import { prisma } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { retrievalService } from '../rag/retrievalService.js';
import { llmService } from '../llm/llmService.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  status: 'success' | 'error';
  error?: string;
}

export const ingestService = {
  /**
   * Process a single document
   */
  async processDocument(documentId: string): Promise<IngestResult> {
    logger.info(`Starting document ingestion: ${documentId}`);

    try {
      // 1. Get document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { folder: true },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // 2. Update status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      // 3. Read and parse file content
      const content = await this.parseDocument(document.filePath, document.fileType);

      if (!content || content.trim().length === 0) {
        throw new Error('Document has no content');
      }

      // 4. Create chunks
      const chunks = this.createChunks(content, 500, 50);

      // 5. Ensure Qdrant collection exists
      await retrievalService.ensureCollection();

      // 6. Process each chunk
      const createdChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const chunkId = uuidv4();

        // Create chunk in database
        const dbChunk = await prisma.chunk.create({
          data: {
            id: chunkId,
            documentId: document.id,
            content: chunkContent,
            chunkIndex: i,
            tokenCount: Math.ceil(chunkContent.length / 4), // Rough estimate
          },
        });

        // Index chunk in Qdrant
        await retrievalService.indexChunk(chunkId, chunkContent, {
          documentId: document.id,
          documentName: document.name,
          folderId: document.folderId,
          folderPath: document.folder.path,
          chunkIndex: i,
        });

        createdChunks.push(dbChunk);
        logger.info(`Indexed chunk ${i + 1}/${chunks.length} for document ${document.name}`);
      }

      // 7. Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'INDEXED',
          processedAt: new Date(),
        },
      });

      logger.info(`Document ingestion complete: ${document.name} (${createdChunks.length} chunks)`);

      return {
        documentId,
        chunksCreated: createdChunks.length,
        status: 'success',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Document ingestion failed: ${errorMessage}`);

      // Update document status to error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: errorMessage,
        },
      });

      return {
        documentId,
        chunksCreated: 0,
        status: 'error',
        error: errorMessage,
      };
    }
  },

  /**
   * Parse document content based on file type
   */
  async parseDocument(filePath: string, fileType: string): Promise<string> {
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    switch (fileType.toLowerCase()) {
      case 'txt':
      case 'md':
        return fs.readFileSync(fullPath, 'utf-8');

      case 'pdf':
        // For PDF, we'd need a library like pdf-parse
        // For now, return placeholder
        logger.warn('PDF parsing not yet implemented, using basic text extraction');
        return fs.readFileSync(fullPath, 'utf-8');

      case 'docx':
        // For DOCX, we'd need a library like mammoth
        logger.warn('DOCX parsing not yet implemented');
        return '';

      default:
        // Try to read as text
        return fs.readFileSync(fullPath, 'utf-8');
    }
  },

  /**
   * Split content into semantic chunks
   */
  createChunks(content: string, targetSize: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];
    
    // Split by paragraphs first
    const paragraphs = content.split(/\n\s*\n/);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      if (!trimmedParagraph) continue;
      
      // If adding this paragraph exceeds target size, save current chunk
      if (currentChunk.length + trimmedParagraph.length > targetSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Keep overlap from end of previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.ceil(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + trimmedParagraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }
    
    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    // If no chunks created (single block of text), split by sentences
    if (chunks.length === 0 && content.trim()) {
      const sentences = content.split(/[.!?]+/);
      let chunk = '';
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        if (chunk.length + trimmedSentence.length > targetSize && chunk) {
          chunks.push(chunk.trim());
          chunk = trimmedSentence;
        } else {
          chunk += (chunk ? '. ' : '') + trimmedSentence;
        }
      }
      
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks.length > 0 ? chunks : [content.trim()];
  },

  /**
   * Process all pending documents
   */
  async processAllPending(): Promise<IngestResult[]> {
    const pendingDocs = await prisma.document.findMany({
      where: { status: 'PENDING' },
    });

    const results: IngestResult[] = [];

    for (const doc of pendingDocs) {
      const result = await this.processDocument(doc.id);
      results.push(result);
    }

    return results;
  },

  /**
   * Reindex a document
   */
  async reindexDocument(documentId: string): Promise<IngestResult> {
    // Delete existing chunks
    const existingChunks = await prisma.chunk.findMany({
      where: { documentId },
      select: { id: true },
    });

    if (existingChunks.length > 0) {
      // Delete from Qdrant
      await retrievalService.deleteChunks(existingChunks.map(c => c.id));
      
      // Delete from database
      await prisma.chunk.deleteMany({ where: { documentId } });
    }

    // Reprocess
    return this.processDocument(documentId);
  },
};


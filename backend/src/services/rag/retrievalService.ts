import { prisma } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { llmService } from '../llm/llmService.js';
import { QdrantClient } from '@qdrant/js-client-rest';

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

const COLLECTION_NAME = 'edergpt_chunks';

export interface RetrievalInput {
  query: string;
  allowedFolderIds: string[];
  topK?: number;
  minSimilarity?: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  totalFound: number;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentName: string;
  folderPath: string;
  content: string;
  pageNumber?: number;
  score: number;
}

export const retrievalService = {
  /**
   * Search for relevant chunks based on query
   */
  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const { query, allowedFolderIds, topK = 10, minSimilarity = 0.25 } = input;

    if (allowedFolderIds.length === 0) {
      return { chunks: [], totalFound: 0 };
    }

    try {
      // Get RAG settings
      const settings = await this.getSettings();

      // Generate query embedding
      const queryEmbedding = await llmService.generateEmbedding(query);

      // Check if collection exists
      const collections = await qdrant.getCollections();
      const collectionExists = collections.collections.some(
        c => c.name === COLLECTION_NAME
      );

      if (!collectionExists) {
        logger.warn('Qdrant collection does not exist, falling back to database search');
        return this.fallbackDatabaseSearch(query, allowedFolderIds, topK);
      }

      // Search in Qdrant with folder filter
      const searchResult = await qdrant.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        limit: settings.topK || topK,
        filter: {
          must: [
            {
              key: 'folderId',
              match: { any: allowedFolderIds },
            },
          ],
        },
        with_payload: true,
        score_threshold: settings.similarityThreshold || minSimilarity,
      });

      // Map results to chunks
      const chunks: RetrievedChunk[] = searchResult.map(result => ({
        id: result.id as string,
        documentId: (result.payload?.documentId as string) || '',
        documentName: (result.payload?.documentName as string) || '',
        folderPath: (result.payload?.folderPath as string) || '',
        content: (result.payload?.content as string) || '',
        pageNumber: result.payload?.pageNumber as number | undefined,
        score: result.score,
      }));

      // Apply de-duplication if enabled
      const finalChunks = settings.deDuplicate
        ? this.deduplicateChunks(chunks, settings.maxChunksPerDocument)
        : chunks;

      logger.info(`Retrieved ${finalChunks.length} chunks for query (${searchResult.length} before dedup)`);

      return {
        chunks: finalChunks,
        totalFound: searchResult.length,
      };
    } catch (error) {
      logger.error('Error in retrieval search:', error);
      // Fallback to database search
      return this.fallbackDatabaseSearch(query, allowedFolderIds, topK);
    }
  },

  /**
   * Fallback database search (simple keyword matching)
   */
  async fallbackDatabaseSearch(
    query: string,
    allowedFolderIds: string[],
    topK: number
  ): Promise<RetrievalResult> {
    try {
      // Simple keyword search in database
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

      if (keywords.length === 0) {
        return { chunks: [], totalFound: 0 };
      }

      const chunks = await prisma.chunk.findMany({
        where: {
          document: {
            folderId: { in: allowedFolderIds },
            status: 'INDEXED',
          },
          OR: keywords.map(keyword => ({
            content: { contains: keyword, mode: 'insensitive' as const },
          })),
        },
        include: {
          document: {
            include: {
              folder: { select: { path: true } },
            },
          },
        },
        take: topK,
      });

      return {
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          documentId: chunk.documentId,
          documentName: chunk.document.name,
          folderPath: chunk.document.folder.path,
          content: chunk.content,
          pageNumber: chunk.pageNumber || undefined,
          score: 0.5, // Default score for fallback
        })),
        totalFound: chunks.length,
      };
    } catch (error) {
      logger.error('Error in fallback database search:', error);
      return { chunks: [], totalFound: 0 };
    }
  },

  /**
   * De-duplicate chunks (limit per document)
   */
  deduplicateChunks(chunks: RetrievedChunk[], maxPerDocument: number): RetrievedChunk[] {
    const documentCounts: Record<string, number> = {};
    const result: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      const count = documentCounts[chunk.documentId] || 0;
      if (count < maxPerDocument) {
        result.push(chunk);
        documentCounts[chunk.documentId] = count + 1;
      }
    }

    return result;
  },

  /**
   * Get RAG settings from database
   */
  async getSettings() {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      });

      const ragSettings = (settings?.settings as any)?.rag;

      return {
        topK: ragSettings?.topK || 10,
        similarityThreshold: ragSettings?.similarityThreshold || 0.25,
        maxChunksPerDocument: ragSettings?.maxChunksPerDocument || 3,
        deDuplicate: ragSettings?.deDuplicate !== false,
        reRanking: ragSettings?.reRanking || false,
      };
    } catch {
      return {
        topK: 10,
        similarityThreshold: 0.25,
        maxChunksPerDocument: 3,
        deDuplicate: true,
        reRanking: false,
      };
    }
  },

  /**
   * Ensure Qdrant collection exists
   */
  async ensureCollection(): Promise<void> {
    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: 1536, // text-embedding-3-small dimension
            distance: 'Cosine',
          },
        });
        logger.info(`Created Qdrant collection: ${COLLECTION_NAME}`);
      }
    } catch (error) {
      logger.error('Error ensuring Qdrant collection:', error);
    }
  },

  /**
   * Index a chunk in Qdrant
   */
  async indexChunk(chunkId: string, content: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      const embedding = await llmService.generateEmbedding(content);

      await qdrant.upsert(COLLECTION_NAME, {
        points: [
          {
            id: chunkId,
            vector: embedding,
            payload: {
              ...metadata,
              content,
            },
          },
        ],
      });
    } catch (error) {
      logger.error('Error indexing chunk:', error);
      throw error;
    }
  },

  /**
   * Delete chunks from Qdrant
   */
  async deleteChunks(chunkIds: string[]): Promise<void> {
    try {
      await qdrant.delete(COLLECTION_NAME, {
        points: chunkIds,
      });
    } catch (error) {
      logger.error('Error deleting chunks from Qdrant:', error);
    }
  },
};


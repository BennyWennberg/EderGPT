import { prisma } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { retrievalService } from '../rag/retrievalService.js';
import { llmService } from '../llm/llmService.js';
import { promptBuilder } from './promptBuilder.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';
import { KnowledgeMode } from '@prisma/client';

export interface ChatInput {
  userId: string;
  message: string;
  chatId?: string;
  allowedFolderIds: string[];
  isAdmin?: boolean;
  previewUserId?: string;
}

export interface ChatResponse {
  chatId: string;
  messageId: string;
  content: string;
  mode: KnowledgeMode;
  sources: Source[];
  suggestedQuestions?: string[];
}

export interface Source {
  documentId: string;
  documentName: string;
  folderPath: string;
  pageNumber?: number;
  chunkId: string;
  relevanceScore: number;
  snippet?: string;
}

export const chatService = {
  /**
   * Process a user message and generate a response
   */
  async processMessage(input: ChatInput): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // 1. Get or create chat
      let chat;
      if (input.chatId) {
        chat = await prisma.chat.findUnique({ where: { id: input.chatId } });
      }

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            userId: input.userId,
            title: input.message.slice(0, 50) + (input.message.length > 50 ? '...' : ''),
          },
        });
      }

      // 2. Save user message
      const userMessage = await prisma.chatMessage.create({
        data: {
          chatId: chat.id,
          role: 'USER',
          content: input.message,
        },
      });

      // 3. Get previous messages for context
      const previousMessages = await prisma.chatMessage.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'asc' },
        take: 20, // Limit context
      });

      // 4. Retrieve relevant documents
      const retrievalResult = await retrievalService.search({
        query: input.message,
        allowedFolderIds: input.allowedFolderIds,
        topK: 10,
      });

      // 5. Determine mode based on retrieval results
      const mode = this.determineMode(retrievalResult.chunks, input.allowedFolderIds);

      // 6. Build prompt
      const prompt = await promptBuilder.build({
        userMessage: input.message,
        previousMessages,
        chunks: retrievalResult.chunks,
        mode,
      });

      // 7. Generate response from LLM
      const llmResponse = await llmService.generate(prompt);

      // 8. Extract sources
      const sources = this.extractSources(retrievalResult.chunks);

      // 9. Generate follow-up suggestions (optional)
      const suggestedQuestions = await this.generateSuggestions(
        input.message,
        llmResponse.content
      );

      // 10. Save assistant message
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          chatId: chat.id,
          role: 'ASSISTANT',
          content: llmResponse.content,
          mode,
          sources: sources.length > 0 ? sources : undefined,
          promptTokens: llmResponse.promptTokens,
          completionTokens: llmResponse.completionTokens,
        },
      });

      // 11. Update chat title if first message
      if (previousMessages.length <= 1) {
        await prisma.chat.update({
          where: { id: chat.id },
          data: { title: input.message.slice(0, 50) },
        });
      }

      // 12. Log audit
      await logAudit(input.userId, AuditActions.CHAT_MESSAGE, 'CHAT', chat.id, {
        mode,
        sourceCount: sources.length,
        responseTime: Date.now() - startTime,
        isAdmin: input.isAdmin,
        previewUserId: input.previewUserId,
      });

      logger.info(`Chat response generated in ${Date.now() - startTime}ms (mode: ${mode})`);

      return {
        chatId: chat.id,
        messageId: assistantMessage.id,
        content: llmResponse.content,
        mode,
        sources,
        suggestedQuestions,
      };
    } catch (error) {
      logger.error('Error processing chat message:', error);
      throw error;
    }
  },

  /**
   * Determine knowledge mode based on retrieval results
   */
  determineMode(chunks: any[], allowedFolderIds: string[]): KnowledgeMode {
    // If no folders assigned, always LLM-only
    if (allowedFolderIds.length === 0) {
      return KnowledgeMode.LLM_ONLY;
    }

    // If no relevant chunks found, LLM-only
    if (!chunks || chunks.length === 0) {
      return KnowledgeMode.LLM_ONLY;
    }

    // Check if any folder requires RAG-only
    // (In real implementation, check folder settings)
    const hasRagOnlyFolder = false; // TODO: Check folder settings

    if (hasRagOnlyFolder) {
      return KnowledgeMode.RAG_ONLY;
    }

    // Default to hybrid
    return KnowledgeMode.HYBRID;
  },

  /**
   * Extract source information from chunks
   */
  extractSources(chunks: any[]): Source[] {
    if (!chunks || chunks.length === 0) return [];

    return chunks.map(chunk => ({
      documentId: chunk.documentId,
      documentName: chunk.documentName || 'Unknown',
      folderPath: chunk.folderPath || '',
      pageNumber: chunk.pageNumber,
      chunkId: chunk.id,
      relevanceScore: chunk.score || 0,
      snippet: chunk.content?.slice(0, 200),
    }));
  },

  /**
   * Generate follow-up question suggestions
   */
  async generateSuggestions(
    question: string,
    answer: string
  ): Promise<string[]> {
    // Simple implementation - can be enhanced with LLM
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      });

      const chatSettings = (settings?.settings as any)?.chat;
      
      if (!chatSettings?.suggestFollowUp) {
        return [];
      }

      // For now, return empty - can implement LLM-based suggestions later
      return [];
    } catch {
      return [];
    }
  },
};


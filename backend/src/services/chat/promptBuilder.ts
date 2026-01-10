import { prisma } from '../../utils/database.js';
import { KnowledgeMode, ChatMessage } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export interface PromptInput {
  userMessage: string;
  previousMessages: ChatMessage[];
  chunks: any[];
  mode: KnowledgeMode;
}

export interface BuiltPrompt {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
}

export const promptBuilder = {
  /**
   * Build the complete prompt for the LLM
   */
  async build(input: PromptInput): Promise<BuiltPrompt> {
    // Get system prompt
    const systemPrompt = await this.getSystemPrompt(input.mode);

    // Build context from chunks
    const context = this.buildContext(input.chunks, input.mode);

    // Build message history
    const messages = this.buildMessages(
      input.userMessage,
      input.previousMessages,
      context
    );

    return {
      systemPrompt,
      messages,
    };
  },

  /**
   * Get the appropriate system prompt
   */
  async getSystemPrompt(mode: KnowledgeMode): Promise<string> {
    try {
      // Get active system prompt from database
      const prompt = await prisma.prompt.findFirst({
        where: { type: 'SYSTEM', isActive: true },
        orderBy: { version: 'desc' },
      });

      let basePrompt = prompt?.content || this.getDefaultSystemPrompt();

      // Add mode-specific instructions
      switch (mode) {
        case KnowledgeMode.RAG_ONLY:
          basePrompt += `\n\nWICHTIG: Du darfst NUR Informationen aus den bereitgestellten Dokumenten verwenden. 
Wenn die Dokumente keine relevanten Informationen enthalten, sage das klar und erfinde NICHTS.`;
          break;
        case KnowledgeMode.LLM_ONLY:
          basePrompt += `\n\nHINWEIS: Für diese Anfrage wurden keine internen Dokumente gefunden. 
Du antwortest basierend auf deinem allgemeinen Wissen. Mache deutlich, dass dies keine dokumentenbasierte Antwort ist.`;
          break;
        case KnowledgeMode.HYBRID:
          basePrompt += `\n\nHINWEIS: Dir wurden interne Dokumente als Kontext bereitgestellt. 
Priorisiere Informationen aus diesen Dokumenten, ergänze aber bei Bedarf mit deinem allgemeinen Wissen.
Kennzeichne klar, welche Informationen aus den Dokumenten stammen.`;
          break;
      }

      return basePrompt;
    } catch (error) {
      logger.error('Error getting system prompt:', error);
      return this.getDefaultSystemPrompt();
    }
  },

  /**
   * Default system prompt
   */
  getDefaultSystemPrompt(): string {
    return `Du bist EderGPT, ein unternehmensinterner KI-Assistent.

WICHTIGE REGELN:
1. Du antwortest immer auf Deutsch, es sei denn, der Nutzer fragt explizit in einer anderen Sprache.
2. Du basierst deine Antworten primär auf den bereitgestellten Dokumenten (Kontext).
3. Wenn du keine relevanten Informationen in den Dokumenten findest, sagst du das ehrlich.
4. Du erfindest NIEMALS Informationen oder Fakten.
5. Du gibst immer an, aus welchen Quellen deine Informationen stammen.
6. Du strukturierst deine Antworten klar und übersichtlich.
7. Bei Unklarheiten stellst du Rückfragen.

ANTWORTFORMAT:
- Beginne mit einer kurzen Zusammenfassung (1-2 Sätze)
- Gib dann Details, falls relevant
- Nenne am Ende die verwendeten Quellen

Du bist hilfsbereit, professionell und präzise.`;
  },

  /**
   * Build context string from retrieved chunks
   */
  buildContext(chunks: any[], mode: KnowledgeMode): string {
    if (!chunks || chunks.length === 0 || mode === KnowledgeMode.LLM_ONLY) {
      return '';
    }

    let context = '=== INTERNE DOKUMENTE (Kontext) ===\n\n';

    chunks.forEach((chunk, index) => {
      context += `[Dokument ${index + 1}: ${chunk.documentName || 'Unbekannt'}`;
      if (chunk.pageNumber) {
        context += `, Seite ${chunk.pageNumber}`;
      }
      context += `]\n${chunk.content}\n\n`;
    });

    context += '=== ENDE KONTEXT ===\n';

    return context;
  },

  /**
   * Build message array for LLM
   */
  buildMessages(
    currentMessage: string,
    previousMessages: ChatMessage[],
    context: string
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // Add previous messages (limited)
    const recentMessages = previousMessages.slice(-10); // Last 10 messages

    for (const msg of recentMessages) {
      messages.push({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current message with context
    let userContent = currentMessage;
    if (context) {
      userContent = `${context}\n\nFRAGE DES NUTZERS:\n${currentMessage}`;
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    return messages;
  },
};


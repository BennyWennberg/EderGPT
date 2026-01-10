import OpenAI from 'openai';
import { prisma } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { BuiltPrompt } from '../chat/promptBuilder.js';

interface LLMResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

interface LLMSettings {
  provider: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  topP: number;
  requestTimeout: number;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const llmService = {
  /**
   * Generate a response from the LLM
   */
  async generate(prompt: BuiltPrompt): Promise<LLMResponse> {
    const settings = await this.getSettings();
    const startTime = Date.now();

    try {
      logger.info(`Generating LLM response with model: ${settings.model}`);

      const response = await openai.chat.completions.create({
        model: settings.model,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          ...prompt.messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
        max_tokens: settings.maxOutputTokens,
        temperature: settings.temperature,
        top_p: settings.topP,
      });

      const content = response.choices[0]?.message?.content || '';
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;

      logger.info(`LLM response generated in ${Date.now() - startTime}ms (${promptTokens + completionTokens} tokens)`);

      return {
        content,
        promptTokens,
        completionTokens,
      };
    } catch (error) {
      logger.error('Error generating LLM response:', error);

      // Return error message instead of throwing
      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          return {
            content: 'Das System ist momentan überlastet. Bitte versuchen Sie es in einigen Sekunden erneut.',
            promptTokens: 0,
            completionTokens: 0,
          };
        }
        if (error.message.includes('context_length')) {
          return {
            content: 'Die Anfrage war zu lang. Bitte formulieren Sie Ihre Frage kürzer.',
            promptTokens: 0,
            completionTokens: 0,
          };
        }
      }

      throw error;
    }
  },

  /**
   * Get LLM settings from database
   */
  async getSettings(): Promise<LLMSettings> {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      });

      const llmSettings = (settings?.settings as any)?.llm;

      return {
        provider: llmSettings?.provider || 'openai',
        model: llmSettings?.model || 'gpt-4-turbo-preview',
        maxOutputTokens: llmSettings?.maxOutputTokens || 2000,
        temperature: llmSettings?.temperature || 0.3,
        topP: llmSettings?.topP || 1.0,
        requestTimeout: llmSettings?.requestTimeout || 60000,
      };
    } catch (error) {
      logger.error('Error getting LLM settings:', error);
      return {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        maxOutputTokens: 2000,
        temperature: 0.3,
        topP: 1.0,
        requestTimeout: 60000,
      };
    }
  },

  /**
   * Check if the LLM service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await openai.models.list();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Generate embeddings for a text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  },
};


import { Router } from 'express';
import { prisma } from '../../utils/database.js';
import { BadRequestError } from '../../middleware/errorHandler.js';
import { logAudit, AuditActions } from '../../middleware/auditLogger.js';
import { requireSuperAdmin } from '../../middleware/auth.js';

const router = Router();

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({ settings: getDefaultSettings() });
    }

    res.json({ settings: settings.settings });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/settings
 * Update system settings (Super Admin only)
 */
router.put('/', requireSuperAdmin, async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      throw BadRequestError('Settings object is required');
    }

    // Get current settings
    const current = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });

    // Merge with existing settings
    const mergedSettings = {
      ...(current?.settings as Record<string, unknown> || getDefaultSettings()),
      ...settings,
    };

    // Validate settings structure
    validateSettings(mergedSettings);

    // Update or create settings
    const updated = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: {
        settings: mergedSettings,
        updatedBy: req.user!.id,
      },
      create: {
        id: 'singleton',
        settings: mergedSettings,
        updatedBy: req.user!.id,
      },
    });

    await logAudit(req.user!.id, AuditActions.SETTINGS_UPDATE, 'SETTINGS', 'singleton', {
      changedSections: Object.keys(settings),
    }, req);

    res.json({ settings: updated.settings });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/settings/:section
 * Update a specific section of settings
 */
router.put('/:section', requireSuperAdmin, async (req, res, next) => {
  try {
    const { section } = req.params;
    const sectionData = req.body;

    const validSections = ['general', 'chat', 'llm', 'rag', 'ingest', 'logging', 'security', 'analytics'];
    if (!validSections.includes(section)) {
      throw BadRequestError(`Invalid section: ${section}`);
    }

    // Get current settings
    const current = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });

    const currentSettings = (current?.settings as Record<string, unknown>) || getDefaultSettings();

    // Update specific section
    const updatedSettings = {
      ...currentSettings,
      [section]: {
        ...(currentSettings[section] as Record<string, unknown> || {}),
        ...sectionData,
      },
    };

    const updated = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: {
        settings: updatedSettings,
        updatedBy: req.user!.id,
      },
      create: {
        id: 'singleton',
        settings: updatedSettings,
        updatedBy: req.user!.id,
      },
    });

    await logAudit(req.user!.id, AuditActions.SETTINGS_UPDATE, 'SETTINGS', 'singleton', {
      section,
      changes: Object.keys(sectionData),
    }, req);

    res.json({ settings: updated.settings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/settings/defaults
 * Get default settings
 */
router.get('/defaults', (req, res) => {
  res.json({ settings: getDefaultSettings() });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultSettings() {
  return {
    general: {
      systemName: 'EderGPT',
      tenantMode: false,
      defaultLanguage: 'de',
      safeMode: false,
    },
    chat: {
      structuredAnswers: true,
      summaryWithDetails: true,
      highlightImportant: true,
      contextContinue: true,
      maxContextTurns: 10,
      allowChatReset: true,
      forceRephrase: true,
      noHallucination: true,
      noKnowledgeMessage: 'Zu dieser Frage habe ich leider keine Informationen in den mir zugänglichen Dokumenten gefunden.',
      suggestFollowUp: true,
      followUpCount: 3,
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      maxInputTokens: 8000,
      maxOutputTokens: 2000,
      temperature: 0.3,
      topP: 1.0,
      requestTimeout: 60000,
      retryAttempts: 2,
      contentFilter: true,
    },
    rag: {
      defaultMode: 'HYBRID',
      topK: 10,
      similarityThreshold: 0.25,
      maxChunksPerDocument: 3,
      deDuplicate: true,
      reRanking: false,
      reRankTopN: 20,
      contextCompression: false,
      citationMode: 'document',
      fallbackToLLM: true,
      forceRephraseOnWeakRetrieval: true,
    },
    ingest: {
      autoIngest: true,
      autoReindex: true,
      reindexStrategy: 'incremental',
      chunkTargetSize: 500,
      chunkOverlap: 50,
      enabledParsers: ['pdf', 'docx', 'pptx', 'txt'],
      imageProcessing: false,
    },
    logging: {
      level: 'INFO',
      logChatRequests: true,
      logChatResponses: true,
      logSources: true,
      logAdminActions: true,
      logIngestEvents: true,
      logRetrievalEvents: false,
      piiMasking: false,
      retentionDays: 90,
      allowExport: true,
    },
    security: {
      sessionLifetimeMinutes: 480,
      idleTimeoutMinutes: 60,
      maxFailedLogins: 5,
      lockoutDurationMinutes: 30,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumber: true,
      passwordRequireSpecial: false,
    },
    analytics: {
      feedbackEnabled: true,
      feedbackTypes: ['positive', 'negative', 'incorrect'],
      dashboardMetrics: ['users', 'chats', 'questions', 'feedback'],
    },
  };
}

function validateSettings(settings: Record<string, unknown>) {
  // Basic validation - can be extended
  const requiredSections = ['general', 'chat', 'llm', 'rag', 'ingest', 'logging', 'security', 'analytics'];
  
  for (const section of requiredSections) {
    if (!(section in settings)) {
      throw BadRequestError(`Missing settings section: ${section}`);
    }
  }

  // Validate specific fields
  const llm = settings.llm as Record<string, unknown>;
  if (llm.temperature !== undefined && (llm.temperature < 0 || llm.temperature > 2)) {
    throw BadRequestError('LLM temperature must be between 0 and 2');
  }

  const rag = settings.rag as Record<string, unknown>;
  if (rag.topK !== undefined && (rag.topK < 1 || rag.topK > 50)) {
    throw BadRequestError('RAG topK must be between 1 and 50');
  }
}

export default router;


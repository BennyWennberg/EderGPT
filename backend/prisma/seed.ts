import { PrismaClient, Role, KnowledgeMode, PromptType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================
  // CREATE DEFAULT ADMIN USER
  // ============================================
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      email: 'admin@company.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // ============================================
  // CREATE DEFAULT USER
  // ============================================
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      passwordHash: userPassword,
      email: 'user@company.com',
      firstName: 'Demo',
      lastName: 'User',
      role: Role.USER,
    },
  });
  console.log('✅ Demo user created:', user.username);

  // ============================================
  // CREATE DEMO FOLDERS
  // ============================================
  const generalFolder = await prisma.folder.upsert({
    where: { path: '/general' },
    update: {},
    create: {
      name: 'Allgemein',
      path: '/general',
      description: 'Allgemeine Unternehmensdokumente',
      knowledgeMode: KnowledgeMode.HYBRID,
    },
  });

  const hrFolder = await prisma.folder.upsert({
    where: { path: '/hr' },
    update: {},
    create: {
      name: 'Human Resources',
      path: '/hr',
      description: 'HR-Dokumente, Richtlinien, Onboarding',
      knowledgeMode: KnowledgeMode.HYBRID,
    },
  });

  const legalFolder = await prisma.folder.upsert({
    where: { path: '/legal' },
    update: {},
    create: {
      name: 'Recht & Compliance',
      path: '/legal',
      description: 'Rechtliche Dokumente (nur RAG)',
      knowledgeMode: KnowledgeMode.RAG_ONLY,
    },
  });

  const techFolder = await prisma.folder.upsert({
    where: { path: '/tech' },
    update: {},
    create: {
      name: 'Technische Dokumentation',
      path: '/tech',
      description: 'Technische Anleitungen und Docs',
      knowledgeMode: KnowledgeMode.HYBRID,
    },
  });

  console.log('✅ Demo folders created');

  // ============================================
  // ASSIGN FOLDERS TO DEMO USER
  // ============================================
  await prisma.userFolder.upsert({
    where: { userId_folderId: { userId: user.id, folderId: generalFolder.id } },
    update: {},
    create: { userId: user.id, folderId: generalFolder.id },
  });

  await prisma.userFolder.upsert({
    where: { userId_folderId: { userId: user.id, folderId: hrFolder.id } },
    update: {},
    create: { userId: user.id, folderId: hrFolder.id },
  });

  console.log('✅ Folders assigned to demo user');

  // ============================================
  // CREATE DEMO GROUP
  // ============================================
  const allEmployeesGroup = await prisma.group.upsert({
    where: { name: 'Alle Mitarbeiter' },
    update: {},
    create: {
      name: 'Alle Mitarbeiter',
      description: 'Standardgruppe für alle Mitarbeiter',
    },
  });

  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: user.id, groupId: allEmployeesGroup.id } },
    update: {},
    create: { userId: user.id, groupId: allEmployeesGroup.id },
  });

  console.log('✅ Demo group created');

  // ============================================
  // CREATE DEFAULT SYSTEM SETTINGS
  // ============================================
  const defaultSettings = {
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

  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: { settings: defaultSettings },
    create: {
      id: 'singleton',
      settings: defaultSettings,
    },
  });

  console.log('✅ System settings created');

  // ============================================
  // CREATE DEFAULT SYSTEM PROMPT
  // ============================================
  await prisma.prompt.upsert({
    where: { name: 'default_system' },
    update: {},
    create: {
      name: 'default_system',
      type: PromptType.SYSTEM,
      content: `Du bist EderGPT, ein unternehmensinterner KI-Assistent.

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

Du bist hilfsbereit, professionell und präzise.`,
      isActive: true,
      version: 1,
    },
  });

  console.log('✅ Default system prompt created');

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('📝 Default Logins:');
  console.log('   Admin: admin / admin123');
  console.log('   User:  user / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


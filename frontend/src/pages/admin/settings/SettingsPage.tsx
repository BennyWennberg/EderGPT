import { useEffect, useState } from 'react';
import { adminApi } from '../../../services/api';
import { Save, Loader2, Settings, MessageSquare, Bot, Database, FileText, Shield, Sliders, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

type SettingsTab = 'general' | 'chat' | 'llm' | 'rag' | 'ingest' | 'prompts' | 'logging' | 'security';

const defaultSettings = {
  general: {
    systemName: 'EderGPT',
    defaultLanguage: 'de',
    safeMode: false,
    tenantMode: 'single',
  },
  chat: {
    structuredAnswers: true,
    summaryWithDetails: true,
    noHallucination: true,
    maxContextTurns: 10,
    highlightSources: true,
    suggestFollowUps: true,
    ambiguityHandling: 'ask',
    defaultNoKnowledgeText: 'Zu dieser Frage liegen mir keine internen Informationen vor.',
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    topP: 1.0,
    maxOutputTokens: 2048,
    maxInputTokens: 8000,
    timeout: 60000,
    retries: 2,
  },
  rag: {
    defaultMode: 'HYBRID',
    topK: 5,
    similarityThreshold: 0.7,
    maxChunksPerDoc: 3,
    deDuplicate: true,
    reRank: true,
    contextCompression: false,
    citationMode: 'inline',
    fallbackToLLM: true,
  },
  ingest: {
    autoIngest: true,
    autoReindex: true,
    chunkTargetSize: 500,
    chunkOverlap: 50,
    enabledParsers: ['pdf', 'docx', 'txt', 'md'],
    processImages: true,
  },
  prompts: {
    systemPrompt: 'Du bist EderGPT, ein hilfreicher KI-Assistent für interne Unternehmensfragen. Antworte präzise und basierend auf den bereitgestellten Dokumenten.',
    ragInstructions: 'Nutze die folgenden Dokumente als Kontext. Zitiere Quellen wenn möglich.',
    noHallucinationRule: 'Wenn du dir nicht sicher bist oder keine Informationen hast, sage das ehrlich.',
    formatInstructions: 'Strukturiere Antworten mit Überschriften und Aufzählungen wo sinnvoll.',
  },
  logging: {
    logLevel: 'info',
    logChatRequests: true,
    logChatResponses: true,
    logSources: true,
    logAdminActions: true,
    piiMasking: true,
    contentHashing: false,
    retentionDays: 90,
  },
  security: {
    sessionLifetimeMinutes: 480,
    maxFailedLogins: 5,
    lockoutDurationMinutes: 30,
    passwordMinLength: 8,
    requirePasswordChange: false,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await adminApi.getSettings();
      // Merge with defaults for missing values
      const loadedSettings = response.data.settings || {};
      const mergedSettings: Record<string, any> = {};
      
      for (const section of Object.keys(defaultSettings)) {
        mergedSettings[section] = {
          ...defaultSettings[section as keyof typeof defaultSettings],
          ...loadedSettings[section],
        };
      }
      
      setSettings(mergedSettings);
    } catch (error) {
      // Use defaults if loading fails
      setSettings(defaultSettings);
      toast.error('Fehler beim Laden - Standardwerte verwendet');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings(settings!);
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [key]: value,
      },
    }));
  };

  const tabs = [
    { id: 'general', label: 'Allgemein', icon: Settings },
    { id: 'chat', label: 'Chat-Verhalten', icon: MessageSquare },
    { id: 'llm', label: 'LLM & Modell', icon: Bot },
    { id: 'rag', label: 'RAG & Retrieval', icon: Database },
    { id: 'ingest', label: 'Dokument-Verarbeitung', icon: Sliders },
    { id: 'prompts', label: 'Prompts & Regeln', icon: Sparkles },
    { id: 'logging', label: 'Logging & Audit', icon: FileText },
    { id: 'security', label: 'Sicherheit', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Tabs Sidebar */}
      <div className="w-64 border-r border-border bg-card p-4">
        <h2 className="font-semibold mb-4">System Settings</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <tab.icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              Konfigurieren Sie die System-Einstellungen
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Speichern
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-6">
            {activeTab === 'general' && settings?.general && (
              <>
                <SettingField
                  label="Systemname"
                  description="Name des Systems in der Oberfläche"
                  value={settings.general.systemName}
                  onChange={(v) => updateSetting('general', 'systemName', v)}
                />
                <SettingSelect
                  label="Standardsprache"
                  description="Sprache für Benutzeroberfläche und Antworten"
                  value={settings.general.defaultLanguage}
                  options={[
                    { value: 'de', label: 'Deutsch' },
                    { value: 'en', label: 'English' },
                  ]}
                  onChange={(v) => updateSetting('general', 'defaultLanguage', v)}
                />
                <SettingSelect
                  label="Tenant-Modus"
                  description="Single-Tenant oder Multi-Tenant Betrieb"
                  value={settings.general.tenantMode}
                  options={[
                    { value: 'single', label: 'Single-Tenant' },
                    { value: 'multi', label: 'Multi-Tenant' },
                  ]}
                  onChange={(v) => updateSetting('general', 'tenantMode', v)}
                />
                <SettingToggle
                  label="Safe-Mode"
                  description="Chat deaktivieren (nur Admin-Zugriff)"
                  checked={settings.general.safeMode}
                  onChange={(v) => updateSetting('general', 'safeMode', v)}
                />
              </>
            )}

            {activeTab === 'chat' && settings?.chat && (
              <>
                <SettingToggle
                  label="Strukturierte Antworten"
                  description="Antworten mit Überschriften und Absätzen gliedern"
                  checked={settings.chat.structuredAnswers}
                  onChange={(v) => updateSetting('chat', 'structuredAnswers', v)}
                />
                <SettingToggle
                  label="Zusammenfassung + Details"
                  description="Erst Kurzfassung, dann Details auf Nachfrage"
                  checked={settings.chat.summaryWithDetails}
                  onChange={(v) => updateSetting('chat', 'summaryWithDetails', v)}
                />
                <SettingToggle
                  label="Quellen hervorheben"
                  description="Dokumentquellen in Antworten anzeigen"
                  checked={settings.chat.highlightSources}
                  onChange={(v) => updateSetting('chat', 'highlightSources', v)}
                />
                <SettingToggle
                  label="Follow-up Vorschläge"
                  description="Nach Antworten verwandte Fragen vorschlagen"
                  checked={settings.chat.suggestFollowUps}
                  onChange={(v) => updateSetting('chat', 'suggestFollowUps', v)}
                />
                <SettingToggle
                  label="Nicht halluzinieren"
                  description="Keine Antworten ohne ausreichende Informationen"
                  checked={settings.chat.noHallucination}
                  onChange={(v) => updateSetting('chat', 'noHallucination', v)}
                />
                <SettingField
                  label="Maximale Kontext-Turns"
                  description="Anzahl vorheriger Nachrichten im Kontext"
                  value={settings.chat.maxContextTurns}
                  type="number"
                  onChange={(v) => updateSetting('chat', 'maxContextTurns', parseInt(v))}
                />
                <SettingSelect
                  label="Bei Mehrdeutigkeit"
                  description="Verhalten bei unklaren Fragen"
                  value={settings.chat.ambiguityHandling}
                  options={[
                    { value: 'ask', label: 'Rückfrage stellen' },
                    { value: 'best_guess', label: 'Beste Interpretation wählen' },
                    { value: 'list_options', label: 'Optionen auflisten' },
                  ]}
                  onChange={(v) => updateSetting('chat', 'ambiguityHandling', v)}
                />
                <SettingTextarea
                  label="Text bei fehlendem Wissen"
                  description="Standardantwort wenn keine internen Infos gefunden"
                  value={settings.chat.defaultNoKnowledgeText}
                  onChange={(v) => updateSetting('chat', 'defaultNoKnowledgeText', v)}
                />
              </>
            )}

            {activeTab === 'llm' && settings?.llm && (
              <>
                <SettingSelect
                  label="Provider"
                  description="LLM-Anbieter"
                  value={settings.llm.provider}
                  options={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'azure', label: 'Azure OpenAI' },
                    { value: 'anthropic', label: 'Anthropic Claude' },
                  ]}
                  onChange={(v) => updateSetting('llm', 'provider', v)}
                />
                <SettingField
                  label="Modell"
                  description="Modell-ID für Antworten (z.B. gpt-4o, gpt-4-turbo)"
                  value={settings.llm.model}
                  onChange={(v) => updateSetting('llm', 'model', v)}
                />
                <SettingField
                  label="Temperature"
                  description="Kreativität der Antworten (0 = präzise, 1 = kreativ)"
                  value={settings.llm.temperature}
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  onChange={(v) => updateSetting('llm', 'temperature', parseFloat(v))}
                />
                <SettingField
                  label="Top-P"
                  description="Nucleus Sampling (0.1-1.0)"
                  value={settings.llm.topP}
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  onChange={(v) => updateSetting('llm', 'topP', parseFloat(v))}
                />
                <SettingField
                  label="Max. Output Tokens"
                  description="Maximale Länge der Antworten"
                  value={settings.llm.maxOutputTokens}
                  type="number"
                  onChange={(v) => updateSetting('llm', 'maxOutputTokens', parseInt(v))}
                />
                <SettingField
                  label="Max. Input Tokens"
                  description="Maximale Kontext-Länge (inkl. Chunks)"
                  value={settings.llm.maxInputTokens}
                  type="number"
                  onChange={(v) => updateSetting('llm', 'maxInputTokens', parseInt(v))}
                />
                <SettingField
                  label="Timeout (ms)"
                  description="Maximale Wartezeit auf Antwort"
                  value={settings.llm.timeout}
                  type="number"
                  onChange={(v) => updateSetting('llm', 'timeout', parseInt(v))}
                />
                <SettingField
                  label="Wiederholungsversuche"
                  description="Anzahl Retries bei Fehler"
                  value={settings.llm.retries}
                  type="number"
                  min="0"
                  max="5"
                  onChange={(v) => updateSetting('llm', 'retries', parseInt(v))}
                />
              </>
            )}

            {activeTab === 'rag' && settings?.rag && (
              <>
                <SettingSelect
                  label="Standard-Wissenmodus"
                  description="Wie Dokumente und LLM kombiniert werden"
                  value={settings.rag.defaultMode}
                  options={[
                    { value: 'HYBRID', label: 'Hybrid (Dokumente + LLM)' },
                    { value: 'RAG_ONLY', label: 'Nur Dokumente (keine LLM-Ergänzung)' },
                    { value: 'LLM_ONLY', label: 'Nur LLM (keine Dokumente)' },
                  ]}
                  onChange={(v) => updateSetting('rag', 'defaultMode', v)}
                />
                <SettingField
                  label="Top-K Chunks"
                  description="Anzahl abgerufener Dokumentenabschnitte"
                  value={settings.rag.topK}
                  type="number"
                  min="1"
                  max="20"
                  onChange={(v) => updateSetting('rag', 'topK', parseInt(v))}
                />
                <SettingField
                  label="Similarity Threshold"
                  description="Mindestrelevanz für Chunks (0.0-1.0)"
                  value={settings.rag.similarityThreshold}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  onChange={(v) => updateSetting('rag', 'similarityThreshold', parseFloat(v))}
                />
                <SettingField
                  label="Max. Chunks pro Dokument"
                  description="Vermeidet Übergewichtung einzelner Dokumente"
                  value={settings.rag.maxChunksPerDoc}
                  type="number"
                  min="1"
                  max="10"
                  onChange={(v) => updateSetting('rag', 'maxChunksPerDoc', parseInt(v))}
                />
                <SettingToggle
                  label="De-Duplizierung"
                  description="Doppelte Chunks aus demselben Dokument vermeiden"
                  checked={settings.rag.deDuplicate}
                  onChange={(v) => updateSetting('rag', 'deDuplicate', v)}
                />
                <SettingToggle
                  label="Re-Ranking"
                  description="Chunks nach Relevanz neu sortieren"
                  checked={settings.rag.reRank}
                  onChange={(v) => updateSetting('rag', 'reRank', v)}
                />
                <SettingToggle
                  label="Kontext-Komprimierung"
                  description="Lange Chunks auf Kernaussagen kürzen"
                  checked={settings.rag.contextCompression}
                  onChange={(v) => updateSetting('rag', 'contextCompression', v)}
                />
                <SettingSelect
                  label="Zitierweise"
                  description="Wie Quellen in Antworten angezeigt werden"
                  value={settings.rag.citationMode}
                  options={[
                    { value: 'inline', label: 'Inline [1], [2], ...' },
                    { value: 'footnote', label: 'Fußnoten' },
                    { value: 'end', label: 'Quellenverzeichnis am Ende' },
                    { value: 'none', label: 'Keine Zitate' },
                  ]}
                  onChange={(v) => updateSetting('rag', 'citationMode', v)}
                />
                <SettingToggle
                  label="Fallback auf LLM"
                  description="Bei keinen relevanten Dokumenten LLM nutzen"
                  checked={settings.rag.fallbackToLLM}
                  onChange={(v) => updateSetting('rag', 'fallbackToLLM', v)}
                />
              </>
            )}

            {activeTab === 'ingest' && settings?.ingest && (
              <>
                <SettingToggle
                  label="Auto-Ingest"
                  description="Hochgeladene Dokumente automatisch verarbeiten"
                  checked={settings.ingest.autoIngest}
                  onChange={(v) => updateSetting('ingest', 'autoIngest', v)}
                />
                <SettingToggle
                  label="Auto-Reindex"
                  description="Bei Änderungen automatisch neu indexieren"
                  checked={settings.ingest.autoReindex}
                  onChange={(v) => updateSetting('ingest', 'autoReindex', v)}
                />
                <SettingField
                  label="Chunk-Größe (Zeichen)"
                  description="Zielgröße für Textabschnitte"
                  value={settings.ingest.chunkTargetSize}
                  type="number"
                  min="100"
                  max="2000"
                  onChange={(v) => updateSetting('ingest', 'chunkTargetSize', parseInt(v))}
                />
                <SettingField
                  label="Chunk-Überlappung (Zeichen)"
                  description="Überlappung zwischen Chunks für Kontext"
                  value={settings.ingest.chunkOverlap}
                  type="number"
                  min="0"
                  max="500"
                  onChange={(v) => updateSetting('ingest', 'chunkOverlap', parseInt(v))}
                />
                <SettingToggle
                  label="Bilder verarbeiten"
                  description="OCR für Bilder in Dokumenten"
                  checked={settings.ingest.processImages}
                  onChange={(v) => updateSetting('ingest', 'processImages', v)}
                />
                <div className="bg-card rounded-lg border border-border p-4">
                  <span className="font-medium">Aktivierte Parser</span>
                  <p className="text-sm text-muted-foreground mb-3">Unterstützte Dateiformate</p>
                  <div className="flex flex-wrap gap-2">
                    {['pdf', 'docx', 'doc', 'txt', 'md', 'pptx', 'xlsx'].map((parser) => (
                      <label
                        key={parser}
                        className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          settings.ingest.enabledParsers?.includes(parser)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={settings.ingest.enabledParsers?.includes(parser)}
                          onChange={(e) => {
                            const current = settings.ingest.enabledParsers || [];
                            if (e.target.checked) {
                              updateSetting('ingest', 'enabledParsers', [...current, parser]);
                            } else {
                              updateSetting('ingest', 'enabledParsers', current.filter((p: string) => p !== parser));
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">.{parser}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'prompts' && settings?.prompts && (
              <>
                <SettingTextarea
                  label="System-Prompt"
                  description="Grundlegende Persönlichkeit und Verhalten des Assistenten"
                  value={settings.prompts.systemPrompt}
                  rows={4}
                  onChange={(v) => updateSetting('prompts', 'systemPrompt', v)}
                />
                <SettingTextarea
                  label="RAG-Instruktionen"
                  description="Wie der Assistent mit bereitgestellten Dokumenten umgehen soll"
                  value={settings.prompts.ragInstructions}
                  rows={3}
                  onChange={(v) => updateSetting('prompts', 'ragInstructions', v)}
                />
                <SettingTextarea
                  label="Keine-Halluzination-Regel"
                  description="Anweisung für Umgang mit Unsicherheit"
                  value={settings.prompts.noHallucinationRule}
                  rows={2}
                  onChange={(v) => updateSetting('prompts', 'noHallucinationRule', v)}
                />
                <SettingTextarea
                  label="Format-Anweisungen"
                  description="Wie Antworten strukturiert werden sollen"
                  value={settings.prompts.formatInstructions}
                  rows={2}
                  onChange={(v) => updateSetting('prompts', 'formatInstructions', v)}
                />
              </>
            )}

            {activeTab === 'logging' && settings?.logging && (
              <>
                <SettingSelect
                  label="Log-Level"
                  description="Detailgrad der System-Logs"
                  value={settings.logging.logLevel}
                  options={[
                    { value: 'error', label: 'Nur Fehler' },
                    { value: 'warn', label: 'Warnungen + Fehler' },
                    { value: 'info', label: 'Info (Standard)' },
                    { value: 'debug', label: 'Debug (Detailliert)' },
                  ]}
                  onChange={(v) => updateSetting('logging', 'logLevel', v)}
                />
                <SettingToggle
                  label="Chat-Anfragen loggen"
                  description="Benutzeranfragen protokollieren"
                  checked={settings.logging.logChatRequests}
                  onChange={(v) => updateSetting('logging', 'logChatRequests', v)}
                />
                <SettingToggle
                  label="Chat-Antworten loggen"
                  description="KI-Antworten protokollieren"
                  checked={settings.logging.logChatResponses}
                  onChange={(v) => updateSetting('logging', 'logChatResponses', v)}
                />
                <SettingToggle
                  label="Quellen loggen"
                  description="Verwendete Dokumentenquellen protokollieren"
                  checked={settings.logging.logSources}
                  onChange={(v) => updateSetting('logging', 'logSources', v)}
                />
                <SettingToggle
                  label="Admin-Aktionen loggen"
                  description="Alle Admin-Änderungen im Audit-Log"
                  checked={settings.logging.logAdminActions}
                  onChange={(v) => updateSetting('logging', 'logAdminActions', v)}
                />
                <SettingToggle
                  label="PII-Maskierung"
                  description="Personenbezogene Daten in Logs maskieren"
                  checked={settings.logging.piiMasking}
                  onChange={(v) => updateSetting('logging', 'piiMasking', v)}
                />
                <SettingToggle
                  label="Content-Hashing"
                  description="Inhalte nur als Hash speichern (Datenschutz)"
                  checked={settings.logging.contentHashing}
                  onChange={(v) => updateSetting('logging', 'contentHashing', v)}
                />
                <SettingField
                  label="Aufbewahrung (Tage)"
                  description="Logs nach X Tagen automatisch löschen"
                  value={settings.logging.retentionDays}
                  type="number"
                  min="1"
                  max="365"
                  onChange={(v) => updateSetting('logging', 'retentionDays', parseInt(v))}
                />
              </>
            )}

            {activeTab === 'security' && settings?.security && (
              <>
                <SettingField
                  label="Session-Dauer (Minuten)"
                  description="Maximale Login-Dauer vor automatischem Logout"
                  value={settings.security.sessionLifetimeMinutes}
                  type="number"
                  min="15"
                  max="1440"
                  onChange={(v) => updateSetting('security', 'sessionLifetimeMinutes', parseInt(v))}
                />
                <SettingField
                  label="Max. Fehlversuche"
                  description="Account nach X Fehlversuchen sperren"
                  value={settings.security.maxFailedLogins}
                  type="number"
                  min="3"
                  max="10"
                  onChange={(v) => updateSetting('security', 'maxFailedLogins', parseInt(v))}
                />
                <SettingField
                  label="Sperrzeit (Minuten)"
                  description="Dauer der Account-Sperre nach Fehlversuchen"
                  value={settings.security.lockoutDurationMinutes}
                  type="number"
                  min="5"
                  max="1440"
                  onChange={(v) => updateSetting('security', 'lockoutDurationMinutes', parseInt(v))}
                />
                <SettingField
                  label="Min. Passwortlänge"
                  description="Mindestlänge für Passwörter"
                  value={settings.security.passwordMinLength}
                  type="number"
                  min="6"
                  max="32"
                  onChange={(v) => updateSetting('security', 'passwordMinLength', parseInt(v))}
                />
                <SettingToggle
                  label="Passwort-Änderung erzwingen"
                  description="Neue Benutzer müssen Passwort beim ersten Login ändern"
                  checked={settings.security.requirePasswordChange}
                  onChange={(v) => updateSetting('security', 'requirePasswordChange', v)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function SettingField({
  label,
  description,
  value,
  type = 'text',
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: string | number;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <label className="block">
        <span className="font-medium">{label}</span>
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
        <input
          type={type}
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
    </div>
  );
}

function SettingTextarea({
  label,
  description,
  value,
  rows = 3,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <label className="block">
        <span className="font-medium">{label}</span>
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
        <textarea
          rows={rows}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </label>
    </div>
  );
}

function SettingSelect({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <label className="block">
        <span className="font-medium">{label}</span>
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-between gap-4">
      <div>
        <span className="font-medium">{label}</span>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

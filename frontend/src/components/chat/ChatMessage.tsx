import { useState } from 'react';
import { User, Copy, Check, ThumbsUp, ThumbsDown, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Source {
  documentId: string;
  documentName: string;
  folderPath: string;
  pageNumber?: number;
  relevanceScore: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'LLM_ONLY' | 'HYBRID' | 'RAG_ONLY';
  sources?: Source[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getModeLabel = (mode?: string) => {
    switch (mode) {
      case 'HYBRID':
        return { label: 'Dokumente + KI', color: 'bg-green-100 text-green-700' };
      case 'RAG_ONLY':
        return { label: 'Nur Dokumente', color: 'bg-blue-100 text-blue-700' };
      case 'LLM_ONLY':
        return { label: 'Allgemeines Wissen', color: 'bg-yellow-100 text-yellow-700' };
      default:
        return null;
    }
  };

  const modeInfo = getModeLabel(message.mode);

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-muted' : 'bg-primary'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-muted-foreground" />
        ) : (
          <span className="text-primary-foreground font-bold text-xs">E</span>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block max-w-full text-left ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2'
              : ''
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Mode Badge & Actions (for assistant messages) */}
        {!isUser && (
          <div className="mt-3 flex items-center flex-wrap gap-2">
            {/* Mode Badge */}
            {modeInfo && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modeInfo.color}`}>
                {modeInfo.label}
              </span>
            )}

            {/* Sources Toggle */}
            {message.sources && message.sources.length > 0 && (
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <FileText size={12} />
                {message.sources.length} Quelle{message.sources.length > 1 ? 'n' : ''}
                {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Kopieren"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => setFeedback('positive')}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${
                  feedback === 'positive' ? 'text-green-500' : ''
                }`}
                title="Hilfreich"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => setFeedback('negative')}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${
                  feedback === 'negative' ? 'text-red-500' : ''
                }`}
                title="Nicht hilfreich"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Sources Panel */}
        {!isUser && showSources && message.sources && message.sources.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Verwendete Quellen:</p>
            {message.sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm p-2 rounded-lg bg-background"
              >
                <FileText size={14} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{source.documentName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {source.folderPath}
                    {source.pageNumber && ` • Seite ${source.pageNumber}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(source.relevanceScore * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


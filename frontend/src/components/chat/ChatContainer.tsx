import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'LLM_ONLY' | 'HYBRID' | 'RAG_ONLY';
  sources?: Source[];
  timestamp: Date;
}

interface Source {
  documentId: string;
  documentName: string;
  folderPath: string;
  pageNumber?: number;
  relevanceScore: number;
}

interface ChatContainerProps {
  onSendMessage: (message: string) => Promise<{
    chatId: string;
    messageId: string;
    content: string;
    mode: string;
    sources?: Source[];
  }>;
  chatId?: string | null;
  isAdmin?: boolean;
}

export default function ChatContainer({ onSendMessage, chatId, isAdmin }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing chat messages if chatId provided
  useEffect(() => {
    if (chatId) {
      loadChat(chatId);
    } else {
      setMessages([]);
    }
  }, [chatId]);

  const loadChat = async (id: string) => {
    try {
      const { userApi } = await import('../../services/api');
      const response = await userApi.getChat(id);
      const loadedMessages = response.data.chat.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role.toLowerCase(),
        content: msg.content,
        mode: msg.mode,
        sources: msg.sources,
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const handleSend = async (message: string) => {
    // Add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await onSendMessage(message);

      // Add assistant message
      const assistantMessage: Message = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        mode: response.mode as Message['mode'],
        sources: response.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Fehler beim Senden der Nachricht');
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Willkommen bei EderGPT
              </h2>
              <p className="text-muted-foreground max-w-md">
                Stellen Sie eine Frage und ich helfe Ihnen, Informationen aus
                Ihren Unternehmensdokumenten zu finden.
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  'Was sind unsere Unternehmensrichtlinien?',
                  'Erkläre mir den Onboarding-Prozess',
                  'Welche IT-Richtlinien gibt es?',
                  'Wie funktioniert die Urlaubsregelung?',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(suggestion)}
                    className="p-3 text-left text-sm rounded-xl border border-border hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">E</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Denkt nach...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isLoading} />
          <p className="text-xs text-center text-muted-foreground mt-2">
            EderGPT kann Fehler machen. Überprüfen Sie wichtige Informationen.
          </p>
        </div>
      </div>
    </div>
  );
}


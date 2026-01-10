import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 p-2 rounded-2xl border border-border bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
        {/* Attachment Button (placeholder) */}
        <button
          type="button"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Datei anhängen (coming soon)"
          disabled
        >
          <Paperclip size={20} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stellen Sie eine Frage..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 py-2 px-1 max-h-[200px] placeholder:text-muted-foreground disabled:opacity-50"
        />

        {/* Voice Button (placeholder) */}
        <button
          type="button"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Spracheingabe (coming soon)"
          disabled
        >
          <Mic size={20} />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
}


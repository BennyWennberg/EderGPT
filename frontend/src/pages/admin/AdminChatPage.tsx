import { useState } from 'react';
import { adminApi } from '../../services/api';
import ChatContainer from '../../components/chat/ChatContainer';

export default function AdminChatPage() {
  const [chatId, setChatId] = useState<string | null>(null);

  const handleSendMessage = async (message: string) => {
    const response = await adminApi.sendAdminMessage(message, chatId || undefined);
    if (!chatId) {
      setChatId(response.data.chatId);
    }
    return response.data;
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-card">
        <div>
          <h1 className="text-lg font-semibold">Admin Test-Chat</h1>
          <p className="text-xs text-muted-foreground">
            Voller Zugriff auf alle Wissensordner
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          Admin-Modus
        </span>
      </div>

      {/* Chat */}
      <ChatContainer onSendMessage={handleSendMessage} isAdmin />
    </div>
  );
}


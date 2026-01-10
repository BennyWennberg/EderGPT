import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userApi } from '../../services/api';
import ChatContainer from '../../components/chat/ChatContainer';

export default function UserChatPage() {
  const { chatId: urlChatId } = useParams();
  const [chatId, setChatId] = useState<string | null>(urlChatId || null);

  useEffect(() => {
    if (urlChatId) {
      setChatId(urlChatId);
    }
  }, [urlChatId]);

  const handleSendMessage = async (message: string) => {
    const response = await userApi.sendMessage(message, chatId || undefined);
    if (!chatId) {
      setChatId(response.data.chatId);
      // Update URL without reload
      window.history.replaceState(null, '', `/chat/${response.data.chatId}`);
    }
    return response.data;
  };

  const handleNewChat = () => {
    setChatId(null);
    window.history.replaceState(null, '', '/chat');
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="font-semibold">EderGPT</h1>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          + Neuer Chat
        </button>
      </div>

      {/* Chat */}
      <ChatContainer 
        onSendMessage={handleSendMessage}
        chatId={chatId}
      />
    </div>
  );
}


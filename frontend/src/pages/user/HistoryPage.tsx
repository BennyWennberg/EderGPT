import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import { Search, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChatHistory {
  id: string;
  title?: string;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function UserHistoryPage() {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await userApi.getHistory();
      setChats(response.data.chats);
    } catch (error) {
      toast.error('Fehler beim Laden des Verlaufs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Chat wirklich löschen?')) return;

    try {
      await userApi.deleteChat(chatId);
      setChats(chats.filter((c) => c.id !== chatId));
      toast.success('Chat gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.title?.toLowerCase().includes(search.toLowerCase()) ||
      chat.preview?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="h-14 border-b border-border px-6 flex items-center bg-card/50 backdrop-blur-sm">
        <h1 className="font-semibold">Chat-Verlauf</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Chats durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Chats List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>Keine Chats gefunden</p>
          </div>
        ) : (
          <div className="grid gap-3 max-w-2xl">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {chat.title || 'Unbenannter Chat'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {chat.preview}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{chat.messageCount} Nachrichten</span>
                      <span>
                        {new Date(chat.updatedAt).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


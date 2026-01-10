import { useEffect, useState } from 'react';
import { userApi } from '../../services/api';
import { User, FolderTree, MessageSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role: string;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  knowledgeMode: string;
}

interface Stats {
  totalChats: number;
  totalMessages: number;
  feedbackGiven: number;
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        userApi.getProfile(),
        userApi.getStats(),
      ]);
      setProfile(profileRes.data.profile);
      setFolders(profileRes.data.accessibleFolders);
      setStats(statsRes.data.stats);
    } catch (error) {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="h-14 border-b border-border px-6 flex items-center bg-card/50 backdrop-blur-sm">
        <h1 className="font-semibold">Mein Profil</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <p className="text-muted-foreground">@{profile?.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">E-Mail</label>
                <p className="font-medium">{profile?.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Abteilung</label>
                <p className="font-medium">{profile?.department || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Rolle</label>
                <p className="font-medium">{profile?.role}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Mitglied seit</label>
                <p className="font-medium">
                  {profile?.createdAt && new Date(profile.createdAt).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <MessageSquare size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats?.totalChats || 0}</p>
              <p className="text-sm text-muted-foreground">Chats</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <MessageSquare size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats?.totalMessages || 0}</p>
              <p className="text-sm text-muted-foreground">Fragen</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <FolderTree size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{folders.length}</p>
              <p className="text-sm text-muted-foreground">Wissensordner</p>
            </div>
          </div>

          {/* Accessible Folders */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FolderTree size={20} />
              Meine Wissensordner
            </h3>
            <div className="space-y-2">
              {folders.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Keine Ordner zugewiesen
                </p>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">{folder.path}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      {folder.knowledgeMode}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


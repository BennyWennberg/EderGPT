import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import {
  Users,
  FolderTree,
  FileText,
  MessageSquare,
  Activity,
  TrendingUp,
} from 'lucide-react';

interface DashboardData {
  stats: {
    users: number;
    folders: number;
    documents: number;
    chats: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user?: { username: string };
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await adminApi.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Aktive Benutzer', value: data?.stats.users || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Wissensordner', value: data?.stats.folders || 0, icon: FolderTree, color: 'bg-green-500' },
    { label: 'Dokumente', value: data?.stats.documents || 0, icon: FileText, color: 'bg-purple-500' },
    { label: 'Chats', value: data?.stats.chats || 0, icon: MessageSquare, color: 'bg-orange-500' },
  ];

  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen im Admin-Bereich von EderGPT
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Letzte Aktivitäten</h2>
          </div>
          <div className="space-y-3">
            {data?.recentActivity?.length ? (
              data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user?.username || 'System'} • {activity.entityType}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString('de-DE')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Keine Aktivitäten</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Schnellaktionen</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/admin/users"
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
            >
              <Users size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Benutzer verwalten</p>
            </a>
            <a
              href="/admin/knowledge"
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
            >
              <FolderTree size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Wissen verwalten</p>
            </a>
            <a
              href="/admin/settings"
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
            >
              <Activity size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Einstellungen</p>
            </a>
            <a
              href="/admin/chat"
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center"
            >
              <MessageSquare size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Test-Chat</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


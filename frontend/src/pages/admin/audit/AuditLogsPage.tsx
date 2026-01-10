import { useEffect, useState } from 'react';
import { adminApi } from '../../../services/api';
import { Download, Loader2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  user?: {
    username: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const loadLogs = async () => {
    try {
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;

      const response = await adminApi.getAuditLogs(params);
      setLogs(response.data.logs);
    } catch (error) {
      toast.error('Fehler beim Laden der Logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminApi.exportAuditLogs({ format: 'csv' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Fehler beim Export');
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit-Logs</h1>
          <p className="text-muted-foreground">
            Alle Systemaktivitäten protokolliert
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <Download size={18} />
          Exportieren
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="">Alle Aktionen</option>
            <option value="LOGIN">Login</option>
            <option value="USER_CREATE">User erstellt</option>
            <option value="USER_UPDATE">User aktualisiert</option>
            <option value="DOCUMENT_UPLOAD">Dokument hochgeladen</option>
            <option value="SETTINGS_UPDATE">Einstellungen geändert</option>
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="">Alle Entitäten</option>
            <option value="AUTH">Auth</option>
            <option value="USER">User</option>
            <option value="FOLDER">Folder</option>
            <option value="DOCUMENT">Document</option>
            <option value="SETTINGS">Settings</option>
            <option value="CHAT">Chat</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Zeitstempel
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Benutzer
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Aktion
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Entität
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    {new Date(log.createdAt).toLocaleString('de-DE')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium">
                      {log.user?.username || 'System'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {log.entityType}
                    {log.entityId && (
                      <span className="text-muted-foreground"> ({log.entityId.slice(0, 8)}...)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {log.details ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {JSON.stringify(log.details).slice(0, 50)}...
                      </code>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


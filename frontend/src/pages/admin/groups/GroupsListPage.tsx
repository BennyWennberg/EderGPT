import { useEffect, useState } from 'react';
import { adminApi } from '../../../services/api';
import { Plus, Users, FolderTree, Loader2, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description?: string;
  _count: {
    users: number;
    folders: number;
  };
}

export default function GroupsListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await adminApi.getGroups();
      setGroups(response.data.groups);
    } catch (error) {
      toast.error('Fehler beim Laden der Gruppen');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name) {
      toast.error('Gruppenname ist erforderlich');
      return;
    }
    
    setCreating(true);
    try {
      await adminApi.createGroup(newGroup);
      toast.success('Gruppe erfolgreich erstellt');
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '' });
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Gruppe "${name}" wirklich löschen?`)) return;
    
    try {
      await adminApi.deleteGroup(id);
      toast.success('Gruppe gelöscht');
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gruppen</h1>
          <p className="text-muted-foreground">
            Gruppen für Ordner-Berechtigungen verwalten
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Gruppe erstellen
        </button>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>Keine Gruppen vorhanden</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-primary hover:underline"
          >
            Erste Gruppe erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold mb-2">{group.name}</h3>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {group.description || 'Keine Beschreibung'}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{group._count.users} Benutzer</span>
                </div>
                <div className="flex items-center gap-1">
                  <FolderTree size={16} />
                  <span>{group._count.folders} Ordner</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Neue Gruppe erstellen</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gruppenname *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  placeholder="z.B. Vertrieb, IT, HR"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Beschreibung</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={3}
                  placeholder="Optionale Beschreibung der Gruppe"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-input hover:bg-muted"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? 'Erstelle...' : 'Gruppe erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

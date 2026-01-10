import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../../services/api';
import { ArrowLeft, Save, Trash2, Loader2, Key, Edit2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserDetail {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role: string;
  status: string;
  folders: Array<{ folder: { id: string; name: string; path: string } }>;
  groups: Array<{ group: { id: string; name: string } }>;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface Group {
  id: string;
  name: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    role: '',
    status: '',
  });
  
  // Password reset
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [userRes, foldersRes, groupsRes] = await Promise.all([
        adminApi.getUser(id!),
        adminApi.getFolders(true),
        adminApi.getGroups(),
      ]);
      const userData = userRes.data.user;
      setUser(userData);
      setAllFolders(foldersRes.data.folders);
      setAllGroups(groupsRes.data.groups || []);
      setSelectedFolders(userData.folders?.map((f: any) => f.folder.id) || []);
      setSelectedGroups(userData.groups?.map((g: any) => g.group.id) || []);
      setEditData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        department: userData.department || '',
        role: userData.role,
        status: userData.status,
      });
    } catch (error) {
      toast.error('Fehler beim Laden');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      await adminApi.updateUser(id!, editData);
      setUser((prev) => prev ? { ...prev, ...editData } : null);
      setIsEditing(false);
      toast.success('Benutzer aktualisiert');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFolders = async () => {
    setSaving(true);
    try {
      await adminApi.updateUserFolders(id!, selectedFolders);
      toast.success('Ordnerzuweisungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroups = async () => {
    setSaving(true);
    try {
      await adminApi.updateUserGroups(id!, selectedGroups);
      toast.success('Gruppenzuweisungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen haben');
      return;
    }

    setResettingPassword(true);
    try {
      await adminApi.updateUser(id!, { password: newPassword });
      toast.success('Passwort wurde zurückgesetzt');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Zurücksetzen');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm('Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      await adminApi.deleteUser(id!);
      toast.success('Benutzer gelöscht');
      navigate('/admin/users');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-muted-foreground">
            {user.firstName} {user.lastName} {user.department ? `• ${user.department}` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <Key size={18} />
          Passwort zurücksetzen
        </button>
        <button
          onClick={handleDeleteUser}
          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Benutzerinformationen</h2>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={saving}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Vorname</label>
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Nachname</label>
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">E-Mail</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Abteilung</label>
                <input
                  type="text"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Rolle</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="USER">Benutzer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super-Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ACTIVE">Aktiv</option>
                  <option value="INACTIVE">Inaktiv</option>
                  <option value="LOCKED">Gesperrt</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Username</label>
                <p className="font-medium">{user.username}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="font-medium">{user.firstName || '-'} {user.lastName || ''}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">E-Mail</label>
                <p className="font-medium">{user.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Abteilung</label>
                <p className="font-medium">{user.department || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Rolle</label>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  user.status === 'LOCKED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Folder Assignment */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Wissensordner</h2>
            <button
              onClick={handleSaveFolders}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Speichern
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Wählen Sie die Ordner aus, auf die dieser Benutzer Zugriff haben soll.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allFolders.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Keine Ordner vorhanden</p>
            ) : (
              allFolders.map((folder) => (
                <label
                  key={folder.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFolders.includes(folder.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFolders([...selectedFolders, folder.id]);
                      } else {
                        setSelectedFolders(selectedFolders.filter((f) => f !== folder.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-input accent-primary"
                  />
                  <div>
                    <p className="font-medium">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{folder.path}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Group Assignment */}
        <div className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Gruppen</h2>
            <button
              onClick={handleSaveGroups}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Speichern
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Benutzer erbt auch Ordnerberechtigungen der zugewiesenen Gruppen.
          </p>
          <div className="flex flex-wrap gap-2">
            {allGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Keine Gruppen vorhanden</p>
            ) : (
              allGroups.map((group) => (
                <label
                  key={group.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedGroups.includes(group.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups([...selectedGroups, group.id]);
                      } else {
                        setSelectedGroups(selectedGroups.filter((g) => g !== group.id));
                      }
                    }}
                    className="sr-only"
                  />
                  <span className="font-medium">{group.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Passwort zurücksetzen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Setzen Sie ein neues Passwort für {user.username}.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Neues Passwort</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword || !newPassword || !confirmPassword}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {resettingPassword ? (
                  <Loader2 size={18} className="animate-spin mx-auto" />
                ) : (
                  'Zurücksetzen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

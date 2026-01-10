import { useState } from 'react';
import { adminApi } from '../../../services/api';
import { X, Loader2, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateFolderModalProps {
  onClose: () => void;
  onFolderCreated: () => void;
  parentFolderId?: string;
}

export default function CreateFolderModal({ onClose, onFolderCreated, parentFolderId }: CreateFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    description: '',
    knowledgeMode: 'HYBRID',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Ordnername ist erforderlich');
      return;
    }
    if (!formData.path.trim()) {
      toast.error('Pfad ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      await adminApi.createFolder({
        ...formData,
        parentId: parentFolderId,
      });
      toast.success('Ordner erstellt');
      onFolderCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate path from name
  const handleNameChange = (name: string) => {
    const path = '/' + name.toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, name, path: formData.path || path });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderPlus size={20} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Neuer Ordner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Ordnername <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="z.B. HR-Dokumente"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Pfad <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              placeholder="/hr-dokumente"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Eindeutiger Pfad zur Identifikation
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optionale Beschreibung des Ordners..."
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Wissensmodus</label>
            <select
              value={formData.knowledgeMode}
              onChange={(e) => setFormData({ ...formData, knowledgeMode: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="HYBRID">Hybrid (Dokumente + LLM)</option>
              <option value="RAG_ONLY">Nur Dokumente</option>
              <option value="LLM_ONLY">Nur LLM</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Wie Chat-Antworten aus diesem Ordner generiert werden
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Erstellen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


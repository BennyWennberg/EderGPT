import { useEffect, useState, useRef } from 'react';
import { adminApi } from '../../../services/api';
import {
  FolderTree,
  Plus,
  Upload,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Folder {
  id: string;
  name: string;
  path: string;
  description?: string;
  knowledgeMode: string;
  status: string;
  children?: Folder[];
  _count?: { documents: number };
}

interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: '', path: '', description: '', knowledgeMode: 'HYBRID' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadDocuments(selectedFolder.id);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      const response = await adminApi.getFolders();
      setFolders(response.data.folders);
    } catch (error) {
      toast.error('Fehler beim Laden der Ordner');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (folderId: string) => {
    try {
      const response = await adminApi.getDocuments({ folderId });
      setDocuments(response.data.documents);
    } catch (error) {
      toast.error('Fehler beim Laden der Dokumente');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolder.name || !newFolder.path) {
      toast.error('Name und Pfad sind erforderlich');
      return;
    }
    
    setCreating(true);
    try {
      await adminApi.createFolder(newFolder);
      toast.success('Ordner erfolgreich erstellt');
      setShowCreateFolderModal(false);
      setNewFolder({ name: '', path: '', description: '', knowledgeMode: 'HYBRID' });
      loadFolders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setCreating(false);
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    if (!selectedFolder) return;
    
    setUploading(true);
    try {
      const fileArray = Array.from(files);
      await adminApi.uploadDocuments(selectedFolder.id, fileArray);
      toast.success(`${fileArray.length} Dokument(e) hochgeladen`);
      setShowUploadModal(false);
      loadDocuments(selectedFolder.id);
      loadFolders(); // Refresh counts
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Dokument "${docName}" wirklich löschen?`)) return;
    
    try {
      await adminApi.deleteDocument(docId);
      toast.success('Dokument gelöscht');
      if (selectedFolder) loadDocuments(selectedFolder.id);
      loadFolders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleReindexDocument = async (docId: string) => {
    try {
      await adminApi.reindexDocument(docId);
      toast.success('Dokument wird neu indexiert');
      if (selectedFolder) loadDocuments(selectedFolder.id);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Reindexieren');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Ordner "${folderName}" und alle Dokumente wirklich löschen?`)) return;
    
    try {
      await adminApi.deleteFolder(folderId);
      toast.success('Ordner gelöscht');
      if (selectedFolder?.id === folderId) setSelectedFolder(null);
      loadFolders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => setSelectedFolder(folder)}
        >
          {folder.children && folder.children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <FolderTree size={18} />
          <span className="flex-1 truncate">{folder.name}</span>
          {folder._count && (
            <span className="text-xs text-muted-foreground">
              {folder._count.documents}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteFolder(folder.id, folder.name);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {isExpanded &&
          folder.children?.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INDEXED':
        return 'bg-green-100 text-green-700';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-700';
      case 'PENDING':
        return 'bg-gray-100 text-gray-700';
      case 'ERROR':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Folder Tree */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Wissensordner</h2>
            <button 
              onClick={() => setShowCreateFolderModal(true)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Neuen Ordner erstellen"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Ordner vorhanden</p>
              <button 
                onClick={() => setShowCreateFolderModal(true)}
                className="mt-2 text-primary text-sm hover:underline"
              >
                Ersten Ordner erstellen
              </button>
            </div>
          ) : (
            folders.map((folder) => renderFolder(folder))
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFolder ? (
          <>
            {/* Folder Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{selectedFolder.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedFolder.path}
                  </p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Upload size={18} />
                  Dokumente hochladen
                </button>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                  {selectedFolder.knowledgeMode}
                </span>
                <span className="text-sm text-muted-foreground">
                  {documents.length} Dokumente
                </span>
              </div>
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto p-6">
              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Keine Dokumente in diesem Ordner</p>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 text-primary hover:underline"
                  >
                    Dokumente hochladen
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <FileText size={20} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.fileType.toUpperCase()} • {formatFileSize(doc.fileSize || 0)} •{' '}
                          {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(doc.status)}`}
                      >
                        {doc.status}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReindexDocument(doc.id)}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Neu indexieren"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FolderTree size={48} className="mx-auto mb-4 opacity-50" />
              <p>Wählen Sie einen Ordner aus</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Neuen Ordner erstellen</h2>
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ordnername *</label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  placeholder="z.B. Human Resources"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pfad *</label>
                <input
                  type="text"
                  value={newFolder.path}
                  onChange={(e) => setNewFolder({ ...newFolder, path: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  placeholder="z.B. /hr oder /legal/contracts"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Beschreibung</label>
                <textarea
                  value={newFolder.description}
                  onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={2}
                  placeholder="Optionale Beschreibung"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wissensmodus</label>
                <select
                  value={newFolder.knowledgeMode}
                  onChange={(e) => setNewFolder({ ...newFolder, knowledgeMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="HYBRID">Hybrid (Dokumente + LLM)</option>
                  <option value="RAG_ONLY">Nur Dokumente</option>
                  <option value="LLM_ONLY">Nur LLM</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 rounded-lg border border-input hover:bg-muted"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? 'Erstelle...' : 'Ordner erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Dokumente hochladen</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Ordner: <span className="font-medium text-foreground">{selectedFolder.name}</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
                className="hidden"
                onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {uploading ? (
                  <Loader2 size={32} className="mx-auto mb-2 animate-spin text-primary" />
                ) : (
                  <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                )}
                <p className="font-medium">
                  {uploading ? 'Wird hochgeladen...' : 'Dateien auswählen'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, DOCX, PPTX, TXT, MD
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-input hover:bg-muted"
                  disabled={uploading}
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

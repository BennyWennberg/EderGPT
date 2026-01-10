import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is already set in auth store
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API helper functions
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // Users
  getUsers: (params?: Record<string, string>) =>
    api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (data: Record<string, unknown>) =>
    api.post('/admin/users', data),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  updateUserFolders: (id: string, folderIds: string[]) =>
    api.put(`/admin/users/${id}/folders`, { folderIds }),
  updateUserGroups: (id: string, groupIds: string[]) =>
    api.put(`/admin/users/${id}/groups`, { groupIds }),

  // Groups
  getGroups: () => api.get('/admin/groups'),
  getGroup: (id: string) => api.get(`/admin/groups/${id}`),
  createGroup: (data: Record<string, unknown>) =>
    api.post('/admin/groups', data),
  updateGroup: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/admin/groups/${id}`),

  // Knowledge
  getFolders: (flat?: boolean) =>
    api.get('/admin/knowledge/folders', { params: { flat } }),
  getFolder: (id: string) => api.get(`/admin/knowledge/folders/${id}`),
  createFolder: (data: Record<string, unknown>) =>
    api.post('/admin/knowledge/folders', data),
  updateFolder: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/knowledge/folders/${id}`, data),
  deleteFolder: (id: string) => api.delete(`/admin/knowledge/folders/${id}`),
  getDocuments: (params?: Record<string, string>) =>
    api.get('/admin/knowledge/documents', { params }),
  uploadDocuments: (folderId: string, files: File[]) => {
    const formData = new FormData();
    formData.append('folderId', folderId);
    files.forEach((file) => formData.append('files', file));
    return api.post('/admin/knowledge/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDocument: (id: string) =>
    api.delete(`/admin/knowledge/documents/${id}`),
  reindexDocument: (id: string) =>
    api.post(`/admin/knowledge/documents/${id}/reindex`),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings: Record<string, unknown>) =>
    api.put('/admin/settings', { settings }),
  updateSettingsSection: (section: string, data: Record<string, unknown>) =>
    api.put(`/admin/settings/${section}`, data),

  // Prompts
  getPrompts: () => api.get('/admin/prompts'),
  updatePrompt: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/prompts/${id}`, data),

  // Audit
  getAuditLogs: (params?: Record<string, string>) =>
    api.get('/admin/audit', { params }),
  exportAuditLogs: (params?: Record<string, string>) =>
    api.get('/admin/audit/export', { params, responseType: 'blob' }),

  // Analytics
  getAnalyticsOverview: () => api.get('/admin/analytics/overview'),
  getAnalyticsUsage: (period?: string) =>
    api.get('/admin/analytics/usage', { params: { period } }),

  // Admin Chat
  sendAdminMessage: (message: string, chatId?: string) =>
    api.post('/admin/chat/message', { message, chatId }),
  previewUserChat: (userId: string, message: string, chatId?: string) =>
    api.post('/admin/chat/preview', { userId, message, chatId }),
};

export const userApi = {
  // Chat
  sendMessage: (message: string, chatId?: string) =>
    api.post('/user/chat/message', { message, chatId }),
  newChat: (title?: string) => api.post('/user/chat/new', { title }),
  getChat: (chatId: string) => api.get(`/user/chat/${chatId}`),
  updateChat: (chatId: string, data: Record<string, unknown>) =>
    api.put(`/user/chat/${chatId}`, data),
  deleteChat: (chatId: string) => api.delete(`/user/chat/${chatId}`),
  submitFeedback: (chatId: string, messageId: string, feedback: string, comment?: string) =>
    api.post(`/user/chat/${chatId}/feedback`, { messageId, feedback, comment }),

  // History
  getHistory: (params?: Record<string, string>) =>
    api.get('/user/history', { params }),
  searchHistory: (query: string) =>
    api.get('/user/history/search', { params: { q: query } }),
  exportHistory: (chatIds?: string[], format?: string) =>
    api.post('/user/history/export', { chatIds, format }, { responseType: 'blob' }),

  // Profile
  getProfile: () => api.get('/user/profile'),
  getStats: () => api.get('/user/profile/stats'),
};

export default api;


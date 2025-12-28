// API utilities
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'https://auth.perumaniacup.info';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Custom error class with additional context
class APIError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'APIError';
    this.endpoint = details.endpoint || null;
    this.status = details.status || null;
    this.statusText = details.statusText || null;
    this.responseBody = details.responseBody || null;
  }
}

// Global error handler - can be set by ErrorProvider
let globalErrorHandler = null;

export const setGlobalErrorHandler = (handler) => {
  globalErrorHandler = handler;
};

export const api = {
  // Auth
  login: () => {
    window.location.href = `${AUTH_URL}/auth/login`;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  getToken: () => localStorage.getItem('auth_token'),

  setToken: (token) => localStorage.setItem('auth_token', token),

  // Generic fetch with auth
  fetch: async (endpoint, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => ({ detail: 'Request failed' }));
        const error = new APIError(
          responseBody.detail || responseBody.message || `Request failed: ${response.status}`,
          {
            endpoint: `${options.method || 'GET'} ${endpoint}`,
            status: response.status,
            statusText: response.statusText,
            responseBody,
          }
        );

        // Call global error handler if set
        if (globalErrorHandler) {
          globalErrorHandler(error);
        }

        throw error;
      }

      return response.json();
    } catch (err) {
      // If it's already an APIError, rethrow
      if (err instanceof APIError) {
        throw err;
      }

      // Network or other errors
      const error = new APIError(
        err.message || 'Network error',
        {
          endpoint: `${options.method || 'GET'} ${endpoint}`,
          status: null,
          statusText: 'Network Error',
          responseBody: null,
        }
      );

      // Call global error handler if set
      if (globalErrorHandler) {
        globalErrorHandler(error);
      }

      throw error;
    }
  },

  // Auth endpoints
  getMe: () => api.fetch('/auth/me'),

  // Tournament
  getTournamentStatus: () => api.fetch('/tournament/status'),
  getRegistrations: () => api.fetch('/tournament/registrations'),
  register: (discordUsername) => api.fetch('/tournament/register', {
    method: 'POST',
    body: JSON.stringify({ discord_username: discordUsername }),
  }),
  unregister: () => api.fetch('/tournament/register', { method: 'DELETE' }),

  // Brackets
  getBrackets: () => api.fetch('/brackets'),
  getBracket: (id) => api.fetch(`/brackets/${id}`),
  getBracketMatches: (id) => api.fetch(`/brackets/${id}/matches`),

  // Matches
  getMatches: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.fetch(`/matches${query ? '?' + query : ''}`);
  },
  getMatch: (id) => api.fetch(`/matches/${id}`),

  // Users
  getRegisteredPlayers: () => api.fetch('/users/registered'),
  getAllUsers: () => api.fetch('/users/all'),

  // Maps
  getMaps: () => api.fetch('/maps'),

  // Timeline
  getTimeline: () => api.fetch('/timeline'),
  updateTimeline: (events) => api.fetch('/timeline', {
    method: 'PUT',
    body: JSON.stringify(events),
  }),
  addTimelineEvent: (data) => api.fetch('/timeline', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteTimelineEvent: (eventId) => api.fetch(`/timeline/${eventId}`, {
    method: 'DELETE',
  }),

  // News
  getNews: () => api.fetch('/news'),
  updateNews: (items) => api.fetch('/news', {
    method: 'PUT',
    body: JSON.stringify(items),
  }),
  addNewsItem: (data) => api.fetch('/news', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteNewsItem: (itemId) => api.fetch(`/news/${itemId}`, {
    method: 'DELETE',
  }),

  // Notifications
  getNotifications: (unreadOnly = false) =>
    api.fetch(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  markNotificationRead: (id) => api.fetch(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Mappools
  getMappools: () => api.fetch('/mappools'),
  getMappoolsAdmin: () => api.fetch('/mappools/all'),
  getMappool: (id) => api.fetch(`/mappools/${id}`),
  lookupBeatmap: (beatmapId) => api.fetch(`/mappools/lookup/${beatmapId}`),
  lookupBeatmapset: (beatmapsetId) => api.fetch(`/mappools/lookup-set/${beatmapsetId}`),
  createMappool: (data) => api.fetch('/mappools', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMappool: (id, data) => api.fetch(`/mappools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteMappool: (id) => api.fetch(`/mappools/${id}`, {
    method: 'DELETE',
  }),
  addMapToPool: (poolId, data) => api.fetch(`/mappools/${poolId}/maps`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePoolMap: (mapId, data) => api.fetch(`/mappools/maps/${mapId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePoolMap: (mapId) => api.fetch(`/mappools/maps/${mapId}`, {
    method: 'DELETE',
  }),

  // Slots
  getSlots: () => api.fetch('/slots'),
  createSlot: (data) => api.fetch('/slots', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSlot: (id, data) => api.fetch(`/slots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSlot: (id) => api.fetch(`/slots/${id}`, {
    method: 'DELETE',
  }),
  seedSlots: () => api.fetch('/slots/seed', {
    method: 'POST',
  }),
};

// API utilities
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'https://auth.perumaniacup.info';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  },

  // Auth endpoints
  getMe: () => api.fetch('/auth/me'),

  // Tournament
  getTournamentStatus: () => api.fetch('/tournament/status'),
  getRegistrations: () => api.fetch('/tournament/registrations'),
  register: () => api.fetch('/tournament/register', { method: 'POST' }),
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

  // Notifications
  getNotifications: (unreadOnly = false) =>
    api.fetch(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  markNotificationRead: (id) => api.fetch(`/notifications/${id}/read`, { method: 'PATCH' }),
};

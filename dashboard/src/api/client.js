import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const api = {
  // Auth
  login: (data) => client.post('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.put('/auth/change-password', data),

  // Stats
  statsOverview: () => client.get('/stats/overview'),
  usersGrowth: () => client.get('/stats/users-growth'),
  postsByPlatform: () => client.get('/stats/posts-by-platform'),
  postsTimeline: () => client.get('/stats/posts-timeline'),
  rewardsSummary: () => client.get('/stats/rewards-summary'),

  // Users
  getUsers: (params) => client.get('/users', { params }),
  getUser: (id) => client.get(`/users/${id}`),
  banUser: (id, data) => client.post(`/users/${id}/ban`, data),
  unbanUser: (id) => client.post(`/users/${id}/unban`),
  updatePoints: (id, data) => client.put(`/users/${id}/points`, data),

  // Channels
  getChannels: () => client.get('/channels'),
  createChannel: (data) => client.post('/channels', data),
  updateChannel: (id, data) => client.put(`/channels/${id}`, data),
  deleteChannel: (id) => client.delete(`/channels/${id}`),

  // Posts
  getPosts: (params) => client.get('/posts', { params }),
  getPost: (id) => client.get(`/posts/${id}`),
  createPost: (data) => client.post('/posts', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  updatePost: (id, data) => client.put(`/posts/${id}`, data),
  publishPost: (id) => client.post(`/posts/${id}/publish`),
  deletePost: (id) => client.delete(`/posts/${id}`),

  // Rewards
  getRewards: () => client.get('/rewards'),
  createReward: (data) => client.post('/rewards', data),
  updateReward: (id, data) => client.put(`/rewards/${id}`, data),
  deleteReward: (id) => client.delete(`/rewards/${id}`),
  getLeaderboard: () => client.get('/rewards/leaderboard'),

  // Tickets
  getTickets: (params) => client.get('/tickets', { params }),
  getTicket: (id) => client.get(`/tickets/${id}`),
  replyTicket: (id, data) => client.post(`/tickets/${id}/reply`, data),
  updateTicketStatus: (id, data) => client.put(`/tickets/${id}/status`, data),

  // Settings
  getSettings: () => client.get('/settings'),
  updateSettings: (data) => client.put('/settings', data),

  // Logs
  getLogs: (params) => client.get('/logs', { params }),
  clearLogs: (data) => client.delete('/logs/clear', { data }),

  // Notifications
  broadcast: (data) => client.post('/notifications/broadcast', data),

  // Platform status
  getPlatformStatus: () => client.get('/platforms/status'),
};

export default client;

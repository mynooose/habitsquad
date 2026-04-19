const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = null;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Something went wrong');
      error.status = response.status;
      throw error;
    }

    return data;
  }

  // Auth
  async register(email, password, name) {
    const data = await this.request('/auth/register', { method: 'POST', body: { email, password, name } });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', { method: 'POST', body: { email, password } });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  async uploadImage(dataUrl, prefix = 'uploads') {
    return this.request('/upload', { method: 'POST', body: { dataUrl, prefix } });
  }

  async updateProfile(data) {
    return this.request('/auth/me', { method: 'PUT', body: data });
  }

  // Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data) {
    return this.request('/tasks', { method: 'POST', body: data });
  }

  async updateTask(id, data) {
    return this.request(`/tasks/${id}`, { method: 'PUT', body: data });
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async completeTask(id, date = null, proofUrl = null) {
    return this.request(`/tasks/${id}/complete`, { method: 'POST', body: { date, proofUrl } });
  }

  async uncompleteTask(id, date = null) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/tasks/${id}/complete${query}`, { method: 'DELETE' });
  }

  // Stats
  async getDailyStats(date = null) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/stats/daily${query}`);
  }

  async getStreak() {
    return this.request('/stats/streak');
  }

  async getOverview() {
    return this.request('/stats/overview');
  }

  // Completions
  async getCalendar(year, month) {
    return this.request(`/completions/calendar?year=${year}&month=${month}`);
  }

  // Groups
  async getGroups() {
    return this.request('/groups');
  }

  async createGroup(data) {
    return this.request('/groups', { method: 'POST', body: data });
  }

  async getGroup(id) {
    return this.request(`/groups/${id}`);
  }

  async updateGroup(id, data) {
    return this.request(`/groups/${id}`, { method: 'PUT', body: data });
  }

  async joinGroup(inviteCode) {
    return this.request('/groups/join', { method: 'POST', body: { inviteCode } });
  }

  async leaveGroup(id) {
    return this.request(`/groups/${id}/leave`, { method: 'DELETE' });
  }

  async getTaskBudget(groupId = null) {
    const param = groupId || 'personal';
    return this.request(`/tasks/budget?groupId=${param}`);
  }

  async getMemberTasks(groupId) {
    return this.request(`/groups/${groupId}/member-tasks`);
  }

  async getDashboardStats() {
    return this.request('/stats/dashboard');
  }

  async getDashboardRankings() {
    return this.request('/stats/rankings');
  }

  async getLeaderboard(groupId, period = 'week') {
    return this.request(`/groups/${groupId}/leaderboard?period=${period}`);
  }

  async inviteToGroup(groupId, data) {
    return this.request(`/groups/${groupId}/invite`, { method: 'POST', body: data });
  }

  async cancelInvite(groupId, inviteId) {
    return this.request(`/groups/${groupId}/invite/${inviteId}`, { method: 'DELETE' });
  }

  async removeMember(groupId, userId) {
    return this.request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  }

  // Users
  async searchUsers(query, excludeGroupId = null) {
    const params = new URLSearchParams({ q: query });
    if (excludeGroupId) params.append('excludeGroupId', excludeGroupId);
    return this.request(`/users/search?${params}`);
  }
}

export const api = new ApiClient();
export default api;

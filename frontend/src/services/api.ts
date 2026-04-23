import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 50000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to all requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Redirect to login on expired/invalid token — but NOT for the login call
    // itself (that 401 means "wrong credentials" and the LoginPage shows it),
    // and not if we're already on the login page.
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const requestUrl: string = error.config?.url || '';
        const isLoginRequest = requestUrl.includes('/auth/login');
        const alreadyOnLoginPage = window.location.pathname === '/login';

        if (
          error.response?.status === 401 &&
          !isLoginRequest &&
          !alreadyOnLoginPage
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('role');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  login(username: string, password: string) {
    return this.api.post('/auth/login', { username, password });
  }

  register(
    username: string,
    email: string,
    password: string,
    role: 'admin' | 'judge',
    name?: string,
    assignedCategories?: string[]
  ) {
    return this.api.post('/auth/register', {
      username,
      email,
      password,
      role,
      name,
      assignedCategories,
    });
  }

  getJudges() {
    return this.api.get('/auth/judges');
  }

  updateJudgeAssignments(judgeId: string, assignedCategories: string[]) {
    return this.api.put(`/auth/judges/${judgeId}/assignments`, {
      assignedCategories,
    });
  }

  updateJudgeName(judgeId: string, name: string) {
    return this.api.put(`/auth/judges/${judgeId}/name`, { name });
  }

  updateJudgeUsername(judgeId: string, username: string) {
    return this.api.put(`/auth/judges/${judgeId}/username`, { username });
  }

  deleteJudge(judgeId: string) {
    return this.api.delete(`/auth/judges/${judgeId}`);
  }

  addJudge(username: string, password: string, name: string, email: string, assignedCategories: string[]) {
    return this.api.post('/auth/judges', {
      username,
      password,
      name,
      email,
      assignedCategories,
    });
  }

  getJudgeProfile() {
    return this.api.get('/auth/judge/profile');
  }

  getAllUsers() {
    return this.api.get('/auth/users');
  }

  createUser(userData: { username: string; email: string; password: string; role: string; name?: string; assignedCategories?: string[] }) {
    return this.api.post('/auth/users', userData);
  }

  updateUserCredentials(userId: string, username?: string, password?: string) {
    return this.api.put(`/auth/users/${userId}/credentials`, {
      username,
      password,
    });
  }

  // Entry endpoints
  uploadEntries(categoryCode: string, entries: Array<{ participant1Name: string; participant2Name?: string }>) {
    return this.api.post('/entries/upload', { categoryCode, entries });
  }

  getEntriesByCategory(categoryCode: string) {
    return this.api.get(`/entries/category/${categoryCode}`);
  }

  updateEntry(entryId: string, categoryCode: string, entryNumber: number, participant1Name: string, participant2Name?: string) {
    return this.api.put(`/entries/${entryId}`, {
      categoryCode,
      entryNumber,
      participant1Name,
      participant2Name,
    });
  }

  deleteEntry(entryId: string) {
    return this.api.delete(`/entries/${entryId}`);
  }

  // Score endpoints
  submitScore(
    entryId: string,
    costumAndImpression: number,
    movementsAndRhythm: number,
    postureAndMudra: number
  ) {
    return this.api.post('/scores/submit', {
      entryId,
      costumAndImpression,
      movementsAndRhythm,
      postureAndMudra,
    });
  }

  getJudgeCategories() {
    return this.api.get('/scores/judge/categories');
  }

  getEntriesForJudge(categoryCode: string) {
    return this.api.get(`/scores/judge/category/${categoryCode}`);
  }

  getScoresByCategory(categoryCode: string) {
    return this.api.get(`/scores/category/${categoryCode}`);
  }

  // Admin endpoints
  exportDatabase() {
    return this.api.get('/admin/export');
  }

  importDatabase(payload: any) {
    return this.api.post('/admin/import', payload);
  }
}

const apiService = new ApiService();
export default apiService;

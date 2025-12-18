import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

export const getStats = () => api.get('/stats');
export const getDocuments = (page = 1, limit = 15, search = '') => api.get(`/documents?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
export const getChunks = (filename) => api.get(`/chunks/${filename}`);
export const updateChunk = (id, data) => api.put(`/chunks/${id}`, data);
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data);
export const login = (credentials) => api.post('/login', credentials);
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);

// Add auth header
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;

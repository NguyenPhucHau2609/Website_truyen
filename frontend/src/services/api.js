import axios from 'axios';

const API_URL = 'http://localhost:8080/api';
export const API_HOST = API_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.accessToken) {
    config.headers.Authorization = `Bearer ${user.accessToken}`;
  }
  return config;
});

// Auth
export const login = (username, password) => api.post('/auth/signin', { username, password });
export const register = (username, email, password) => api.post('/auth/signup', { username, email, password });

export const googleLogin = (credential) => api.post('/auth/google', { credential });

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });


// Stories
export const getStories = () => api.get('/stories');
export const getStory = (id) => api.get(`/stories/${id}`);
export const searchStories = (params) => api.get('/stories/search', { params });
export const getTrendingStories = (limit = 10) => api.get('/stories/trending', { params: { limit } });
export const getNewReleases = (limit = 10) => api.get('/stories/new-releases', { params: { limit } });
export const getRecommendations = (userId, limit = 10) => api.get('/stories/recommendations', { params: { userId, limit } });
export const createStory = (data) => api.post('/stories', data);
export const updateStory = (id, data) => api.put(`/stories/${id}`, data);
export const deleteStory = (id) => api.delete(`/stories/${id}`);
export const getFollowedStories = () => api.get('/stories/followed');
export const incrementViews = (id) => api.put(`/stories/${id}/views`);
export const followStory = (id) => api.post(`/stories/${id}/follow`);
export const isFollowing = (id) => api.get(`/stories/${id}/is-following`);
export const getRelatedStories = (id) => api.get(`/stories/${id}/related`);

// Categories
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Authors
export const getAuthors = () => api.get('/authors');

// Chapters
export const getChaptersByStory = (storyId) => api.get(`/chapters/story/${storyId}`);
export const getChapter = (id) => api.get(`/chapters/${id}`);
export const createChapter = (data) => api.post('/chapters', data);
export const updateChapter = (id, data) => api.put(`/chapters/${id}`, data);
export const deleteChapter = (id) => api.delete(`/chapters/${id}`);

// Comments
export const getCommentsByStory = (storyId) => api.get(`/comments/story/${storyId}`);
export const getCommentsByChapter = (chapterId) => api.get(`/comments/chapter/${chapterId}`);
export const getCommentsByPage = (chapterId, pageIndex) => api.get(`/comments/chapter/${chapterId}/page/${pageIndex}`);
export const createComment = (data) => api.post('/comments', data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);

// Ratings
export const rateStory = (data) => api.post('/ratings', data);
export const getStoryRating = (storyId) => api.get(`/ratings/story/${storyId}`);
export const getUserRating = (storyId) => api.get(`/ratings/story/${storyId}/user`);

// Bookmarks
export const getBookmarks = () => api.get('/bookmarks');
export const addBookmark = (data) => api.post('/bookmarks', data);
export const deleteBookmark = (id) => api.delete(`/bookmarks/${id}`);

// Reading History
export const getReadingHistory = () => api.get('/reading-history');
export const saveReadingHistory = (data) => api.post('/reading-history', data);
export const deleteReadingHistoryItem = (id) => api.delete(`/reading-history/${id}`);

// Notifications
export const getNotifications = () => api.get('/notifications');
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllAsRead = () => api.put('/notifications/read-all');

// Reports
export const createReport = (data) => api.post('/reports', data);
export const getReports = () => api.get('/reports');
export const updateReportStatus = (id, status) => api.put(`/reports/${id}/status`, { status });

// GIFs (Giphy proxy)
export const searchGifs = (q, limit = 12) => api.get('/gifs/search', { params: { q, limit } });
export const trendingGifs = (limit = 12) => api.get('/gifs/trending', { params: { limit } });

// Admin
export const getAdminStats = () => api.get('/admin/stats');
export const getTrendStats = () => api.get('/admin/stats/trends');
export const getHotStories = () => api.get('/admin/stats/hot');
export const getDistributionData = () => api.get('/admin/stats/distribution');

// Upload (Cloudinary)
export const uploadImage = (file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const uploadMangaPages = (files) => {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  return api.post('/upload/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export default api;

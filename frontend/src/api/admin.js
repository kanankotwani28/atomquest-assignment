import api from './axios';

export const getCompletionDashboard = () => api.get('/admin/completion');
export const getAuditLogs = () => api.get('/admin/audit-logs');
export const getCycles = () => api.get('/admin/cycles');
export const createCycle = (data) => api.post('/admin/cycles', data);
export const activateCycle = (id) => api.post(`/admin/cycles/${id}/activate`);
export const pushSharedGoal = (data) => api.post('/admin/shared-goals', data);
export const getAdminUsers = () => api.get('/admin/users');
export const updateUserManager = (id, managerId) => (
  api.put(`/admin/users/${id}/manager`, { manager_id: managerId || null })
);
export const getAdminGoals = () => api.get('/admin/goals');
export const unlockGoal = (id) => api.post(`/admin/goals/${id}/unlock`);

export const downloadAchievementReport = async () => {
  const res = await api.get('/admin/reports/achievement', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'achievement_report.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

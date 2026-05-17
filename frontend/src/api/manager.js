import api from './axios';
export const getTeamGoals    = ()             => api.get('/goals/team');
export const approveGoals    = (employeeId)   => api.post('/goals/approve', { employeeId });
export const returnGoal      = (id, reason)   => api.post(`/goals/${id}/return`, { reason });
export const managerEditGoal = (id, data)     => api.put(`/goals/${id}/manager-edit`, data);
import api from './axios';

export const getMyCheckIns     = ()              => api.get('/checkins/my');
export const upsertCheckIn     = (data)          => api.post('/checkins', data);
export const getTeamCheckIns   = ()              => api.get('/checkins/team');
export const addManagerComment = (id, comment)   => api.put(`/checkins/${id}/comment`, { comment });
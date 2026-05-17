import api from "./axios";

export const getMyGoals = () => api.get("/goals/my");
export const getThrustAreas = () => api.get("/goals/thrust-areas");
export const getActiveCycle = () => api.get("/goals/cycle");
export const createGoal = (data) => api.post("/goals", data);
export const updateGoal = (id, d) => api.put(`/goals/${id}`, d);
export const deleteGoal = (id) => api.delete(`/goals/${id}`);
export const submitAllGoals = () => api.post("/goals/submit-all");

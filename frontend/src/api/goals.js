import api from "./axios";

const normalizeGoal = (goal) => ({
  ...goal,
  uomType: goal.uomType ?? goal.uom_type,
  thrustArea: goal.thrustArea ?? goal.thrust_area,
  thrustAreaId: goal.thrustAreaId ?? goal.thrust_area_id,
  isShared: goal.isShared ?? goal.is_shared ?? false,
  sharedFromId: goal.sharedFromId ?? goal.shared_from_id ?? null,
});

export const getMyGoals = async () => {
  const res = await api.get("/goals/my");
  return { ...res, data: (res.data ?? []).map(normalizeGoal) };
};
export const getThrustAreas = () => api.get("/goals/thrust-areas");
export const getActiveCycle = () => api.get("/goals/cycle");
export const createGoal = async (data) => {
  const res = await api.post("/goals", data);
  return { ...res, data: normalizeGoal(res.data) };
};
export const updateGoal = async (id, d) => {
  const res = await api.put(`/goals/${id}`, d);
  return { ...res, data: normalizeGoal(res.data) };
};
export const deleteGoal = (id) => api.delete(`/goals/${id}`);
export const submitAllGoals = () => api.post("/goals/submit-all");

import api from "./axios";

const normalizeGoal = (goal) => ({
  ...goal,
  uomType: goal.uomType ?? goal.uom_type,
  thrustArea: goal.thrustArea ?? goal.thrust_area,
  thrustAreaId: goal.thrustAreaId ?? goal.thrust_area_id,
  isShared: goal.isShared ?? goal.is_shared ?? false,
  sharedFromId: goal.sharedFromId ?? goal.shared_from_id ?? null,
});

export const getTeamGoals = async () => {
  const res = await api.get("/goals/team");
  const data = res.data;
  const team = (data.team || []).map((member) => ({
    ...member,
    goals: (member.goals || []).map(normalizeGoal),
  }));
  return { ...res, data: { ...data, team } };
};
export const approveGoals = (employeeId) =>
  api.post("/goals/approve", { employeeId });
export const returnGoal = (id, reason) =>
  api.post(`/goals/${id}/return`, { reason });
export const managerEditGoal = (id, data) =>
  api.put(`/goals/${id}/manager-edit`, data);
export const pushTeamSharedGoal = (data) =>
  api.post("/goals/team/shared-goals", data);

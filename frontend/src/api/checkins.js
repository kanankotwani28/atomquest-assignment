import api from "./axios";

const normalizeCheckIn = (checkIn) => ({
  ...checkIn,
  completionDate: checkIn.completionDate ?? checkIn.completion_date ?? null,
  progressStatus: checkIn.progressStatus ?? checkIn.progress_status,
  managerComment: checkIn.managerComment ?? checkIn.manager_comment ?? null,
});

const normalizeGoal = (goal) => {
  const checkIns = goal.checkIns ?? goal.check_ins ?? [];

  return {
    ...goal,
    uomType: goal.uomType ?? goal.uom_type,
    thrustArea: goal.thrustArea ?? goal.thrust_area,
    isShared: goal.isShared ?? goal.is_shared ?? false,
    sharedFromId: goal.sharedFromId ?? goal.shared_from_id ?? null,
    checkIns: checkIns.map(normalizeCheckIn),
  };
};

const normalizeMyCheckIns = (data) => ({
  ...data,
  goals: (data.goals ?? []).map(normalizeGoal),
  allowCheckinOutsideWindow: data.allowCheckinOutsideWindow ?? false,
});

const normalizeTeamCheckIns = (data) => ({
  ...data,
  team: (data.team ?? []).map((member) => ({
    ...member,
    goals: (member.goals ?? []).map(normalizeGoal),
  })),
});

const toCheckInPayload = (data) => ({
  goal_id: data.goalId ?? data.goal_id,
  quarter: data.quarter,
  actual: data.actual,
  completion_date: data.completionDate ?? data.completion_date,
  progress_status: data.progressStatus ?? data.progress_status,
});

const withoutUndefined = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

export const getMyCheckIns = async () => {
  const res = await api.get("/checkins/my");
  return { ...res, data: normalizeMyCheckIns(res.data) };
};

export const upsertCheckIn = (data) => {
  const payload = withoutUndefined(toCheckInPayload(data));
  console.log("POST /api/checkins payload:", payload);
  return api.post("/checkins", payload);
};

export const getTeamCheckIns = async () => {
  const res = await api.get("/checkins/team");
  return { ...res, data: normalizeTeamCheckIns(res.data) };
};

export const addManagerComment = (id, comment) =>
  api.put(`/checkins/${id}/comment`, { comment });

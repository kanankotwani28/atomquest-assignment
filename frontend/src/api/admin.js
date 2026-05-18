import api from "./axios";

// ── Completion dashboard ──────────────────────────────────────────
export const getCompletionDashboard = () => api.get("/admin/completion");

// ── Audit logs ────────────────────────────────────────────────────
export const getAuditLogs = (page = 1, pageSize = 50) => api.get(`/admin/audit-logs?page=${page}&page_size=${pageSize}`);

// ── Cycles ────────────────────────────────────────────────────────
export const getCycles       = ()       => api.get("/admin/cycles");
export const createCycle     = (data)   => api.post("/admin/cycles", data);
export const activateCycle   = (id)     => api.post(`/admin/cycles/${id}/activate`);
export const openQuarter     = (id, q)  => api.post(`/admin/cycles/${id}/open-quarter`, { quarter: q });
export const toggleCheckinWindow = (id) => api.post(`/admin/cycles/${id}/toggle-window`);
export const autoScheduleWindows = (id) => api.post(`/admin/cycles/${id}/auto-schedule`);

// ── Shared goals ──────────────────────────────────────────────────
export const pushSharedGoal = (data) => api.post("/admin/shared-goals", data);

// ── Users / Org ───────────────────────────────────────────────────
export const getAdminUsers      = ()              => api.get("/admin/users");
export const updateUserManager  = (id, managerId) => api.put(`/admin/users/${id}/manager`, { manager_id: managerId || null });

// ── Goal oversight ────────────────────────────────────────────────
export const getAdminGoals = ()   => api.get("/admin/goals");
export const unlockGoal    = (id) => api.post(`/admin/goals/${id}/unlock`);
export const getAnalytics  = ()   => api.get("/admin/analytics");

// ── Excel download ────────────────────────────────────────────────
export const downloadAchievementReport = async () => {
  const res = await api.get("/admin/reports/achievement", {
    responseType: "blob",
  });
  const url  = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", "achievement_report.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── CSV download ──────────────────────────────────────────────────
export const downloadAchievementCSV = async () => {
  const res = await api.get("/admin/reports/achievement/csv", {
    responseType: "blob",
  });
  const url  = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", "achievement_report.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── SSE / Polling completion stream ───────────────────────────────
export const startCompletionStream = (onMessage) => {
  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 2000;

  const poll = async () => {
    try {
      const res = await getCompletionDashboard();
      retryCount = 0;
      onMessage({ data: res.data });
    } catch (e) {
      console.error("Polling error in completion stream:", e);
      retryCount++;
      if (retryCount <= maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), 30000);
        setTimeout(poll, delay);
      }
    }
  };

  const interval = setInterval(poll, 5000);
  poll();

  return {
    close: () => clearInterval(interval)
  };
};
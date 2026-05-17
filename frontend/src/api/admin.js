import api from "./axios";

export const getCompletionDashboard = () => api.get("/admin/completion");
export const getAuditLogs = () => api.get("/admin/audit-logs");
export const getCycles = () => api.get("/admin/cycles");
export const createCycle = (data) => api.post("/admin/cycles", data);
export const activateCycle = (id) => api.post(`/admin/cycles/${id}/activate`);
export const pushSharedGoal = (data) => api.post("/admin/shared-goals", data);
export const getAdminUsers = () => api.get("/admin/users");
export const updateUserManager = (id, managerId) =>
  api.put(`/admin/users/${id}/manager`, { manager_id: managerId || null });
export const getAdminGoals = () => api.get("/admin/goals");
export const unlockGoal = (id) => api.post(`/admin/goals/${id}/unlock`);

export const downloadAchievementReport = async () => {
  const res = await api.get("/admin/reports/achievement", {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "achievement_report.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadAchievementCSV = async () => {
  const res = await api.get("/admin/reports/achievement/csv", {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "achievement_report.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Start a fetch-based SSE stream (EventSource can't send Authorization headers)
export const startCompletionStream = (onMessage) => {
  const token = localStorage.getItem("token");
  const controller = new AbortController();
  const signal = controller.signal;

  fetch(`${api.defaults.baseURL}/admin/completion/stream`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("SSE stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const lines = part.split("\n").map((l) => l.trim());
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const payload = line.replace(/^data:\s*/, "");
              try {
                onMessage(JSON.parse(payload));
              } catch (e) {
                console.error("Failed to parse SSE payload", e);
              }
            }
          }
        }
      }
    })
    .catch((err) => {
      console.error("Completion SSE error", err);
    });

  return { close: () => controller.abort() };
};

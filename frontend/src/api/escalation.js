import api from "./axios";

export const getEscalationRules   = ()           => api.get("/admin/escalation/rules");
export const seedEscalationRules  = ()           => api.post("/admin/escalation/rules/seed");
export const updateEscalationRule = (type, data) => api.put(`/admin/escalation/rules/${type}`, data);
export const runEscalationCheck   = ()           => api.post("/admin/escalation/run");
export const getEscalationLogs    = (params)     => api.get("/admin/escalation/logs", { params });
export const resolveEscalation    = (id, notes)  => api.post(`/admin/escalation/logs/${id}/resolve`, { notes });
export const getEscalationSummary = ()           => api.get("/admin/escalation/summary");

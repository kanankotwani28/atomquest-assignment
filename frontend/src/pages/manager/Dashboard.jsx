import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import { getTeamGoals, approveGoals, returnGoal, pushTeamSharedGoal } from "../../api/manager";
import AppShell from "../../components/AppShell";
import EmployeeGoalCard from "../../components/EmployeeGoalCard";
import ReturnReasonModal from "../../components/ReturnReasonModal";
import toast, { Toaster } from "react-hot-toast";
import { Users, Clock, CheckCircle, Target, Send, ShieldAlert } from "lucide-react";

const initialSharedGoal = {
  title: "",
  thrust_area_id: "",
  uom_type: "NUMERIC_MIN",
  target: "",
  weightage: "",
  employee_ids: [],
};

const UOM_OPTIONS = [
  { value: "NUMERIC_MIN", label: "Higher is better" },
  { value: "NUMERIC_MAX", label: "Lower is better" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero = Success" },
];

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [team, setTeam] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [sharedGoal, setSharedGoal] = useState(initialSharedGoal);
  const [loading, setLoading] = useState(true);
  const [returningGoal, setReturningGoal] = useState(null);

  const fetchTeam = async () => {
    try {
      const res = await getTeamGoals();
      setTeam(res.data.team);
      setCycle(res.data.cycle);
    } catch {
      toast.error("Failed to load team goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    getThrustAreas().then((res) => setThrustAreas(res.data)).catch(() => {});
  }, []);

  const handleApprove = async (employeeId) => {
    const emp = team.find((t) => t.employee.id === employeeId);
    if (!confirm(`Approve all submitted goals for ${emp?.employee.name}? They will be locked.`)) return;
    try {
      const res = await approveGoals(employeeId);
      toast.success(res.data.message);
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.error || "Approval failed");
    }
  };

  const handleReturn = async (reason) => {
    try {
      await returnGoal(returningGoal.id, reason);
      toast.success("Goal returned for rework");
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to return goal");
    }
  };

  const toggleSharedGoalRecipient = (employeeId) => {
    setSharedGoal((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(employeeId)
        ? prev.employee_ids.filter((id) => id !== employeeId)
        : [...prev.employee_ids, employeeId],
    }));
  };

  const handlePushSharedGoal = async (e) => {
    e.preventDefault();
    try {
      const res = await pushTeamSharedGoal({
        ...sharedGoal,
        target: Number(sharedGoal.target),
        weightage: Number(sharedGoal.weightage),
      });
      toast.success(res.data.message);
      setSharedGoal(initialSharedGoal);
      fetchTeam();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && detail.blocked) {
        const list = detail.blocked.map((b) =>
          `  - ${b.name}: ${b.approved_total}% + ${b.shared_weightage}% = ${b.would_be}% (exceeds 100% by ${b.would_be - 100}%)`
        ).join("\n");
        toast.error(`${detail.message}\n\nBlocked:\n${list}`);
      } else {
        toast.error(detail?.message || detail || "Failed to push KPI");
      }
    }
  };

  const totalPending = team.reduce((s, t) => s + t.submittedCount, 0);
  const totalApproved = team.reduce((s, t) => s + t.approvedCount, 0);
  const totalGoals = team.reduce((s, t) => s + t.goals.length, 0);
  const teamScore = totalGoals ? ((totalApproved / totalGoals) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="skeleton h-4 w-44 rounded" />
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      logout={logout}
      title="Manager Workspace"
      subtitle={cycle ? `${cycle.year} · ${cycle.phase} · ${team.length} direct reports` : "Active Cycle"}
    >
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-12 pb-12">
        {/* SECTION 1: TEAM OVERVIEW */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#222222] pb-2">
            <h2 className="text-[13px] font-semibold text-[#e8e8e8] uppercase tracking-[0.08em]">Team Overview</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            <Stat label="Total Reports" value={team.length} icon={Users} />
            <Stat label="Pending Approvals" value={totalPending} tone="warning" icon={Clock} />
            <Stat label="Goals Approved" value={totalApproved} tone="success" icon={CheckCircle} />
            <Stat label="Team Score" value={`${teamScore}%`} tone="info" icon={Target} />
          </div>

          {totalPending > 0 && (
            <div className="notice-bar amber mt-4 flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#c49a2a]" />
              <span>{totalPending} goal{totalPending !== 1 ? "s" : ""} awaiting your review and approval.</span>
            </div>
          )}
        </section>

        {/* SECTION 2: KPI PUSH MODULE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#222222] pb-2">
            <h2 className="text-[13px] font-semibold text-[#e8e8e8] uppercase tracking-[0.08em]">Strategic Alignment</h2>
          </div>
          
          <div className="aq-card border-[#2a2a2a] bg-[#0d0d0d] shadow-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#4a7ac4] to-[#4d9966]" />
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#f5f5f5] flex items-center gap-2">
                    <Send size={16} className="text-[#4a7ac4]" />
                    Departmental KPI Push
                  </h3>
                  <p className="mt-1.5 text-xs text-[#909090] max-w-2xl leading-relaxed">
                    Cascade strategic objectives directly to your team members. Pushed goals automatically appear in their draft sheets as Shared KPIs and must be accommodated in their 100% weightage allocation.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePushSharedGoal} className="space-y-5 bg-[#141414] rounded-lg border border-[#222222] p-5">
                <div>
                  <label className="block text-[10px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-2">KPI Title</label>
                  <input
                    value={sharedGoal.title}
                    onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })}
                    className="aq-input w-full bg-[#0a0a0a]"
                    placeholder="E.g., Increase Department Q2 Revenue by 15%"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-2">Thrust Area</label>
                    <select value={sharedGoal.thrust_area_id} onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })} className="aq-input w-full bg-[#0a0a0a]" required>
                      <option value="">Select Area...</option>
                      {thrustAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-2">Measurement</label>
                    <select value={sharedGoal.uom_type} onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })} className="aq-input w-full bg-[#0a0a0a]">
                      {UOM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-2">Target Value</label>
                    <input type="number" step="any" value={sharedGoal.target} onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })} className="aq-input w-full bg-[#0a0a0a]" placeholder="E.g., 100000" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-2">Weightage (%)</label>
                    <input type="number" min="10" max="100" value={sharedGoal.weightage} onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} className="aq-input w-full bg-[#0a0a0a]" placeholder="10 - 100" required />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#222222]">
                  <label className="block text-[10px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-3">Assign To Direct Reports</label>
                  <div className="flex flex-wrap gap-2.5">
                    {team.length === 0 ? (
                      <span className="text-xs text-[#555555] italic">No team members available</span>
                    ) : (
                      team.map(({ employee }) => {
                        const isSelected = sharedGoal.employee_ids.includes(employee.id);
                        return (
                          <label 
                            key={employee.id} 
                            className={`flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? "border-[#4a7ac4] bg-[#4a7ac4]/10 text-[#f5f5f5]" 
                                : "border-[#2e2e2e] bg-[#0a0a0a] text-[#909090] hover:border-[#444444]"
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              className="accent-[#4a7ac4]"
                              checked={isSelected} 
                              onChange={() => toggleSharedGoalRecipient(employee.id)} 
                            />
                            {employee.name}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    disabled={sharedGoal.employee_ids.length === 0} 
                    className="btn bg-[#4a7ac4] hover:bg-[#3b66a8] text-white disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2"
                  >
                    Deploy to {sharedGoal.employee_ids.length} Member{sharedGoal.employee_ids.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* SECTION 3: TEAM MEMBERS & APPROVALS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <h2 className="text-[13px] font-semibold text-[#e8e8e8] uppercase tracking-[0.08em]">Team Workspaces</h2>
            <span className="text-xs text-[#909090]">{team.length} Members</span>
          </div>

          {team.length === 0 ? (
            <div className="aq-card py-24 text-center border-dashed border-[#333333]">
              <div className="mx-auto mb-5 h-16 w-16 rounded-full border border-[#222222] bg-[#0d0d0d] flex items-center justify-center text-[#555555]">
                <Users size={24} />
              </div>
              <h3 className="mb-2 text-base font-medium text-[#f5f5f5]">No Direct Reports Configured</h3>
              <p className="text-sm text-[#909090] max-w-sm mx-auto">
                You currently don't have any team members assigned to you. Ask your system administrator to update the organizational hierarchy.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {team.map(({ employee, goals, totalWeightage, submittedCount, approvedCount, revisionCount }) => (
                <EmployeeGoalCard
                  key={employee.id}
                  employee={employee}
                  goals={goals}
                  totalWeightage={totalWeightage}
                  submittedCount={submittedCount}
                  approvedCount={approvedCount}
                  revisionCount={revisionCount}
                  onApprove={handleApprove}
                  onUpdated={fetchTeam}
                  onReturn={(goal) => setReturningGoal(goal)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ReturnReasonModal
        isOpen={!!returningGoal}
        goalTitle={returningGoal?.title}
        onConfirm={handleReturn}
        onClose={() => setReturningGoal(null)}
      />
    </AppShell>
  );
}

function Stat({ label, value, tone, icon: Icon }) {
  const color = tone === "success" ? "text-[#4d9966]" : tone === "warning" ? "text-[#c49a2a]" : tone === "info" ? "text-[#4a7ac4]" : "text-[#f5f5f5]";
  const bgGradient = tone === "success" ? "from-[#4d9966]/5" : tone === "warning" ? "from-[#c49a2a]/5" : tone === "info" ? "from-[#4a7ac4]/5" : "from-[#f5f5f5]/5";
  const iconColor = tone === "success" ? "text-[#4d9966]" : tone === "warning" ? "text-[#c49a2a]" : tone === "info" ? "text-[#4a7ac4]" : "text-[#909090]";
  const borderColor = tone === "success" ? "border-[#4d9966]/20" : tone === "warning" ? "border-[#c49a2a]/20" : tone === "info" ? "border-[#4a7ac4]/20" : "border-[#333333]";

  return (
    <div className={`aq-card relative overflow-hidden group hover:-translate-y-1 hover:border-[#444444] transition-all duration-300 border ${borderColor} p-6 shadow-sm`}>
      <div className={`absolute top-0 left-0 right-0 h-full bg-gradient-to-br ${bgGradient} to-transparent opacity-50`} />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#909090] uppercase tracking-wider">{label}</span>
          {Icon && (
            <div className={`p-1.5 rounded-md bg-[#111111] border border-[#222222] group-hover:bg-[#1a1a1a] transition-colors`}>
              <Icon size={16} className={`${iconColor} opacity-80`} />
            </div>
          )}
        </div>
        <div className="mt-auto">
          <span className={`text-3xl font-light tracking-tight ${color}`}>{value}</span>
        </div>
      </div>
    </div>
  );
}

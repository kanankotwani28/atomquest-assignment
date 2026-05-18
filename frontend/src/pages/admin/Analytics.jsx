import { useEffect, useState } from "react";
import { getAnalytics } from "../../api/admin";
import ScoreBadge from "../../components/ScoreBadge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine
} from "recharts";

const PIE_COLORS = ["#4a7ac4", "#4d9966", "#c49a2a", "#c44a4a", "#888888", "#6a5a8a"];

const UOM_LABELS = {
  NUMERIC_MIN: "Higher Better",
  NUMERIC_MAX: "Lower Better",
  TIMELINE: "Timeline",
  ZERO: "Zero Based"
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a0a0a] border border-[#222222] rounded-lg">
        <p className="text-[#c44a4a] font-medium text-sm mb-4">Failed to load analytics</p>
        <button onClick={fetchAnalyticsData} className="btn btn-confirm py-1.5 px-4 text-xs">
          Retry
        </button>
      </div>
    );
  }

  const {
    summary,
    employee_scores = [],
    thrust_area_distribution = [],
    uom_distribution = [],
    manager_effectiveness = [],
    heatmap = [],
    goal_status_distribution = []
  } = data || {};

  // Formatted data for UoM Distribution
  const formattedUomData = uom_distribution.map((item) => ({
    name: UOM_LABELS[item.uom_type] || item.uom_type,
    count: item.count
  }));

  // Formatted data for PieChart
  const totalPieGoals = thrust_area_distribution.reduce((acc, curr) => acc + curr.count, 0);

  // Check if any check-in data exists
  const hasCheckins = employee_scores.some(
    (emp) =>
      emp.q1_score !== null ||
      emp.q2_score !== null ||
      emp.q3_score !== null ||
      emp.q4_score !== null
  );

  const getHeatmapColor = (score) => {
    if (score === null || score === undefined) {
      return { bg: "bg-[#111111]", text: "text-[#333333]", label: "—" };
    }
    if (score >= 80) return { bg: "bg-[#1a2e1a]", text: "text-[#4d9966]", label: score.toFixed(1) };
    if (score >= 60) return { bg: "bg-[#252e1a]", text: "text-[#8a9940]", label: score.toFixed(1) };
    if (score >= 40) return { bg: "bg-[#2e2a1a]", text: "text-[#c49a2a]", label: score.toFixed(1) };
    return { bg: "bg-[#2e1a1a]", text: "text-[#c44a4a]", label: score.toFixed(1) };
  };

  const truncate = (name, length = 10) => {
    return name.length > length ? name.substring(0, length) + "…" : name;
  };

  // Custom tooltips for Recharts
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161616] border border-[#2a2a2a] p-3 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-[#f5f5f5] mb-1.5">{payload[0].payload.employee}</p>
          {payload.map((bar) => (
            <div key={bar.name} className="flex justify-between items-center gap-4">
              <span className="text-[#909090]">{bar.name}:</span>
              <span className="mono font-semibold" style={{ color: bar.color }}>
                {bar.value !== null && bar.value !== undefined ? `${bar.value}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomManagerTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161616] border border-[#2a2a2a] p-3 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-[#f5f5f5] mb-1.5">{payload[0].payload.manager}</p>
          {payload.map((bar) => (
            <div key={bar.name} className="flex justify-between items-center gap-4">
              <span className="text-[#909090]">{bar.name}:</span>
              <span className="mono font-semibold" style={{ color: bar.color }}>
                {bar.value !== null && bar.value !== undefined ? `${bar.value}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* SECTION 1 — Summary KPI row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Average Score</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="number-large text-zinc-100">
              {summary?.avg_overall_score !== null && summary?.avg_overall_score !== undefined
                ? summary.avg_overall_score.toFixed(1)
                : "—"}
            </span>
            {summary?.avg_overall_score !== null && summary?.avg_overall_score !== undefined && (
              <ScoreBadge score={summary.avg_overall_score} />
            )}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Total Employees</span>
          <span className="number-large mt-3 block text-zinc-100">{summary?.total_employees || 0}</span>
        </div>

        {/* KPI 3 */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Total Goals</span>
          <span className="number-large mt-3 block text-[#909090]">{summary?.total_goals || 0}</span>
        </div>

        {/* KPI 4 */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Check-in Completion</span>
          <span className="number-large mt-3 block text-[#4d9966]">
            {summary?.checkin_completion_rate?.toFixed(1) || "0.0"}%
          </span>
          <div className="w-full bg-[#1a1a1a] h-1 rounded mt-3 overflow-hidden">
            <div
              className="bg-[#4d9966] h-full rounded transition-all duration-500"
              style={{ width: `${summary?.checkin_completion_rate || 0}%` }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 2 — two charts side by side (50/50 split) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left card — Quarter-on-Quarter Scores */}
        <div className="aq-card p-5 flex flex-col justify-between border border-[#222222]">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
              Quarter-on-Quarter Scores
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">Average weighted score trends per employee.</p>
          </div>

          <div className="h-[260px] relative w-full flex items-center justify-center">
            {!hasCheckins ? (
              <div className="absolute inset-0 flex items-center justify-center text-center px-6 pointer-events-none">
                <p className="text-xs text-[#555555] italic">
                  No check-in data yet — scores will appear after Q1 check-ins are logged
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employee_scores}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="employee"
                    tickFormatter={(val) => truncate(val, 10)}
                    stroke="#555555"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#555555"
                    fontSize={10}
                    domain={[0, 120]}
                    tickFormatter={(val) => `${val}%`}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#161616/40" }} />
                  <ReferenceLine
                    y={100}
                    stroke="#333333"
                    strokeDasharray="4 4"
                    label={{
                      value: "100% Target",
                      fill: "#555555",
                      fontSize: 8,
                      position: "top"
                    }}
                  />
                  <Bar dataKey="q1_score" name="Q1" fill="#4a7ac4" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="q2_score" name="Q2" fill="#4d9966" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="q3_score" name="Q3" fill="#c49a2a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="q4_score" name="Q4" fill="#888888" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right card — Goals by Thrust Area */}
        <div className="aq-card p-5 flex flex-col justify-between border border-[#222222]">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
              Goals by Thrust Area
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">Goal volume distribution per thrust area.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center mt-2">
            <div className="sm:col-span-3 h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={thrust_area_distribution}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {thrust_area_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Pie center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="mono text-2xl font-bold text-[#f5f5f5]">{totalPieGoals}</span>
                <span className="text-[9px] uppercase tracking-[0.08em] text-[#555555]">Total Goals</span>
              </div>
            </div>

            {/* Custom Pie Legend */}
            <div className="sm:col-span-2 space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
              {thrust_area_distribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-[#909090] truncate flex-grow" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="mono text-[#f5f5f5] font-semibold">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — two charts side by side (60/40 split) */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left card — Manager Effectiveness (Col 1-3) */}
        <div className="aq-card p-5 lg:col-span-3 flex flex-col justify-between border border-[#222222]">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
              Manager Effectiveness
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">Direct report check-in rate and average team scores.</p>
          </div>

          <div className="h-[200px] relative w-full flex items-center justify-center">
            {manager_effectiveness.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                <p className="text-xs text-[#555555] italic">No managers with teams found</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={manager_effectiveness}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <XAxis type="number" domain={[0, 100]} stroke="#555555" fontSize={10} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="manager"
                    stroke="#555555"
                    fontSize={10}
                    tickFormatter={(val) => truncate(val, 8)}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomManagerTooltip />} cursor={{ fill: "#161616/40" }} />
                  <Bar
                    dataKey="checkin_completion_rate"
                    name="Check-in Rate"
                    fill="#4a7ac4"
                    radius={[0, 2, 2, 0]}
                  />
                  <Bar
                    dataKey="avg_team_score"
                    name="Avg Team Score"
                    fill="#4d9966"
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right card — UoM Distribution (Col 4-5) */}
        <div className="aq-card p-5 lg:col-span-2 flex flex-col justify-between border border-[#222222]">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
              UoM Distribution
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">Goal counts organized by UoM metrics.</p>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedUomData}
                margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis dataKey="name" stroke="#555555" fontSize={9} tickLine={false} />
                <YAxis stroke="#555555" fontSize={9} tickLine={false} />
                <Tooltip cursor={{ fill: "#161616/40" }} />
                <Bar
                  dataKey="count"
                  fill="#4a7ac4"
                  radius={[2, 2, 0, 0]}
                  label={{ position: "top", fill: "#909090", fontSize: 10, fontWeight: "bold" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* SECTION 4 — full width score heatmap */}
      <section className="aq-card p-0 overflow-hidden border border-[#222222]">
        <div className="p-5 border-b border-[#222222] bg-[#111111]">
          <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
            Score Heatmap — All Employees × All Quarters
          </h3>
          <p className="text-[11px] text-[#555555] mt-1">
            Departmental performance snapshot mapping achievement colors.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-[#555555] bg-[#0d0d0d] border-b border-[#222222]">
                <th className="py-2.5 px-4 text-left font-semibold text-[10px]">Employee</th>
                <th className="py-2.5 px-4 text-left font-semibold text-[10px]">Dept</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Q1</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Q2</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Q3</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Q4</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Overall</th>
              </tr>
            </thead>
            <tbody>
              {heatmap.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#555555] italic bg-[#111111]">
                    No employee logs registered yet.
                  </td>
                </tr>
              ) : (
                heatmap.map((row, idx) => {
                  const q1Style = getHeatmapColor(row.q1);
                  const q2Style = getHeatmapColor(row.q2);
                  const q3Style = getHeatmapColor(row.q3);
                  const q4Style = getHeatmapColor(row.q4);
                  const overallStyle = getHeatmapColor(row.overall);

                  return (
                    <tr
                      key={row.employee}
                      className={`text-xs border-b border-[#222222]/40 transition-colors hover:bg-[#141414] ${
                        idx % 2 === 0 ? "bg-[#111111]" : "bg-[#0f0f0f]"
                      }`}
                    >
                      <td className="py-3 px-4 text-[#ccc] font-medium">{row.employee}</td>
                      <td className="py-3 px-4 text-[#555]">{row.department}</td>
                      <td className={`py-3 px-4 text-center font-mono text-[12px] font-semibold ${q1Style.bg} ${q1Style.text}`}>
                        {q1Style.label}
                      </td>
                      <td className={`py-3 px-4 text-center font-mono text-[12px] font-semibold ${q2Style.bg} ${q2Style.text}`}>
                        {q2Style.label}
                      </td>
                      <td className={`py-3 px-4 text-center font-mono text-[12px] font-semibold ${q3Style.bg} ${q3Style.text}`}>
                        {q3Style.label}
                      </td>
                      <td className={`py-3 px-4 text-center font-mono text-[12px] font-semibold ${q4Style.bg} ${q4Style.text}`}>
                        {q4Style.label}
                      </td>
                      <td className={`py-3 px-4 text-center font-mono text-[12px] font-semibold ${overallStyle.bg} ${overallStyle.text}`}>
                        {overallStyle.label}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5 — full width department stacked bar */}
      <section className="aq-card p-5 border border-[#222222]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
              Goal Distribution by Status
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">
              Departmental goal counts color-mapped by current completion lifecycle.
            </p>
          </div>

          {/* Status Legends */}
          <div className="flex flex-wrap gap-3.5 text-[10px] font-semibold uppercase tracking-wider text-[#909090]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] block" />
              <span>Draft</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1a2a4a] block" />
              <span>Submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2d5a3d] block" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5a4a1a] block" />
              <span>Returned</span>
            </div>
          </div>
        </div>

        {/* Stacked Bars List */}
        <div className="space-y-4">
          {goal_status_distribution.length === 0 ? (
            <p className="text-xs text-[#555555] italic text-center py-6">No departmental goals registered.</p>
          ) : (
            goal_status_distribution.map((deptRow) => {
              const draftPct = deptRow.total > 0 ? (deptRow.DRAFT / deptRow.total) * 100 : 0;
              const submittedPct = deptRow.total > 0 ? (deptRow.SUBMITTED / deptRow.total) * 100 : 0;
              const approvedPct = deptRow.total > 0 ? (deptRow.APPROVED / deptRow.total) * 100 : 0;
              const returnedPct = deptRow.total > 0 ? (deptRow.RETURNED / deptRow.total) * 100 : 0;

              return (
                <div key={deptRow.department} className="grid grid-cols-1 sm:grid-cols-5 items-center gap-3">
                  <span className="text-xs font-medium text-[#ccc] sm:col-span-1 truncate" title={deptRow.department}>
                    {deptRow.department}
                  </span>

                  <div className="sm:col-span-4 flex w-full h-5 rounded overflow-hidden bg-[#161616]">
                    {deptRow.DRAFT > 0 && (
                      <div
                        className="bg-[#1e1e1e] border-r border-[#2a2a2a]/30 flex items-center justify-center text-[9px] font-mono text-[#666666] transition-all hover:brightness-110"
                        style={{ width: `${draftPct}%` }}
                      >
                        {draftPct > 8 ? deptRow.DRAFT : ""}
                      </div>
                    )}
                    {deptRow.SUBMITTED > 0 && (
                      <div
                        className="bg-[#1a2a4a] border-r border-[#2a2a2a]/30 flex items-center justify-center text-[9px] font-mono text-[#4a7ac4] transition-all hover:brightness-110"
                        style={{ width: `${submittedPct}%` }}
                      >
                        {submittedPct > 8 ? deptRow.SUBMITTED : ""}
                      </div>
                    )}
                    {deptRow.APPROVED > 0 && (
                      <div
                        className="bg-[#2d5a3d] border-r border-[#2a2a2a]/30 flex items-center justify-center text-[9px] font-mono text-[#4d9966] transition-all hover:brightness-110"
                        style={{ width: `${approvedPct}%` }}
                      >
                        {approvedPct > 8 ? deptRow.APPROVED : ""}
                      </div>
                    )}
                    {deptRow.RETURNED > 0 && (
                      <div
                        className="bg-[#5a4a1a] flex items-center justify-center text-[9px] font-mono text-[#c49a2a] transition-all hover:brightness-110"
                        style={{ width: `${returnedPct}%` }}
                      >
                        {returnedPct > 8 ? deptRow.RETURNED : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-[90px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton h-[320px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="skeleton lg:col-span-3 h-[260px]" />
        <div className="skeleton lg:col-span-2 h-[260px]" />
      </div>
      <div className="skeleton h-[350px]" />
      <div className="skeleton h-[200px]" />
    </div>
  );
}

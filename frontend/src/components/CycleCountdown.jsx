import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function CycleCountdown({ cycle }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!cycle?.end_date) return;

    const compute = () => {
      const end = new Date(cycle.end_date).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown({ label: "Cycle ended", urgent: true, color: "#EF4444" });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days < 7) {
        setCountdown({ label: `${days}d ${hours}h remaining`, urgent: true, color: "#F59E0B" });
      } else if (days < 30) {
        setCountdown({ label: `${days}d remaining`, urgent: false, color: "#10B981" });
      } else {
        setCountdown({ label: `Ends ${new Date(cycle.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, urgent: false, color: "#64748B" });
      }
    };

    compute();
    const interval = setInterval(compute, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cycle?.end_date]);

  if (!countdown) return null;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 8,
      background: `${countdown.color}18`,
      border: `1px solid ${countdown.color}30`,
    }}>
      <Clock size={12} style={{ color: countdown.color }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: countdown.color }}>{countdown.label}</span>
    </div>
  );
}
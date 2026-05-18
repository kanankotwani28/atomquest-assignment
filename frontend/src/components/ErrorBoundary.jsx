import { useEffect, useState } from "react";

export default function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.error) setHasError(true);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (hasError) {
    return fallback || (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "48px 24px", textAlign: "center",
        minHeight: 300,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.15)",
          display: "grid", placeItems: "center", marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#F8FAFC", margin: "0 0 6px" }}>
          Something broke
        </h3>
        <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 280 }}>
          An unexpected error occurred. Try refreshing the page.
        </p>
        <button
          onClick={() => { setHasError(false); window.location.reload(); }}
          style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.12)", color: "#EF4444",
            cursor: "pointer",
          }}
        >
          Reload page
        </button>
      </div>
    );
  }

  return children;
}
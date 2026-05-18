import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020817",
          color: "#F8FAFC",
          padding: 32,
        }}>
          <div style={{
            background: "rgba(15,27,52,0.95)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 16,
            padding: 32,
            maxWidth: 480,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#EF4444" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 1.6 }}>
              An unexpected error occurred. Please refresh the page or contact support if this persists.
            </p>
            <div style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#EF4444",
              wordBreak: "break-all",
              textAlign: "left",
            }}>
              {this.state.error?.message || "Unknown error"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8,
                  color: "#EF4444",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); }}
                style={{
                  padding: "10px 20px",
                  background: "rgba(11,22,55,0.80)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: "#94A3B8",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
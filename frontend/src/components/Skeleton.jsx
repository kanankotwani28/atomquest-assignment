export default function Skeleton({ width = "100%", height = 16, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="admin-glass" style={{ padding: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={10} />
          </div>
          <Skeleton width={60} height={22} style={{ borderRadius: 6 }} />
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton width="50%" height={9} style={{ marginBottom: 4 }} />
              <Skeleton width="80%" height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonPage({ title = true, cards = 3 }) {
  return (
    <div className="admin-page">
      <div className="admin-inner" style={{ padding: "28px 32px" }}>
        {title && (
          <div style={{ marginBottom: 24 }}>
            <Skeleton width={200} height={28} style={{ marginBottom: 8 }} />
            <Skeleton width={120} height={12} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="admin-glass" style={{ padding: 20 }}>
              <Skeleton width="60%" height={10} style={{ marginBottom: 8 }} />
              <Skeleton width="80%" height={28} style={{ marginBottom: 4 }} />
              <Skeleton width="50%" height={10} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
          {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  );
}
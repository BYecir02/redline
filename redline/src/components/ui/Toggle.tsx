// Interrupteur on/off (style inline).
export function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        width: 40, height: 22, borderRadius: 999,
        backgroundColor: enabled ? "#c0392b" : "#c8bfb0",
        border: "none", cursor: "pointer", flexShrink: 0,
        transition: "background-color 0.2s", padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: enabled ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

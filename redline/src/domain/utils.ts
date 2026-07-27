// Petits helpers purs (pas de JSX, pas d'état).

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateChartData() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now.getTime() - (23 - i) * 12000);
    return { time: t.toTimeString().slice(3, 8), critical: Math.floor(Math.random() * 3), warning: Math.floor(Math.random() * 5), info: Math.floor(Math.random() * 4) };
  });
}

export function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

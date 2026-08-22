export function formatCount(n) {
  if (n >= 1000) {
    const k = n / 1000
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`
  }
  return String(n)
}

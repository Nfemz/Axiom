const startTime = Date.now();

export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

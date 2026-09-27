export type LogLevel = "info" | "warn" | "error";

export function logAiEvent(
  level: LogLevel,
  endpoint: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const logPayload = {
    timestamp: new Date().toISOString(),
    level,
    endpoint,
    message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(logPayload));
  } else if (level === "warn") {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.info(JSON.stringify(logPayload));
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export class StructuredLogger {
  constructor(private readonly minLevel: LogLevel = "info") {}

  debug(message: string, meta: Record<string, unknown> = {}) {
    this.log("debug", message, meta);
  }

  info(message: string, meta: Record<string, unknown> = {}) {
    this.log("info", message, meta);
  }

  warn(message: string, meta: Record<string, unknown> = {}) {
    this.log("warn", message, meta);
  }

  error(message: string, meta: Record<string, unknown> = {}) {
    this.log("error", message, meta);
  }

  private log(level: LogLevel, message: string, meta: Record<string, unknown>) {
    if (priorities[level] < priorities[this.minLevel]) return;

    const line = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };

    process.stdout.write(`${JSON.stringify(line)}\n`);
  }
}

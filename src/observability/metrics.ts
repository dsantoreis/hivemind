export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly durations = new Map<string, number[]>();

  increment(metric: string, amount = 1) {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + amount);
  }

  observeDuration(metric: string, durationMs: number) {
    const current = this.durations.get(metric) ?? [];
    current.push(durationMs);
    this.durations.set(metric, current);
  }

  snapshot() {
    const durationSummary: Record<string, { count: number; avgMs: number; maxMs: number }> = {};

    for (const [name, values] of this.durations.entries()) {
      const count = values.length;
      const sum = values.reduce((acc, value) => acc + value, 0);
      durationSummary[name] = {
        count,
        avgMs: count ? Math.round(sum / count) : 0,
        maxMs: count ? Math.max(...values) : 0
      };
    }

    return {
      counters: Object.fromEntries(this.counters.entries()),
      durations: durationSummary
    };
  }
}

export type TelemetryEvent = {
  ts: number;
  type: string;
  projectId?: string;
  costUsd?: number;
  meta?: Record<string, any>;
};

class InProcessTelemetryStore {
  private events: TelemetryEvent[] = [];

  add(evt: TelemetryEvent) {
    this.events.push(evt);
    if (this.events.length > 5000) this.events.shift();
  }

  list(limit = 200) {
    return this.events.slice(-limit).reverse();
  }

  summary() {
    const total = this.events.length;
    const costUsd = this.events.reduce((a, b) => a + (b.costUsd || 0), 0);
    return { total, costUsd };
  }
}

export const telemetryStore = new InProcessTelemetryStore();

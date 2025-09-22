export type QueueTask = {
  id: string;
  type: string;
  payload: any;
  status: "queued" | "running" | "done" | "error";
  result?: any;
  error?: string;
  ts: number;
};

class InProcQueue {
  private tasks = new Map<string, QueueTask>();
  private workers: ((task: QueueTask) => Promise<any>)[] = [];
  private busy = false;

  enqueue(type: string, payload: any) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task: QueueTask = {
      id,
      type,
      payload,
      status: "queued",
      ts: Date.now(),
    };
    this.tasks.set(id, task);
    this.loop();
    return id;
  }

  registerWorker(fn: (task: QueueTask) => Promise<any>) {
    this.workers.push(fn);
  }

  get(id: string) {
    return this.tasks.get(id);
  }

  list(limit = 100) {
    return Array.from(this.tasks.values()).slice(-limit).reverse();
  }

  private async loop() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const task of this.tasks.values()) {
        if (task.status !== "queued") continue;
        task.status = "running";
        let handled = false;
        for (const w of this.workers) {
          try {
            const res = await w(task);
            task.result = res;
            task.status = "done";
            handled = true;
            break;
          } catch (e: any) {
            task.error = e?.message || String(e);
            task.status = "error";
            handled = true;
            break;
          }
        }
        if (!handled) {
          task.status = "error";
          task.error = "no worker available";
        }
      }
    } finally {
      this.busy = false;
    }
  }
}

export const inprocQueue = new InProcQueue();

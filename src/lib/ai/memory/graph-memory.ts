type MemoryEntry = {
  ts: number;
  role: "planner" | "programmer" | "tester" | "publisher" | "system" | "user";
  content: string;
  tags?: string[];
};

class InProcessGraphMemory {
  private store = new Map<string, MemoryEntry[]>();

  append(projectId: string, entry: MemoryEntry) {
    const arr = this.store.get(projectId) ?? [];
    arr.push(entry);
    this.store.set(projectId, arr);
  }

  list(projectId: string) {
    return this.store.get(projectId) ?? [];
  }

  clear(projectId: string) {
    this.store.delete(projectId);
  }
}

export const graphMemory = new InProcessGraphMemory();
export type { MemoryEntry };

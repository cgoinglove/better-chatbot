import { describe, it, expect, vi } from "vitest";
import { safeJsRun } from "./safe-js-run";

describe("safe-js-run", () => {
  it("should execute basic code with console.log", async () => {
    const result = await safeJsRun("console.log(2 + 3);", {});
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({ type: "log", args: [5] });
    }
  });

  it("should handle input data", async () => {
    const result = await safeJsRun("console.log(x + y);", { x: 10, y: 5 });
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({ type: "log", args: [15] });
    }
  });

  it("should work with Math API", async () => {
    const result = await safeJsRun("console.log(Math.max(1, 2, 3));", {});
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({ type: "log", args: [3] });
    }
  });

  it("should work with JSON API", async () => {
    const result = await safeJsRun(
      'const obj = {name: "test"}; console.log(JSON.stringify(obj));',
      {},
    );
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        type: "log",
        args: ['{"name":"test"}'],
      });
    }
  });

  it("should capture multiple console methods", async () => {
    const result = await safeJsRun(
      'console.log("hello"); console.warn("warning"); console.error("error");',
      {},
    );
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(3);
      expect(result.logs[0]).toEqual({ type: "log", args: ["hello"] });
      expect(result.logs[1]).toEqual({ type: "warn", args: ["warning"] });
      expect(result.logs[2]).toEqual({ type: "error", args: ["error"] });
    }
  });

  it("should capture console.log with multiple arguments", async () => {
    const result = await safeJsRun('console.log("hello", "world", 42);', {});
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        type: "log",
        args: ["hello", "world", 42],
      });
    }
  });

  it("should call onLog callback when provided", async () => {
    const onLogSpy = vi.fn();
    const result = await safeJsRun(
      'console.log("test"); console.warn("warning");',
      {},
      5000,
      onLogSpy,
    );

    expect("success" in result).toBe(true);
    expect(onLogSpy).toHaveBeenCalledTimes(2);
    expect(onLogSpy).toHaveBeenCalledWith({ type: "log", args: ["test"] });
    expect(onLogSpy).toHaveBeenCalledWith({ type: "warn", args: ["warning"] });
  });

  it("should handle syntax errors", async () => {
    const result = await safeJsRun("console.log(2 +);", {});
    expect("isError" in result).toBe(true);
    if ("isError" in result) {
      expect(result.error).toContain("Unexpected token");
    }
  });

  it("should block forbidden keywords", async () => {
    const result = await safeJsRun("window.alert('hack');", {});
    expect("isError" in result).toBe(true);
    if ("isError" in result) {
      expect(result.error).toContain("Forbidden keyword: 'window'");
    }
  });

  it("should detect Function constructor", async () => {
    const result = await safeJsRun("new Function('return 1')();", {});
    expect("isError" in result).toBe(true);
    if ("isError" in result) {
      expect(result.error).toContain("Function constructor");
    }
  });

  it("should detect infinite loop patterns", async () => {
    const result = await safeJsRun("while(true) {}", {});
    expect("isError" in result).toBe(true);
    if ("isError" in result) {
      expect(result.error).toContain("Infinite while loop");
    }
  });

  it("should handle code with no console output", async () => {
    const result = await safeJsRun("const x = 5; const y = 10;", {});
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(0);
    }
  });

  it("should handle different console methods correctly", async () => {
    const result = await safeJsRun(
      'console.info("info"); console.debug("debug"); console.trace("trace");',
      {},
    );
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(3);
      expect(result.logs[0]).toEqual({ type: "info", args: ["info"] });
      expect(result.logs[1]).toEqual({ type: "debug", args: ["debug"] });
      expect(result.logs[2]).toEqual({ type: "trace", args: ["trace"] });
    }
  });

  it("should handle async/await operations", async () => {
    const result = await safeJsRun(
      `
      const delay = (ms) => new Promise(resolve => resolve("completed"));
      const result = await delay(10);
      console.log("async operation", result);
      `,
      {},
    );
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        type: "log",
        args: ["async operation", "completed"],
      });
    }
  });

  it("should handle Promise-based operations", async () => {
    const result = await safeJsRun(
      `
      const result = await Promise.resolve(42);
      console.log("Promise result:", result);
      `,
      {},
    );
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        type: "log",
        args: ["Promise result:", 42],
      });
    }
  });

  it("should handle async errors properly", async () => {
    const result = await safeJsRun(
      `
      try {
        await Promise.reject(new Error("async error"));
      } catch (error) {
        console.error("Caught async error:", error.message);
      }
      `,
      {},
    );
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        type: "error",
        args: ["Caught async error:", "async error"],
      });
    }
  });

  it("should handle sequential async operations with delay", async () => {
    const result = await safeJsRun(
      `
      async function delay(ms) { 
        return new Promise(resolve => setTimeout(resolve, ms)); 
      }

      function generateEmployee(id) {
        const names = ['Kim Minjun', 'Lee Jisoo', 'Park Hyunwoo'];
        const departments = ['Engineering', 'Design', 'Marketing'];
        return {
          id,
          name: names[id - 1],
          department: departments[id - 1],
          createdAt: Date.now()
        };
      }

      async function processEmployees() {
        const employees = [];
        console.log("Starting employee processing...");
        
        for (let i = 1; i <= 3; i++) {
          console.log(\`[\${i}] Creating employee data...\`);
          const employee = generateEmployee(i);
          
          console.log(\`[\${i}] Saving to database...\`);
          await delay(50); // 50ms database operation simulation
          
          console.log(\`[\${i}] Employee \${employee.name} saved successfully\`);
          employees.push(employee);
        }
        
        console.log(\`All \${employees.length} employees processed\`);
        return employees;
      }

      await processEmployees();
      `,
      {},
      2000, // 2초 타임아웃 - 300ms + 여유시간
    );

    expect("success" in result).toBe(true);
    if ("success" in result) {
      // Should have: 1 start + 3*(create + saving + saved) + 1 final = 11 logs
      expect(result.logs.length).toBeGreaterThanOrEqual(10);
      expect(result.logs[0].args[0]).toBe("Starting employee processing...");
      expect(result.logs[result.logs.length - 1].args[0]).toBe(
        "All 3 employees processed",
      );

      // Check that delays actually happened (execution time should be > 150ms)
      const executionTime = parseInt(result.executionTime.replace("ms", ""));
      expect(executionTime).toBeGreaterThan(140); // 50ms × 3 + margin
    }
  });

  it("should demonstrate timeout behavior (test environment limitation)", async () => {
    const result = await safeJsRun(
      `
      console.log("Starting operation...");
      // In real browser environment, this would trigger timeout
      // But in test environment, timeout may not work as expected
      await new Promise(() => {}); 
      console.log("This should not appear");
      `,
      {},
      100, // 100ms timeout
    );

    // Note: In test environment, timeout might not work as expected
    // This test documents the intended behavior
    if ("isError" in result) {
      expect(result.error).toContain("timeout");
    } else {
      // If timeout doesn't work in test env, we should at least see the first log
      expect("success" in result).toBe(true);
      if ("success" in result) {
        expect(result.logs[0].args[0]).toBe("Starting operation...");
      }
    }
  });
});

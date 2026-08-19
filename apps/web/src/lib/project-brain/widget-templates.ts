import "server-only";
import type { ProjectBrainExtraction } from "./analyze-source";

/**
 * Predefined dashboard widgets for the project workspace.
 *
 * The HTML/CSS here is FIXED — colors, sizes, and fonts are baked in so every
 * project gets the same, recognisable To-dos and Progress widgets. The widgets
 * never generate their own content; they render whatever JSON render-data is
 * pushed in via `postMessage({ type: "navigator:data", payload })` from
 * `ProjectHtmlInsightFrame`. That keeps the visual structure stable while the
 * data underneath refreshes after every tool sync.
 */

const SHARED_HEAD = `
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --bg: #ffffff;
    --fg: #0f172a;
    --muted: #64748b;
    --border: #e2e8f0;
    --surface: #f8fafc;
    --critical: #dc2626;
    --high: #ea580c;
    --normal: #2563eb;
    --low: #94a3b8;
    --green: #16a34a;
    --green-bg: #dcfce7;
    --yellow: #ca8a04;
    --yellow-bg: #fef9c3;
    --red: #dc2626;
    --red-bg: #fee2e2;
    --slate: #64748b;
    --slate-bg: #f1f5f9;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: var(--fg);
    background: var(--bg);
  }
  #app { height: 100vh; display: flex; flex-direction: column; padding: 10px 12px; }
  .w-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .w-title { font-size: 12px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; color: var(--muted); }
  .w-count {
    font-size: 11px; font-weight: 600; color: var(--muted);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 999px; padding: 1px 8px;
  }
  .w-body { flex: 1; overflow-y: auto; }
  .w-empty { color: var(--muted); font-size: 12px; padding: 14px 2px; }
  .w-foot { margin-top: 6px; font-size: 10px; color: var(--low); }
  /* todos */
  .todo { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-top: 1px solid var(--border); }
  .todo:first-child { border-top: none; }
  .dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 4px; flex: 0 0 auto; }
  .todo-main { min-width: 0; flex: 1; }
  .todo-title { font-weight: 600; font-size: 12px; }
  .todo-title.done { text-decoration: line-through; color: var(--muted); }
  .todo-meta { font-size: 10px; color: var(--muted); }
  /* status */
  .pill { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; font-size: 11px; border-radius: 999px; padding: 2px 9px; }
  .pill .pdot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }
  .bar { height: 8px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); overflow: hidden; margin: 8px 0 4px; }
  .bar > span { display: block; height: 100%; background: var(--normal); border-radius: 999px; transition: width .3s ease; }
  .pct { font-size: 18px; font-weight: 800; }
  .summary { font-size: 12px; color: var(--fg); margin-top: 6px; }
  .blockers { margin-top: 8px; }
  .blocker { display: flex; gap: 6px; align-items: flex-start; font-size: 11px; color: var(--red); padding: 2px 0; }
</style>
`.trim();

export const TODOS_WIDGET_HTML = `
<!doctype html>
<html>
<head>${SHARED_HEAD}</head>
<body>
  <div id="app">
    <div class="w-head">
      <span class="w-title">To-dos</span>
      <span class="w-count" id="count">0</span>
    </div>
    <div class="w-body" id="list">
      <div class="w-empty">Connect tools or chat with the project — your to-dos will appear here automatically.</div>
    </div>
    <div class="w-foot" id="foot"></div>
  </div>
  <script>
    var PRIORITY = { critical: "var(--critical)", high: "var(--high)", normal: "var(--normal)", low: "var(--low)" };
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"})[c]; }); }
    function renderDashboard(payload) {
      payload = payload || {};
      var items = Array.isArray(payload.items) ? payload.items : [];
      var open = items.filter(function(i){ return i.status !== "done"; });
      document.getElementById("count").textContent = String(open.length);
      var list = document.getElementById("list");
      if (!items.length) {
        list.innerHTML = '<div class="w-empty">Connect tools or chat with the project — your to-dos will appear here automatically.</div>';
      } else {
        list.innerHTML = items.map(function(i){
          var done = i.status === "done";
          var color = PRIORITY[i.priority] || PRIORITY.normal;
          var meta = [i.status, i.priority].filter(Boolean).join(" · ");
          return '<div class="todo">' +
            '<span class="dot" style="background:' + color + '"></span>' +
            '<div class="todo-main">' +
              '<div class="todo-title ' + (done ? "done" : "") + '">' + esc(i.title) + '</div>' +
              (meta ? '<div class="todo-meta">' + esc(meta) + '</div>' : "") +
            '</div></div>';
        }).join("");
      }
      document.getElementById("foot").textContent = payload.generatedAt
        ? "Updated " + new Date(payload.generatedAt).toLocaleString()
        : "";
    }
    window.addEventListener("message", function(e){
      if (e.data && e.data.type === "navigator:data") renderDashboard(e.data.payload);
    });
  </script>
</body>
</html>
`.trim();

export const STATUS_WIDGET_HTML = `
<!doctype html>
<html>
<head>${SHARED_HEAD}</head>
<body>
  <div id="app">
    <div class="w-head">
      <span class="w-title">Progress</span>
      <span class="pill" id="health" style="color: var(--slate); background: var(--slate-bg);">
        <span class="pdot"></span><span id="health-label">Unknown</span>
      </span>
    </div>
    <div class="w-body">
      <div class="pct" id="pct">—</div>
      <div class="bar"><span id="barfill" style="width:0%"></span></div>
      <div class="summary" id="summary">Connect a tool to start tracking this project's progress.</div>
      <div class="blockers" id="blockers"></div>
    </div>
    <div class="w-foot" id="foot"></div>
  </div>
  <script>
    var HEALTH = {
      green:   { label: "On track",  fg: "var(--green)",  bg: "var(--green-bg)" },
      yellow:  { label: "At risk",   fg: "var(--yellow)", bg: "var(--yellow-bg)" },
      red:     { label: "Off track", fg: "var(--red)",    bg: "var(--red-bg)" },
      unknown: { label: "Unknown",   fg: "var(--slate)",  bg: "var(--slate-bg)" }
    };
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"})[c]; }); }
    function renderDashboard(payload) {
      payload = payload || {};
      var h = HEALTH[payload.health] || HEALTH.unknown;
      var pill = document.getElementById("health");
      pill.style.color = h.fg; pill.style.background = h.bg;
      document.getElementById("health-label").textContent = h.label;
      var pct = typeof payload.progressPct === "number" ? Math.max(0, Math.min(100, payload.progressPct)) : null;
      document.getElementById("pct").textContent = pct == null ? "—" : pct + "%";
      var fill = document.getElementById("barfill");
      fill.style.width = (pct == null ? 0 : pct) + "%";
      fill.style.background = h.fg;
      document.getElementById("summary").textContent = payload.summary ||
        "Connect a tool to start tracking this project's progress.";
      var blockers = Array.isArray(payload.blockers) ? payload.blockers : [];
      document.getElementById("blockers").innerHTML = blockers.map(function(b){
        return '<div class="blocker">⚠ <span>' + esc(b) + '</span></div>';
      }).join("");
      document.getElementById("foot").textContent = payload.generatedAt
        ? "Updated " + new Date(payload.generatedAt).toLocaleString()
        : "";
    }
    window.addEventListener("message", function(e){
      if (e.data && e.data.type === "navigator:data") renderDashboard(e.data.payload);
    });
  </script>
</body>
</html>
`.trim();

export const TABLE_WIDGET_HTML = `
<!doctype html>
<html>
<head>${SHARED_HEAD}
<style>
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th { position: sticky; top: 0; background: var(--bg); color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
  td.cell-num { text-align: right; font-variant-numeric: tabular-nums; }
  .badge { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 10px; border-radius: 999px; padding: 1px 8px; color: var(--slate); background: var(--slate-bg); }
  .badge.green { color: var(--green); background: var(--green-bg); }
  .badge.yellow { color: var(--yellow); background: var(--yellow-bg); }
  .badge.red { color: var(--red); background: var(--red-bg); }
  .badge.blue { color: var(--normal); background: #dbeafe; }
</style>
</head>
<body>
  <div id="app">
    <div class="w-head">
      <span class="w-title" id="title">Table</span>
      <span class="w-count" id="count">0</span>
    </div>
    <div class="w-body">
      <table><thead id="thead"></thead><tbody id="tbody"></tbody></table>
      <div class="w-empty" id="empty">Connect a tool to populate this table.</div>
    </div>
    <div class="w-foot" id="foot"></div>
  </div>
  <script>
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"})[c]; }); }
    var STATUS_COLOR = {
      green: "green", ontrack: "green", active: "green", won: "green", done: "green", paid: "green", completed: "green",
      yellow: "yellow", pending: "yellow", inprogress: "yellow", atrisk: "yellow", warm: "yellow",
      red: "red", blocked: "red", lost: "red", churned: "red", overdue: "red", failed: "red",
      blue: "blue", new: "blue", cold: "blue"
    };
    function badgeClass(v) {
      var key = String(v == null ? "" : v).toLowerCase().replace(/[^a-z]/g, "");
      return STATUS_COLOR[key] || "";
    }
    function render(payload) {
      payload = payload || {};
      var columns = Array.isArray(payload.columns) ? payload.columns : [];
      var rows = Array.isArray(payload.rows) ? payload.rows : [];
      document.getElementById("title").textContent = payload.title || "Table";
      document.getElementById("count").textContent = String(rows.length);
      var empty = document.getElementById("empty");
      var thead = document.getElementById("thead");
      var tbody = document.getElementById("tbody");
      if (!columns.length || !rows.length) {
        empty.style.display = "block"; thead.innerHTML = ""; tbody.innerHTML = "";
      } else {
        empty.style.display = "none";
        thead.innerHTML = "<tr>" + columns.map(function(c){ return "<th>" + esc(c.label || c.key) + "</th>"; }).join("") + "</tr>";
        tbody.innerHTML = rows.map(function(r){
          return "<tr>" + columns.map(function(c){
            var v = r[c.key];
            if (c.type === "status") return '<td><span class="badge ' + badgeClass(v) + '">' + esc(v) + '</span></td>';
            if (c.type === "number") return '<td class="cell-num">' + esc(v) + '</td>';
            return "<td>" + esc(v) + "</td>";
          }).join("") + "</tr>";
        }).join("");
      }
      document.getElementById("foot").textContent = payload.generatedAt
        ? "Updated " + new Date(payload.generatedAt).toLocaleString() : "";
    }
    window.addEventListener("message", function(e){
      if (e.data && e.data.type === "navigator:data") render(e.data.payload);
    });
  </script>
</body>
</html>
`.trim();

export const METRIC_WIDGET_HTML = `
<!doctype html>
<html>
<head>${SHARED_HEAD}
<style>
  .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
  .metric { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--surface); }
  .metric .label { font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); }
  .metric .value { font-size: 22px; font-weight: 800; margin-top: 2px; }
  .metric .delta { font-size: 11px; font-weight: 600; margin-top: 2px; }
  .metric .delta.up { color: var(--green); }
  .metric .delta.down { color: var(--red); }
</style>
</head>
<body>
  <div id="app">
    <div class="w-head"><span class="w-title" id="title">Metrics</span></div>
    <div class="w-body">
      <div class="metrics" id="metrics"></div>
      <div class="w-empty" id="empty">Connect a tool to track metrics.</div>
    </div>
    <div class="w-foot" id="foot"></div>
  </div>
  <script>
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"})[c]; }); }
    function render(payload) {
      payload = payload || {};
      var items = Array.isArray(payload.items) ? payload.items : [];
      document.getElementById("title").textContent = payload.title || "Metrics";
      var empty = document.getElementById("empty");
      var grid = document.getElementById("metrics");
      if (!items.length) { empty.style.display = "block"; grid.innerHTML = ""; }
      else {
        empty.style.display = "none";
        grid.innerHTML = items.map(function(m){
          var dir = m.delta == null ? "" : (Number(m.delta) >= 0 ? "up" : "down");
          var deltaStr = m.delta == null ? "" : '<div class="delta ' + dir + '">' + (Number(m.delta) >= 0 ? "▲ " : "▼ ") + esc(m.delta) + (m.deltaLabel ? " " + esc(m.deltaLabel) : "") + '</div>';
          return '<div class="metric"><div class="label">' + esc(m.label) + '</div><div class="value">' + esc(m.value) + '</div>' + deltaStr + '</div>';
        }).join("");
      }
      document.getElementById("foot").textContent = payload.generatedAt
        ? "Updated " + new Date(payload.generatedAt).toLocaleString() : "";
    }
    window.addEventListener("message", function(e){
      if (e.data && e.data.type === "navigator:data") render(e.data.payload);
    });
  </script>
</body>
</html>
`.trim();

/** Map a widget kind to its FIXED html template. */
export const WIDGET_HTML_BY_KIND: Record<string, string> = {
  todos: TODOS_WIDGET_HTML,
  status: STATUS_WIDGET_HTML,
  table: TABLE_WIDGET_HTML,
  metric: METRIC_WIDGET_HTML,
};

/** Build the To-dos widget render-data from a brain extraction. */
export function buildTodosRenderData(
  extraction: ProjectBrainExtraction,
  generatedAt: Date,
) {
  return {
    items: extraction.todos.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      rationale: t.rationale ?? null,
    })),
    generatedAt: generatedAt.toISOString(),
  };
}

/** Build the Progress widget render-data from a brain extraction. */
export function buildStatusRenderData(
  extraction: ProjectBrainExtraction,
  generatedAt: Date,
) {
  return {
    health: extraction.status.health,
    progressPct: extraction.status.progressPct ?? null,
    summary: extraction.status.shortSummary || extraction.summary,
    blockers: extraction.status.blockers ?? [],
    generatedAt: generatedAt.toISOString(),
  };
}

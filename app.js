// Renders a comparison grid (packages as columns, attributes as rows)
// from data/packages.json. No build step, no dependencies.

const state = { data: null, query: "", sort: "stars" };

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

function visiblePackages() {
  const q = state.query.trim().toLowerCase();
  const list = state.data.packages.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  );
  const by = state.sort;
  return list.sort((a, b) => {
    if (by === "name") return a.name.localeCompare(b.name);
    if (by === "updated") return b.updated.localeCompare(a.updated);
    return b[by] - a[by];
  });
}

function render() {
  const table = $("#grid");
  table.replaceChildren();
  const packages = visiblePackages();
  $("#count").textContent = `${packages.length} of ${state.data.packages.length} packages`;

  if (packages.length === 0) {
    table.append(el("tbody", {}, el("tr", {}, el("td", { class: "empty" }, "No packages match."))));
    return;
  }

  const maxStars = Math.max(...state.data.packages.map((p) => p.stars));

  const head = el("tr", {}, el("th", { scope: "row" }, "Package"));
  for (const p of packages) {
    head.append(el("th", { scope: "col" }, el("a", { href: p.repo, target: "_blank", rel: "noopener" }, p.name)));
  }

  const body = el("tbody");
  const row = (label, cell) => {
    const tr = el("tr", {}, el("th", { scope: "row" }, label));
    for (const p of packages) tr.append(el("td", {}, cell(p)));
    body.append(tr);
  };
  const section = (label) => {
    body.append(el("tr", { class: "section" }, el("th", { colspan: packages.length + 1 }, label)));
  };

  section("Overview");
  row("Description", (p) => p.description);
  row("Stars", (p) => {
    const wrap = el("div", { class: "num" }, p.stars.toLocaleString());
    wrap.append(el("div", { class: "bar", style: `width:${Math.round((p.stars / maxStars) * 100)}%` }));
    return wrap;
  });
  row("Forks", (p) => el("span", { class: "num" }, p.forks.toLocaleString()));
  row("Version", (p) => p.version);
  row("Last updated", (p) => p.updated);
  row("License", (p) => p.license);

  section("Features");
  for (const f of state.data.features) {
    row(f.label, (p) => (p.features[f.id] ? el("span", { class: "yes" }, "✓") : el("span", { class: "no" }, "✗")));
  }

  table.append(el("thead", {}, head), body);
}

async function init() {
  const res = await fetch("data/packages.json");
  state.data = await res.json();
  $("#grid-title").textContent = state.data.grid.title;
  $("#grid-description").textContent = state.data.grid.description;
  document.title = `${state.data.grid.title} · Package Grid`;

  $("#search").addEventListener("input", (e) => { state.query = e.target.value; render(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("#suggest-form").addEventListener("submit", suggest);
  render();
}

// Issue forms accept ?<field id>=<value> to pre-fill fields, so the page
// can hand off to GitHub without holding any credentials.
function suggest(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const params = new URLSearchParams({ template: "add-package.yml", title: `Add package: ${form.get("name")}` });
  for (const [key, value] of form) {
    if (String(value).trim()) params.set(key, String(value).trim());
  }
  window.open(`https://github.com/${state.data.grid.source}/issues/new?${params}`, "_blank", "noopener");
}

init().catch((err) => {
  $("#grid-title").textContent = "Failed to load data";
  console.error(err);
});

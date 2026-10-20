// Turns an "Add a package" issue into an entry in data/packages.json.
// Run by .github/workflows/add-package.yml. The issue body is untrusted
// input: every field is validated here and nothing from it reaches a shell.
//
// Writes `name` and `error` to $GITHUB_OUTPUT; on error, data is left unchanged.

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const DATA = "data/packages.json";
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

function output(key, value) {
  // Single-line values only; strip newlines so input can't inject extra outputs.
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value).replace(/[\r\n]+/g, " ")}\n`);
}

function fail(message) {
  output("error", message);
  console.error(message);
  process.exit(0);
}

// Issue forms render as "### <label>\n\n<value>" sections.
function parseSections(body) {
  const sections = {};
  for (const part of (body || "").split(/^### /m).slice(1)) {
    const [label, ...rest] = part.split("\n");
    const value = rest.join("\n").trim();
    sections[label.trim()] = value === "_No response_" ? "" : value;
  }
  return sections;
}

const s = parseSections(event.issue.body);
const name = (s["Package name"] || "").trim();
const repoUrl = (s["Repository URL"] || "").trim().replace(/\/+$/, "").replace(/\.git$/, "");
const version = (s["Latest version"] || "").trim();
let description = (s["Description"] || "").replace(/\s+/g, " ").trim();

if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(name)) {
  fail("Package name must be 1-100 characters: letters, digits, `.`, `_` or `-`.");
}
const m = repoUrl.match(/^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
if (!m) fail("Repository URL must look like `https://github.com/owner/repo`.");
if (version && !/^[A-Za-z0-9._+-]{1,30}$/.test(version)) fail("Version looks invalid.");
if (description.length > 300) fail("Description must be 300 characters or fewer.");

const data = JSON.parse(readFileSync(DATA, "utf8"));
const lower = name.toLowerCase();
if (data.packages.some((p) => p.name.toLowerCase() === lower || p.repo.toLowerCase() === repoUrl.toLowerCase())) {
  fail(`\`${name}\` is already in the grid.`);
}

const res = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GH_TOKEN}`,
  },
});
if (!res.ok) fail(`Could not read ${repoUrl} from the GitHub API (HTTP ${res.status}). Is it public?`);
const repo = await res.json();

if (!description) description = (repo.description || "").trim();
if (!description) fail("The repository has no description, so please provide one.");

// "- [X] Label" lines from the checkboxes field.
const checked = new Set(
  [...(s["Features"] || "").matchAll(/^- \[[xX]\] (.+)$/gm)].map((x) => x[1].trim())
);
const features = Object.fromEntries(data.features.map((f) => [f.id, checked.has(f.label)]));

data.packages.push({
  name,
  repo: repo.html_url,
  description,
  stars: repo.stargazers_count,
  forks: repo.forks_count,
  version: version || "-",
  license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : "-",
  updated: (repo.pushed_at || "").slice(0, 7),
  features,
});

writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n");
output("name", name);
console.log(`Added ${name}`);

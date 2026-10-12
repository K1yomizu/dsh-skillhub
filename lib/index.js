// src/host/index.ts
import z from "@deepseek-ai/schemastery";

// src/shared/skillhub.ts
var SKILLHUB_PRIMARY_HOST = "https://api.skillhub.cn";
var SKILLHUB_MIRROR_HOST = "https://api.skillhub.tencent.com";
var DEFAULT_TIMEOUT_MS = 15e3;
var DEFAULT_PAGE_SIZE = 30;
var MAX_PAGE_SIZE = 100;
var SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
var SkillHubHttpError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "SkillHubHttpError";
    this.status = status;
  }
};
var SkillHubTimeoutError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SkillHubTimeoutError";
  }
};
var SkillHubInputError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SkillHubInputError";
  }
};
function assertSafeSegment(value, label) {
  if (!SAFE_SEGMENT.test(value)) throw new SkillHubInputError(`invalid ${label}`);
  return value;
}
function assertSafeRelativePath(value) {
  if (value === "" || value.startsWith("/") || value.startsWith("\\")) {
    throw new SkillHubInputError("invalid file path");
  }
  if (/^[A-Za-z]:/.test(value)) throw new SkillHubInputError("invalid file path");
  for (const segment of value.replaceAll("\\", "/").split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new SkillHubInputError("invalid file path");
    }
  }
  return value;
}
function makeSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal === void 0 ? timeout : AbortSignal.any([signal, timeout]);
}
function throwForAbortOrTimeout(signal, timeoutMs, what) {
  if (signal?.aborted === true) throw new DOMException("aborted", "AbortError");
  throw new SkillHubTimeoutError(
    `SkillHub ${what} request timed out after ${Math.round(timeoutMs / 1e3)}s`
  );
}
async function request(fetchImpl, url, init, what) {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    return await fetchImpl(url, { headers: init.headers, signal: makeSignal(init.signal, timeoutMs) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError" && init.signal?.aborted === true) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throwForAbortOrTimeout(init.signal, timeoutMs, what);
    }
    throw error;
  }
}
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : {};
}
function asString(value) {
  return typeof value === "string" ? value : "";
}
function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function skillPageUrl(namespace, slug) {
  if (namespace === "" || slug === "") return "";
  return `https://skillhub.cn/skills/${encodeURIComponent(namespace)}/${encodeURIComponent(slug)}`;
}
function mapSkillHubItem(raw) {
  const row = asRecord(raw);
  const namespace = asRecord(row["namespace"]);
  const handle = asString(namespace["handle"]);
  const slug = asString(row["slug"]);
  const description = asString(row["description_zh"]) || asString(row["description"]);
  return {
    slug,
    namespace: handle,
    name: asString(row["name"]),
    description,
    category: asString(row["category"]),
    downloads: asNumber(row["downloads"]),
    installs: asNumber(row["installs"]),
    stars: asNumber(row["stars"]),
    iconUrl: asString(row["iconUrl"]),
    pageUrl: skillPageUrl(handle, slug)
  };
}
function assertOk(res, url, what) {
  if (!res.ok) throw new SkillHubHttpError(res.status, `SkillHub ${what} failed with HTTP ${res.status} (${url})`);
}
async function readData(url, res, what) {
  assertOk(res, url, what);
  const parsed = await res.json();
  const body = asRecord(parsed);
  const code = body["code"];
  if (typeof code === "number" && code !== 0) {
    throw new SkillHubHttpError(
      res.status,
      `SkillHub ${what} returned code ${code}: ${asString(body["message"])} (${url})`
    );
  }
  return asRecord(body["data"] ?? body);
}
async function searchSkills(fetchImpl, params, extra = {}) {
  const page = Math.max(1, Math.trunc(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  const query = new URLSearchParams({
    sortBy: params.sortBy ?? "score",
    order: "desc",
    page: String(page),
    pageSize: String(pageSize)
  });
  const keyword = params.keyword?.trim();
  if (keyword !== void 0 && keyword !== "") query.set("keyword", keyword);
  if (params.category !== void 0 && params.category !== "") query.set("category", params.category);
  const url = `${params.host}/api/skills?${query.toString()}`;
  const res = await request(fetchImpl, url, extra, "search");
  const data = await readData(url, res, "search");
  const list = Array.isArray(data["skills"]) ? data["skills"] : [];
  const items = list.map(mapSkillHubItem);
  return { total: asNumber(data["total"]) || items.length, page, pageSize, items };
}
async function fetchCategories(fetchImpl, extra) {
  const url = `${extra.host}/api/v1/categories`;
  const res = await request(fetchImpl, url, extra, "categories");
  assertOk(res, url, "categories");
  const body = asRecord(await res.json());
  const items = Array.isArray(body["items"]) ? body["items"] : [];
  const categories = [];
  for (const raw of items) {
    const row = asRecord(raw);
    const key = asString(row["key"]);
    if (key === "" || key === "pay-skill") continue;
    categories.push({ key, name: asString(row["name"]) || key });
  }
  return categories.length === 0 ? void 0 : categories;
}
var BUILTIN_CATEGORIES = [
  { key: "office-efficiency", name: "\u529E\u516C\u6548\u7387" },
  { key: "content-creation", name: "\u5185\u5BB9\u521B\u4F5C" },
  { key: "dev-programming", name: "\u5F00\u53D1\u7F16\u7A0B" },
  { key: "data-analysis", name: "\u6570\u636E\u5206\u6790" },
  { key: "design-media", name: "\u8BBE\u8BA1\u591A\u5A92\u4F53" },
  { key: "ai-agent", name: "AI Agent" },
  { key: "knowledge-management", name: "\u77E5\u8BC6\u7BA1\u7406" },
  { key: "business-ops", name: "\u5546\u4E1A\u8FD0\u8425" },
  { key: "education", name: "\u6559\u80B2\u5B66\u4E60" },
  { key: "professional", name: "\u884C\u4E1A\u4E13\u4E1A" },
  { key: "it-ops-security", name: "IT \u8FD0\u7EF4\u4E0E\u5B89\u5168" },
  { key: "life-service", name: "\u751F\u6D3B\u670D\u52A1" }
];
async function fetchSkillManifest(fetchImpl, params, extra = {}) {
  const slug = assertSafeSegment(params.slug, "slug");
  const namespace = assertSafeSegment(params.namespace, "namespace");
  const query = new URLSearchParams({ namespace });
  if (params.version !== void 0 && params.version !== "") query.set("version", params.version);
  const url = `${params.host}/api/v1/skills/${slug}/files?${query.toString()}`;
  const res = await request(fetchImpl, url, extra, "manifest");
  assertOk(res, url, "manifest");
  const body = asRecord(await res.json());
  const rawFiles = Array.isArray(body["files"]) ? body["files"] : [];
  const files = [];
  for (const raw of rawFiles) {
    const row = asRecord(raw);
    const path = asString(row["path"]);
    if (path === "") continue;
    files.push({ path, sha256: asString(row["sha256"]), size: asNumber(row["size"]) });
  }
  const version = asString(body["version"]);
  return { version, files };
}
async function fetchSkillFile(fetchImpl, params, extra = {}) {
  const slug = assertSafeSegment(params.slug, "slug");
  const namespace = assertSafeSegment(params.namespace, "namespace");
  const path = assertSafeRelativePath(params.path);
  const query = new URLSearchParams({ path, namespace });
  if (params.version !== "") query.set("version", params.version);
  const url = `${params.host}/api/v1/skills/${slug}/file?${query.toString()}`;
  const res = await request(fetchImpl, url, { ...extra, timeoutMs: extra.timeoutMs ?? 6e4 }, "file");
  assertOk(res, url, `file "${path}"`);
  return new Uint8Array(await res.arrayBuffer());
}
async function fetchSkillDetail(fetchImpl, params, extra = {}) {
  const slug = assertSafeSegment(params.slug, "slug");
  const namespace = assertSafeSegment(params.namespace, "namespace");
  const query = new URLSearchParams({ namespace });
  const url = `${params.host}/api/v1/skills/${slug}?${query.toString()}`;
  const res = await request(fetchImpl, url, extra, "detail");
  assertOk(res, url, "detail");
  const body = asRecord(await res.json());
  const skill = asRecord(body["skill"]);
  const latest = asRecord(body["latestVersion"]);
  const subCategories = Array.isArray(skill["subCategories"]) ? skill["subCategories"] : [];
  const tags = Array.isArray(skill["tags"]) ? skill["tags"] : [];
  let readme = "";
  const summary = asString(skill["summary_zh"]) || asString(skill["summary"]);
  try {
    const manifest = await fetchSkillManifest(fetchImpl, params, extra);
    const skillFile = manifest.files.find((file) => file.path.toLowerCase() === "skill.md");
    if (skillFile !== void 0) {
      const bytes = await fetchSkillFile(fetchImpl, { ...params, path: skillFile.path, version: manifest.version }, extra);
      readme = stripFrontmatter(new TextDecoder().decode(bytes));
    }
  } catch {
  }
  const handle = asString(asRecord(body["namespace"])["handle"]) || namespace;
  return {
    slug,
    namespace: handle,
    name: asString(skill["displayName"]) || slug,
    summary,
    readme,
    version: asString(latest["version"]),
    category: asString(skill["category"]),
    tags: [
      ...subCategories.map((entry) => asString(asRecord(entry)["name"])).filter((name2) => name2 !== ""),
      ...tags.map((tag) => asString(tag)).filter((tag) => tag !== "")
    ],
    pageUrl: skillPageUrl(handle, slug)
  };
}
function stripFrontmatter(text) {
  const normalized = text.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return normalized.trim();
  const end = normalized.indexOf("\n---", 3);
  if (end < 0) return normalized.trim();
  const after = normalized.indexOf("\n", end + 1);
  return (after < 0 ? "" : normalized.slice(after + 1)).trim();
}

// src/shared/types.ts
var MARKET_SORTS = ["score", "downloads", "stars", "updated_at"];

// src/host/local.ts
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
var SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function resolveDshHome() {
  const configured = process.env["DSH_HOME"];
  return resolve(configured !== void 0 && configured !== "" ? configured : join(homedir(), ".dsh"));
}
function resolveAgentsHome() {
  const configured = process.env["DSH_AGENTS_HOME"];
  return resolve(configured !== void 0 && configured !== "" ? configured : join(homedir(), ".agents"));
}
function findProjectRoot(cwd) {
  let current = resolve(cwd);
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}
function projectSkillsDir(cwd) {
  return join(findProjectRoot(cwd), ".agents", "skills");
}
function userSkillsDir() {
  return join(resolveAgentsHome(), "skills");
}
function skillRoots(cwd) {
  const projectRoot = findProjectRoot(cwd);
  return [
    { path: join(projectRoot, ".dsh", "skills"), level: "project", source: "project-dsh", manageable: false, skipSystem: false },
    { path: join(projectRoot, ".agents", "skills"), level: "project", source: "project-agents", manageable: true, skipSystem: false },
    { path: join(resolveDshHome(), "skills"), level: "user", source: "user-dsh", manageable: false, skipSystem: true },
    { path: join(resolveAgentsHome(), "skills"), level: "user", source: "user-agents", manageable: true, skipSystem: false }
  ];
}
function levelRoot(level, cwd) {
  if (level === "project") return projectSkillsDir(cwd);
  if (level === "user") return userSkillsDir();
  throw new Error(`invalid level: ${String(level)}`);
}
function isSkillName(name2) {
  return SKILL_NAME.test(name2);
}
function parseFrontmatter(text) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  if (lines[0]?.trim() !== "---") return {};
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      end = index;
      break;
    }
  }
  if (end < 0) return {};
  const front = {};
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (match === null) continue;
    const key = match[1] ?? "";
    const value = unquote(match[2] ?? "");
    if (key === "name" && front.name === void 0 && value !== "") front.name = value;
    if (key === "description" && front.description === void 0 && value !== "") front.description = value;
    if (key === "disable-model-invocation") {
      const flag = frontmatterBoolean(value);
      if (flag !== void 0) front.modelInvocable = !flag;
    }
    if (key === "user-invocable") {
      const flag = frontmatterBoolean(value);
      if (flag !== void 0) front.userInvocable = flag;
    }
  }
  return front;
}
function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    if ((first === '"' || first === "'") && trimmed.at(-1) === first) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}
function frontmatterBoolean(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "yes" || normalized === "on" || normalized === "1") return true;
  if (normalized === "false" || normalized === "no" || normalized === "off" || normalized === "0") return false;
  return void 0;
}
async function discover(root) {
  if (!existsSync(root.path)) return [];
  let entries;
  try {
    entries = await readdir(root.path, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (root.skipSystem && entry.name === ".system") continue;
    if (entry.isDirectory()) {
      found.push({ dir: entry.name, file: join(root.path, entry.name, "SKILL.md"), bundled: true });
      continue;
    }
    if (entry.name.endsWith(".md")) {
      found.push({ dir: entry.name.slice(0, -3), file: join(root.path, entry.name), bundled: false });
    }
  }
  return found.sort((left, right) => left.dir.localeCompare(right.dir));
}
async function readSkill(root, entry) {
  let text;
  try {
    if (!entry.bundled) {
      const info = await stat(entry.file);
      if (!info.isFile()) return void 0;
    }
    text = await readFile(entry.file, "utf8");
  } catch {
    return void 0;
  }
  const front = parseFrontmatter(text);
  return {
    level: root.level,
    manageable: root.manageable,
    source: root.source,
    dir: entry.dir,
    name: front.name ?? entry.dir,
    description: front.description ?? "",
    modelInvocable: front.modelInvocable ?? true,
    userInvocable: front.userInvocable ?? true
  };
}
async function listInstalled(cwd) {
  const rows = [];
  const seen = /* @__PURE__ */ new Set();
  for (const root of skillRoots(cwd)) {
    for (const entry of await discover(root)) {
      const key = `${root.level}:${entry.dir}`;
      if (seen.has(key)) continue;
      const row = await readSkill(root, entry);
      if (row === void 0) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  return rows;
}
async function setSkillInvocation(root, dir, flags) {
  const file = resolveSkillFile(root, dir);
  const lines = (await readFile(file, "utf8")).replaceAll("\r\n", "\n").split("\n");
  if (lines[0]?.trim() !== "---") throw new Error("SKILL.md has no YAML frontmatter");
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("SKILL.md frontmatter is not closed");
  const head = lines.slice(1, end).filter((line) => !/^(disable-model-invocation|user-invocable)\s*:/.test(line));
  if (flags.modelInvocable === false) head.push("disable-model-invocation: true");
  if (flags.userInvocable === false) head.push("user-invocable: false");
  await writeFile(file, [...["---"], ...head, ...lines.slice(end)].join("\n"), "utf8");
}
function resolveSkillFile(root, dir) {
  if (!isSkillName(dir)) throw new Error(`invalid skill name: ${dir}`);
  if (!existsSync(root)) throw new Error(`skill root does not exist: ${root}`);
  const candidate = join(root, dir);
  if (!resolve(candidate).startsWith(resolve(root) + sep)) throw new Error(`invalid skill name: ${dir}`);
  const bundled = join(candidate, "SKILL.md");
  if (existsSync(bundled)) return bundled;
  const flat = join(root, `${dir}.md`);
  if (existsSync(flat)) return flat;
  throw new Error(`skill not found: ${dir}`);
}
async function writeSkill(root, dir, files, overwrite) {
  if (!isSkillName(dir)) throw new Error(`invalid skill name: ${dir}`);
  const dest = join(root, dir);
  if (existsSync(dest) && !overwrite) {
    const error = new Error("already-exists");
    error.name = "SkillAlreadyExists";
    throw error;
  }
  if (!files.some((file) => file.path.toLowerCase() === "skill.md")) {
    throw new Error("package does not contain SKILL.md");
  }
  const staging = join(root, `.staging-${dir}-${process.pid}-${Date.now()}`);
  await mkdir(staging, { recursive: true });
  const written = /* @__PURE__ */ new Set();
  try {
    for (const file of files) {
      const target = join(staging, ...file.path.split("/"));
      if (!resolve(target).startsWith(resolve(staging) + sep)) continue;
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
      written.add(file.path);
    }
    if (overwrite && existsSync(dest)) await rm(dest, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    await rename(staging, dest);
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => {
    });
    throw error;
  }
  return { path: dest, fileCount: written.size };
}
async function removeSkill(root, dir) {
  const file = resolveSkillFile(root, dir);
  const target = file.endsWith("SKILL.md") ? dirname(file) : file;
  if (!resolve(target).startsWith(resolve(root) + sep)) throw new Error(`invalid skill name: ${dir}`);
  await rm(target, { recursive: true, force: true });
}
async function moveSkill(fromRoot, toRoot, dir) {
  if (!isSkillName(dir)) throw new Error(`invalid skill name: ${dir}`);
  const source = join(fromRoot, dir);
  if (!existsSync(source)) throw new Error(`skill not found: ${dir}`);
  const destination = join(toRoot, dir);
  await mkdir(toRoot, { recursive: true });
  if (!existsSync(destination)) {
    const staging = join(toRoot, `.staging-${dir}-${process.pid}-${Date.now()}`);
    await cpRecursive(source, staging);
    await rename(staging, destination);
  }
  await rm(source, { recursive: true, force: true });
  const flat = join(fromRoot, `${dir}.md`);
  if (existsSync(flat)) await rm(flat, { force: true });
  return destination;
}
async function cpRecursive(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      await cpRecursive(source, target);
      continue;
    }
    if (entry.isFile()) await writeFile(target, await readFile(source));
  }
}
function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}
async function readSkillFile(root, dir) {
  return await readFile(resolveSkillFile(root, dir), "utf8");
}

// src/host/contract.ts
var FRONTMATTER_KEY = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/;
var LEGACY_INVOCATION_KEYS = [
  ["disableModelInvocation", "disable-model-invocation"],
  ["modelInvocable", "disable-model-invocation"],
  ["userInvocable", "user-invocable"]
];
var INVOCATION_KEYS = ["disable-model-invocation", "user-invocable"];
var BOOLEAN_TOKENS = /* @__PURE__ */ new Set(["true", "false", "yes", "no", "on", "off", "1", "0"]);
function readRawFrontmatter(text) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  if (lines[0]?.trim() !== "---") return { present: false, closed: false, fields: /* @__PURE__ */ new Map() };
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      end = index;
      break;
    }
  }
  const fields = /* @__PURE__ */ new Map();
  if (end < 0) return { present: true, closed: false, fields };
  for (const line of lines.slice(1, end)) {
    const match = FRONTMATTER_KEY.exec(line);
    if (match === null) continue;
    const key = match[1] ?? "";
    if (!fields.has(key)) fields.set(key, unquote(match[2] ?? ""));
  }
  return { present: true, closed: true, fields };
}
function checkSkillContract(text) {
  const front = readRawFrontmatter(text);
  if (!front.present || !front.closed) {
    return {
      code: "missing-frontmatter",
      message: "skill file ignored: missing YAML frontmatter"
    };
  }
  const name2 = front.fields.get("name") ?? "";
  const description = front.fields.get("description") ?? "";
  if (name2 === "" || description === "") {
    return {
      code: "missing-name-or-description",
      message: "skill file ignored: frontmatter requires name and description"
    };
  }
  if (!SKILL_NAME.test(name2)) {
    return {
      code: "invalid-name",
      message: `skill file ignored: invalid skill name "${name2}"`,
      detail: name2
    };
  }
  for (const [legacy, canonical] of LEGACY_INVOCATION_KEYS) {
    if (front.fields.has(legacy)) {
      return {
        code: "legacy-invocation-key",
        message: `frontmatter field "${legacy}" is unsupported; use "${canonical}"`,
        detail: legacy,
        hint: canonical
      };
    }
  }
  for (const key of INVOCATION_KEYS) {
    const raw = front.fields.get(key);
    if (raw === void 0) continue;
    if (!BOOLEAN_TOKENS.has(raw.toLowerCase())) {
      return {
        code: "invalid-invocation-boolean",
        message: `frontmatter field "${key}" must be a boolean`,
        detail: raw
      };
    }
  }
  return void 0;
}

// src/host/market.ts
var REMOTE_SOURCES = [
  { id: "skillhub", host: SKILLHUB_PRIMARY_HOST },
  { id: "skillhub-mirror", host: SKILLHUB_MIRROR_HOST }
];
var INSTALL_CONCURRENCY = 4;
var MAX_INSTALL_BYTES = 64 * 1024 * 1024;
var MAX_INSTALL_FILES = 600;
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
async function withRemoteSources(work, signal) {
  const attempts = [];
  let lastError;
  for (const candidate of REMOTE_SOURCES) {
    if (signal?.aborted === true) throw signal.reason ?? new Error("aborted");
    try {
      const value = await work(candidate.host, signal);
      attempts.push({ source: candidate.id, ok: true });
      return { value, source: candidate.id, host: candidate.host, attempts };
    } catch (error) {
      lastError = error;
      attempts.push({ source: candidate.id, ok: false, error: errorText(error) });
    }
  }
  throw Object.assign(new Error(errorText(lastError)), { attempts });
}
function localToItem(skill) {
  return {
    slug: skill.dir,
    namespace: "",
    name: skill.name,
    description: skill.description,
    category: "local",
    downloads: 0,
    installs: 0,
    stars: 0,
    iconUrl: "",
    pageUrl: "",
    local: skill
  };
}
function filterLocal(skills, request2) {
  const keyword = request2.keyword?.trim().toLowerCase() ?? "";
  if (keyword === "") return skills.map(localToItem);
  return skills.filter((skill) => skill.name.toLowerCase().includes(keyword) || skill.dir.toLowerCase().includes(keyword) || skill.description.toLowerCase().includes(keyword)).map(localToItem);
}
async function searchMarket(deps, request2, signal) {
  const page = Math.max(1, Math.trunc(request2.page ?? 1));
  const pageSize = Math.max(1, Math.trunc(request2.pageSize ?? 30));
  try {
    const { value, source, attempts } = await withRemoteSources(
      (host, inner) => searchSkills(deps.fetchImpl, { host, ...request2, page, pageSize }, { signal: inner }),
      signal
    );
    return { ...value, source, degraded: source !== "skillhub", attempts };
  } catch (error) {
    const attempts = error.attempts ?? [];
    const items = filterLocal(await deps.listLocal(), request2);
    return {
      source: "local",
      degraded: true,
      attempts,
      total: items.length,
      page: 1,
      pageSize,
      items
    };
  }
}
async function loadCategories(fetchImpl, signal) {
  try {
    const { value } = await withRemoteSources(
      (host, inner) => fetchCategories(fetchImpl, { host, signal: inner }),
      signal
    );
    if (value !== void 0 && value.length > 0) return { categories: value, degraded: false };
  } catch {
  }
  return { categories: [...BUILTIN_CATEGORIES], degraded: true };
}
async function installFromMarket(deps, request2, signal, cwd) {
  const root = levelRoot(request2.level, cwd);
  const { value: manifest, host } = await withRemoteSources(
    (candidate, inner) => fetchSkillManifest(
      deps.fetchImpl,
      { host: candidate, slug: request2.slug, namespace: request2.namespace, version: request2.version },
      { signal: inner }
    ),
    signal
  );
  if (manifest.files.length === 0) throw new Error("upstream manifest contains no files");
  if (manifest.files.length > MAX_INSTALL_FILES) {
    throw new Error(`skill has too many files (${manifest.files.length})`);
  }
  const totalBytes = manifest.files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_INSTALL_BYTES) throw new Error("skill exceeds the install size limit");
  const files = await downloadAll(deps.fetchImpl, host, request2, manifest, signal);
  const result = await writeSkill(root, request2.slug, files, true);
  return {
    path: result.path,
    level: request2.level,
    version: manifest.version,
    fileCount: result.fileCount,
    warnings: await readBack(root, request2.slug)
  };
}
async function readBack(root, dir) {
  try {
    const issue = checkSkillContract(await readSkillFile(root, dir));
    return issue === void 0 ? [] : [issue];
  } catch (error) {
    return [{
      code: "unreadable",
      message: `could not read the installed skill back: ${errorText(error)}`
    }];
  }
}
async function downloadAll(fetchImpl, host, request2, manifest, signal) {
  const results = new Array(manifest.files.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      const file = manifest.files[index];
      if (file === void 0) return;
      if (signal?.aborted === true) throw signal.reason ?? new Error("aborted");
      const bytes = await fetchSkillFile(
        fetchImpl,
        { host, slug: request2.slug, namespace: request2.namespace, path: file.path, version: manifest.version },
        { signal }
      );
      if (file.sha256 !== "") {
        const actual = sha256Hex(bytes);
        if (actual !== file.sha256) {
          throw new Error(`integrity check failed for "${file.path}"`);
        }
      }
      results[index] = { path: file.path, content: bytes };
    }
  };
  const workers = Array.from({ length: Math.min(INSTALL_CONCURRENCY, manifest.files.length) }, () => worker());
  await Promise.all(workers);
  const files = [];
  for (const entry of results) {
    if (entry !== void 0) files.push(entry);
  }
  if (files.length !== manifest.files.length) throw new Error("install stalled before every file arrived");
  return files;
}

// src/host/api.ts
var API_PREFIX = "/plugins/dsh-skillhub/api";
var MAX_BODY_BYTES = 64 * 1024;
function sendJson(res, body, status = 200) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(payload);
}
function sendError(res, error, kind) {
  sendJson(res, kind === void 0 ? { ok: false, error } : { ok: false, error, kind });
}
function errorText2(error) {
  return error instanceof Error ? error.message : String(error);
}
function originAllowed(req) {
  const origin = req.headers.origin;
  if (origin === void 0) return true;
  const host = req.headers.host;
  if (host === void 0) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("request body too large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
}
function stringField(body, key) {
  const value = body[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
function numberField(body, key) {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function boolField(body, key) {
  const value = body[key];
  return typeof value === "boolean" ? value : void 0;
}
function levelField(body, fallback) {
  const value = body["level"];
  if (value === "project" || value === "user") return value;
  if (value === void 0) return fallback;
  throw new Error(`invalid level: ${String(value)}`);
}
async function handleSearch(deps, body, signal) {
  const sortBy = body["sortBy"];
  const request2 = {
    ...stringField(body, "keyword") === void 0 ? {} : { keyword: stringField(body, "keyword") },
    ...stringField(body, "category") === void 0 ? {} : { category: stringField(body, "category") },
    ...typeof sortBy === "string" && MARKET_SORTS.includes(sortBy) ? { sortBy } : {},
    ...numberField(body, "page") === void 0 ? {} : { page: numberField(body, "page") },
    ...numberField(body, "pageSize") === void 0 ? {} : { pageSize: numberField(body, "pageSize") }
  };
  const cwd = stringField(body, "cwd") ?? process.cwd();
  const page = await searchMarket({ fetchImpl: deps.fetchImpl, listLocal: () => listInstalled(cwd) }, request2, signal);
  return { ok: true, ...page };
}
async function handleCategories(deps, signal) {
  const result = await loadCategories(deps.fetchImpl, signal);
  return { ok: true, ...result };
}
async function handleInstalled(body) {
  const cwd = stringField(body, "cwd") ?? process.cwd();
  const skills = await listInstalled(cwd);
  return {
    ok: true,
    skills,
    projectDir: projectSkillsDir(cwd),
    userDir: userSkillsDir()
  };
}
async function handleInstall(deps, body, signal) {
  const slug = stringField(body, "slug");
  const namespace = stringField(body, "namespace");
  if (slug === void 0 || namespace === void 0) throw new Error("slug and namespace are required");
  const request2 = {
    slug: assertSafeSegment(slug, "slug"),
    namespace: assertSafeSegment(namespace, "namespace"),
    level: levelField(body, "user"),
    ...stringField(body, "version") === void 0 ? {} : { version: stringField(body, "version") }
  };
  const cwd = stringField(body, "cwd") ?? process.cwd();
  const result = await installFromMarket(deps, request2, signal, cwd);
  return { ok: true, ...result };
}
async function handleUninstall(body) {
  const name2 = stringField(body, "name");
  if (name2 === void 0) throw new Error("name is required");
  const cwd = stringField(body, "cwd") ?? process.cwd();
  await removeSkill(levelRoot(levelField(body, "user"), cwd), name2);
  return { ok: true };
}
async function handlePromote(body) {
  const name2 = stringField(body, "name");
  if (name2 === void 0) throw new Error("name is required");
  const cwd = stringField(body, "cwd") ?? process.cwd();
  const path = await moveSkill(projectSkillsDir(cwd), userSkillsDir(), name2);
  return { ok: true, path };
}
async function handleSetInvocation(body) {
  const name2 = stringField(body, "name");
  if (name2 === void 0) throw new Error("name is required");
  const cwd = stringField(body, "cwd") ?? process.cwd();
  const modelInvocable = boolField(body, "modelInvocable");
  const userInvocable = boolField(body, "userInvocable");
  if (modelInvocable === void 0 && userInvocable === void 0) {
    throw new Error("modelInvocable or userInvocable is required");
  }
  const request2 = {
    name: name2,
    level: levelField(body, "user"),
    ...modelInvocable === void 0 ? {} : { modelInvocable },
    ...userInvocable === void 0 ? {} : { userInvocable }
  };
  await setSkillInvocation(levelRoot(request2.level, cwd), name2, {
    ...request2.modelInvocable === void 0 ? {} : { modelInvocable: request2.modelInvocable },
    ...request2.userInvocable === void 0 ? {} : { userInvocable: request2.userInvocable }
  });
  return { ok: true };
}
async function handleDetail(deps, body, signal) {
  const slug = stringField(body, "slug");
  const namespace = stringField(body, "namespace");
  if (slug === void 0 || namespace === void 0) throw new Error("slug and namespace are required");
  const safeSlug = assertSafeSegment(slug, "slug");
  const safeNamespace = assertSafeSegment(namespace, "namespace");
  const hosts = [SKILLHUB_PRIMARY_HOST, SKILLHUB_MIRROR_HOST];
  let lastError;
  for (const host of hosts) {
    try {
      const detail = await fetchSkillDetail(deps.fetchImpl, { host, slug: safeSlug, namespace: safeNamespace }, { signal });
      return { ok: true, detail, source: host === SKILLHUB_PRIMARY_HOST ? "skillhub" : "skillhub-mirror" };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(errorText2(lastError));
}
var ROUTES = {
  "/search": handleSearch,
  "/categories": (deps, _body, signal) => handleCategories(deps, signal),
  "/installed": (_deps, body) => handleInstalled(body),
  "/install": handleInstall,
  "/uninstall": (_deps, body) => handleUninstall(body),
  "/promote": (_deps, body) => handlePromote(body),
  "/set-invocation": (_deps, body) => handleSetInvocation(body),
  "/detail": handleDetail
};
async function handleApiRequest(deps, req, res) {
  try {
    if (req.method !== "POST") {
      sendError(res, "method not allowed", "method-not-allowed");
      return;
    }
    if (!originAllowed(req)) {
      sendError(res, "cross-origin request rejected", "forbidden-origin");
      return;
    }
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      sendError(res, "content-type must be application/json", "unsupported-media-type");
      return;
    }
    const pathname = (req.url ?? "").split("?")[0] ?? "";
    const sub = pathname.startsWith(API_PREFIX) ? pathname.slice(API_PREFIX.length) : pathname;
    const handler = ROUTES[sub];
    if (handler === void 0) {
      sendError(res, "unknown endpoint", "not-found");
      return;
    }
    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort(new Error("client disconnected"));
    });
    const body = await readJsonBody(req);
    const result = await handler(deps, body, controller.signal);
    sendJson(res, result);
  } catch (error) {
    if (error instanceof Error && error.name === "SkillAlreadyExists") {
      sendError(res, "already-exists", "already-exists");
      return;
    }
    sendError(res, errorText2(error));
  }
}

// src/host/tool.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
var SEARCH_TOOL_NAME = "dsh_skillhub_search";
var TOOL_PAGE_SIZE = 10;
function renderRow(item, rank) {
  const identity = item.namespace === "" ? item.slug : `@${item.namespace}/${item.slug}`;
  const description = item.description === "" ? "" : ` \u2014 ${item.description.slice(0, 100)}`;
  const stats = item.downloads === 0 && item.installs === 0 ? "" : `\uFF08\u4E0B\u8F7D ${item.downloads} / \u5B89\u88C5 ${item.installs}\uFF09`;
  const page = item.pageUrl === "" ? "" : `
   ${item.pageUrl}`;
  return `${rank}. ${item.name}\uFF08${identity}\uFF09${stats}${description}${page}`;
}
function renderValue(value) {
  if (!value.ok) return `SkillHub \u641C\u7D22\u5931\u8D25\uFF1A${value.message ?? "\u672A\u77E5\u9519\u8BEF"}`;
  const sourceLabel = {
    skillhub: "SkillHub \u4E3B\u6E90",
    "skillhub-mirror": "SkillHub \u955C\u50CF\uFF08\u4E3B\u6E90\u4E0D\u53EF\u7528\uFF0C\u5DF2\u81EA\u52A8\u56DE\u9000\uFF09",
    local: "\u672C\u673A\u5DF2\u5B89\u88C5\u6280\u80FD\uFF08\u8FDC\u7A0B\u4E0D\u53EF\u7528\uFF0C\u5DF2\u81EA\u52A8\u56DE\u9000\uFF09"
  };
  const header = `\u6280\u80FD\u5E02\u573A\u641C\u7D22\uFF1A\u5171 ${value.total} \u6761\uFF0C\u7B2C ${value.page} \u9875\u8FD4\u56DE ${value.items.length} \u6761\uFF08\u6570\u636E\u6E90\uFF1A${sourceLabel[value.source] ?? value.source}\uFF09\u3002`;
  if (value.items.length === 0) {
    return `${header}
\u6CA1\u6709\u5339\u914D\u7684\u6280\u80FD\u3002\u6362\u4E00\u4E2A\u5173\u952E\u8BCD\u6216\u540C\u4E49\u8BCD\u518D\u8BD5\uFF0C\u6216\u7528 category \u9650\u5B9A\u5206\u7C7B\u3002`;
  }
  const rows = value.items.map((item, index) => renderRow(item, (value.page - 1) * TOOL_PAGE_SIZE + index + 1));
  const guidance = value.source === "local" ? "\n\u63D0\u793A\uFF1A\u8FDC\u7A0B\u6E90\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u4EE5\u4E0A\u4E3A\u672C\u673A\u5DF2\u5B89\u88C5\u6280\u80FD\u3002" : "\n\u5B89\u88C5\u65B9\u5F0F\uFF1A\u8BF7\u7528\u6237\u6253\u5F00 Web UI \u4FA7\u8FB9\u680F\u5E95\u90E8\u7684\u300C\u6280\u80FD\u5E02\u573A\u300D\u9762\u677F\uFF0C\u641C\u7D22\u8BE5\u6280\u80FD\u5E76\u9009\u62E9\u7528\u6237\u7EA7\u6216\u9879\u76EE\u7EA7\u4E00\u952E\u5B89\u88C5\u3002\u672C\u5DE5\u5177\u4E0D\u4F1A\u4EE3\u4E3A\u5B89\u88C5\u3002";
  return [header, "", ...rows, guidance].join("\n");
}
function createSearchTool(fetchImpl) {
  return defineTool({
    name: SEARCH_TOOL_NAME,
    description: [
      "\u641C\u7D22 SkillHub\uFF08skillhub.cn\uFF09\u6280\u80FD\u5E02\u573A\u4E0A\u7684\u516C\u5F00\u6280\u80FD\uFF0C\u65E0\u9700\u5BC6\u94A5\u3002",
      "\u5F53\u7528\u6237\u95EE\u300C\u6709\u6CA1\u6709\u2026\u2026\u7684 skill\u300D\u300C\u5E2E\u6211\u627E\u4E2A\u5904\u7406 X \u7684\u6280\u80FD\u300D\u300C\u53BB\u6280\u80FD\u5E02\u573A\u641C\u4E00\u4E0B\u300D\u65F6\u4F7F\u7528\u3002",
      "\u8FD4\u56DE\u5019\u9009\u6280\u80FD\uFF08\u540D\u79F0\u3001@\u547D\u540D\u7A7A\u95F4/slug\u3001\u5206\u7C7B\u3001\u4E0B\u8F7D\u4E0E\u5B89\u88C5\u91CF\u3001\u7B80\u4ECB\u3001\u4E3B\u9875\u94FE\u63A5\uFF09\u3002",
      "\u672C\u5DE5\u5177\u53EA\u8BFB\uFF1A\u4E0D\u4F1A\u5B89\u88C5\u3001\u5220\u9664\u6216\u4FEE\u6539\u4EFB\u4F55\u6587\u4EF6\uFF1B\u5B89\u88C5\u9700\u7531\u7528\u6237\u5728 Web UI \u7684\u6280\u80FD\u5E02\u573A\u9762\u677F\u4E2D\u786E\u8BA4\u3002"
    ].join(""),
    parameters: {
      keyword: { type: "string", description: "\u641C\u7D22\u5173\u952E\u8BCD\uFF08\u4E0A\u6E38\u505A\u5206\u8BCD\u5339\u914D\uFF09\u3002\u7559\u7A7A\u5219\u6309\u6392\u5E8F\u8FD4\u56DE\u70ED\u95E8\u6280\u80FD\u3002" },
      category: { type: "string", description: "\u4E00\u7EA7\u5206\u7C7B key\uFF0C\u5982 office-efficiency\u3001dev-programming\u3001data-analysis\u3001ai-agent\u3001professional \u7B49\u3002" },
      sortBy: {
        type: "string",
        enum: ["score", "downloads", "stars", "updated_at"],
        description: "\u6392\u5E8F\u65B9\u5F0F\uFF1Ascore\uFF08\u9ED8\u8BA4\uFF0C\u7EFC\u5408\u8BC4\u5206\uFF09/ downloads / stars / updated_at\u3002"
      },
      page: { type: "number", description: `\u9875\u7801\uFF0C\u4ECE 1 \u5F00\u59CB\uFF0C\u6BCF\u9875 ${TOOL_PAGE_SIZE} \u6761\u3002` }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }]
    },
    timeoutMs: 25e3,
    isConcurrencySafe: () => true,
    presentCall: (args) => {
      const keyword = typeof args.keyword === "string" ? args.keyword.trim() : "";
      return {
        card: "generic",
        title: keyword === "" ? "\u6D4F\u89C8\u6280\u80FD\u5E02\u573A" : `\u641C\u7D22\u6280\u80FD\u5E02\u573A\uFF1A${keyword}`,
        kind: "search"
      };
    },
    async execute(args, exec) {
      const page = await searchMarket(
        { fetchImpl, listLocal: async () => [] },
        {
          ...args.keyword === void 0 ? {} : { keyword: args.keyword },
          ...args.category === void 0 ? {} : { category: args.category },
          ...args.sortBy === void 0 ? {} : { sortBy: args.sortBy },
          page: typeof args.page === "number" && args.page > 0 ? args.page : 1,
          pageSize: TOOL_PAGE_SIZE
        },
        exec.signal
      );
      return renderValue({
        ok: true,
        source: page.source,
        degraded: page.degraded,
        total: page.total,
        page: page.page,
        items: page.items
      });
    }
  });
}

// src/host/index.ts
var name = "dsh-skillhub";
var inject = ["webServer"];
var Config = z.object({
  timeoutMs: z.number().step(1).min(1e3).max(12e4).default(15e3),
  defaultLevel: z.union([z.const("user"), z.const("project")]).default("user"),
  pageSize: z.number().step(1).min(1).max(100).default(30),
  enableModelTool: z.boolean().default(true)
});
var nodeFetch = async (url, init) => await fetch(url, {
  ...init.headers === void 0 ? {} : { headers: init.headers },
  ...init.signal === void 0 ? {} : { signal: init.signal },
  redirect: "follow"
});
function apply(ctx, config = {}) {
  const deps = { fetchImpl: nodeFetch };
  const route = {
    kind: "prefix",
    path: API_PREFIX,
    handler: (req, res) => {
      void handleApiRequest(deps, req, res);
    }
  };
  ctx.effect(() => ctx.webServer.register(route), "skill-hub: panel API route");
  if (config.enableModelTool !== false) {
    ctx.inject(["tools"], (toolCtx) => {
      toolCtx.effect(() => toolCtx.tools.register(createSearchTool(nodeFetch)), `skill-hub: ${SEARCH_TOOL_NAME}`);
    });
  }
}
export {
  Config,
  SEARCH_TOOL_NAME,
  apply,
  inject,
  name
};

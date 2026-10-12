// Built by dsh-skillhub — do not edit; see scripts/build.mjs.
window.__ModuleLoader__.load({ id: "dsh-skillhub", factory: function (require) {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/i18n.ts
var ZH = {
  "entry.label": "\u6280\u80FD\u5E02\u573A",
  "panel.title": "\u6280\u80FD\u5E02\u573A",
  "panel.subtitle": "\u4ECE SkillHub \u5B89\u88C5\u6280\u80FD\u5230\u7528\u6237\u7EA7\u6216\u9879\u76EE\u7EA7\u6280\u80FD\u76EE\u5F55",
  "tab.market": "\u5E02\u573A",
  "tab.installed": "\u5DF2\u5B89\u88C5",
  "action.close": "\u5173\u95ED",
  "action.refresh": "\u5237\u65B0",
  "action.retry": "\u91CD\u8BD5",
  "search.placeholder": "\u641C\u7D22\u6280\u80FD\uFF0C\u4F8B\u5982\u300C\u6570\u636E\u5206\u6790\u300D\u300C\u6587\u6863\u5904\u7406\u300D",
  "search.button": "\u641C\u7D22",
  "filter.allCategories": "\u5168\u90E8\u5206\u7C7B",
  "sort.score": "\u7EFC\u5408\u8BC4\u5206",
  "sort.downloads": "\u4E0B\u8F7D\u91CF",
  "sort.stars": "\u6536\u85CF\u6570",
  "sort.updated_at": "\u6700\u8FD1\u66F4\u65B0",
  "install.user": "\u88C5\u5230\u7528\u6237\u7EA7",
  "install.project": "\u88C5\u5230\u9879\u76EE\u7EA7",
  "install.installing": "\u5B89\u88C5\u4E2D\u2026",
  "install.done": "\u5DF2\u5B89\u88C5",
  "market.empty": "\u6CA1\u6709\u5339\u914D\u7684\u6280\u80FD\uFF0C\u6362\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5\u3002",
  "market.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "market.total": "\u5171 {total} \u4E2A\u6280\u80FD",
  "market.source.skillhub": "SkillHub \u4E3B\u6E90",
  "market.source.skillhub-mirror": "SkillHub \u955C\u50CF",
  "market.source.local": "\u672C\u673A\u5DF2\u5B89\u88C5",
  "market.degraded": "\u4E3B\u6E90\u4E0D\u53EF\u7528\uFF0C\u5DF2\u81EA\u52A8\u56DE\u9000\u5230{source}",
  "installed.empty": "\u8FD8\u6CA1\u6709\u5B89\u88C5\u4EFB\u4F55\u6280\u80FD\u3002",
  "installed.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "installed.filter.placeholder": "\u7B5B\u9009\u5DF2\u5B89\u88C5\u6280\u80FD",
  "installed.level.all": "\u5168\u90E8",
  "installed.level.project": "\u9879\u76EE\u7EA7",
  "installed.level.user": "\u7528\u6237\u7EA7",
  "installed.level.builtin": "\u5185\u7F6E/\u53EA\u8BFB",
  "installed.model": "\u6A21\u578B\u53EF\u8C03\u7528",
  "installed.user": "\u7528\u6237\u53EF\u8C03\u7528",
  "installed.model.hint": "\u5173\u95ED\u540E AI \u5C06\u4E0D\u518D\u5728\u4F1A\u8BDD\u4E2D\u81EA\u52A8\u52A0\u8F7D\u8BE5\u6280\u80FD",
  "installed.user.hint": "\u5173\u95ED\u540E /\u6280\u80FD\u540D \u624B\u52BF\u4E0D\u518D\u53EF\u7528",
  "installed.delete": "\u5220\u9664",
  "installed.promote": "\u5347\u4E3A\u7528\u6237\u7EA7",
  "installed.promote.hint": "\u79FB\u52A8\u5230\u7528\u6237\u7EA7\u76EE\u5F55\uFF0C\u6240\u6709\u9879\u76EE\u53EF\u89C1",
  "installed.readonly": "\u53EA\u8BFB",
  "installed.confirmDelete": "\u786E\u5B9A\u5220\u9664\u6280\u80FD\u300C{name}\u300D\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",
  "detail.overview": "\u6982\u8FF0",
  "detail.install": "\u5B89\u88C5",
  "detail.version": "\u7248\u672C {version}",
  "detail.openPage": "\u5728 SkillHub \u6253\u5F00",
  "detail.back": "\u8FD4\u56DE\u5217\u8868",
  "detail.noReadme": "\u8BE5\u6280\u80FD\u672A\u63D0\u4F9B\u6982\u8FF0\u5185\u5BB9\u3002",
  "notice.installed": "\u5DF2\u5B89\u88C5\u300C{name}\u300D\uFF08{level}\u7EA7\uFF0C{count} \u4E2A\u6587\u4EF6\uFF09",
  "notice.installedWarn": "\u5DF2\u5B89\u88C5\u300C{name}\u300D\uFF0C\u4F46 DSH \u4F1A\u5FFD\u7565\u5B83\uFF1A{reason}",
  "notice.removed": "\u5DF2\u5220\u9664\u300C{name}\u300D",
  "notice.promoted": "\u5DF2\u628A\u300C{name}\u300D\u5347\u7EA7\u4E3A\u7528\u6237\u7EA7",
  "notice.updated": "\u5DF2\u66F4\u65B0\u300C{name}\u300D\u7684\u8C03\u7528\u5F00\u5173",
  "warn.missing-frontmatter": "\u300CSKILL.md\u300D\u6CA1\u6709 YAML frontmatter \u5757",
  "warn.missing-name-or-description": "frontmatter \u5FC5\u987B\u540C\u65F6\u63D0\u4F9B name \u548C description",
  "warn.invalid-name": "name\u300C{detail}\u300D\u4E0D\u7B26\u5408 DSH \u8BED\u6CD5\uFF08\u53EA\u5141\u8BB8\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u8FDE\u5B57\u7B26\uFF09",
  "warn.legacy-invocation-key": "\u5B57\u6BB5\u300C{detail}\u300DDSH \u4E0D\u63A5\u53D7\uFF0C\u5E94\u6539\u7528\u300C{hint}\u300D",
  "warn.invalid-invocation-boolean": "\u8C03\u7528\u5F00\u5173\u300C{detail}\u300D\u7684\u503C\u4E0D\u662F\u5E03\u5C14\u503C",
  "warn.unreadable": "\u65E0\u6CD5\u56DE\u8BFB\u521A\u5199\u5165\u7684\u6587\u4EF6\uFF1A{detail}",
  "busy.working": "\u5904\u7406\u4E2D\u2026"
};
var EN = {
  "entry.label": "Skill Market",
  "panel.title": "Skill Market",
  "panel.subtitle": "Install SkillHub skills into user-level or project-level skill directories",
  "tab.market": "Market",
  "tab.installed": "Installed",
  "action.close": "Close",
  "action.refresh": "Refresh",
  "action.retry": "Retry",
  "search.placeholder": 'Search skills, e.g. "data analysis" or "documents"',
  "search.button": "Search",
  "filter.allCategories": "All categories",
  "sort.score": "Top rated",
  "sort.downloads": "Most downloaded",
  "sort.stars": "Most starred",
  "sort.updated_at": "Recently updated",
  "install.user": "Install (user)",
  "install.project": "Install (project)",
  "install.installing": "Installing\u2026",
  "install.done": "Installed",
  "market.empty": "No matching skills. Try another keyword.",
  "market.loading": "Loading\u2026",
  "market.total": "{total} skills",
  "market.source.skillhub": "SkillHub primary",
  "market.source.skillhub-mirror": "SkillHub mirror",
  "market.source.local": "Installed locally",
  "market.degraded": "Primary unavailable; fell back to {source}",
  "installed.empty": "No skills installed yet.",
  "installed.loading": "Loading\u2026",
  "installed.filter.placeholder": "Filter installed skills",
  "installed.level.all": "All",
  "installed.level.project": "Project",
  "installed.level.user": "User",
  "installed.level.builtin": "Built-in / read-only",
  "installed.model": "Model invocable",
  "installed.user": "User invocable",
  "installed.model.hint": "When off, the model no longer auto-loads this skill in a session",
  "installed.user.hint": "When off, the /skill-name gesture is unavailable",
  "installed.delete": "Delete",
  "installed.promote": "Promote to user",
  "installed.promote.hint": "Move to the user-level directory, visible to every project",
  "installed.readonly": "Read-only",
  "installed.confirmDelete": 'Delete skill "{name}"? This cannot be undone.',
  "detail.overview": "Overview",
  "detail.install": "Install",
  "detail.version": "Version {version}",
  "detail.openPage": "Open on SkillHub",
  "detail.back": "Back to list",
  "detail.noReadme": "No overview content was provided for this skill.",
  "notice.installed": 'Installed "{name}" at {level} level ({count} files)',
  "notice.installedWarn": 'Installed "{name}", but DSH will ignore it: {reason}',
  "notice.removed": 'Removed "{name}"',
  "notice.promoted": 'Promoted "{name}" to user level',
  "notice.updated": 'Updated invocation switches for "{name}"',
  "warn.missing-frontmatter": "SKILL.md has no YAML frontmatter block",
  "warn.missing-name-or-description": "frontmatter requires both name and description",
  "warn.invalid-name": 'name "{detail}" does not match DSH grammar (lowercase letters, digits, hyphens)',
  "warn.legacy-invocation-key": 'DSH rejects the field "{detail}"; use "{hint}" instead',
  "warn.invalid-invocation-boolean": 'invocation switch "{detail}" does not carry a boolean value',
  "warn.unreadable": "could not read the installed skill back: {detail}",
  "busy.working": "Working\u2026"
};
var DICTIONARIES = { zh: ZH, en: EN };
function detectLocale() {
  try {
    const language = navigator.language.toLowerCase();
    return language.startsWith("zh") ? "zh" : "en";
  } catch {
    return "zh";
  }
}
function bindTranslate(locale) {
  const dictionary = DICTIONARIES[locale];
  return (key, params) => {
    const template = dictionary[key] ?? key;
    if (params === void 0) return template;
    return template.replace(/\{(\w+)\}/g, (match, name2) => Object.hasOwn(params, name2) ? String(params[name2]) : match);
  };
}

// src/client/entry.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function MarketGlyph({ size = 16 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      className: "smk-entry-icon",
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      "aria-hidden": "true",
      focusable: "false",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "path",
          {
            d: "M2 6.2 3.1 2.6h9.8L14 6.2a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0Z",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.2",
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "path",
          {
            d: "M3.4 8.4v4.3c0 .5.4.9.9.9h7.4c.5 0 .9-.4.9-.9V8.4",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.2",
            strokeLinecap: "round"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.6 13.6V10h2.8v3.6", fill: "none", stroke: "currentColor", strokeWidth: "1.2", strokeLinejoin: "round" })
      ]
    }
  );
}
function SkillMarketEntry(props) {
  const { wide, toggle, useMarket, t } = props;
  const open = useMarket((snapshot) => snapshot.open);
  const label = t("entry.label");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: "smk-entry",
      "data-active": open ? "true" : "false",
      onClick: toggle,
      title: label,
      "aria-label": label,
      "aria-expanded": open,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketGlyph, {}),
        wide ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "smk-entry-label", children: label }) : null
      ]
    }
  );
}

// src/client/panel.tsx
var import_react = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function statsLine(item) {
  const parts = [];
  if (item.downloads > 0) parts.push(`\u2193 ${item.downloads}`);
  if (item.installs > 0) parts.push(`\u2913 ${item.installs}`);
  if (item.stars > 0) parts.push(`\u2605 ${item.stars}`);
  return parts.join("   ");
}
function levelLabel(t, level) {
  if (level === "project") return t("installed.level.project");
  if (level === "user") return t("installed.level.user");
  if (level === "builtin") return t("installed.level.builtin");
  return t("installed.level.all");
}
function sourceLabelOf(t, source) {
  if (source === "skillhub") return t("market.source.skillhub");
  if (source === "skillhub-mirror") return t("market.source.skillhub-mirror");
  return t("market.source.local");
}
function MarketRow({ item, actions, t, busyKey }) {
  const key = `${item.namespace}/${item.slug}`;
  const installing = busyKey === key;
  const blocked = busyKey !== "" || item.namespace === "";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "smk-link",
            onClick: () => actions.openDetail(item),
            title: item.name,
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-row-name", children: item.name })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-row-id", children: item.namespace === "" ? item.slug : `@${item.namespace}/${item.slug}` })
      ] }),
      item.description === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-row-desc", children: item.description }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-stats", children: [
        statsLine(item),
        item.category === "" ? null : `   #${item.category}`
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-btn",
          "data-variant": "primary",
          "data-size": "sm",
          disabled: blocked,
          onClick: () => actions.install(item, "user"),
          children: installing ? t("install.installing") : t("install.user")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-btn",
          "data-size": "sm",
          disabled: blocked,
          onClick: () => actions.install(item, "project"),
          children: t("install.project")
        }
      )
    ] })
  ] });
}
function MarketTab({ actions, t, useMarket }) {
  const market = useMarket((snapshot) => snapshot.market);
  const categories = useMarket((snapshot) => snapshot.categories);
  const categoriesDegraded = useMarket((snapshot) => snapshot.categoriesDegraded);
  const result = market.result;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          className: "smk-input",
          value: market.keyword,
          placeholder: t("search.placeholder"),
          onChange: (event) => actions.setKeyword(event.currentTarget.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") actions.submitSearch();
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "select",
        {
          className: "smk-select",
          value: market.category,
          onChange: (event) => actions.setCategory(event.currentTarget.value),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: t("filter.allCategories") }),
            categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: category.key, children: category.name }, category.key))
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "select",
        {
          className: "smk-select",
          value: market.sortBy,
          onChange: (event) => actions.setSortBy(event.currentTarget.value),
          children: ["score", "downloads", "stars", "updated_at"].map((sort) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: sort, children: t(`sort.${sort}`) }, sort))
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "smk-btn", "data-variant": "primary", onClick: actions.submitSearch, children: t("search.button") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-meta", children: result === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("market.total", { total: result.total }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", children: sourceLabelOf(t, result.source) }),
      result.degraded ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", "data-tone": "warn", children: t("market.degraded", { source: sourceLabelOf(t, result.source) }) }) : null,
      categoriesDegraded ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", "data-tone": "warn", children: "categories: built-in" }) : null
    ] }) }),
    market.error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-error", children: market.error }),
    result !== null && result.items.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-list", children: result.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      MarketRow,
      {
        item,
        actions,
        t,
        busyKey: market.installingKey
      },
      `${item.namespace}/${item.slug}`
    )) }) : market.loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-loading", children: t("market.loading") }) : market.error === null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-empty", children: t("market.empty") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: result === null ? "" : t("market.total", { total: result.total }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-pager", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "smk-btn",
            "data-size": "sm",
            disabled: market.page <= 1 || market.loading,
            onClick: () => actions.goToPage(market.page - 1),
            children: "\u2039"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: market.page }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "smk-btn",
            "data-size": "sm",
            disabled: market.loading || result === null || market.page * result.pageSize >= result.total,
            onClick: () => actions.goToPage(market.page + 1),
            children: "\u203A"
          }
        )
      ] })
    ] })
  ] });
}
function InstalledRow({ skill, actions, t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-row-name", children: skill.name }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-row-id", children: skill.dir }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", children: levelLabel(t, skill.level) }),
        skill.manageable ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", "data-tone": "warn", children: t("installed.readonly") })
      ] }),
      skill.description === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-row-desc", children: skill.description }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-switches", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "smk-switch", "data-readonly": skill.manageable ? "false" : "true", title: t("installed.model.hint"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "checkbox",
              checked: skill.modelInvocable,
              disabled: !skill.manageable || skill.pending !== void 0,
              onChange: (event) => actions.setInvocation(skill, "modelInvocable", event.currentTarget.checked)
            }
          ),
          t("installed.model")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "smk-switch", "data-readonly": skill.manageable ? "false" : "true", title: t("installed.user.hint"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "checkbox",
              checked: skill.userInvocable,
              disabled: !skill.manageable || skill.pending !== void 0,
              onChange: (event) => actions.setInvocation(skill, "userInvocable", event.currentTarget.checked)
            }
          ),
          t("installed.user")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-row-actions", children: [
      skill.level === "project" && skill.manageable ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-btn",
          "data-size": "sm",
          onClick: () => actions.promote(skill),
          title: t("installed.promote.hint"),
          children: t("installed.promote")
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-btn",
          "data-size": "sm",
          "data-variant": "danger",
          disabled: !skill.manageable,
          onClick: () => {
            if (window.confirm(t("installed.confirmDelete", { name: skill.name }))) actions.uninstall(skill);
          },
          children: t("installed.delete")
        }
      )
    ] })
  ] });
}
function InstalledTab({ actions, t, useMarket }) {
  const installed = useMarket((snapshot) => snapshot.installed);
  const rows = (0, import_react.useMemo)(() => {
    const filter = installed.filter.trim().toLowerCase();
    return installed.skills.filter((skill) => {
      if (installed.level !== "all" && skill.level !== installed.level) return false;
      if (filter === "") return true;
      return skill.name.toLowerCase().includes(filter) || skill.dir.toLowerCase().includes(filter) || skill.description.toLowerCase().includes(filter);
    });
  }, [installed.filter, installed.level, installed.skills]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          className: "smk-input",
          value: installed.filter,
          placeholder: t("installed.filter.placeholder"),
          onChange: (event) => actions.setInstalledFilter(event.currentTarget.value)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "select",
        {
          className: "smk-select",
          value: installed.level,
          onChange: (event) => actions.setInstalledLevel(event.currentTarget.value),
          children: ["all", "project", "user", "builtin"].map((level) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: level, children: levelLabel(t, level) }, level))
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "smk-btn", onClick: () => actions.refresh(), children: t("action.refresh") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-dirs", children: [
      installed.projectDir === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        "project: ",
        installed.projectDir
      ] }),
      installed.userDir === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        "user: ",
        installed.userDir
      ] })
    ] }),
    installed.error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-error", children: installed.error }),
    installed.skills.length === 0 && installed.loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-loading", children: t("installed.loading") }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-empty", children: t("installed.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-list", children: rows.map((skill) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(InstalledRow, { skill, actions, t }, `${skill.level}:${skill.dir}`)) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
        rows.length,
        " / ",
        installed.skills.length
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: installed.loading ? t("installed.loading") : "" })
    ] })
  ] });
}
function DetailView({ actions, t, useMarket }) {
  const detail = useMarket((snapshot) => snapshot.detail);
  const item = detail.item;
  const record = detail.detail;
  if (item === null) return null;
  const body = record === null ? item.description === "" ? t("detail.noReadme") : item.description : record.readme === "" ? record.summary === "" ? t("detail.noReadme") : record.summary : record.readme;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-detail", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-detail-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "smk-btn", "data-size": "sm", onClick: actions.closeDetail, children: t("detail.back") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: item.name }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-row-id", children: item.namespace === "" ? item.slug : `@${item.namespace}/${item.slug}` }),
      record !== null && record.version !== "" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", children: t("detail.version", { version: record.version }) }) : null,
      item.pageUrl === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { className: "smk-btn", "data-size": "sm", href: item.pageUrl, target: "_blank", rel: "noreferrer noopener", children: t("detail.openPage") })
    ] }),
    detail.loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-loading", children: t("market.loading") }) : null,
    detail.error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-error", children: detail.error }),
    record !== null && record.tags.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-meta", style: { padding: "0 0 8px" }, children: record.tags.slice(0, 8).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "smk-chip", children: tag }, tag)) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-detail-body", children: body }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-detail-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-btn",
          "data-variant": "primary",
          "data-size": "sm",
          disabled: item.namespace === "",
          onClick: () => actions.install(item, "user"),
          children: t("install.user")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-btn",
          "data-size": "sm",
          disabled: item.namespace === "",
          onClick: () => actions.install(item, "project"),
          children: t("install.project")
        }
      )
    ] })
  ] });
}
function SkillMarketOverlay(props) {
  const { actions, t, useMarket } = props;
  const open = useMarket((snapshot) => snapshot.open);
  const tab = useMarket((snapshot) => snapshot.tab);
  const notice = useMarket((snapshot) => snapshot.notice);
  const detailItem = useMarket((snapshot) => snapshot.detail.item);
  const detailOpen = detailItem !== null;
  (0, import_react.useEffect)(() => {
    if (!open) return void 0;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (detailOpen) actions.closeDetail();
      else actions.close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, detailOpen, actions]);
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-layer", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-mask", onClick: actions.close, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-panel", role: "dialog", "aria-modal": "true", "aria-label": t("panel.title"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "smk-head-main", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "smk-title", children: t("panel.title") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "smk-subtitle", children: t("panel.subtitle") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "smk-icon-btn", onClick: actions.close, "aria-label": t("action.close"), children: "\u2715" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-tabs", children: ["market", "installed"].map((value) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "smk-tab",
          "data-on": tab === value ? "true" : "false",
          onClick: () => {
            actions.clearNotice();
            actions.setTab(value);
          },
          children: t(value === "market" ? "tab.market" : "tab.installed")
        },
        value
      )) }),
      notice === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "smk-notice", "data-kind": notice.kind, onDoubleClick: actions.clearNotice, children: notice.text }),
      detailOpen ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(DetailView, { actions, t, useMarket }) : tab === "market" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(MarketTab, { actions, t, useMarket }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(InstalledTab, { actions, t, useMarket })
    ] })
  ] });
}

// src/client/styles.ts
var P = "smk";
var PANEL_CSS = `
.${P}-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--dsw-radius-md, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, CanvasText);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.${P}-entry:hover { background: var(--dsw-alias-fill-l1, color-mix(in srgb, CanvasText 8%, transparent)); color: var(--dsw-alias-label-primary, CanvasText); }
.${P}-entry[data-active='true'] { color: var(--dsw-alias-brand-primary, AccentColor); }
.${P}-entry-icon { display: block; flex: none; }
.${P}-entry-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* The overlay layer is click-through by contract: only the mask and the panel
   opt back into pointer events, so the app underneath stays interactive. */
.${P}-layer {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5vh 16px;
  pointer-events: none;
}
.${P}-mask {
  position: absolute;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1, color-mix(in srgb, #000 42%, transparent));
  pointer-events: auto;
}
.${P}-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(760px, 96vw);
  max-height: 90vh;
  overflow: hidden;
  pointer-events: auto;
  border: 0.5px solid var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 20%, transparent));
  border-radius: var(--dsw-radius-panel, 14px);
  background: var(--dsw-alias-bg-overlay, Canvas);
  color: var(--dsw-alias-label-primary, CanvasText);
  box-shadow: 0 18px 48px color-mix(in srgb, #000 34%, transparent);
  font-size: 13px;
  line-height: 1.5;
}

.${P}-head { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px 0; }
.${P}-head-main { min-width: 0; flex: 1; }
.${P}-title { margin: 0; font-size: 15px; font-weight: 600; }
.${P}-subtitle { margin: 2px 0 0; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); font-size: 12px; }
.${P}-icon-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, CanvasText);
  cursor: pointer;
}
.${P}-icon-btn:hover { background: var(--dsw-alias-fill-l1, color-mix(in srgb, CanvasText 8%, transparent)); }
.${P}-icon-btn[disabled] { opacity: .45; cursor: default; }

.${P}-tabs { display: flex; gap: 4px; padding: 10px 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent)); }
.${P}-tab {
  padding: 7px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary, CanvasText);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
.${P}-tab[data-on='true'] { color: var(--dsw-alias-label-primary, CanvasText); border-bottom-color: var(--dsw-alias-brand-primary, AccentColor); }

.${P}-notice { margin: 10px 16px 0; padding: 8px 10px; border-radius: var(--dsw-radius-md, 8px); font-size: 12px; border: 0.5px solid transparent; }
.${P}-notice[data-kind='ok'] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #2e9e5b) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #2e9e5b) 40%, transparent); }
.${P}-notice[data-kind='warn'] { background: color-mix(in srgb, var(--dsw-alias-state-warning-primary, #c98a1b) 16%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-warning-primary, #c98a1b) 45%, transparent); }
.${P}-notice[data-kind='error'] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d94a4a) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d94a4a) 40%, transparent); }

.${P}-toolbar { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px 8px; }
.${P}-input, .${P}-select {
  height: 30px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 20%, transparent));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 4%, transparent));
  color: inherit;
  font: inherit;
  outline: none;
}
.${P}-input:focus, .${P}-select:focus { border-color: var(--dsw-alias-brand-primary, AccentColor); }
.${P}-input { flex: 1 1 220px; min-width: 0; }
.${P}-select { flex: none; }

.${P}-btn {
  height: 30px;
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 20%, transparent));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 4%, transparent));
  color: inherit;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.${P}-btn:hover:not([disabled]) { background: var(--dsw-alias-fill-l1, color-mix(in srgb, CanvasText 9%, transparent)); }
.${P}-btn[disabled] { opacity: .5; cursor: default; }
.${P}-btn[data-variant='primary'] { background: var(--dsw-alias-brand-primary, AccentColor); border-color: transparent; color: var(--dsw-alias-label-primary-inverted, #fff); }
.${P}-btn[data-variant='danger'] { color: var(--dsw-alias-label-error, #d94a4a); }
.${P}-btn[data-size='sm'] { height: 26px; padding: 0 9px; font-size: 12px; }

.${P}-meta { display: flex; align-items: center; gap: 8px; padding: 0 16px 8px; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); font-size: 12px; }
.${P}-chip { padding: 1px 7px; border-radius: 999px; border: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 16%, transparent)); }
.${P}-chip[data-tone='warn'] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #c98a20) 50%, transparent); color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary, #c98a20)); }

.${P}-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; }
.${P}-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent));
  border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 3%, transparent));
}
.${P}-row-main { flex: 1; min-width: 0; }
.${P}-row-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.${P}-row-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.${P}-link {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.${P}-link:hover .${P}-row-name { text-decoration: underline; }
.${P}-row-id { color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 58%, transparent)); font-size: 11px; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
.${P}-row-desc { margin-top: 3px; color: var(--dsw-alias-label-secondary, color-mix(in srgb, CanvasText 78%, transparent)); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.${P}-row-actions { flex: none; display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
.${P}-row-stats { margin-top: 4px; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 58%, transparent)); font-size: 11px; }

.${P}-switches { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.${P}-switch { display: inline-flex; align-items: center; gap: 5px; color: var(--dsw-alias-label-secondary, CanvasText); font-size: 12px; cursor: pointer; }
.${P}-switch input { margin: 0; accent-color: var(--dsw-alias-brand-primary, AccentColor); }
.${P}-switch[data-readonly='true'] { cursor: default; opacity: .7; }

.${P}-empty, .${P}-loading { padding: 22px 16px; text-align: center; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); }
.${P}-error { margin: 8px 16px; padding: 8px 10px; border-radius: var(--dsw-radius-md, 8px); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d94a4a) 12%, transparent); color: var(--dsw-alias-label-error, #d94a4a); font-size: 12px; }

.${P}-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 16px; border-top: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent)); color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); font-size: 12px; }
.${P}-pager { display: flex; align-items: center; gap: 6px; }

.${P}-detail { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 16px; }
.${P}-detail-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.${P}-detail-body { white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary, CanvasText); font-size: 12.5px; }
.${P}-detail-actions { display: flex; gap: 8px; margin-top: 12px; }
.${P}-dirs { padding: 8px 16px 0; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 58%, transparent)); font-size: 11px; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); word-break: break-all; }
`;

// src/client/api.ts
var API_BASE = "/plugins/dsh-skillhub/api";
var MarketTransportError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MarketTransportError";
  }
};
async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new MarketTransportError(error instanceof Error ? error.message : String(error));
  }
  if (!response.ok) throw new MarketTransportError(`HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new MarketTransportError("malformed response from the skill-hub route");
  }
}
function unwrap(envelope) {
  if (!envelope.ok) {
    const error = new Error(envelope.error);
    if (envelope.kind !== void 0) error.name = envelope.kind;
    throw error;
  }
  return envelope;
}
async function searchMarket(request) {
  return unwrap(await post("/search", { ...request }));
}
async function loadCategories() {
  return unwrap(await post("/categories", {}));
}
async function listInstalled() {
  return unwrap(await post("/installed", {}));
}
async function installSkill(request) {
  return unwrap(await post("/install", { ...request }));
}
async function uninstallSkill(request) {
  unwrap(await post("/uninstall", { ...request }));
}
async function promoteSkill(request) {
  return unwrap(await post("/promote", { ...request }));
}
async function setInvocation(request) {
  unwrap(await post("/set-invocation", { ...request }));
}
async function fetchDetail(request) {
  return unwrap(await post("/detail", { ...request }));
}

// src/client/store.ts
function describeContractIssue(issue, t) {
  const key = `warn.${issue.code}`;
  const text = t(key, { detail: issue.detail ?? "", hint: issue.hint ?? "" });
  return text === key ? issue.message : text;
}
var INITIAL_MARKET = {
  keyword: "",
  category: "",
  sortBy: "score",
  page: 1,
  loading: false,
  error: null,
  result: null,
  installingKey: "",
  installedKeys: []
};
var INITIAL_INSTALLED = {
  loading: false,
  error: null,
  skills: [],
  projectDir: "",
  userDir: "",
  filter: "",
  level: "all"
};
var INITIAL_DETAIL = { loading: false, item: null, detail: null, error: null };
function rowKey(item) {
  return `${item.namespace}/${item.slug}`;
}
function levelOf(source, level) {
  return source.endsWith("dsh") ? "builtin" : level;
}
var SkillMarketStore = class {
  snapshot = {
    open: false,
    tab: "market",
    loaded: false,
    market: INITIAL_MARKET,
    installed: INITIAL_INSTALLED,
    categories: [],
    categoriesDegraded: false,
    detail: INITIAL_DETAIL,
    notice: null
  };
  listeners = /* @__PURE__ */ new Set();
  /** Read the current snapshot (identity-stable between mutations). */
  getSnapshot() {
    return this.snapshot;
  }
  /** Subscribe to snapshot changes. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  commit(patch) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  patchMarket(patch) {
    this.commit({ market: { ...this.snapshot.market, ...patch } });
  }
  patchInstalled(patch) {
    this.commit({ installed: { ...this.snapshot.installed, ...patch } });
  }
  /* ---------------------------------------------------------------- */
  /* Panel lifecycle                                                   */
  /* ---------------------------------------------------------------- */
  /** Open the panel, running the first load exactly once. */
  open() {
    this.commit({ open: true });
    if (!this.snapshot.loaded) {
      this.commit({ loaded: true });
      void this.loadCategories();
      void this.search();
      void this.loadInstalled();
    }
  }
  /** Close the panel and drop any transient notice. */
  close() {
    this.commit({ open: false, notice: null, detail: INITIAL_DETAIL });
  }
  /** Flip the panel's visibility. */
  toggle() {
    if (this.snapshot.open) this.close();
    else this.open();
  }
  /** Select a tab. */
  setTab(tab) {
    if (this.snapshot.tab === tab) return;
    this.commit({ tab });
    if (tab === "installed") void this.loadInstalled();
  }
  /** Dismiss the current notice. */
  clearNotice() {
    if (this.snapshot.notice !== null) this.commit({ notice: null });
  }
  notify(kind, text) {
    this.commit({ notice: { kind, text } });
  }
  /* ---------------------------------------------------------------- */
  /* Market tab                                                        */
  /* ---------------------------------------------------------------- */
  /** Update the search box (no request). */
  setKeyword(keyword) {
    this.patchMarket({ keyword });
  }
  /** Update the category filter and re-query immediately. */
  setCategory(category) {
    this.patchMarket({ category, page: 1 });
    void this.search();
  }
  /** Update the sort key and re-query immediately. */
  setSortBy(sortBy) {
    this.patchMarket({ sortBy, page: 1 });
    void this.search();
  }
  /** Move one page and re-query. */
  goToPage(page) {
    if (page < 1) return;
    this.patchMarket({ page });
    void this.search();
  }
  /** Run the current query. */
  async search() {
    const { keyword, category, sortBy, page } = this.snapshot.market;
    this.patchMarket({ loading: true, error: null });
    try {
      const result = await searchMarket({
        ...keyword.trim() === "" ? {} : { keyword: keyword.trim() },
        ...category === "" ? {} : { category },
        sortBy,
        page
      });
      this.patchMarket({ loading: false, result, error: null });
    } catch (error) {
      this.patchMarket({ loading: false, error: messageOf(error) });
    }
  }
  /** Load the category table, falling back to the built-in copy. */
  async loadCategories() {
    try {
      const loaded = await loadCategories();
      this.commit({ categories: loaded.categories, categoriesDegraded: loaded.degraded });
    } catch {
      this.commit({ categories: [], categoriesDegraded: true });
    }
  }
  /* ---------------------------------------------------------------- */
  /* Install / uninstall                                               */
  /* ---------------------------------------------------------------- */
  /**
   * Install one market row at the requested level.
   * @param item - the row.
   * @param level - target level.
   * @param t - translate function for the result notice.
   */
  async install(item, level, t) {
    const key = rowKey(item);
    if (this.snapshot.market.installingKey !== "") return;
    this.patchMarket({ installingKey: key });
    try {
      const result = await installSkill({ slug: item.slug, namespace: item.namespace, level });
      this.patchMarket({
        installingKey: "",
        installedKeys: this.snapshot.market.installedKeys.includes(key) ? this.snapshot.market.installedKeys : [...this.snapshot.market.installedKeys, key]
      });
      const issue = result.warnings[0];
      if (issue === void 0) {
        this.notify("ok", t("notice.installed", {
          name: item.name,
          level: t(level === "user" ? "installed.level.user" : "installed.level.project"),
          count: result.fileCount
        }));
      } else {
        this.notify("warn", t("notice.installedWarn", {
          name: item.name,
          reason: describeContractIssue(issue, t)
        }));
      }
      await this.loadInstalled();
    } catch (error) {
      this.patchMarket({ installingKey: "" });
      this.notify("error", messageOf(error));
    }
  }
  /** Remove an installed skill. */
  async uninstall(skill, t) {
    try {
      await uninstallSkill({ name: skill.dir, level: skill.level === "builtin" ? "user" : skill.level });
      this.notify("ok", t("notice.removed", { name: skill.name }));
      await this.loadInstalled();
    } catch (error) {
      this.notify("error", messageOf(error));
    }
  }
  /** Promote a project-level skill to user level. */
  async promote(skill, t) {
    try {
      await promoteSkill({ name: skill.dir });
      this.notify("ok", t("notice.promoted", { name: skill.name }));
      await this.loadInstalled();
    } catch (error) {
      this.notify("error", messageOf(error));
    }
  }
  /**
   * Flip one invocation switch, optimistically updating the row.
   * @param skill - the row.
   * @param surface - which switch.
   * @param value - new value.
   * @param t - translate function for the result notice.
   */
  async setInvocation(skill, surface, value, t) {
    const pending = `${skill.dir}:${surface}`;
    this.patchInstalled({
      skills: this.snapshot.installed.skills.map((row) => row.dir === skill.dir ? { ...row, pending, [surface]: value } : row)
    });
    try {
      await setInvocation({
        name: skill.dir,
        level: skill.level === "builtin" ? "user" : skill.level,
        [surface]: value
      });
      this.notify("ok", t("notice.updated", { name: skill.name }));
      await this.loadInstalled();
    } catch (error) {
      this.notify("error", messageOf(error));
      await this.loadInstalled();
    }
  }
  /* ---------------------------------------------------------------- */
  /* Installed tab                                                     */
  /* ---------------------------------------------------------------- */
  /** Update the installed-list text filter. */
  setInstalledFilter(filter) {
    this.patchInstalled({ filter });
  }
  /** Update the installed-list level filter. */
  setInstalledLevel(level) {
    this.patchInstalled({ level });
  }
  /** Reload the installed list and the resolved directories. */
  async loadInstalled() {
    this.patchInstalled({ loading: true, error: null });
    try {
      const loaded = await listInstalled();
      this.patchInstalled({
        loading: false,
        error: null,
        projectDir: loaded.projectDir,
        userDir: loaded.userDir,
        skills: loaded.skills.map((skill) => ({
          level: levelOf(skill.source, skill.level),
          manageable: skill.manageable,
          source: skill.source,
          dir: skill.dir,
          name: skill.name,
          description: skill.description,
          modelInvocable: skill.modelInvocable,
          userInvocable: skill.userInvocable
        }))
      });
    } catch (error) {
      this.patchInstalled({ loading: false, error: messageOf(error) });
    }
  }
  /* ---------------------------------------------------------------- */
  /* Detail view                                                       */
  /* ---------------------------------------------------------------- */
  /** Open the detail view for one market row. */
  async openDetail(item) {
    this.commit({ detail: { loading: true, item, detail: null, error: null } });
    if (item.namespace === "") {
      this.commit({ detail: { loading: false, item, detail: null, error: null } });
      return;
    }
    try {
      const loaded = await fetchDetail({ slug: item.slug, namespace: item.namespace });
      this.commit({ detail: { loading: false, item, detail: loaded.detail, error: null } });
    } catch (error) {
      this.commit({ detail: { loading: false, item, detail: null, error: messageOf(error) } });
    }
  }
  /** Close the detail view. */
  closeDetail() {
    this.commit({ detail: INITIAL_DETAIL });
  }
};
function messageOf(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

// src/client/index.tsx
var name = "dsh-skillhub";
var inject = ["slots"];
var ENTRY_ID = "skill-hub";
var OVERLAY_ID = "skill-hub-panel";
var ENTRY_ORDER = -40;
function apply(ctx) {
  const t = bindTranslate(detectLocale());
  const store = new SkillMarketStore();
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset["plugin"] = name;
    tag.textContent = PANEL_CSS;
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, "skill-hub: panel styles");
  const actions = {
    close: () => {
      store.close();
    },
    setTab: (tab) => {
      store.setTab(tab);
    },
    clearNotice: () => {
      store.clearNotice();
    },
    setKeyword: (keyword) => {
      store.setKeyword(keyword);
    },
    submitSearch: () => {
      void store.search();
    },
    setCategory: (category) => {
      store.setCategory(category);
    },
    setSortBy: (sortBy) => {
      store.setSortBy(sortBy);
    },
    goToPage: (page) => {
      store.goToPage(page);
    },
    refresh: () => {
      void store.loadInstalled();
    },
    install: (item, level) => {
      void store.install(item, level, t);
    },
    openDetail: (item) => {
      void store.openDetail(item);
    },
    closeDetail: () => {
      store.closeDetail();
    },
    setInstalledFilter: (filter) => {
      store.setInstalledFilter(filter);
    },
    setInstalledLevel: (level) => {
      store.setInstalledLevel(level);
    },
    uninstall: (skill) => {
      void store.uninstall(skill, t);
    },
    promote: (skill) => {
      void store.promote(skill, t);
    },
    setInvocation: (skill, surface, value) => {
      void store.setInvocation(skill, surface, value, t);
    }
  };
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: ENTRY_ID,
    order: ENTRY_ORDER,
    label: () => t("entry.label"),
    inject: () => ({
      toggle: () => {
        store.toggle();
      },
      t,
      hooks: { market: store }
    })
  }, SkillMarketEntry));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
    name: "shell.overlay",
    id: OVERLAY_ID,
    order: 120,
    label: () => t("panel.title"),
    inject: () => ({
      actions,
      t,
      hooks: { market: store }
    })
  }, SkillMarketOverlay));
}
return module.exports;
} });

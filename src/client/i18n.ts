/**
 * Panel copy. Kept as a self-contained dictionary rather than the framework's
 * locale seat: the published `@deepseek-ai/dsh-client-locale` client entry
 * imports `@deepseek-ai/dsh-client-runtime/client`, which is not published, so
 * depending on it would make this plugin un-typeable and would make rendering
 * fail loud on any profile whose locale face is not installed. The dictionary
 * is registered with `plugins` display metadata separately (see `locale/*.json`).
 */

/** Supported locales, matching DSH's own set. */
export type LocaleId = 'zh' | 'en'

/** Copy keys. */
export type CopyKey =
  | 'entry.label'
  | 'panel.title'
  | 'panel.subtitle'
  | 'tab.market'
  | 'tab.installed'
  | 'action.close'
  | 'action.refresh'
  | 'action.retry'
  | 'search.placeholder'
  | 'search.button'
  | 'filter.allCategories'
  | 'sort.score'
  | 'sort.downloads'
  | 'sort.stars'
  | 'sort.updated_at'
  | 'install.user'
  | 'install.project'
  | 'install.installing'
  | 'install.done'
  | 'market.empty'
  | 'market.loading'
  | 'market.total'
  | 'market.source.skillhub'
  | 'market.source.skillhub-mirror'
  | 'market.source.local'
  | 'market.degraded'
  | 'installed.empty'
  | 'installed.loading'
  | 'installed.filter.placeholder'
  | 'installed.level.all'
  | 'installed.level.project'
  | 'installed.level.user'
  | 'installed.level.builtin'
  | 'installed.model'
  | 'installed.user'
  | 'installed.model.hint'
  | 'installed.user.hint'
  | 'installed.delete'
  | 'installed.promote'
  | 'installed.promote.hint'
  | 'installed.readonly'
  | 'installed.confirmDelete'
  | 'detail.overview'
  | 'detail.install'
  | 'detail.version'
  | 'detail.openPage'
  | 'detail.back'
  | 'detail.noReadme'
  | 'notice.installed'
  | 'notice.installedWarn'
  | 'notice.removed'
  | 'notice.promoted'
  | 'notice.updated'
  | 'warn.missing-frontmatter'
  | 'warn.missing-name-or-description'
  | 'warn.invalid-name'
  | 'warn.legacy-invocation-key'
  | 'warn.invalid-invocation-boolean'
  | 'warn.unreadable'
  | 'busy.working'

/** Chinese dictionary (default). */
const ZH: Record<CopyKey, string> = {
  'entry.label': '技能市场',
  'panel.title': '技能市场',
  'panel.subtitle': '从 SkillHub 安装技能到用户级或项目级技能目录',
  'tab.market': '市场',
  'tab.installed': '已安装',
  'action.close': '关闭',
  'action.refresh': '刷新',
  'action.retry': '重试',
  'search.placeholder': '搜索技能，例如「数据分析」「文档处理」',
  'search.button': '搜索',
  'filter.allCategories': '全部分类',
  'sort.score': '综合评分',
  'sort.downloads': '下载量',
  'sort.stars': '收藏数',
  'sort.updated_at': '最近更新',
  'install.user': '装到用户级',
  'install.project': '装到项目级',
  'install.installing': '安装中…',
  'install.done': '已安装',
  'market.empty': '没有匹配的技能，换个关键词试试。',
  'market.loading': '加载中…',
  'market.total': '共 {total} 个技能',
  'market.source.skillhub': 'SkillHub 主源',
  'market.source.skillhub-mirror': 'SkillHub 镜像',
  'market.source.local': '本机已安装',
  'market.degraded': '主源不可用，已自动回退到{source}',
  'installed.empty': '还没有安装任何技能。',
  'installed.loading': '加载中…',
  'installed.filter.placeholder': '筛选已安装技能',
  'installed.level.all': '全部',
  'installed.level.project': '项目级',
  'installed.level.user': '用户级',
  'installed.level.builtin': '内置/只读',
  'installed.model': '模型可调用',
  'installed.user': '用户可调用',
  'installed.model.hint': '关闭后 AI 将不再在会话中自动加载该技能',
  'installed.user.hint': '关闭后 /技能名 手势不再可用',
  'installed.delete': '删除',
  'installed.promote': '升为用户级',
  'installed.promote.hint': '移动到用户级目录，所有项目可见',
  'installed.readonly': '只读',
  'installed.confirmDelete': '确定删除技能「{name}」？此操作不可撤销。',
  'detail.overview': '概述',
  'detail.install': '安装',
  'detail.version': '版本 {version}',
  'detail.openPage': '在 SkillHub 打开',
  'detail.back': '返回列表',
  'detail.noReadme': '该技能未提供概述内容。',
  'notice.installed': '已安装「{name}」（{level}级，{count} 个文件）',
  'notice.installedWarn': '已安装「{name}」，但 DSH 会忽略它：{reason}',
  'notice.removed': '已删除「{name}」',
  'notice.promoted': '已把「{name}」升级为用户级',
  'notice.updated': '已更新「{name}」的调用开关',
  'warn.missing-frontmatter': '「SKILL.md」没有 YAML frontmatter 块',
  'warn.missing-name-or-description': 'frontmatter 必须同时提供 name 和 description',
  'warn.invalid-name': 'name「{detail}」不符合 DSH 语法（只允许小写字母、数字、连字符）',
  'warn.legacy-invocation-key': '字段「{detail}」DSH 不接受，应改用「{hint}」',
  'warn.invalid-invocation-boolean': '调用开关「{detail}」的值不是布尔值',
  'warn.unreadable': '无法回读刚写入的文件：{detail}',
  'busy.working': '处理中…',
}

/** English dictionary. */
const EN: Record<CopyKey, string> = {
  'entry.label': 'Skill Market',
  'panel.title': 'Skill Market',
  'panel.subtitle': 'Install SkillHub skills into user-level or project-level skill directories',
  'tab.market': 'Market',
  'tab.installed': 'Installed',
  'action.close': 'Close',
  'action.refresh': 'Refresh',
  'action.retry': 'Retry',
  'search.placeholder': 'Search skills, e.g. "data analysis" or "documents"',
  'search.button': 'Search',
  'filter.allCategories': 'All categories',
  'sort.score': 'Top rated',
  'sort.downloads': 'Most downloaded',
  'sort.stars': 'Most starred',
  'sort.updated_at': 'Recently updated',
  'install.user': 'Install (user)',
  'install.project': 'Install (project)',
  'install.installing': 'Installing…',
  'install.done': 'Installed',
  'market.empty': 'No matching skills. Try another keyword.',
  'market.loading': 'Loading…',
  'market.total': '{total} skills',
  'market.source.skillhub': 'SkillHub primary',
  'market.source.skillhub-mirror': 'SkillHub mirror',
  'market.source.local': 'Installed locally',
  'market.degraded': 'Primary unavailable; fell back to {source}',
  'installed.empty': 'No skills installed yet.',
  'installed.loading': 'Loading…',
  'installed.filter.placeholder': 'Filter installed skills',
  'installed.level.all': 'All',
  'installed.level.project': 'Project',
  'installed.level.user': 'User',
  'installed.level.builtin': 'Built-in / read-only',
  'installed.model': 'Model invocable',
  'installed.user': 'User invocable',
  'installed.model.hint': 'When off, the model no longer auto-loads this skill in a session',
  'installed.user.hint': 'When off, the /skill-name gesture is unavailable',
  'installed.delete': 'Delete',
  'installed.promote': 'Promote to user',
  'installed.promote.hint': 'Move to the user-level directory, visible to every project',
  'installed.readonly': 'Read-only',
  'installed.confirmDelete': 'Delete skill "{name}"? This cannot be undone.',
  'detail.overview': 'Overview',
  'detail.install': 'Install',
  'detail.version': 'Version {version}',
  'detail.openPage': 'Open on SkillHub',
  'detail.back': 'Back to list',
  'detail.noReadme': 'No overview content was provided for this skill.',
  'notice.installed': 'Installed "{name}" at {level} level ({count} files)',
  'notice.installedWarn': 'Installed "{name}", but DSH will ignore it: {reason}',
  'notice.removed': 'Removed "{name}"',
  'notice.promoted': 'Promoted "{name}" to user level',
  'notice.updated': 'Updated invocation switches for "{name}"',
  'warn.missing-frontmatter': 'SKILL.md has no YAML frontmatter block',
  'warn.missing-name-or-description': 'frontmatter requires both name and description',
  'warn.invalid-name': 'name "{detail}" does not match DSH grammar (lowercase letters, digits, hyphens)',
  'warn.legacy-invocation-key': 'DSH rejects the field "{detail}"; use "{hint}" instead',
  'warn.invalid-invocation-boolean': 'invocation switch "{detail}" does not carry a boolean value',
  'warn.unreadable': 'could not read the installed skill back: {detail}',
  'busy.working': 'Working…',
}

const DICTIONARIES: Record<LocaleId, Record<CopyKey, string>> = { zh: ZH, en: EN }

/**
 * Detect the active locale from the browser, defaulting to Chinese.
 * @returns the resolved locale id.
 */
export function detectLocale(): LocaleId {
  try {
    const language = navigator.language.toLowerCase()
    return language.startsWith('zh') ? 'zh' : 'en'
  } catch {
    return 'zh'
  }
}

/**
 * Bind a translate function for one locale.
 * @param locale - target locale.
 * @returns `t(key, params)` with `{name}` placeholder substitution.
 */
export function bindTranslate(locale: LocaleId): (key: CopyKey, params?: Record<string, string | number>) => string {
  const dictionary = DICTIONARIES[locale]
  return (key, params) => {
    const template = dictionary[key] ?? key
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : match)
  }
}

/** Translate function type handed to components. */
export type TranslateFn = (key: CopyKey, params?: Record<string, string | number>) => string

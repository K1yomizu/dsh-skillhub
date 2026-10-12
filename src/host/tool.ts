/**
 * The `dsh_skillhub_search` model tool.
 *
 * Gives the in-session agent the same market the panel shows, through the same
 * fallback chain, so the model can answer "is there a skill for X?" and then
 * point the user at a one-click install. The tool is strictly read-only: it
 * never installs, deletes, or writes anything. Installation stays a user
 * decision made in the panel.
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { FetchLike } from '../shared/skillhub.ts'
import type { MarketItem, MarketSort } from '../shared/types.ts'
import { searchMarket } from './market.ts'

/** Tool name, exported so the README, tests and docs cannot drift. */
export const SEARCH_TOOL_NAME = 'dsh_skillhub_search'

/** Rows returned per call; deliberately small so the result stays scannable. */
const TOOL_PAGE_SIZE = 10

/** Parameters accepted by the tool. */
interface SearchArgs {
  keyword?: string
  category?: string
  sortBy?: MarketSort
  page?: number
}

/** Render one result row for the model. */
function renderRow(item: MarketItem, rank: number): string {
  const identity = item.namespace === '' ? item.slug : `@${item.namespace}/${item.slug}`
  const description = item.description === '' ? '' : ` — ${item.description.slice(0, 100)}`
  const stats = item.downloads === 0 && item.installs === 0
    ? ''
    : `（下载 ${item.downloads} / 安装 ${item.installs}）`
  const page = item.pageUrl === '' ? '' : `\n   ${item.pageUrl}`
  return `${rank}. ${item.name}（${identity}）${stats}${description}${page}`
}

/** Render the whole tool value. */
function renderValue(value: {
  ok: boolean
  source: string
  degraded: boolean
  total: number
  page: number
  items: MarketItem[]
  message?: string
}): string {
  if (!value.ok) return `SkillHub 搜索失败：${value.message ?? '未知错误'}`

  const sourceLabel: Record<string, string> = {
    skillhub: 'SkillHub 主源',
    'skillhub-mirror': 'SkillHub 镜像（主源不可用，已自动回退）',
    local: '本机已安装技能（远程不可用，已自动回退）',
  }
  const header = `技能市场搜索：共 ${value.total} 条，第 ${value.page} 页返回 ${value.items.length} 条（数据源：${sourceLabel[value.source] ?? value.source}）。`

  if (value.items.length === 0) {
    return `${header}\n没有匹配的技能。换一个关键词或同义词再试，或用 category 限定分类。`
  }

  const rows = value.items.map((item, index) => renderRow(item, (value.page - 1) * TOOL_PAGE_SIZE + index + 1))
  const guidance = value.source === 'local'
    ? '\n提示：远程源当前不可用，以上为本机已安装技能。'
    : '\n安装方式：请用户打开 Web UI 侧边栏底部的「技能市场」面板，搜索该技能并选择用户级或项目级一键安装。本工具不会代为安装。'
  return [header, '', ...rows, guidance].join('\n')
}

/**
 * Build the tool definition.
 * @param fetchImpl - fetch used for upstream calls.
 * @returns a registry-ready tool definition.
 */
export function createSearchTool(fetchImpl: FetchLike) {
  return defineTool({
    name: SEARCH_TOOL_NAME,
    description: [
      '搜索 SkillHub（skillhub.cn）技能市场上的公开技能，无需密钥。',
      '当用户问「有没有……的 skill」「帮我找个处理 X 的技能」「去技能市场搜一下」时使用。',
      '返回候选技能（名称、@命名空间/slug、分类、下载与安装量、简介、主页链接）。',
      '本工具只读：不会安装、删除或修改任何文件；安装需由用户在 Web UI 的技能市场面板中确认。',
    ].join(''),
    parameters: {
      keyword: { type: 'string', description: '搜索关键词（上游做分词匹配）。留空则按排序返回热门技能。' },
      category: { type: 'string', description: '一级分类 key，如 office-efficiency、dev-programming、data-analysis、ai-agent、professional 等。' },
      sortBy: {
        type: 'string',
        enum: ['score', 'downloads', 'stars', 'updated_at'],
        description: '排序方式：score（默认，综合评分）/ downloads / stars / updated_at。',
      },
      page: { type: 'number', description: `页码，从 1 开始，每页 ${TOOL_PAGE_SIZE} 条。` },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    timeoutMs: 25_000,
    isConcurrencySafe: () => true,
    presentCall: args => {
      const keyword = typeof args.keyword === 'string' ? args.keyword.trim() : ''
      return {
        card: 'generic',
        title: keyword === '' ? '浏览技能市场' : `搜索技能市场：${keyword}`,
        kind: 'search',
      }
    },
    async execute(args: SearchArgs, exec) {
      const page = await searchMarket(
        { fetchImpl, listLocal: async () => [] },
        {
          ...(args.keyword === undefined ? {} : { keyword: args.keyword }),
          ...(args.category === undefined ? {} : { category: args.category }),
          ...(args.sortBy === undefined ? {} : { sortBy: args.sortBy }),
          page: typeof args.page === 'number' && args.page > 0 ? args.page : 1,
          pageSize: TOOL_PAGE_SIZE,
        },
        exec.signal,
      )
      return renderValue({
        ok: true,
        source: page.source,
        degraded: page.degraded,
        total: page.total,
        page: page.page,
        items: page.items,
      })
    },
  })
}

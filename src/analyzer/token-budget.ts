import { type Segment, type SegmentCategory, segment } from './segment.js'

/** Per-category token aggregation for one or more files. */
export interface CategoryBreakdown {
  category: SegmentCategory
  tokens: number
  /** Share of the file (or total) as a fraction in [0, 1]. */
  ratio: number
}

/** Token budget for a single file. */
export interface FileTokenBudget {
  /** Display path/name of the file. */
  name: string
  tokens: number
  segments: Segment[]
  breakdown: CategoryBreakdown[]
}

/** Aggregate token budget across all scanned files. */
export interface TokenBudget {
  files: FileTokenBudget[]
  totalTokens: number
  /** Category breakdown across all files combined. */
  breakdown: CategoryBreakdown[]
}

/** Fixed display order for categories in reports. */
export const CATEGORY_ORDER: SegmentCategory[] = [
  'rule',
  'trigger-table',
  'methodology',
  'example',
  'decoration',
  'meta',
]

/**
 * Roughly the usable context window (in tokens) used to express a config's
 * footprint as a percentage. Uses a conservative 200K baseline; this is a
 * display aid, not an exact accounting.
 */
export const CONTEXT_WINDOW_TOKENS = 200_000

/** Build a category breakdown from a flat segment list. */
function buildBreakdown(segments: Segment[], total: number): CategoryBreakdown[] {
  const byCategory = new Map<SegmentCategory, number>()
  for (const seg of segments) {
    byCategory.set(seg.category, (byCategory.get(seg.category) ?? 0) + seg.tokens)
  }

  return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => {
    const tokens = byCategory.get(category) ?? 0
    return { category, tokens, ratio: total > 0 ? tokens / total : 0 }
  })
}

/**
 * Compute the token budget for a set of files.
 *
 * @param files - File name + raw markdown content pairs
 * @returns Per-file and aggregate token breakdown
 */
export function analyzeTokenBudget(files: { name: string; content: string }[]): TokenBudget {
  const fileBudgets: FileTokenBudget[] = files.map(({ name, content }) => {
    const segments = segment(content)
    const tokens = segments.reduce((sum, s) => sum + s.tokens, 0)
    return { name, tokens, segments, breakdown: buildBreakdown(segments, tokens) }
  })

  const allSegments = fileBudgets.flatMap((f) => f.segments)
  const totalTokens = fileBudgets.reduce((sum, f) => sum + f.tokens, 0)

  return {
    files: fileBudgets,
    totalTokens,
    breakdown: buildBreakdown(allSegments, totalTokens),
  }
}

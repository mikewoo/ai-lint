/**
 * Truncate text to maxLen characters, appending "..." if truncated.
 */
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

/**
 * Estimate the token count of a text using a character-based heuristic.
 *
 * Coefficients:
 * - CJK Unified Ideographs (U+4E00–U+9FFF): 1.0 token per character
 * - All other characters: 0.25 token per character
 *
 * Calibrated against modern BPE tokenizers (2026-07-22, 7 content types):
 *   o200k_base  (GPT-4o):   6.6% aggregate error
 *   cl100k_base (GPT-4):   17%
 *
 * Per-line deviations can reach ~40%. This is a relative-comparison and
 * reporting aid — use the target model's native tokenizer for exact counts.
 * Future: a per-model coefficient preset in .ai-lintrc.json (v0.3).
 */
export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    tokens += /[一-鿿]/.test(char) ? 1.0 : 0.25
  }
  return Math.round(tokens)
}

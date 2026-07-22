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
 * Calibrated against BPE tokenizers (2026-07-22, 7 content types):
 *   cl100k_base (GPT-4): 17% aggregate error
 *   o200k_base  (GPT-4o): 6.6%
 *   p50k_base   (GPT-3):  52%  (much less efficient on CJK — older tokenizer)
 *
 * Different BPE tokenizers handle CJK characters very differently
 * (tokenizer-to-tokenizer variance up to 174% on the same CJK-paragraph
 * input), so a single-coefficient character heuristic cannot be equally
 * accurate across all models. Modern tokenizers (cl100k, o200k, Claude)
 * are roughly comparable; p50k is the outlier and is not targeted.
 *
 * Per-line deviations can be up to ~40% even on modern tokenizers.
 * This is a relative-comparison and reporting aid, not an exact
 * accounting. Use the target model's native tokenizer for precise counts.
 */
export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    tokens += /[一-鿿]/.test(char) ? 1.0 : 0.25
  }
  return Math.round(tokens)
}

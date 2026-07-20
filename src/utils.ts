/**
 * Truncate text to maxLen characters, appending "..." if truncated.
 */
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

/**
 * Estimate the token count of a text.
 * Rough rule: English ~4 chars/token, CJK ~1.5 chars/token.
 */
export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    tokens += /[一-鿿]/.test(char) ? 0.67 : 0.25
  }
  return Math.round(tokens)
}

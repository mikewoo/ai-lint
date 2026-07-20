/**
 * General-purpose text simplification map.
 *
 * Each entry: verbose expression → concise replacement
 */
const SIMPLIFICATIONS: Array<{ from: RegExp; to: string }> = [
  // === Chinese simplification ===
  { from: /请务必确保一定/g, to: '请' },
  { from: /请务必?一定?要?确保/g, to: '确保' },
  { from: /一定必须要/g, to: '必须' },
  { from: /所有的一?切的?/g, to: '所有' },
  { from: /无论在任何情况下/g, to: '任何情况' },

  // === English simplification ===
  { from: /please be absolutely sure to/gi, to: 'please ' },
  { from: /please make absolutely certain to/gi, to: 'please ' },
  { from: /always make sure to/gi, to: 'always ' },
  { from: /it is (absolutely |completely |totally )?essential (that|to)/gi, to: 'must ' },
  { from: /under no circumstances should you ever/gi, to: 'never' },
  { from: /at all times,? (you )?(must|should) (always )?/gi, to: 'always ' },
  { from: /in order to ensure that/gi, to: 'to ensure' },
  { from: /for the purpose(s)? of/gi, to: 'for' },
  { from: /due to the fact that/gi, to: 'because' },
  { from: /in the event that/gi, to: 'if' },
  { from: /a (large |great |significant )?number of/gi, to: 'many' },
  { from: /(I want you to|I need you to|you need to|you have to)\s*/gi, to: '' },
  { from: /(remember that|keep in mind that|note that|it is important to note that)\s*/gi, to: '' },
  { from: /(don'?t forget to|do not forget to)\s*/gi, to: '' },
  { from: /in (order )?to be able to/gi, to: 'to' },

  // === General optimization ===
  { from: /(?:is |are |be )?(able to|capable of)\s*/gi, to: 'can ' },
  { from: /make (?:a |an )?use of/gi, to: 'use' },
  { from: /take (?:a )?look at/gi, to: 'check' },
  { from: /carry out/gi, to: 'run' },
]

/**
 * Simplifies redundant expressions in text.
 *
 * Applies all simplification rules in order, then trims and cleans up excess whitespace.
 *
 * @param text - Original text
 * @returns Simplified text
 */
export function simplifyText(text: string): string {
  // First collapse excess whitespace to single spaces (to avoid space count affecting regex matching)
  let result = text.replace(/\s{2,}/g, ' ').trim()

  for (const { from, to } of SIMPLIFICATIONS) {
    from.lastIndex = 0
    result = result.replace(from, to)
  }

  // Clean up again: collapse excess whitespace, strip leading/trailing whitespace
  result = result.replace(/\s{2,}/g, ' ').trim()

  // Ensure first letter is capitalized (English) — skip list markers
  const firstAlpha = result.search(/[a-zA-Z]/)
  if (firstAlpha >= 0 && /[a-z]/.test(result[firstAlpha])) {
    result = result.slice(0, firstAlpha)
      + result[firstAlpha].toUpperCase()
      + result.slice(firstAlpha + 1)
  }

  return result
}

/**
 * Estimate the number of tokens saved by simplification.
 */
export function estimateSavings(original: string, simplified: string): number {
  return estimateTokens(original) - estimateTokens(simplified)
}

function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    tokens += /[一-鿿]/.test(char) ? 0.67 : 0.25
  }
  return Math.round(tokens)
}

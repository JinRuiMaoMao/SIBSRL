import { Converter } from 'opencc-js'

let toTraditional: ((text: string) => string) | null = null
let toSimplified: ((text: string) => string) | null = null

export function convertToTraditional(text: string): string {
  if (!text) return text
  if (!toTraditional) {
    toTraditional = Converter({ from: 'cn', to: 'tw' })
  }
  return toTraditional(text)
}

export function convertToSimplified(text: string): string {
  if (!text) return text
  if (!/[\u4e00-\u9fff]/.test(text)) return text
  if (!toSimplified) {
    toSimplified = Converter({ from: 'tw', to: 'cn' })
  }
  return toSimplified(text)
}

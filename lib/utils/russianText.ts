/** Для UI без буквы «ё» — единообразно с остальным интерфейсом WireHire. */
export function withoutYo(text: string): string {
  return text.replace(/ё/g, "е").replace(/Ё/g, "Е");
}

/** Mantém prévias de documentação fora da experiência publicada. */
export function isDevelopmentPreviewEnabled(
  search: string,
  isDevelopment: boolean,
  previewParameter: string
) {
  return isDevelopment && new URLSearchParams(search).has(previewParameter);
}

export function isFeedbackPreviewEnabled(search: string, isDevelopment: boolean) {
  return isDevelopmentPreviewEnabled(search, isDevelopment, "preview-feedback");
}

import { describe, expect, it } from "vitest";
import {
  isDevelopmentPreviewEnabled,
  isFeedbackPreviewEnabled,
} from "./feedbackPreview";

describe("isFeedbackPreviewEnabled", () => {
  it("abre a prévia somente em desenvolvimento com o parâmetro explícito", () => {
    expect(isFeedbackPreviewEnabled("?preview-feedback=1", true)).toBe(true);
    expect(isFeedbackPreviewEnabled("?preview-feedback=1", false)).toBe(false);
    expect(isFeedbackPreviewEnabled("", true)).toBe(false);
  });

  it("aceita prévias diferentes sem habilitá-las em produção", () => {
    expect(isDevelopmentPreviewEnabled("?preview-print=1", true, "preview-print")).toBe(true);
    expect(isDevelopmentPreviewEnabled("?preview-print=1", false, "preview-print")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildFormspreePayload,
  isFeedbackHoneypotTriggered,
  type CustomerFeedbackForm,
} from "./customerFeedback";

const sampleFeedback: CustomerFeedbackForm = {
  email: " cliente@exemplo.com ",
  profile: "empresa",
  company: " Mercado Exemplo ",
  cnpj: "12.345.678/0001-90",
  category: "problema",
  report: "O campo de valores não atualizou durante a conferência.",
  suggestion: "Adicionar uma mensagem de confirmação após o lançamento.",
  consent: true,
  website: "",
};

describe("encaminhamento hospedado de experiência do cliente", () => {
  it("transforma o relato em campos legíveis para o Formspree", () => {
    expect(buildFormspreePayload(sampleFeedback)).toMatchObject({
      email: "cliente@exemplo.com",
      perfil: "Empresa",
      empresa: "Mercado Exemplo",
      categoria: "Problema encontrado",
      consentimento: "Autorizado",
      origem: "PixBee FechaCaixa",
      _subject: "[PixBee] Problema encontrado — cliente@exemplo.com",
    });
  });

  it("identifica o preenchimento do campo invisível de proteção", () => {
    expect(isFeedbackHoneypotTriggered(sampleFeedback)).toBe(false);
    expect(
      isFeedbackHoneypotTriggered({ ...sampleFeedback, website: "bot" })
    ).toBe(true);
  });
});

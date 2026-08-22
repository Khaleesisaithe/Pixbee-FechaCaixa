export const FORMSPREE_ENDPOINT = "https://formspree.io/f/moeablqp" as const;

export type CustomerFeedbackForm = {
  email: string;
  profile: "empresa" | "operador" | "autonomo" | "outro";
  company: string;
  cnpj: string;
  category: "problema" | "sugestao" | "melhoria" | "outro";
  report: string;
  suggestion: string;
  consent: boolean;
  website: string;
};

const categoryLabels: Record<CustomerFeedbackForm["category"], string> = {
  problema: "Problema encontrado",
  sugestao: "Sugestão",
  melhoria: "Ideia de melhoria",
  outro: "Outro relato",
};

const profileLabels: Record<CustomerFeedbackForm["profile"], string> = {
  empresa: "Empresa",
  operador: "Operador(a) de caixa",
  autonomo: "Profissional autônomo(a)",
  outro: "Outro perfil",
};

/**
 * O Formspree identifica os campos pelo nome. Os rótulos abaixo deixam o e-mail
 * recebido pela autora legível, sem depender de código de servidor ou domínio próprio.
 */
export function buildFormspreePayload(form: CustomerFeedbackForm) {
  const email = form.email.trim();
  const category = categoryLabels[form.category];

  return {
    email,
    perfil: profileLabels[form.profile],
    empresa: form.company.trim() || "Não informado",
    cnpj: form.cnpj.trim() || "Não informado",
    categoria: category,
    relato: form.report.trim(),
    sugestao: form.suggestion.trim() || "Não informada",
    consentimento: form.consent ? "Autorizado" : "Não autorizado",
    origem: "PixBee FechaCaixa",
    _subject: `[PixBee] ${category} — ${email}`,
  };
}

export function isFeedbackHoneypotTriggered(form: CustomerFeedbackForm) {
  return form.website.trim().length > 0;
}

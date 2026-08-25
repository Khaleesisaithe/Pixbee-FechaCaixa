import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildFormspreePayload,
  FORMSPREE_ENDPOINT,
  isFeedbackHoneypotTriggered,
  type CustomerFeedbackForm,
} from "@/lib/customerFeedback";
import { isFeedbackPreviewEnabled } from "@/lib/feedbackPreview";
import { MessageCircle, Send } from "lucide-react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import React, { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const initialForm: CustomerFeedbackForm = {
  email: "",
  profile: "operador",
  company: "",
  cnpj: "",
  category: "problema",
  report: "",
  suggestion: "",
  consent: false,
  website: "",
};

/** Canal público de relatos encaminhado pelo formulário hospedado da autora. */
export function CustomerFeedbackWidget({ showTrigger = true }: { showTrigger?: boolean }) {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(() =>
    isFeedbackPreviewEnabled(
      typeof window === "undefined" ? "" : window.location.search,
      import.meta.env.DEV
    )
  );
  const [form, setForm] = useState<CustomerFeedbackForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const openFromQuickTools = () => setOpen(true);
    window.addEventListener("pixbee:open-feedback", openFromQuickTools);
    return () =>
      window.removeEventListener("pixbee:open-feedback", openFromQuickTools);
  }, []);

  function update<K extends keyof CustomerFeedbackForm>(
    field: K,
    value: CustomerFeedbackForm[K]
  ) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.consent) {
      toast.error(locale === "en" ? "Authorize submission to share your report." : "Autorize o envio para compartilhar seu relato.");
      return;
    }

    if (isFeedbackHoneypotTriggered(form)) {
      setForm(initialForm);
      setOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildFormspreePayload(form)),
      });

      if (!response.ok) throw new Error(locale === "en" ? "Formspree rejected the report." : "Formspree recusou o relato.");

      setForm(initialForm);
      setOpen(false);
      toast.success(locale === "en" ? "Report sent. Thank you for helping improve PixBee." : "Relato enviado. Obrigada por ajudar a melhorar o PixBee.");
    } catch {
      toast.error(
        locale === "en" ? "It was not possible to send this now. Check the fields and try again." : "Não foi possível enviar agora. Confira os campos e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && <DialogTrigger asChild>
        <button
          className="feedback-fab"
          type="button"
          aria-label={locale === "en" ? "Send customer feedback" : "Enviar relato de experiência"}
          title={locale === "en" ? "Customer feedback" : "Experiência do cliente"}
        >
          <MessageCircle size={21} />
          <span>{locale === "en" ? "Customer feedback" : "Experiência do cliente"}</span>
        </button>
      </DialogTrigger>}
      <DialogContent className="feedback-dialog">
        <DialogHeader>
          <DialogTitle>{locale === "en" ? "Share your experience" : "Conte sua experiência"}</DialogTitle>
          <DialogDescription>
            {locale === "en" ? "Found a problem or have an idea? Your report helps make PixBee more useful for daily cash operations." : "Encontrou um problema ou tem uma ideia? Seu relato ajuda a tornar o PixBee mais útil no dia a dia de caixa."}
          </DialogDescription>
        </DialogHeader>
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-grid">
            <label>
              <span>{locale === "en" ? "Your email" : "Seu e-mail"}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                placeholder="voce@exemplo.com"
                onChange={event => update("email", event.target.value)}
              />
            </label>
            <label>
              <span>{locale === "en" ? "You are" : "Você é"}</span>
              <select
                value={form.profile}
                onChange={event =>
                  update(
                    "profile",
                    event.target.value as CustomerFeedbackForm["profile"]
                  )
                }
              >
                <option value="empresa">{locale === "en" ? "Company" : "Empresa"}</option>
                <option value="operador">{locale === "en" ? "Cashier" : "Operador(a) de caixa"}</option>
                <option value="autonomo">{locale === "en" ? "Self-employed professional" : "Profissional autônomo(a)"}</option>
                <option value="outro">{locale === "en" ? "Other" : "Outro"}</option>
              </select>
            </label>
          </div>
          <div className="feedback-grid">
            <label>
              <span>
                {locale === "en" ? "Company" : "Empresa"} <small>{locale === "en" ? "optional" : "opcional"}</small>
              </span>
              <input
                value={form.company}
                maxLength={120}
                placeholder={locale === "en" ? "Business name" : "Nome do negócio"}
                onChange={event => update("company", event.target.value)}
              />
            </label>
            <label>
              <span>
                CNPJ <small>{locale === "en" ? "optional" : "opcional"}</small>
              </span>
              <input
                value={form.cnpj}
                maxLength={18}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                onChange={event => update("cnpj", event.target.value)}
              />
            </label>
          </div>
          <label>
            <span>{locale === "en" ? "Report type" : "Tipo de relato"}</span>
            <select
              value={form.category}
              onChange={event =>
                update(
                  "category",
                    event.target.value as CustomerFeedbackForm["category"]
                )
              }
            >
              <option value="problema">{locale === "en" ? "Report a problem" : "Relatar um problema"}</option>
              <option value="sugestao">{locale === "en" ? "Send a suggestion" : "Enviar uma sugestão"}</option>
              <option value="melhoria">{locale === "en" ? "Suggest an improvement" : "Sugerir uma melhoria"}</option>
              <option value="outro">{locale === "en" ? "Other topic" : "Outro assunto"}</option>
            </select>
          </label>
          <label>
            <span>{locale === "en" ? "Tell us what happened" : "Conte o que aconteceu"}</span>
            <textarea
              required
              minLength={12}
              maxLength={2400}
              value={form.report}
              placeholder={locale === "en" ? "Describe the context, what you expected to happen, and what happened." : "Descreva o contexto, o que esperava que acontecesse e o que ocorreu."}
              onChange={event => update("report", event.target.value)}
            />
          </label>
          <label>
            <span>
              {locale === "en" ? "How can PixBee improve?" : "Como o PixBee pode melhorar?"} <small>{locale === "en" ? "optional" : "opcional"}</small>
            </span>
            <textarea
              maxLength={1200}
              value={form.suggestion}
              placeholder={locale === "en" ? "Share your idea or suggestion." : "Compartilhe sua ideia ou sugestão."}
              onChange={event => update("suggestion", event.target.value)}
            />
          </label>
          <label className="feedback-consent">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={event => update("consent", event.target.checked)}
            />
            <span>
              {locale === "en" ? "I authorize sending this data so the creator can contact me and improve PixBee." : "Autorizo o envio destes dados para contato e melhoria do PixBee."}
            </span>
          </label>
          <label className="feedback-honeypot" aria-hidden="true">
            {locale === "en" ? "Website" : "Site"}
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={event => update("website", event.target.value)}
            />
          </label>
          <p className="feedback-privacy">
            {locale === "en" ? "Data from this form is used only to respond to your report and improve the system. Do not send passwords or payment information." : "Os dados deste formulário são usados somente para responder ao seu relato e aprimorar o sistema. Não envie senhas ou informações de pagamento."}
          </p>
          <Button
            className="pixbee-primary-button feedback-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoadingIndicator compact label={locale === "en" ? "Sending report..." : "Enviando relato..."} />
            ) : (
              <>
                <Send size={17} /> {locale === "en" ? "Send report" : "Enviar relato"}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

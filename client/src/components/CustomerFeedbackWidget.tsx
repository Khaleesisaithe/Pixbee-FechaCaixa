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
import { MessageCircle, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

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
export function CustomerFeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerFeedbackForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof CustomerFeedbackForm>(
    field: K,
    value: CustomerFeedbackForm[K]
  ) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.consent) {
      toast.error("Autorize o envio para compartilhar seu relato.");
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

      if (!response.ok) throw new Error("Formspree recusou o relato.");

      setForm(initialForm);
      setOpen(false);
      toast.success("Relato enviado. Obrigada por ajudar a melhorar o PixBee.");
    } catch {
      toast.error(
        "Não foi possível enviar agora. Confira os campos e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="feedback-fab"
          type="button"
          aria-label="Enviar relato de experiência"
          title="Experiência do cliente"
        >
          <MessageCircle size={21} />
          <span>Experiência do cliente</span>
        </button>
      </DialogTrigger>
      <DialogContent className="feedback-dialog">
        <DialogHeader>
          <DialogTitle>Conte sua experiência</DialogTitle>
          <DialogDescription>
            Encontrou um problema ou tem uma ideia? Seu relato ajuda a tornar o
            PixBee mais útil no dia a dia de caixa.
          </DialogDescription>
        </DialogHeader>
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-grid">
            <label>
              <span>Seu e-mail</span>
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
              <span>Você é</span>
              <select
                value={form.profile}
                onChange={event =>
                  update(
                    "profile",
                    event.target.value as CustomerFeedbackForm["profile"]
                  )
                }
              >
                <option value="empresa">Empresa</option>
                <option value="operador">Operador(a) de caixa</option>
                <option value="autonomo">Profissional autônomo(a)</option>
                <option value="outro">Outro</option>
              </select>
            </label>
          </div>
          <div className="feedback-grid">
            <label>
              <span>
                Empresa <small>opcional</small>
              </span>
              <input
                value={form.company}
                maxLength={120}
                placeholder="Nome do negócio"
                onChange={event => update("company", event.target.value)}
              />
            </label>
            <label>
              <span>
                CNPJ <small>opcional</small>
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
            <span>Tipo de relato</span>
            <select
              value={form.category}
              onChange={event =>
                update(
                  "category",
                    event.target.value as CustomerFeedbackForm["category"]
                )
              }
            >
              <option value="problema">Relatar um problema</option>
              <option value="sugestao">Enviar uma sugestão</option>
              <option value="melhoria">Sugerir uma melhoria</option>
              <option value="outro">Outro assunto</option>
            </select>
          </label>
          <label>
            <span>Conte o que aconteceu</span>
            <textarea
              required
              minLength={12}
              maxLength={2400}
              value={form.report}
              placeholder="Descreva o contexto, o que esperava que acontecesse e o que ocorreu."
              onChange={event => update("report", event.target.value)}
            />
          </label>
          <label>
            <span>
              Como o PixBee pode melhorar? <small>opcional</small>
            </span>
            <textarea
              maxLength={1200}
              value={form.suggestion}
              placeholder="Compartilhe sua ideia ou sugestão."
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
              Autorizo o envio destes dados para contato e melhoria do PixBee.
            </span>
          </label>
          <label className="feedback-honeypot" aria-hidden="true">
            Site
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={event => update("website", event.target.value)}
            />
          </label>
          <p className="feedback-privacy">
            Os dados deste formulário são usados somente para responder ao seu
            relato e aprimorar o sistema. Não envie senhas ou informações de
            pagamento.
          </p>
          <Button
            className="pixbee-primary-button feedback-submit"
            type="submit"
            disabled={isSubmitting}
          >
            <Send size={17} />
            {isSubmitting ? "Enviando relato..." : "Enviar relato"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

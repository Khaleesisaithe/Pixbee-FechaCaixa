# PixBee FechaCaixa

Sistema web de contagem e fechamento de caixa para organizar a abertura do turno, registrar movimentações, conferir meios de pagamento e documentar divergências.

> **Autoria e desenvolvimento:** projeto idealizado e mantido por **Khaleesi Saithe**. A implementação foi desenvolvida com **assistência de IA**, com decisões de produto, regras de negócio, dados e revisão sob responsabilidade da autora.

## O que o sistema faz

O PixBee acompanha o operador em quatro etapas: abertura, seleção dos meios de recebimento, contagem e validação. Durante o turno, ele registra sangrias e suprimentos individualmente, exige justificativa para alterações e preserva uma trilha de auditoria no histórico local e nos comprovantes térmicos.

Os turnos ficam no navegador por até três dias. Antes da limpeza, a pessoa pode consultar, imprimir ou exportar o relatório em PDF. O projeto também inclui alto contraste, rótulos de navegação para celular e uma página de privacidade e direitos.

## Tecnologias

| Camada | Ferramentas |
| --- | --- |
| Interface | React, TypeScript e Tailwind CSS |
| Navegação | Wouter |
| Componentes | Radix UI, shadcn/ui e Lucide |
| Relatórios | jsPDF |
| Persistência | `localStorage` do navegador |
| Desenvolvimento | Vite, pnpm e Prettier |

## Estrutura do projeto

```text
client/
  src/
    components/     Componentes reutilizáveis e elementos de interface
    contexts/       Estado da sessão de caixa e persistência local
    pages/          Telas do fluxo operacional e páginas institucionais
    index.css       Tokens, layout, responsividade e acessibilidade
docs/               Arquitetura, integração de caixa e orientações de publicação
server/             Servidor estático usado apenas no ambiente atual
```

Consulte [`docs/architecture.md`](docs/architecture.md) para entender a responsabilidade de cada área e [`docs/github-vercel.md`](docs/github-vercel.md) para a atualização do repositório e da hospedagem.

## Executar localmente

```bash
pnpm install
pnpm dev
```

Para conferir a versão de produção:

```bash
pnpm build
pnpm preview
```

## Privacidade e autoria

O PixBee não usa banco de dados neste estágio. Dados operacionais permanecem no navegador do operador e podem ser removidos pela própria pessoa. Os avisos de uso, armazenamento local e direitos autorais estão na rota `/privacidade` e em [`docs/legal-references.md`](docs/legal-references.md).

## Publicação externa

Para GitHub e Vercel, utilize o pacote independente preparado junto com esta entrega. Ele substitui dependências específicas do ambiente de desenvolvimento por ativos locais e uma configuração Vite padrão. As etapas estão em [`docs/github-vercel.md`](docs/github-vercel.md).

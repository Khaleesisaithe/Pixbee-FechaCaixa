<p align="center">
  <img src="https://raw.githubusercontent.com/Khaleesisaithe/Pixbee-FechaCaixa/main/client/public/assets/pixbee-bee-mark.png" width="104" alt="Símbolo PixBee" />
</p>

<h1 align="center">PixBee FechaCaixa</h1>

<p align="center">
  Sistema de contagem, conferência e fechamento de caixa criado para transformar uma rotina operacional em um processo mais claro, rastreável e seguro.
</p>

<p align="center">
  <a href="https://pixbee-red.vercel.app/">
    <img src="https://img.shields.io/badge/SISTEMA_FUNCIONANDO_AO_VIVO-55C26A?style=for-the-badge&logo=vercel&logoColor=white" alt="Abrir PixBee ao vivo" />
  </a>
  <a href="https://pixbee-red.vercel.app/">
    <img src="https://img.shields.io/badge/pixbee--red.vercel.app-00ADB5?style=for-the-badge&logoColor=white" alt="pixbee-red.vercel.app" />
  </a>
</p>

<p align="center">
  <strong><a href="https://pixbee-red.vercel.app/">Abrir o PixBee funcionando ao vivo</a></strong>
</p>

---

## Visão do sistema

O PixBee organiza a abertura do turno, o registro de movimentações, a contagem de dinheiro e a conciliação final. Ele mantém o histórico operacional no navegador por até três dias, permite gerar PDF, imprimir comprovantes térmicos e documentar divergências sem bloquear o fechamento.

| Etapa | O que o sistema faz |
| --- | --- |
| **Abertura** | Identifica operador, empresa, fundo inicial e meios de recebimento. |
| **Contagem** | Registra cédulas, moedas, Pix, cartões e entradas acumuladas em espécie. |
| **Movimentações** | Controla sangrias e suprimentos com horário, justificativa e auditoria. |
| **Conciliação** | Mostra sobra ou falta por modalidade, sem impedir o fechamento. |
| **Comprovantes** | Prepara impressão Epson em bobina de 80 mm e relatório PDF. |

## Tecnologias e ferramentas utilizadas

<p align="center">
  <a href="https://www.typescriptlang.org/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" /></a>
  <a href="https://react.dev/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" /></a>
  <a href="https://tailwindcss.com/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" alt="Tailwind CSS" /></a>
  <a href="https://vite.dev/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" alt="Vite" /></a>
  <a href="https://nodejs.org/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" /></a>
  <a href="https://expressjs.com/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" alt="Express" /></a>
  <a href="https://pnpm.io/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pnpm/pnpm-original.svg" alt="pnpm" /></a>
  <a href="https://vitest.dev/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitest/vitest-original.svg" alt="Vitest" /></a>
  <a href="https://vercel.com/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vercel/vercel-original.svg" alt="Vercel" /></a>
  <a href="https://github.com/"><img height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" alt="GitHub" /></a>
</p>

<p align="center">
  <sub>TypeScript · React · Tailwind CSS · Vite · Node.js · Express · pnpm · Vitest · Vercel · GitHub</sub>
</p>

| Camada | Tecnologias presentes no projeto |
| --- | --- |
| **Interface** | React 19, React DOM, TSX, Tailwind CSS 4, Wouter, Radix UI, shadcn/ui, Lucide, Sonner, `clsx`, `tailwind-merge` e `tw-animate-css`. |
| **Lógica e validação** | TypeScript, Context API, Zod, Nano ID, SuperJSON e TanStack Query. |
| **Relatórios e impressão** | jsPDF, impressão do navegador e layout de comprovante para Epson. |
| **Contato** | Formspree para relatos e sugestões de experiência. |
| **Qualidade e build** | Vitest, Prettier, esbuild, tsx, pnpm e Vite. |
| **Infraestrutura disponível** | Node.js, Express, tRPC, Drizzle ORM, MySQL, AWS SDK, Axios, `jose`, `cookie` e dotenv. |
| **Publicação** | GitHub, GitHub Codespaces e Vercel. |

## Composição real do código

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-77.1%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 77.1%" />
  <img src="https://img.shields.io/badge/CSS-22.6%25-663399?style=for-the-badge&logo=css3&logoColor=white" alt="CSS 22.6%" />
  <img src="https://img.shields.io/badge/Outros-0.3%25-6B7280?style=for-the-badge" alt="Outros 0.3%" />
</p>

<p align="center">
  <sub>Percentuais atuais calculados automaticamente pelo GitHub a partir dos arquivos versionados. Bibliotecas e plataformas aparecem na seção de ferramentas, pois não são linguagens de programação.</sub>
</p>

## PixBee em funcionamento

<p align="center">
  <img width="100%" src="https://raw.githubusercontent.com/Khaleesisaithe/Pixbee-FechaCaixa/main/docs/screenshots/pixbee-inicio.png" alt="Tela inicial do PixBee FechaCaixa" />
  <br />
  <sub>Início do fluxo de fechamento</sub>
  <br /><br />
  <img width="100%" src="https://raw.githubusercontent.com/Khaleesisaithe/Pixbee-FechaCaixa/main/docs/screenshots/pixbee-historico.png" alt="Histórico de turnos e relatório do PixBee" />
  <br />
  <sub>Histórico local, impressão e relatório PDF</sub>
  <br /><br />
  <img width="100%" src="https://raw.githubusercontent.com/Khaleesisaithe/Pixbee-FechaCaixa/main/docs/screenshots/pixbee-privacidade.png" alt="Tela de privacidade e direitos do PixBee" />
  <br />
  <sub>Privacidade, retenção local e direitos</sub>
</p>

## Privacidade e operação local

Os dados do turno ficam no navegador utilizado pelo operador. O histórico permanece disponível por até três dias; antes da limpeza assistida, o sistema oferece impressão e exportação em PDF. Para WordPress, a recomendação é usar um botão ou item de menu para abrir o PixBee em página própria, mantendo a impressão térmica, a experiência mobile e o armazenamento local.

<p align="center">
  <a href="https://pixbee-red.vercel.app/privacidade">Ler a política de privacidade</a>
</p>

## Autoria

O PixBee foi idealizado por **Khaleesi Saithe**, em transição de operações e varejo para Ciência de Dados, cursando Estácio de Sá. O sistema nasceu de necessidades reais de atendimento e conferência de caixa e foi desenvolvido com assistência de ferramentas de IA, mantendo as decisões de produto e regras de negócio sob responsabilidade da autora.

<p align="center">
  <a href="https://khaleesi-portifolio.vercel.app/">Portfólio</a> ·
  <a href="https://www.linkedin.com/in/khaleesisaithen">LinkedIn</a> ·
  <a href="https://github.com/khaleesisaithe">GitHub</a>
</p>

---

<p align="center">
  <strong>PixBee FechaCaixa</strong><br />
  Mais clareza e menos retrabalho no fechamento de caixa.<br /><br />
  © Khaleesi Saithe. Todos os direitos reservados.
</p>

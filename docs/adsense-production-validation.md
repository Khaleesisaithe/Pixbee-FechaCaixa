# Validação de produção — Google AdSense

**Data da validação:** 26 de agosto de 2026

Após o cadastro das variáveis de ambiente exclusivamente em `Production` e o redeploy do projeto Vercel `pixbee`, o domínio `https://www.pixbeecaixa.com.br/` respondeu publicamente com a área de publicidade visível.

| Verificação | Resultado |
| --- | --- |
| Deploy Vercel | `Ready` em Production, a partir do commit `f36ec94` |
| Página inicial (`/`) | Script AdSense e slot responsivo carregados em faixa fina |
| Página Sobre (`/sobre`) | Script AdSense e slot responsivo carregados |
| Página Privacidade (`/privacidade`) | Script AdSense e slot responsivo carregados em faixa fina |
| Página Histórico (`/historico`) | Área compacta no topo direito, com cerca de um quarto da largura em desktop |
| Slot configurado | Unidade pública configurada exclusivamente por variáveis privadas de Production |
| Páginas operacionais (`/abertura`, `/contagem`, `/validacao`) | Nenhum script AdSense e nenhum slot presentes |
| GitHub | Nenhum identificador real de editor ou slot versionado |

O preenchimento de um anúncio efetivo continua sujeito à análise e à disponibilidade do Google AdSense. A área reservada em páginas públicas é o comportamento esperado até então.

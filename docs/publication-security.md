# Auditoria de publicação e configuração futura

## Situação validada

O repositório preparado para o GitHub foi analisado para arquivos de ambiente, telemetria, artefatos de compilação e padrões comuns de credenciais. Nenhum valor de chave AWS, Google, GitHub, Stripe, Resend ou JWT foi encontrado no conteúdo rastreado. O código contém apenas referências a variáveis de ambiente do servidor, o que é esperado e não equivale a expor um valor secreto.

| Área | Medida aplicada |
|---|---|
| Ambiente e segredos | Arquivos de ambiente, certificados e chaves foram excluídos do versionamento. |
| Telemetria e depuração | Logs locais e os arquivos gerados em `client/public/__manus__/` foram excluídos e limpos antes de `dev` e `build`. |
| Artefatos internos | `todo.md`, `template.json`, arquivos de entrega e metadados de provedores de hospedagem não devem ser enviados ao repositório público. |
| OAuth | O servidor deixa OAuth desativado quando as três variáveis de login não estiverem configuradas. |

## Publicação Vercel e WordPress

Publique o PixBee na Vercel e conecte o endereço gerado ao WordPress com um botão ou item de menu. A navegação para uma página própria é preferível ao iframe para preservar impressão térmica, espaço de tela em celular e o comportamento de armazenamento local.

## Variáveis de ambiente

Para a versão atual, que usa armazenamento local e Formspree, nenhuma variável adicional é obrigatória na Vercel. Não crie nem envie arquivos de ambiente ao GitHub.

Se o login OAuth for ativado no futuro, configure os valores exclusivamente no painel da Vercel, em **Settings → Environment Variables**:

| Variável | Uso |
|---|---|
| `OAUTH_SERVER_URL` | Endereço do serviço de autenticação. |
| `VITE_APP_ID` | Identificador público do aplicativo OAuth. |
| `VITE_OAUTH_PORTAL_URL` | Portal que inicia o login. |
| `JWT_SECRET` | Segredo usado somente pelo servidor para assinar sessões. |

> Nunca use prefixo `VITE_` em uma chave privada. Variáveis com esse prefixo podem ser incluídas no código entregue ao navegador.

## Google Analytics e Search Console

Google Analytics permanece desativado até a criação de uma propriedade GA4. Quando houver um ID de medição `G-...`, use a mesma propriedade no WordPress e no PixBee. Se estiverem em domínios diferentes, configure medição entre domínios para preservar a sessão do visitante.[1]

Após conectar um domínio à Vercel, verifique-o no Google Search Console. A verificação por domínio é a opção mais abrangente para cobrir subdomínios; mantenha o método de verificação ativo para preservar o acesso.[2]

## Referências

[1] [Google Analytics — Configurar medição entre domínios](https://support.google.com/analytics/answer/10071811?hl=pt-BR)

[2] [Google Search Console — Verificar a propriedade do site](https://support.google.com/webmasters/answer/9008080?hl=pt-BR)

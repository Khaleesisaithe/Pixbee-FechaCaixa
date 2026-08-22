# Arquitetura do PixBee FechaCaixa

Este documento foi escrito para facilitar a leitura do código por quem for manter o projeto depois da primeira versão.

## Visão geral

O PixBee é uma aplicação React de página única. O roteador muda entre as telas sem recarregar o navegador, enquanto o contexto de sessão guarda os dados do caixa que está em andamento.

| Área | Arquivo principal | Responsabilidade |
| --- | --- | --- |
| Rotas | `client/src/App.tsx` | Expõe as URLs públicas do sistema. |
| Fluxo de caixa | `client/src/pages/Home.tsx` | Agrupa as telas, os componentes do fluxo e a exportação do relatório. |
| Estado | `client/src/contexts/CashSessionContext.tsx` | Mantém abertura, modalidades, contagem, sangrias, suprimentos e auditoria. |
| Estilos | `client/src/index.css` | Define tokens, responsividade, impressão e alto contraste. |
| Componentes de base | `client/src/components/ui/` | Componentes Radix UI usados em botões, diálogos e seletores. |

## Fluxo do operador

1. **Início:** apresenta a proposta do sistema e inicia uma sessão nova.
2. **Abertura:** registra empresa, operador, fundo de caixa e modalidades que serão conferidas.
3. **Contagem:** calcula cédulas, moedas e formas digitais; também registra sangrias e suprimentos.
4. **Validação:** compara o valor esperado com o valor encontrado e permite fechar mesmo com quebra registrada.
5. **Histórico:** guarda cada fechamento localmente, filtra turnos, mostra auditoria e gera PDF ou impressão térmica.

## Decisões de dados

O objeto de sessão é salvo em `localStorage` pela chave `pixbee-fecha-caixa-session-v2`. Os fechamentos são salvos separadamente em `pixbee-fecha-caixa-history-v2` e têm retenção planejada para três dias.

As sangrias e suprimentos são entradas individuais, cada uma com horário, identificação e auditoria. Edições e exclusões requerem justificativa; a operação deixa de aparecer no painel operacional, mas permanece na trilha de auditoria do relatório e do comprovante.

## Onde alterar com segurança

| Necessidade | Ponto de alteração |
| --- | --- |
| Incluir uma modalidade de pagamento | Tipos e configuração em `CashSessionContext.tsx`, depois o mapa `METHOD_INFO` em `Home.tsx`. |
| Mudar a regra de retenção | Constante `RETENTION_MS` em `Home.tsx`. |
| Alterar o PDF | Função `exportHistoryPdf` em `Home.tsx`. |
| Alterar o comprovante Epson | Componente `ThermalReceipt` em `Home.tsx` e bloco `@media print` em `index.css`. |
| Ajustar cores, responsividade ou alto contraste | Tokens e seletores em `index.css`. |

## Observação de evolução

O arquivo `Home.tsx` concentra os componentes da primeira versão para manter o fluxo didático e a relação entre as telas visível. Em uma próxima refatoração, os componentes `OpeningPage`, `CountPage`, `ValidationPage`, `HistoryPage` e `LegalPage` podem ser movidos gradualmente para `client/src/features/cash-closing/`, sem alterar os contratos do contexto.

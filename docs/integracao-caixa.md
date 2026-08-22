# Integração do PixBee com o sistema de caixa

## Objetivo

O PixBee deve receber os **movimentos efetivamente registrados no caixa de origem** e compará-los ao valor encontrado na conferência física. Assim, o operador deixa de digitar o valor esperado manualmente: o sistema calcula o esperado com base na abertura, vendas, recebimentos, sangrias, suprimentos, cancelamentos e devoluções do turno.

> O PixBee não deve tentar ler a tela do outro sistema. A integração deve usar dados estruturados fornecidos pelo sistema de origem, seja por arquivo de fechamento ou por uma API autorizada.

## Opções de integração

| Opção | Como funciona | Quando adotar | Limitação principal |
|---|---|---|---|
| **Importação de arquivo** | O operador exporta o relatório do caixa em CSV, XLSX ou JSON e envia ao PixBee antes de fechar. | Primeiro piloto, sistemas sem API ou integração rápida. | Processo manual e sujeito ao uso do arquivo errado. |
| **API sob demanda** | O PixBee consulta a API do sistema de caixa ao abrir ou revisar o fechamento. | O sistema de origem possui API autenticada e dados por turno. | Exige backend, credenciais e contrato de API. |
| **Sincronização por evento** | Cada venda, recebimento, sangria ou cancelamento é enviado ao PixBee em tempo real. | Operação com maior volume e necessidade de acompanhamento em tempo real. | Depende de webhooks ou integração instalada no sistema de origem. |
| **Conector local** | Um pequeno serviço autorizado na máquina da loja lê uma fonte local permitida e envia os dados para uma API segura. | Sistema legado, desktop ou sem acesso externo direto. | Requer instalação, atualização e monitoramento do conector. |

## Caminho recomendado

O melhor caminho é começar pela **importação de relatório de fechamento**. Ela permite validar o modelo de dados sem depender de acesso ao fornecedor do caixa. O arquivo deve trazer, no mínimo, empresa, identificador do caixa, operador, abertura, vendas por modalidade, sangrias, suprimentos, estornos e horário de fechamento.

Após validar os cálculos com relatórios reais, evolua para uma **API sob demanda**. O PixBee passará a buscar o resumo do turno usando uma chave do caixa, uma data e um identificador de operador. Caso a operação realmente necessite de atualizações durante o dia, a terceira etapa é habilitar eventos em tempo real.

## Modelo mínimo de movimento

```json
{
  "companyId": "loja-centro",
  "registerId": "caixa-01",
  "operatorId": "operador-123",
  "openedAt": "2026-08-21T08:00:00-03:00",
  "openingFloat": 100.00,
  "movements": [
    {
      "occurredAt": "2026-08-21T10:15:00-03:00",
      "type": "sale",
      "paymentMethod": "cash",
      "amount": 42.50,
      "reference": "venda-4891"
    },
    {
      "occurredAt": "2026-08-21T11:20:00-03:00",
      "type": "withdrawal",
      "paymentMethod": "cash",
      "amount": 200.00,
      "reference": "sangria-18"
    }
  ]
}
```

Com esse formato, o esperado em dinheiro é calculado como: **fundo inicial + vendas em dinheiro + suprimentos − sangrias − estornos em dinheiro**. PIX, crédito, débito e vales são calculados por modalidade, com suas respectivas vendas, estornos e ajustes.

## Próxima implementação técnica

Para executar qualquer integração automática, o projeto precisa evoluir de interface estática para uma aplicação com backend. Esse backend deverá guardar as credenciais do fornecedor do caixa, validar a identidade da loja e expor ao PixBee uma rota própria de conciliação. Nunca coloque chaves de acesso da API do caixa diretamente no navegador.

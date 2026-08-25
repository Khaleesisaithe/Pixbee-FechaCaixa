# Validação do comprovante térmico

Em 25 de agosto de 2026, a prévia foi percorrida até a validação de um turno de demonstração. O fechamento gerou o comprovante com identificação de empresa, operador, turno, valores conferidos e divergência, e disponibilizou a ação **Imprimir comprovante**.

O CSS de impressão foi verificado com a regra `@page { size: 80mm auto; }` e com a largura fixa de `80mm` para o comprovante térmico. A suíte automatizada também verifica a presença da identificação do turno, do valor recebido, do troco e do valor líquido no conteúdo do comprovante.

O acionamento da visualização de impressão no navegador da prévia excedeu o tempo de resposta da extensão antes de abrir o diálogo do sistema. Nenhum trabalho foi enviado a uma impressora. A impressão física deve ser confirmada em um navegador local com uma impressora térmica configurada antes do uso operacional.

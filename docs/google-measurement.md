# Medição Google para Vercel e WordPress

## Decisão recomendada

Use uma única propriedade do Google Analytics 4 (GA4) e o mesmo identificador de medição `G-...` tanto no site WordPress quanto no PixBee publicado na Vercel. Quando os endereços estiverem em domínios raiz diferentes, configure a medição entre domínios no fluxo Web do GA4 para preservar uma única sessão quando a pessoa navegar entre os dois ambientes.

O Google informa que, sem essa configuração, cada domínio cria cookies e identificadores distintos; com a medição entre domínios, o identificador é transmitido por meio do parâmetro `_gl`. Todos os domínios incluídos devem usar a mesma tag e o mesmo ID de medição.[1]

## Search Console

Após publicar o PixBee, verifique a propriedade no Google Search Console. A verificação por domínio é útil quando houver domínio próprio, pois abrange protocolos e subdomínios. A verificação por tag HTML, Google Analytics ou Google Tag Manager também é possível; o token precisa permanecer disponível para preservar a propriedade verificada.[2]

## Fontes oficiais

[1] [Google Analytics — Configurar medição entre domínios](https://support.google.com/analytics/answer/10071811?hl=pt-BR)

[2] [Google Search Console — Verificar a propriedade do site](https://support.google.com/webmasters/answer/9008080?hl=pt-BR)

[3] [Google Analytics — Criar conta, propriedade e fluxo de dados](https://support.google.com/analytics/answer/9304153?hl=pt-BR)

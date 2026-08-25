# Google AdSense no PixBee FechaCaixa

A integração do Google AdSense foi preparada de forma **opt-in**. O PixBee não carrega o script nem exibe anúncios enquanto a ativação não estiver explicitamente habilitada, o ID do editor não for válido e cada unidade não tiver um slot numérico configurado.

## Variáveis de configuração

Configure as variáveis no ambiente do projeto somente depois de criar e conectar o site no Google AdSense:

```text
VITE_ADSENSE_ENABLED=false
VITE_ADSENSE_CLIENT_ID=ca-pub-0000000000000000
VITE_ADSENSE_HOME_SLOT=0000000000
VITE_ADSENSE_ABOUT_SLOT=0000000000
VITE_ADSENSE_PRIVACY_SLOT=0000000000
```

Os valores acima são exemplos. Não use o ID ou os slots de exemplo. O identificador real do editor tem o formato `ca-pub-...` e deve ser copiado do painel do Google AdSense. A ativação só deve mudar para `true` após a aprovação do site.

## Onde os anúncios podem aparecer

O componente é usado somente na tela inicial, na página Sobre e na página de Privacidade. As rotas de abertura, contagem, validação e histórico não montam o componente, para que anúncios não cubram valores, cronômetro, modais, botões ou dados auditáveis.

## Processo de ativação

Primeiro, publique o domínio e confirme o HTTPS. No AdSense, adicione o domínio, conecte-o pelo snippet ou metatag, solicite a revisão e conclua as informações de pagamento, identidade, endereço e privacidade. O Google informa que a análise pode levar de alguns dias a duas ou quatro semanas.

Depois da aprovação, crie as unidades de anúncio no painel do AdSense, copie os três slots necessários e configure as variáveis no ambiente de produção. Publique a linha exata fornecida pelo Google no arquivo `ads.txt` da raiz do domínio. O arquivo inicial do PixBee contém apenas comentários e não inventa um ID de editor.

Por último, valide o site publicado e altere `VITE_ADSENSE_ENABLED` para `true`. Se a variável estiver ausente, se o ID não começar com `ca-pub-` ou se algum slot não for numérico, o PixBee continuará sem publicidade.

## Privacidade

A página de Privacidade do PixBee declara que a publicidade é opcional, limitada a áreas institucionais públicas e sujeita às políticas do Google e aos requisitos aplicáveis de privacidade e consentimento. Essa declaração deve ser revisada quando a conta for efetivamente aprovada e ativada.

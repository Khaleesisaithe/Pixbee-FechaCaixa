# Atualização no GitHub e publicação na Vercel

## 1. Atualize o repositório

Baixe e extraia o pacote independente entregue junto com este projeto. Ele é a versão indicada para subir no GitHub porque inclui os ativos de imagem e não depende dos caminhos do ambiente de desenvolvimento atual.

Abra a pasta extraída no VS Code e rode:

```bash
pnpm install
pnpm check
pnpm build
```

Se os comandos terminarem sem erros, envie os arquivos ao seu repositório existente. Pelo terminal, dentro da pasta do projeto:

```bash
git add .
git commit -m "feat: atualiza PixBee FechaCaixa"
git push origin main
```

Se o seu ramo principal tiver outro nome, substitua `main` pelo nome usado no repositório.

## 2. Importe na Vercel

No painel da Vercel, escolha **Add New → Project**, conecte seu GitHub e selecione o repositório do PixBee. A configuração esperada é:

| Campo | Valor |
| --- | --- |
| Framework preset | Vite |
| Build command | `pnpm build` |
| Output directory | `dist` |
| Install command | `pnpm install` |

O arquivo `vercel.json` do pacote já inclui o redirecionamento necessário para as rotas internas do React, como `/historico` e `/privacidade`.

## 3. Configure o domínio

Depois da primeira publicação, abra **Settings → Domains** na Vercel. Adicione o domínio desejado e siga os registros DNS indicados pelo painel.

## 4. Dados locais

O histórico de caixa é local ao navegador e não acompanha o deploy. Cada operador terá seu próprio histórico na máquina usada para trabalhar. Se você futuramente quiser histórico compartilhado entre máquinas, será necessário adicionar autenticação e banco de dados.

## 5. Antes de publicar

- Não envie arquivos `.env` reais, logs ou arquivos de cache.
- Revise a chave Pix exibida na página Sobre antes de tornar o site público.
- Leia a página de privacidade e atualize o canal de contato da autora se necessário.

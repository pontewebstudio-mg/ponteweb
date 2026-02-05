# PonteWeb — demos (site da agência + exemplo de Landing Express)

Este pacote contém 2 demos estáticas (HTML/CSS/JS) prontas para publicar grátis.

## Estrutura
- `agency/` → site da PonteWeb (multi-seção)
- `landing-express-demo/` → exemplo de Landing Express para um restaurante (demo)

## Como visualizar localmente
### Opção 1 (mais simples)
Abra o arquivo `agency/index.html` no Chrome.

### Opção 2 (servidor local)
No Windows (PowerShell) dentro da pasta `ponteweb-demo`:

```powershell
python -m http.server 5500
```

Acesse:
- http://localhost:5500/agency/
- http://localhost:5500/landing-express-demo/

## Como publicar grátis (GitHub Pages)
1. Crie um repositório no GitHub (ex: `ponteweb-demo`).
2. Envie o conteúdo desta pasta.
3. Settings → Pages → Deploy from branch → `main` / `/ (root)`.
4. O site fica em algo como `https://SEUUSUARIO.github.io/ponteweb-demo/agency/`.

## Observações
- As imagens são placeholders (SVG) para evitar uso indevido de marcas/fotos.
- Textos e preços são exemplos e podem ser ajustados.

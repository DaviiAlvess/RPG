# ⚔ RPG Edric Yronwood — Crônicas de Gelo e Fogo

RPG de texto imersivo com IA como Mestre e geração de cenas automática.

---

## 🚀 Como fazer deploy na Vercel

### 1. Suba o projeto no GitHub
- Crie um repositório no github.com
- Faça upload de todos os arquivos desta pasta

### 2. Importe na Vercel
- Acesse vercel.com e faça login
- Clique em "Add New Project"
- Selecione seu repositório do GitHub
- Clique em "Deploy"

### 3. Configure a variável de ambiente (CHAVE SEGURA)
- No painel da Vercel, vá em **Settings → Environment Variables**
- Adicione:
  - **Name:** `GEMINI_KEY`
  - **Value:** sua chave do Google AI Studio
- Clique em Save e faça redeploy

> ⚠️ NUNCA suba o arquivo `.env.local` para o GitHub. Ele já está no `.gitignore`.

---

## 🛠 Rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## 🔑 Gerar nova chave Gemini

1. Acesse: https://aistudio.google.com
2. Clique em **Get API Key**
3. Crie uma nova chave
4. Adicione na Vercel conforme passo 3 acima

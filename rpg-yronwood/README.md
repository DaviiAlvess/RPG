# ⚔ RPG Edric Yronwood — Crônicas de Gelo e Fogo

RPG de texto imersivo com IA como Mestre e saves na nuvem via **Firebase Realtime Database**.

---

## 🚀 Deploy na Vercel

1. Importe o repositório no [vercel.com](https://vercel.com)
2. **Root Directory:** `rpg-yronwood`
3. Adicione a variável `GEMINI_API_KEY` (Google AI Studio)
4. Configure o Firebase (abaixo) e faça deploy

> As credenciais do Firebase (`siterpg32`) já vêm no código.

---

## 🔥 Firebase (obrigatório para login e saves)

Siga `firebase/SETUP.md`:

1. [Firebase Console](https://console.firebase.google.com/project/siterpg32) → **Authentication** → E-mail/Senha → Enable
2. **Realtime Database** → Create database → `https://siterpg32-default-rtdb.firebaseio.com/`
3. **Rules** → cole `firebase/database.rules.json` → Publish

---

## 🛠 Rodar localmente

```bash
cd rpg-yronwood
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## 🔑 Chave Gemini (Mestre IA)

1. https://aistudio.google.com → **Get API Key**
2. Na Vercel: **Settings → Environment Variables** → `GEMINI_API_KEY`

## Narração e modelo do Mestre

A criação da aventura e a aba Ajustes permitem escolher seis vozes de narração,
tamanho da resposta e ritmo. As preferências ficam na campanha e valem a partir
da próxima resposta. Saves antigos usam o estilo cinematográfico equilibrado.

O modelo padrão agora é `gemini-3.5-flash-lite`. Para alterar na hospedagem:
- `GEMINI_MODEL`: modelo usado para narração, memória e ações automáticas.
- `GEMINI_LORE_MODEL`: opcional, modelo separado para lore e fichas.

Após alterar variáveis ou atualizar o código, faça um novo deploy. Uma variável
`GEMINI_MODEL` antiga tem prioridade sobre o padrão: atualize-a ou remova-a.
A disponibilidade efetiva depende da chave e do projeto no Google AI Studio.
Documentação: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite

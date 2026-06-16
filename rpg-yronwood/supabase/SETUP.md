# Configurar Supabase (usuários + saves na nuvem)

## 1. Criar projeto
1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Anote a **Project URL** e a **anon public key** (Settings → API)

## 2. Variáveis na Vercel
Settings → Environment Variables → adicione:

| Nome | Valor |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` |

Redeploy após salvar.

## 3. Criar tabelas
No Supabase: **SQL Editor** → New query → cole todo o conteúdo de `schema.sql` → **Run**.

## 4. Autenticação por e-mail
1. **Authentication** → **Providers** → **Email** → Enable
2. Para testar rápido: **Authentication** → **Settings** → desmarque **Confirm email**
3. **Authentication** → **URL Configuration**:
   - Site URL = URL do seu site (ex: `https://seu-app.vercel.app`)
   - Redirect URLs = mesma URL + `http://localhost:3000` para dev local

## 5. Testar
1. Abra o site → **Criar conta**
2. Entre com e-mail e senha
3. Crie um mundo e jogue
4. No Supabase → **Table Editor** → `rpg_campaigns` deve aparecer a campanha

Usuários ficam em **Authentication** → **Users**.

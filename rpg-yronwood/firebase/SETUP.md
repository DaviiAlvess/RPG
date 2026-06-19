# Firebase — Forja de Mundos

## 1. Authentication (e-mail/senha)
1. [Firebase Console](https://console.firebase.google.com/project/siterpg32) → projeto **siterpg32**
2. **Build** → **Authentication** → **Get started**
3. **Sign-in method** → **Email/Password** → **Enable** → Save

## 2. Realtime Database (saves na nuvem)
1. **Build** → **Realtime Database** → **Create Database**
2. Escolha a região e modo **Production** (ou teste para dev)
3. URL do banco: `https://siterpg32-default-rtdb.firebaseio.com/`
4. Aba **Rules** → cole o conteúdo de `firebase/database.rules.json` → **Publish**

Estrutura dos dados:
```
users/
  {seu-uid}/
    campaigns/
      {id-da-campanha}/
        charName, world, msgs, disp, hp, ...
```

## 3. Deploy
Faça push do código e redeploy na Vercel. **Não precisa** de variáveis extras — a URL do RTDB já está no código.

Opcional na Vercel: `NEXT_PUBLIC_FIREBASE_DATABASE_URL` se usar outro projeto.

# Firebase — Forja de Mundos

## 1. Authentication (e-mail/senha)
1. [Firebase Console](https://console.firebase.google.com) → projeto **siterpg32**
2. **Build** → **Authentication** → **Get started**
3. **Sign-in method** → **Email/Password** → **Enable** → Save

## 2. Firestore (saves na nuvem)
1. **Build** → **Firestore Database** → **Create database**
2. Modo **Production** (ou teste para dev)
3. **Rules** → cole o conteúdo de `firebase/firestore.rules` → **Publish**

## 3. Deploy
Faça push do código e redeploy na Vercel. **Não precisa** de variáveis Supabase.

Opcional: defina `NEXT_PUBLIC_FIREBASE_*` na Vercel se usar outro projeto Firebase.

Render deployment guide
1. Create a Render account (render.com) and connect to your GitHub repo that contains backend + frontend directories.
2. For backend: create a new Web Service -> connect repo -> Use Docker -> set env vars from .env -> Deploy.
3. For frontend: create a new Static Site -> connect repo -> set build command `npm install && npm run build` -> set publish directory `dist`.
4. After backend deploy, note the URL and add it to the frontend .env (VITE_API_BASE).
5. To register Stripe webhook: use the backend's /api/webhooks/stripe endpoint URL shown in Render and register it in Stripe Dashboard with your webhook secret.

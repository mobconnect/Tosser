# Deployment recommendations

Tosser is a Vite/React application with an Express/GenAI server.

## Recommended option

Use **Render** for the simplest combined Node deployment:

- Build: `npm run build`
- Start: `npm start`
- Environment: `GEMINI_API_KEY`

**Google Cloud Run** is recommended when you want container-based autoscaling. **Railway** and **Fly.io** are good alternatives for a long-running Node service.

Do not deploy the API or Gemini key to GitHub Pages. If the frontend and API are split, configure the frontend API URL and restrict CORS to the production origin.

# Previso — Think Before You Pay

This enhanced version includes a premium warm editorial design and a CSS 3D hero composition (no 3D model download required).

A warm, minimalist consumer purchase intelligence MVP. Users upload screenshots of product advertisements, seller conversations and purchase terms. The backend sends the real images to Gemini for evidence-based comparison and renders the resulting report.

## Requirements

- Node.js 18+
- A Google Gemini API key with access to a vision-capable Gemini model

## Run locally

1. Extract the project.
2. Open a terminal in the `previso` folder.
3. Install packages:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. Add your Gemini API key to `.env`:

   ```env
   GEMINI_API_KEY=your_real_key
   GEMINI_MODEL=gemini-2.5-flash
   PORT=3000
   ```

6. Start the app:

   ```bash
   npm start
   ```

7. Open http://localhost:3000

## Deploying on Replit

1. Create a Node.js Repl.
2. Upload/extract the project files.
3. Install dependencies if Replit does not do so automatically.
4. Open **Secrets** and add `GEMINI_API_KEY`.
5. Optionally add `GEMINI_MODEL` with a currently supported vision-capable model name.
6. Run the app. Replit should expose the web preview/public deployment URL.

Never put the API key in `public/app.js`, HTML, or any client-side code.

## Features

- Responsive warm ivory / espresso / terracotta visual theme.
- Landing page and five app states: home, upload, analyzing, report, seller message.
- Upload up to five JPG, PNG or WEBP screenshots, max 5 MB each.
- Real Gemini multimodal analysis through a server endpoint.
- Structured report with contradictions, missing information and clarification questions.
- Editable seller message and copy-to-clipboard.
- Print-friendly report.
- Drag-and-drop evidence upload.
- Health endpoint at `/api/health`.

## Important limitations

- The app does not authenticate users or save report history.
- Screenshots are processed in server memory and are not intentionally persisted by this app. Hosting providers may have their own operational logs and retention practices.
- The model can misread screenshots. Users should verify important findings directly with sellers.
- The generated Bangla seller message is a polite general fallback unless the model returns a Bangla message.
- The buildathon sticker is not included because it must be the exact official image supplied by the organizer. Add the supplied asset to the page if required; do not recreate it.
- This is an MVP, not a seller verification service, fraud detector, or legal advice tool.

# EasyFair

A personal tool for capturing products quickly at trade fairs (especially in China) and reviewing them later at home.

**At the fair, you collect. At home, you review and decide.**

- **Fair mode (phone):** take a photo, talk or type a note (tap the 🎤 on the iPhone keyboard), save. The AI writes a **title and description** from your note and photo and pre-fills fields. After saving you land on **Today** with a **Same booth** button.
- **Review mode (desktop/tablet):** complete the details, check the supplier, run the AI analysis and score, and export a PDF.
- **Offline-first:** everything is stored on the device right away (IndexedDB). When a connection is available, the app syncs to Firebase and Cloudinary in the background.

Runs under `jajehelp.com/messe/`, the same origin as the Jajehelp site, so it uses the same login. It is built in the Jajehelp design system: tokens from `jajehelp/public/css/os.css`, self-hosted Geist fonts, pink rings.

## Stack

| Part | Choice | Why |
|---|---|---|
| UI | Vite + React 19 + TypeScript | Fast start on iPhone. No Flutter runtime to download over roaming. |
| Offline | Dexie (IndexedDB) + PWA service worker | Local data is the source of truth. The app works without a network connection. |
| Sync | Firebase Auth + Firestore (existing project `jajehelp37`) | Same login and same database as Jajehelp. Uses its own `messe*` collections. |
| Photos | Cloudinary unsigned upload preset | No secret in the frontend. The high-quality original is uploaded, and the low-quality version is a URL transformation. |
| AI | **DeepSeek** (works in China), Claude (optional) or the built-in offline Demo AI | Every AI call goes through `src/services/ai/` and is never made from UI components. |
| QR | `jsqr` | Decodes QR codes locally, even offline. |
| PDF | One A4 page per product, rendered with `html2canvas` and wrapped into a real PDF file (`src/services/pdf.ts`) | "Create PDF" opens the iPhone share sheet (Save to Files, WhatsApp, AirDrop). |

## Local development

```bash
npm install
npm run dev          # http://localhost:5173/messe/  (local mode, no login, nothing leaves the device)
npm run dev:live     # http://localhost:5175/messe/  (real jajehelp37: login + sync, separate local storage)
npm test             # unit tests (parser, category tree, filters, QR, repository, mock AI)
npm run test:rules   # Firestore security rules in the emulator (needs Java 11+)
npm run build        # production build to dist/
```

The first time you start the app, go to **Settings → Load demo data**. This adds 10 demo products, one or more in each category.

### Test with the Firebase emulators (login + sync, nothing goes online)

```bash
npm run emulators                       # auth :9099, firestore :8085, UI :4005
npx vite --port 5174 --mode emulator    # uses .env.emulator (VITE_FIREBASE_MODE=emulator)
```

1. In the app, sign in with any test number, e.g. `+4915100000001`.
2. Get the SMS code with `npm run emulator:admin -- codes`.
3. The first sign-in shows **"no access"**. This is correct: the account has no admin claim yet.
4. Grant the claim with `npm run emulator:admin -- grant +4915100000001`, then sign in again.

## Environment variables

Copy `.env.example` to `.env.local` (gitignored).

| Variable | Meaning |
|---|---|
| `VITE_FIREBASE_MODE` | `off` = local only (Phase 1). `emulator` = local emulators. `live` = jajehelp37 (Phase 2). |
| `VITE_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._APP_ID` | Public Firebase web config. This is not a secret: access is enforced by the rules and the admin claim. |

The Claude API key and the Cloudinary settings are **not** environment variables. You enter them in the app under **Settings**. They are stored locally and synced to your private `messeSettings/{uid}` document, which only you can read.

## Firebase

- Uses the existing project **jajehelp37**. Login: email + password (SMS fallback) plus the `admin: true` custom claim, set once with `jajehelp/scripts/set-admin.mjs`. There is no registration. Accounts without the claim are signed out.
- Collections: `messeProducts`, `messeFairs`, `messeSettings`. Existing Jajehelp data (`ecosystem`, `os`, ...) is never read or written.
- Every document has an `ownerId`, so the app is ready for multiple users. The owner can delete their own products (rules enforce `ownerId`).
- Firestore has **one rules file per project**, and it lives in the jajehelp repo. `firestore.rules` here is an emulator copy. Only the block marked `Messe Organizer` is merged into `jajehelp/firestore.rules`. **Never deploy rules from this repo.**
- Index: `messeProducts (ownerId ASC, updatedAt ASC)` (see `firestore.indexes.json`). Merge it into `jajehelp/firestore.indexes.json`.

## Cloudinary

The app uploads with an **unsigned upload preset** called `messe_unsigned`. The API key alone is not enough. Create the preset once, either way:

- **Script** (creates the preset and proves it with a test upload that is deleted again). The secret stays in this terminal only:
  ```powershell
  $env:CLOUDINARY_API_KEY = "<api key>"; $env:CLOUDINARY_API_SECRET = "<api secret>"; node scripts/cloudinary-preset.mjs
  ```
- **Console**: Settings → Upload → Add upload preset → name `messe_unsigned`, Signing mode **Unsigned**, folder `messe`.

In the app, **Settings → Cloudinary** is pre-filled with cloud name `dwzzcufpf`, preset `messe_unsigned` and folder `messe`. The API key field is optional and for reference.

The API key and API secret are **never** entered in the app.

How photo upload works:

- Photos stay in IndexedDB until Cloudinary confirms the upload. Only then is the large local copy removed. The small copy stays for offline viewing.
- If an upload fails, the app waits 5 minutes before retrying. This protects your roaming data.

## AI

Pick the provider in **Settings → AI**. Keys are stored in your private Firebase profile (`messeSettings/{uid}`, owner-only rules).

- **DeepSeek (recommended, works in China):** key from platform.deepseek.com. Model `deepseek-flash` sees photos (Base64, low detail), runs with thinking off and JSON mode, and costs very little. Called directly from the browser (CORS is allowed for jajehelp.com).
- **Claude (optional):** needs a VPN in China. `claude-opus-5-5`, Sonnet 5.5 or Haiku 4.5.
- **Demo AI (no key):** offline rules for German/English notes. It writes a basic title and description, but cannot translate.

What the AI does:

- **Title + description + pre-filled fields** from the note and the product photo (once per capture; offline it falls back to the rule parser).
- **Analysis and score** on demand. Results are stored and never re-run unless you tap "Run again". Only low-quality images are sent; booth and "other" photos are never sent.
- **Business-card reading** with per-field review (Accept / Edit / Ignore).
- **Arabic view of the current page:** the **ع** button translates everything visible on the page you are on (labels, AI texts, your notes). It switches itself off when you open another page. Translations are cached in IndexedDB, so pages you translated once work offline.
- **No hallucinations:** the prompts require `null` for unknown values. AI output is always labelled and applied only after you accept it.
- The key is used from the browser (`dangerouslyAllowBrowser` for Claude, plain `fetch` for DeepSeek). That is acceptable for a single-owner tool whose key sits behind owner-only rules. Before sharing the app with other users, move AI calls to a Firebase Function.

## Fair guide (optional help)

The normal flow is unchanged: **Add product → Products → Review**. The book icon in the header opens the **Fair guide** with optional helpers from the NEPCON game plan (all offline):

- **Plan:** timeline for day 1–3 (tick off, edit times), halls, exhibitor list with a "Visit" button, checklist, second round with your A-leads.
- **Phrases (中文):** full-screen Chinese cards with Pinyin, numbers, favourites, playback.
- **Pitch:** opener and the four pitches with a teleprompter.
- **Deal helper:** conversation order, money-saving sentences, rules, red flags, glossary, EU duties.
- **Stand talk:** optional 8-question checklist per booth (MOQ, price tiers, samples, lead time, terms, German distributor) with timer.
- **Follow-up:** ready-to-send WeChat message per lead.

Products also got an optional **priority A/B/C**, **quick answers** in the note step, **quick filters** (A/B/C, today, follow-up, sales chance, red flag) and **CSV/JSON export** of the filtered list.

## Data

- **Delete forever** (trash icon on a product): removes it on the phone and in Firebase (also on your other devices via background sync). Photos already in Cloudinary stay there. **Archive** only hides a product.
- **PDF** exists for one product at a time (Product → PDF), one A4 page with the facts that matter. Long texts are shortened on the page; the full text stays in the app.

## Deployment (live since 2026-10-05)

Live at **https://jajehelp.com/messe/**, linked in Jajehelp → **Private Projects**.

Already set up once:
- `jajehelp/firestore.rules` contains the Messe block, `jajehelp/firestore.indexes.json` the index (deployed).
- `jajehelp/firebase.json` has the `/messe/**` rewrite and `no-cache` headers for `sw.js` / `index.html`.
- Login is **email + password** (SMS as fallback). Access needs the admin claim:
  `npm run set-admin -- --email hello@jajehelp.com` (in the jajehelp repo, with `GOOGLE_APPLICATION_CREDENTIALS` set).

Releasing an update:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\publish-to-jajehelp.ps1   # build + copy to jajehelp/public/messe
cd ..\jajehelp; firebase deploy --only hosting
```

`firebase deploy --only hosting` publishes the whole `jajehelp/public` folder, so make sure the rest of it is the version you want live.

On the iPhone: Safari → `jajehelp.com/messe/` → Share → **Add to Home Screen**. Sign in once at home, before the trip.

## Security notes

- Never commit `.env*`, the service account JSON (`*adminsdk*.json`) or keys. The `.gitignore` blocks these files.
- The Firebase service account key is only needed for admin scripts. Keep it outside every repository.
- Sensitive data (keys, contact details) is not logged. Errors shown in the UI are written in plain language.
- No Google Fonts or other Google CDN calls. These are blocked in China, and the fonts are bundled with the app.

## Project structure

```
src/
  config/app.ts          app name, collection names, Firebase mode, image sizes, models
  constants/             options, categories (dynamic question tree), fairs
  types/models.ts        Product, Supplier, Photo, Pricing, AI types
  db/                    Dexie schema + repository (create, edit, archive, restore, history)
  services/              ai/ (provider interface, mock, rules, Claude), sync, auth, cloudinary, qr, images, filter
  hooks/                 data, speech, photo URLs, online state
  components/            chips, editors, supplier + OCR review, suggestion review, cards
  pages/                 Dashboard, Capture, Captured (quick card), Products, ProductDetail (review),
                         Review, Projects, Export (PDF), Settings, Login
tests/unit, tests/rules
```

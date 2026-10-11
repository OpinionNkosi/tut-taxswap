# TUT TextSwap — Phase 1 Prototype

A working front-end prototype of the TUT TextSwap marketplace described in
your presentation: a TUT-only site for buying, selling, renting and
swapping textbooks and equipment, with an AI Support chat widget and an
admin dashboard for handling reports and flagged users.

Built with plain **HTML, CSS and JavaScript** — no build step, no
frameworks. It runs immediately in any browser, and is structured so it
can be switched over to **Firebase** (Authentication + Firestore) as its
real database once you're ready to move past the prototype stage.

## Run it

Just open `index.html` in a browser (double-click it, or use a local
server such as the VS Code "Live Server" extension). No installation
needed — the prototype uses your browser's `localStorage` as a stand-in
database, seeded automatically with demo accounts and listings the
first time it runs.

## Pages

| Page | What it does | Maps to your slides |
|---|---|---|
| `index.html` | Landing page — the pitch, the problem, how it works | Slides 2, 3, 9 |
| `register.html` | Sign-up, enforces the `@tut4life.ac.za` email domain | IPO table, row 1 |
| `login.html` | Login | Use-case diagram: "Register / Login" |
| `browse.html` | Search & filter listings, "Buy now" / "Rent now" / "Propose a swap" | Use-case diagram: "Browse & Search", "Buy/Rent/Swap" |
| `sell.html` | Publish a new listing | Use-case diagram: "List Item for Sale/Rent" |
| `checkout.html` | Pay for a sale or rental with a (mock) card | Use-case diagram: "Buy/Rent/Swap" |
| `admin.html` | Reports, disputes, flag/unflag users, orders, platform stats | Use-case diagram: "Manage Disputes", "Flag Suspicious User", "View Platform Reports" |

## Checkout & payment

"Buy now" and "Rent now" on a listing go to `checkout.html`, which shows
an order summary (item, price, and the 5% platform fee, included in the
total rather than added on top) and a card form. There's no real
payment gateway wired up — any 16-digit card number, a future MM/YY
expiry, and a 3–4 digit CVC will "succeed" — but the whole flow is
real: it validates the card fields, computes the seller's payout after
the fee, records an order (visible under Admin → Orders), and marks the
listing `sold` or `rented` so it can't be bought twice and drops off
Browse. Swap listings skip checkout entirely, since nothing is paid for
— they still use "Propose a swap", which hands off to the seller
directly.

Before accepting real payments, replace `DB.payForListing` in
`js/db.js` with a call to a real South African payment gateway (PayFast
and Yoco both work well for student marketplaces) from a trusted
server — card numbers should never be processed in client-side code
the way this prototype does for demo purposes.

## Voice messages in AI Support

The chat widget's 🎤 button records a voice message with the browser's
`MediaRecorder` API and adds it to the chat as a playable audio clip.
Where the browser supports it (Chrome, Edge), it also transcribes the
recording live with the Web Speech API and feeds that text into the
same rule-based responder used for typed questions — so asking "how do
I report a scam?" by voice gets the same answer as typing it.

**This needs a "secure context"** — `https://` or `http://localhost` —
because browsers block microphone access on plain `file://` pages. If
you open `index.html` by double-clicking it, the mic button disables
itself with an explanatory tooltip. To try it locally, serve the folder
instead, e.g. from inside `tuttextswap/`:
```bash
python3 -m http.server 8000
```
then open `http://localhost:8000`. Once deployed to Firebase Hosting or
any other host, `https://` covers this automatically.

Firefox and Safari record audio fine but don't support live
transcription — voice messages there are saved and playable, just not
auto-answered; the bot asks the student to type the question instead.
| AI Support widget (bottom-right on every page) | Scripted Q&A bot | Use-case diagram: "Chat with AI Support" |

## Login credentials (developer / demo use only)

These accounts are seeded automatically by `js/db.js` so you can explore
every screen without registering first:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@tuttextswap.co.za` | `Admin@2026` |
| Student | `thabo.m@tut4life.ac.za` | `Student123` |
| Student | `lerato.k@tut4life.ac.za` | `Student123` |

**These are plaintext demo credentials for local testing only.** They
live in `js/db.js` (see `_seed()`). Before this goes anywhere near real
students or a real server:
1. Delete the seeded accounts from `_seed()`.
2. Switch on Firebase (below) and create a real admin user through
   Firebase Authentication instead of a hardcoded password.
3. Never commit real passwords or API keys to a public repository.

## Moving from prototype to a real backend (Firebase)

The whole app talks to a single `DB` object in `js/db.js` — every page
calls `DB.login(...)`, `DB.getListings(...)`, etc. Right now those
methods read and write `localStorage`. To connect a real Firebase
project instead:

1. Follow the steps at the top of `js/firebase-config.js` to create a
   Firebase project, enable Email/Password auth, create a Firestore
   database, and copy your config values into `FIREBASE_CONFIG`.
2. Set `USE_FIREBASE = true` in `js/firebase-config.js`.
3. Fill in the `TODO` blocks marked `if (USE_FIREBASE)` inside
   `js/db.js` (`register`, `login`, `addListing`) with the Firestore/Auth
   calls shown in the comments there.
4. Add the Firebase SDK script tags to each HTML page's `<head>`,
   *before* `firebase-config.js`:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
   ```
5. Deploy with Firebase Hosting (`firebase deploy`) or any static host —
   the site is plain HTML/CSS/JS, so nothing else changes.

No page-level code needs to change for this switch — that's the point
of routing everything through `db.js`.

## What's mocked vs. real in this prototype

- **Real:** registration validation, login/session handling, listing
  search & filters, publishing listings (with a required cover photo,
  resized in the browser), admin report resolution, flagging/unflagging
  users, the chat widget's scripted responses and voice messages.
- **Mocked (by design, for Phase 1):** the "contact seller" email (shows
  an alert instead of sending mail) and the AI chatbot (rule-based
  keyword matching, not a real language model).

### A note on cover photos and localStorage

A cover photo is now required to publish a listing, and **Browse only
shows listings that have one** — the old placeholder book icon no
longer appears there. If you still see icon-only cards in your own
browser, they're left over from before this change; clear them with
`localStorage.removeItem("tts_listings")` in the browser console (or
just clear site data) to reset to a clean, photo-only set.

Cover photos are resized to ~500px wide and stored as part of the
listing in `localStorage`, so they're a reasonable size but still
count against the browser's per-site storage quota (typically 5–10MB).
That's fine for a class demo with a handful of listings. Once you
switch to Firebase (below), swap this for **Firebase Storage**: upload
the file there and store the returned download URL on the listing
instead of the image data itself — the `TODO` in `DB.addListing`
(`js/db.js`) marks where that change goes.

## Folder structure

```
tuttextswap/
├── index.html
├── register.html
├── login.html
├── browse.html
├── sell.html
├── admin.html
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js   ← Firebase project keys + on/off switch
│   ├── db.js                ← data layer (localStorage now, Firebase-ready)
│   └── app.js                ← nav bar + AI Support chat widget
└── README.md
```

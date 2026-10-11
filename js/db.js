/*
  TUT TextSwap — data layer
  ==========================
  Every screen talks to the DB object below, never to localStorage or
  Firebase directly. That means the switch between "prototype" and
  "real backend" (see js/firebase-config.js) only has to happen in
  this one file.

  DEMO ADMIN LOGIN (prototype / local-database mode only)
    email:    admin@tuttextswap.co.za
    password: Admin@2026
  This account is seeded automatically the first time the app runs
  (see seedDemoData below). It exists so you — the developer — can open
  admin.html and see the admin views without building a sign-up flow
  for admins. It is a plaintext demo credential for local testing ONLY.
  It must be deleted (see firebase-config.js Step 3) before this ever
  touches a real server, real students, or real data.
*/

const LS_KEYS = {
  users: "tts_users",
  listings: "tts_listings",
  reports: "tts_reports",
  orders: "tts_orders",
  session: "tts_session"
};

const PLATFORM_FEE_RATE = 0.05; // The 5% platform fee mentioned to students by AI Support

const TUT_EMAIL_DOMAIN = "@tut4life.ac.za";

const DB = {

  // ---------- setup ----------
  init() {
    if (!localStorage.getItem(LS_KEYS.users)) this._seed();
  },

  _seed() {
    const users = [
      {
        email: "admin@tuttextswap.co.za",
        password: "Admin@2026",
        name: "Platform Admin",
        campus: "Pretoria",
        role: "admin",
        flagged: false,
        createdAt: Date.now()
      },
      {
        email: "thabo.m@tut4life.ac.za",
        password: "Student123",
        name: "Thabo M.",
        campus: "Soshanguve",
        role: "student",
        flagged: false,
        createdAt: Date.now()
      },
      {
        email: "lerato.k@tut4life.ac.za",
        password: "Student123",
        name: "Lerato K.",
        campus: "eMalahleni",
        role: "student",
        flagged: false,
        createdAt: Date.now()
      }
    ];

    const listings = [
      {
        id: "L1001",
        sellerEmail: "thabo.m@tut4life.ac.za",
        title: "Programming Fundamentals (Java) — 3rd Ed.",
        category: "Textbook",
        price: 320,
        type: "sale",
        description: "Used one semester, no torn pages. Covers OOP basics used in first-year Java modules.",
        status: "active",
        createdAt: Date.now()
      },
      {
        id: "L1002",
        sellerEmail: "lerato.k@tut4life.ac.za",
        title: "Database Systems (SQL) textbook",
        category: "Textbook",
        price: 90,
        type: "rent",
        description: "Available to rent per semester. Great condition, some highlighter notes.",
        status: "active",
        createdAt: Date.now()
      },
      {
        id: "L1003",
        sellerEmail: "thabo.m@tut4life.ac.za",
        title: "Scientific Calculator (Casio fx-991)",
        category: "Equipment",
        price: 150,
        type: "sale",
        description: "Barely used, comes with case and manual.",
        status: "active",
        createdAt: Date.now()
      }
    ];

    const reports = [
      {
        id: "R1",
        reporterEmail: "lerato.k@tut4life.ac.za",
        targetEmail: "thabo.m@tut4life.ac.za",
        reason: "Buyer asked to pay outside the platform via personal EFT.",
        status: "open",
        createdAt: Date.now()
      }
    ];

    localStorage.setItem(LS_KEYS.users, JSON.stringify(users));
    localStorage.setItem(LS_KEYS.listings, JSON.stringify(listings));
    localStorage.setItem(LS_KEYS.reports, JSON.stringify(reports));
  },

  _read(key) { return JSON.parse(localStorage.getItem(key) || "[]"); },
  _write(key, data) { localStorage.setItem(key, JSON.stringify(data)); },

  // ---------- auth ----------
  isTutEmail(email) {
    return email.toLowerCase().endsWith(TUT_EMAIL_DOMAIN) ||
           email.toLowerCase() === "admin@tuttextswap.co.za";
  },

  register({ email, password, name, campus }) {
    if (USE_FIREBASE) {
      // TODO (real backend): replace with Firebase Auth + Firestore.
      //   const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      //   await firebase.firestore().collection("users").doc(cred.user.uid).set({
      //     email, name, campus, role: "student", flagged: false, createdAt: Date.now()
      //   });
      throw new Error("Firebase mode is on but not wired up yet — see js/firebase-config.js");
    }
    const users = this._read(LS_KEYS.users);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "An account with that email already exists." };
    }
    if (!this.isTutEmail(email)) {
      return { ok: false, error: `Please use your TUT student email (${TUT_EMAIL_DOMAIN}).` };
    }
    users.push({ email, password, name, campus, role: "student", flagged: false, createdAt: Date.now() });
    this._write(LS_KEYS.users, users);
    return { ok: true };
  },

  login(email, password) {
    if (USE_FIREBASE) {
      // TODO (real backend): replace with Firebase Auth sign-in, then
      // fetch the matching /users/{uid} document for name/role/campus.
      //   const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      throw new Error("Firebase mode is on but not wired up yet — see js/firebase-config.js");
    }
    const users = this._read(LS_KEYS.users);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return { ok: false, error: "Incorrect email or password." };
    if (user.flagged) return { ok: false, error: "This account has been suspended pending review. Contact AI Support." };
    localStorage.setItem(LS_KEYS.session, JSON.stringify({ email: user.email, role: user.role, name: user.name }));
    return { ok: true, user };
  },

  logout() { localStorage.removeItem(LS_KEYS.session); },

  currentSession() {
    const raw = localStorage.getItem(LS_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  },

  requireLogin(redirectTo = "login.html") {
    const s = this.currentSession();
    if (!s) window.location.href = redirectTo;
    return s;
  },

  requireAdmin(redirectTo = "login.html") {
    const s = this.currentSession();
    if (!s || s.role !== "admin") { window.location.href = redirectTo; return null; }
    return s;
  },

  // ---------- listings ----------
  getListings({ search = "", category = "" } = {}) {
    // Only listings with an uploaded cover photo are shown — this hides the
    // old placeholder-icon listings (the seeded demo ones) from Browse.
    let listings = this._read(LS_KEYS.listings).filter(l => l.status === "active" && l.coverImage);
    if (search) {
      const q = search.toLowerCase();
      listings = listings.filter(l => l.title.toLowerCase().includes(q));
    }
    if (category) listings = listings.filter(l => l.category === category);
    return listings.sort((a, b) => b.createdAt - a.createdAt);
  },

  addListing({ title, category, price, type, description, sellerEmail, coverImage }) {
    if (USE_FIREBASE) {
      // TODO (real backend):
      //   await firebase.firestore().collection("listings").add({ ...fields, createdAt: Date.now(), status: "active" });
      //   (store the cover as a Firebase Storage URL rather than a data URL — see the note in sell.html)
      throw new Error("Firebase mode is on but not wired up yet — see js/firebase-config.js");
    }
    const listings = this._read(LS_KEYS.listings);
    const id = "L" + (2000 + listings.length);
    listings.push({ id, sellerEmail, title, category, price: Number(price), type, description, coverImage: coverImage || null, status: "active", createdAt: Date.now() });
    this._write(LS_KEYS.listings, listings);
    return { ok: true, id };
  },

  // Looks a listing up by ID regardless of status — checkout needs this even
  // for a listing Browse itself would filter out (e.g. while mid-checkout).
  getListingById(id) {
    return this._read(LS_KEYS.listings).find(l => l.id === id) || null;
  },

  // ---------- checkout / payments ----------
  // A mock payment: no real card processing happens (there's no payment
  // gateway wired up in the prototype), but it fully exercises the flow —
  // it validates the card fields, computes the platform fee and the
  // seller's payout, records an order, and marks the listing unavailable
  // so it can't be bought or rented twice.
  payForListing({ listingId, buyerEmail, cardName, cardNumber, expiry, cvc }) {
    const listing = this.getListingById(listingId);
    if (!listing) return { ok: false, error: "This listing no longer exists." };
    if (listing.status !== "active") return { ok: false, error: "This item is no longer available." };
    if (listing.sellerEmail === buyerEmail) return { ok: false, error: "You can't buy or rent your own listing." };

    const digitsOnly = cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(digitsOnly)) return { ok: false, error: "Enter a 16-digit card number." };
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return { ok: false, error: "Enter the expiry as MM/YY." };
    if (!/^\d{3,4}$/.test(cvc)) return { ok: false, error: "Enter a valid CVC." };
    if (!cardName.trim()) return { ok: false, error: "Enter the name on the card." };

    if (USE_FIREBASE) {
      // TODO (real backend): replace this whole method with a call to a
      // real payment gateway (e.g. PayFast, Yoco, Stripe) from a trusted
      // server — never process real card numbers in client-side code.
      // Once payment succeeds server-side, write the order the same way
      // below, from a Cloud Function, not from the browser.
      throw new Error("Firebase mode is on but payment isn't wired up yet — see js/firebase-config.js");
    }

    const amount = listing.price;
    const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
    const sellerPayout = Math.round((amount - platformFee) * 100) / 100;

    const orders = this._read(LS_KEYS.orders);
    const order = {
      id: "O" + (1000 + orders.length),
      listingId: listing.id,
      listingTitle: listing.title,
      listingType: listing.type, // "sale" or "rent"
      buyerEmail,
      sellerEmail: listing.sellerEmail,
      amount,
      platformFee,
      sellerPayout,
      cardLast4: digitsOnly.slice(-4),
      createdAt: Date.now()
    };
    orders.push(order);
    this._write(LS_KEYS.orders, orders);

    // Sold items come off the market entirely; rented items are marked
    // "rented" so they stop appearing in Browse until returned.
    const listings = this._read(LS_KEYS.listings);
    const target = listings.find(l => l.id === listing.id);
    target.status = listing.type === "rent" ? "rented" : "sold";
    this._write(LS_KEYS.listings, listings);

    return { ok: true, order };
  },

  getOrders() { return this._read(LS_KEYS.orders).sort((a, b) => b.createdAt - a.createdAt); },

  getOrdersForUser(email) {
    return this.getOrders().filter(o => o.buyerEmail === email || o.sellerEmail === email);
  },

  // ---------- admin: users & reports ----------
  getAllUsers() { return this._read(LS_KEYS.users); },

  flagUser(email) {
    const users = this._read(LS_KEYS.users);
    const u = users.find(u => u.email === email);
    if (u) { u.flagged = true; this._write(LS_KEYS.users, users); }
    return u;
  },

  unflagUser(email) {
    const users = this._read(LS_KEYS.users);
    const u = users.find(u => u.email === email);
    if (u) { u.flagged = false; this._write(LS_KEYS.users, users); }
    return u;
  },

  getReports() { return this._read(LS_KEYS.reports).sort((a, b) => b.createdAt - a.createdAt); },

  resolveReport(id) {
    const reports = this._read(LS_KEYS.reports);
    const r = reports.find(r => r.id === id);
    if (r) { r.status = "resolved"; this._write(LS_KEYS.reports, reports); }
    return r;
  },

  addReport({ reporterEmail, targetEmail, reason }) {
    const reports = this._read(LS_KEYS.reports);
    const id = "R" + (reports.length + 1);
    reports.push({ id, reporterEmail, targetEmail, reason, status: "open", createdAt: Date.now() });
    this._write(LS_KEYS.reports, reports);
    return { ok: true, id };
  }
};

DB.init();

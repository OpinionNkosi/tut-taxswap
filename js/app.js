/*
  TUT TextSwap — shared app logic
  Runs on every page: paints the nav bar based on login state and
  powers the "AI Support" chat widget (a scripted mock — this is the
  piece the slides call "Chat with AI Support" / "scam detection").
*/

function renderNav() {
  const el = document.getElementById("nav-user");
  if (!el) return;
  const session = DB.currentSession();
  if (!session) {
    el.innerHTML = `<a href="login.html">Log in</a>`;
    return;
  }
  const adminLink = session.role === "admin" ? ` · <a href="admin.html">Admin</a>` : "";
  el.innerHTML = `${session.name}${adminLink} · <a href="#" id="logout-link">Log out</a>`;
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      DB.logout();
      window.location.href = "index.html";
    });
  }
}

// ---------- AI Support chat widget ----------
const CHAT_RESPONSES = [
  { match: /scam|suspicious|report|flag/i, reply: "If a trade feels off — pressure to pay outside the platform, or a listing that seems too good to be true — use \"Report a problem\" on that user's listing. Our safety team reviews every report within 24 hours." },
  { match: /price|cost|how much|fee/i, reply: "TUT TextSwap only charges a 5% fee on completed trades — there's no fee to list an item. Prices are set by students themselves, so shop around." },
  { match: /rent/i, reply: "To rent an item, open its listing on Browse and tap \"Rent now\" — you'll pay securely at checkout, and arrange collection and the return date with the seller directly." },
  { match: /pay|checkout|card|buy/i, reply: "Tap \"Buy now\" or \"Rent now\" on any listing to go to checkout. Payment is handled there — the seller receives the amount minus our 5% fee once it clears." },
  { match: /sell|list|post/i, reply: "Go to \"Sell an item\", fill in the title, category, price and a short description, then publish. Your listing goes live immediately for all verified TUT students to see." },
  { match: /verify|email|register|sign ?up/i, reply: "Registration needs a valid @tut4life.ac.za email — that's how we keep the marketplace TUT-only. Check your inbox for the verification link after signing up." },
  { match: /dispute|refund|didn.?t (get|receive)/i, reply: "Sorry to hear that. Please file a report with the order details from your Buyer dashboard — an admin will step in to mediate and can pause the seller's account while it's investigated." },
];

function chatReply(message) {
  const hit = CHAT_RESPONSES.find(r => r.match.test(message));
  if (hit) return hit.reply;
  return "I can help with buying, selling, renting, fees, verification, or reporting a problem. What would you like to know?";
}

function initChatWidget() {
  const toggle = document.getElementById("chat-toggle");
  const win = document.getElementById("chat-window");
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const micBtn = document.getElementById("chat-mic");
  if (!toggle || !win) return;

  toggle.addEventListener("click", () => win.classList.toggle("open"));
  document.getElementById("chat-close").addEventListener("click", () => win.classList.remove("open"));

  function addMsg(text, who) {
    const div = document.createElement("div");
    div.className = "chat-msg " + who;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function addAudioMsg(audioUrl, who, transcript) {
    const div = document.createElement("div");
    div.className = "chat-msg " + who + " chat-msg-audio";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = audioUrl;
    div.appendChild(audio);
    if (transcript) {
      const cap = document.createElement("div");
      cap.className = "chat-transcript";
      cap.textContent = "“" + transcript + "”";
      div.appendChild(cap);
    }
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  if (log.children.length === 0) {
    addMsg("Hi! I'm the TUT TextSwap AI Support bot. Ask me about buying, selling, renting, fees, or how to report a problem — or tap the mic to ask by voice.", "bot");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, "user");
    input.value = "";
    setTimeout(() => addMsg(chatReply(text), "bot"), 350);
  });

  // ---------- voice input: record audio + (where supported) transcribe it ----------
  if (micBtn) initVoiceRecording(micBtn, addMsg, addAudioMsg);
}

function initVoiceRecording(micBtn, addMsg, addAudioMsg) {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let mediaRecorder = null;
  let audioChunks = [];
  let recognizer = null;
  let transcript = "";
  let isRecording = false;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    micBtn.disabled = true;
    micBtn.title = "Voice recording needs a secure context (https:// or localhost) and browser microphone support.";
    return;
  }

  micBtn.addEventListener("click", () => {
    if (isRecording) stopRecording();
    else startRecording();
  });

  function startRecording() {
    transcript = "";
    audioChunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        isRecording = true;
        micBtn.classList.add("recording");
        micBtn.textContent = "⏹";
        micBtn.title = "Stop recording";

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable", (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        });
        mediaRecorder.addEventListener("stop", () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
          const url = URL.createObjectURL(blob);
          addAudioMsg(url, "user", transcript.trim());

          if (transcript.trim()) {
            setTimeout(() => addMsg(chatReply(transcript), "bot"), 350);
          } else {
            setTimeout(() => addMsg(
              SpeechRecognitionCtor
                ? "I couldn't make out any words in that recording — could you try again, or type your question instead?"
                : "I've saved your voice message, but this browser can't transcribe speech, so I can't read it yet. Could you type your question instead?",
              "bot"
            ), 350);
          }
        });
        mediaRecorder.start();

        if (SpeechRecognitionCtor) {
          recognizer = new SpeechRecognitionCtor();
          recognizer.lang = "en-US";
          recognizer.interimResults = false;
          recognizer.continuous = true;
          recognizer.addEventListener("result", (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
              transcript += e.results[i][0].transcript + " ";
            }
          });
          recognizer.addEventListener("error", () => {});
          recognizer.start();
        }
      })
      .catch(() => {
        addMsg("I couldn't access your microphone — check your browser's permission for this site and try again.", "bot");
      });
  }

  function stopRecording() {
    isRecording = false;
    micBtn.classList.remove("recording");
    micBtn.textContent = "🎤";
    micBtn.title = "Record a voice message";
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (recognizer) recognizer.stop();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  initChatWidget();
});

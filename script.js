// This file connects the buttons, browser voice features, and built-in commands.
const chatLog = document.getElementById("chatLog");
const textForm = document.getElementById("textForm");
const textInput = document.getElementById("textInput");
const activateButton = document.getElementById("activateButton");
const activateLabel = document.getElementById("activateLabel");
const statusLine = document.querySelector(".status-line");
const statusText = document.getElementById("statusText");
const micHint = document.getElementById("micHint");
const soundToggle = document.getElementById("soundToggle");
const soundLabel = document.getElementById("soundLabel");
const reactorWrap = document.querySelector(".reactor-wrap");

let recognition = null;
let isListening = false;
let isSpeaking = false;
let isMuted = false;
let voiceList = [];

// Build the layered reactor inside the existing dashboard element.
function buildReactorVisual() {
  if (!reactorWrap) return;
  reactorWrap.dataset.state = "online";
  reactorWrap.innerHTML = `
    <div class="orbit orbit-one"></div>
    <div class="orbit orbit-two"></div>
    <div class="reactor-gear-ring"></div>
    <div class="reactor-ring reactor-ring-outer"></div>
    <div class="reactor-ring reactor-ring-inner"></div>
    <svg class="pulse-orbits" viewBox="0 0 320 320" focusable="false">
      <circle class="speech-flash" cx="160" cy="160" r="127"></circle>
      <path class="pulse-wave pulse-wave-one" d="M160 28 C176 40 181 52 197 49 C214 45 221 36 235 49 C250 62 242 78 255 89 C270 101 285 104 278 123 C272 140 261 146 275 163 C288 180 272 194 258 201 C242 209 247 226 229 238 C212 250 199 237 183 251 C167 264 153 278 139 264 C126 251 123 239 106 244 C89 249 78 257 66 242 C54 227 65 211 51 199 C37 187 23 177 31 160 C39 143 50 137 37 121 C24 105 37 89 53 82 C69 75 67 58 85 51 C103 44 111 58 127 49 C143 40 145 29 160 28 Z"></path>
      <path class="pulse-wave pulse-wave-two" d="M160 38 C175 48 183 60 198 58 C213 56 226 49 237 62 C248 75 240 88 253 100 C266 112 277 119 269 134 C261 149 253 153 264 168 C275 183 263 194 248 204 C233 214 238 228 221 237 C204 246 194 233 179 245 C164 257 152 269 139 254 C126 239 119 233 104 237 C89 241 79 246 69 231 C59 216 67 204 53 192 C39 180 31 170 41 156 C51 142 59 135 48 121 C37 107 45 93 61 87 C77 81 79 66 94 60 C109 54 118 65 132 56 C146 47 148 39 160 38 Z"></path>
      <path class="pulse-wave pulse-wave-inner" d="M160 56 C174 65 181 75 194 73 C207 71 217 67 225 78 C233 89 228 99 240 110 C251 121 260 127 254 140 C248 153 240 158 250 171 C259 184 249 194 236 201 C223 208 225 219 211 226 C196 233 187 224 174 234 C161 244 151 252 140 240 C129 228 120 224 107 228 C94 232 85 232 78 220 C71 208 77 198 65 188 C53 178 47 169 56 157 C65 145 72 138 63 126 C54 114 60 103 73 98 C86 93 89 81 102 76 C115 71 123 79 135 71 C147 63 150 56 160 56 Z"></path>
    </svg>
    <div class="reactor">
      <div class="reactor-shell">
        <div class="reactor-triangle reactor-triangle-back"></div>
        <div class="reactor-triangle reactor-triangle-mid"></div>
        <div class="reactor-triangle reactor-triangle-front"></div>
        <div class="reactor-center"><span>J</span></div>
      </div>
    </div>
    <span class="orbit-label orbit-label-top">ARC // 01</span>
    <span class="orbit-label orbit-label-bottom">POWER 100%</span>
  `;
}

buildReactorVisual();

// Show a chat message as text, except for the one trusted website link we create here.
function addMessage(text, sender, link = null) {
  const article = document.createElement("article");
  article.className = `message ${sender === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "user" ? "YOU" : "J";

  const content = document.createElement("div");
  content.className = "message-content";
  const author = document.createElement("span");
  author.className = "message-author";
  author.append(document.createTextNode(sender === "user" ? "YOU " : "JARVIS "));

  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  author.appendChild(time);

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  if (link) {
    paragraph.append(document.createTextNode(" "));
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = "Open website ↗";
    paragraph.appendChild(anchor);
  }

  content.append(author, paragraph);
  article.append(avatar, content);
  chatLog.appendChild(article);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Update the visible system state and the microphone button together.
function setStatus(state) {
  const labels = { online: "ONLINE", listening: "LISTENING", speaking: "SPEAKING" };
  statusLine.dataset.state = state;
  statusText.textContent = labels[state];
  if (reactorWrap) {
    reactorWrap.dataset.state = state;
    if (state !== "speaking") reactorWrap.classList.remove("speech-beat");
  }
}

// Prefer a calm English voice, and fall back to the browser's default voice.
function loadVoices() {
  if ("speechSynthesis" in window) voiceList = window.speechSynthesis.getVoices();
}

function speak(text) {
  if (isMuted || !("speechSynthesis" in window)) {
    setStatus(isSpeaking ? "speaking" : isListening ? "listening" : "online");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const englishVoices = voiceList.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  utterance.voice = englishVoices.find((voice) => /female|aria|jenny|samantha|google uk english/i.test(voice.name))
    || englishVoices[0] || null;
  utterance.lang = utterance.voice ? utterance.voice.lang : "en-US";
  utterance.rate = 0.94;
  utterance.pitch = 0.92;
  utterance.volume = 0.9;
  utterance.onstart = () => {
    isSpeaking = true;
    setStatus("speaking");
  };
  utterance.onboundary = (event) => {
    if (!reactorWrap || (event.name !== "word" && !event.charLength)) return;
    const wordLength = Math.min(event.charLength || 4, 12);
    const pulseScale = 1.08 + wordLength * 0.008;
    reactorWrap.style.setProperty("--voice-word-scale", pulseScale.toFixed(2));
    reactorWrap.classList.remove("speech-beat");
    void reactorWrap.offsetWidth;
    reactorWrap.classList.add("speech-beat");
  };
  utterance.onend = () => {
    isSpeaking = false;
    if (reactorWrap) reactorWrap.style.removeProperty("--voice-word-scale");
    setStatus(isListening ? "listening" : "online");
  };
  utterance.onerror = () => {
    isSpeaking = false;
    if (reactorWrap) reactorWrap.style.removeProperty("--voice-word-scale");
    setStatus(isListening ? "listening" : "online");
  };
  window.speechSynthesis.speak(utterance);
}

function reply(text, link = null) {
  addMessage(text, "assistant", link);
  speak(text);
}

// A small recursive-descent parser handles arithmetic without using eval().
function calculateExpression(expression) {
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!tokens || tokens.join("") !== expression.replace(/\s+/g, "")) return null;

  let position = 0;
  function parsePrimary() {
    if (tokens[position] === "+") { position += 1; return parsePrimary(); }
    if (tokens[position] === "-") { position += 1; return -parsePrimary(); }
    if (tokens[position] === "(") {
      position += 1;
      const value = parseSum();
      if (tokens[position] !== ")") throw new Error("Missing closing parenthesis");
      position += 1;
      return value;
    }
    const token = tokens[position++];
    if (!token || !/^\d+(?:\.\d+)?$/.test(token)) throw new Error("Expected a number");
    return Number(token);
  }
  function parseProduct() {
    let value = parsePrimary();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const next = parsePrimary();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }
  function parseSum() {
    let value = parseProduct();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const next = parseProduct();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  try {
    const result = parseSum();
    if (position !== tokens.length || !Number.isFinite(result)) return null;
    return Number.isInteger(result) ? String(result) : String(Number(result.toFixed(8)));
  } catch {
    return null;
  }
}

// Turn spoken math words into symbols, then let the safe parser evaluate it.
function getMathReply(query) {
  let expression = query.toLowerCase()
    .replace(/^(?:please\s+)?calculate\s+/i, "")
    .replace(/^what(?:'s| is)\s+/i, "")
    .replace(/\bmultiplied by\b|\btimes\b|\bx\b/g, "*")
    .replace(/\bdivided by\b|\bover\b/g, "/")
    .replace(/\bplus\b|\badded to\b/g, "+")
    .replace(/\bminus\b|\bsubtract(?:ed)?\b/g, "-")
    .replace(/[?,=]/g, " ")
    .trim();

  if (!/[+\-*/]/.test(expression)) return null;
  if (/\/\s*0+(?:\.0+)?(?:\D|$)/.test(expression)) return "Division by zero is undefined, so I can't calculate that.";
  const result = calculateExpression(expression);
  if (result === null) return "I couldn't work out that calculation. Try something like calculate 25 times 4.";
  return `The answer is ${result}.`;
}

// Recognize questions asking for the current holder of a national or state office.
function getOfficeQuestion(question) {
  const phrase = question.trim()
    .replace(/^(?:what(?:'s| is)|who(?:'s| is)|tell me)\s+/i, "")
    .replace(/^(?:(?:the\s+)?name of\s+|the\s+)/i, "")
    .replace(/^current\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();
  const match = phrase.match(/^(?:the\s+)?(prime minister|chief minister|president|monarch|king|queen)\s+of\s+(.+)$/i);
  if (!match) return null;

  const office = match[1].toLowerCase();
  return {
    office,
    property: office === "prime minister" || office === "chief minister" ? "P6" : "P35",
    country: match[2].replace(/^the\s+/i, "").trim()
  };
}

// Use live Wikidata claims so the app does not depend on a stale list of officeholders.
async function getOfficeHolderReply(question) {
  const details = getOfficeQuestion(question);
  if (!details) return null;

  try {
    const countryUrl = new URL("https://www.wikidata.org/w/api.php");
    countryUrl.search = new URLSearchParams({
      action: "wbsearchentities",
      search: details.country,
      language: "en",
      type: "item",
      limit: "5",
      format: "json",
      origin: "*"
    }).toString();
    const countryResponse = await fetch(countryUrl);
    if (!countryResponse.ok) throw new Error(`Wikidata search returned ${countryResponse.status}`);
    const countryData = await countryResponse.json();
    const location = (countryData.search || []).find((item) => {
      if (!item.label || item.label.toLowerCase() !== details.country.toLowerCase()) return false;
      const description = item.description || "";
      return details.office === "chief minister"
        ? /Indian state|state.*India|India.*state|Indian union territory|union territory.*India|India.*union territory/i.test(description)
        : /country|sovereign state/i.test(description);
    });
    if (!location) {
      const expectedLocation = details.office === "chief minister" ? "an Indian state or union territory" : "a country";
      return `I couldn't identify ${details.country} as ${expectedLocation}. Please check the place name and try again.`;
    }

    const claimsUrl = new URL("https://www.wikidata.org/w/api.php");
    claimsUrl.search = new URLSearchParams({
      action: "wbgetclaims",
      entity: location.id,
      property: details.property,
      format: "json",
      origin: "*"
    }).toString();
    const claimsResponse = await fetch(claimsUrl);
    if (!claimsResponse.ok) throw new Error(`Wikidata claims returned ${claimsResponse.status}`);
    const claimsData = await claimsResponse.json();
    const today = new Date().toISOString().slice(0, 10);
    const candidates = (claimsData.claims && claimsData.claims[details.property] || []).filter((claim) => {
      if (claim.rank === "deprecated") return false;
      const start = claim.qualifiers && claim.qualifiers.P580 && claim.qualifiers.P580[0];
      const end = claim.qualifiers && claim.qualifiers.P582 && claim.qualifiers.P582[0];
      const startDate = start && start.datavalue ? start.datavalue.value.time.slice(1, 11) : null;
      const endDate = end && end.datavalue ? end.datavalue.value.time.slice(1, 11) : null;
      return (!startDate || startDate <= today) && (!endDate || endDate >= today);
    });
    const currentClaim = candidates.find((claim) => claim.rank === "preferred")
      || candidates.sort((first, second) => {
        const firstStart = first.qualifiers && first.qualifiers.P580 && first.qualifiers.P580[0];
        const secondStart = second.qualifiers && second.qualifiers.P580 && second.qualifiers.P580[0];
        const firstDate = firstStart && firstStart.datavalue ? firstStart.datavalue.value.time : "";
        const secondDate = secondStart && secondStart.datavalue ? secondStart.datavalue.value.time : "";
        return secondDate.localeCompare(firstDate);
      })[0];
    const personId = currentClaim && currentClaim.mainsnak.datavalue
      && currentClaim.mainsnak.datavalue.value.id;
    if (!personId) return `I couldn't find a current ${details.office} for ${location.label}.`;

    const personUrl = new URL("https://www.wikidata.org/w/api.php");
    personUrl.search = new URLSearchParams({
      action: "wbgetentities",
      ids: personId,
      props: "labels",
      languages: "en",
      format: "json",
      origin: "*"
    }).toString();
    const personResponse = await fetch(personUrl);
    if (!personResponse.ok) throw new Error(`Wikidata label lookup returned ${personResponse.status}`);
    const personData = await personResponse.json();
    const person = personData.entities && personData.entities[personId]
      && personData.entities[personId].labels && personData.entities[personId].labels.en;
    if (!person) return `I found the current ${details.office} of ${location.label}, but couldn't retrieve their name.`;
    return `${person.value} is the current ${details.office} of ${location.label}.`;
  } catch {
    return "I’m sorry, I can’t reach my knowledge source right now. Please check your internet connection and try again.";
  }
}

// Remove conversational phrasing so Wikipedia can search for the actual topic.
function cleanWikipediaQuery(question) {
  return question.trim()
    .replace(/[?!.]+$/, "")
    .replace(/^(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:tell me about|tell me|explain(?: to me)?|describe|define|summarize|give me (?:information|details|a summary) (?:about|on))\s+/i, "")
    .replace(/^(?:what do you know about|do you know about)\s+/i, "")
    .replace(/^(?:who|what|where|when|why|how)(?:'s|\s+(?:is|are|was|were|did|does|do|can))?\s+/i, "")
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();
}

// Look up a short article summary from Wikipedia for general knowledge questions.
async function getWikipediaReply(question) {
  const cleanedQuestion = cleanWikipediaQuery(question);
  if (!cleanedQuestion) return "Please tell me what you'd like to know.";

  try {
    // Search first so a natural-language question does not need to be an exact article title.
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.search = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: cleanedQuestion,
      srlimit: "5",
      format: "json",
      origin: "*"
    }).toString();
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error(`Wikipedia search returned ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    const results = searchData.query && searchData.query.search ? searchData.query.search : [];
    if (results.length === 0) return "I couldn't find a short summary for that. Try asking about a person, place, or topic.";

    // The REST summary endpoint provides a concise description for each matching article.
    for (const result of results) {
      const title = result.title.replace(/ /g, "_");
      const summaryResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      if (summaryResponse.status === 404) continue;
      if (!summaryResponse.ok) throw new Error(`Wikipedia summary returned ${summaryResponse.status}`);
      const data = await summaryResponse.json();
      if (!data.extract || data.type === "disambiguation") continue;
      const sentences = data.extract.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [data.extract];
      return sentences.slice(0, 2).join("").trim();
    }
    return "I couldn't find a short summary for that. Try asking about a person, place, or topic.";
  } catch {
    return "I’m sorry, I can’t reach my knowledge source right now. Please check your internet connection and try again.";
  }
}

// Choose a built-in response before sending other questions to Wikipedia.
async function handleCommand(rawText) {
  const query = rawText.trim();
  if (!query) return;
  addMessage(query, "user");
  textInput.value = "";
  const normalized = query.toLowerCase().replace(/[’]/g, "'").replace(/[.!?,]+$/g, "").trim();

  if (/^(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(normalized)) {
    reply(/^good morning/.test(normalized) ? "Good morning. I hope you're having an excellent day." : "Hello. It's a pleasure to hear from you.");
    return;
  }
  if (/^(who are you|what are you)$/.test(normalized)) {
    reply("I am JARVIS, your personal AI voice assistant. How may I help you?");
    return;
  }
  if (/^(what can you do|help|show commands)$/.test(normalized)) {
    reply("Ask me about people, places, science, history, or other topics. I can also calculate, tell you the time and date, look up current prime ministers and Indian state chief ministers, and open Google, YouTube, or Wikipedia.");
    return;
  }
  if (/^(thanks|thank you|goodbye|bye)\b/.test(normalized)) {
    reply(/^(goodbye|bye)\b/.test(normalized) ? "Goodbye. I'll be here when you need me." : "You're welcome. Let me know if there's anything else I can help with.");
    return;
  }
  if (/^(introduce yourself|tell me about yourself)$/.test(normalized)) {
    reply("I am JARVIS, a Grade 9 Upcoming Technology AI voice assistant project. I can answer questions, help with calculations, and respond to voice commands.");
    return;
  }
  if (/\b(time|date|day)\b/.test(normalized) && /\b(what|tell|current|today|date|time)\b/.test(normalized)) {
    const now = new Date();
    if (/\b(date|day|today)\b/.test(normalized)) {
      reply(`Today is ${now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`);
    } else {
      reply(`The time is ${now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`);
    }
    return;
  }

  const mathReply = getMathReply(normalized);
  if (mathReply !== null) {
    reply(mathReply);
    return;
  }

  const website = normalized.match(/^open\s+(google|youtube|wikipedia)$/);
  if (website) {
    const sites = { google: "https://www.google.com", youtube: "https://www.youtube.com", wikipedia: "https://www.wikipedia.org" };
    const name = website[1][0].toUpperCase() + website[1].slice(1);
    reply(`Opening ${name}. If your browser blocked the new tab, use this link.`, sites[website[1]]);
    window.open(sites[website[1]], "_blank", "noopener,noreferrer");
    return;
  }

  const officeHolderReply = await getOfficeHolderReply(query);
  if (officeHolderReply !== null) {
    reply(officeHolderReply);
    return;
  }

  if (/\bminister\b/.test(normalized) && (/^(?:what|who)\b/.test(normalized) || /\b(?:name|current)\b/.test(normalized))) {
    reply("I couldn't reliably verify the current holder of that ministerial portfolio. I can look up prime ministers and Indian state chief ministers by country or state name.");
    return;
  }

  const summary = await getWikipediaReply(query);
  reply(summary);
}

// Start browser speech recognition when the browser supports it.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    isListening = true;
    activateButton.classList.add("is-listening");
    activateLabel.textContent = "LISTENING...";
    micHint.textContent = "LISTENING — SPEAK NOW";
    setStatus("listening");
  };
  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;
    handleCommand(spokenText);
  };
  recognition.onerror = (event) => {
    const errors = {
      "not-allowed": "Microphone access is blocked. Allow microphone access in your browser settings.",
      "no-speech": "I didn't hear anything. Please try speaking again.",
      "audio-capture": "I couldn't find a microphone. You can type your command instead.",
      "network": "Voice recognition needs an internet connection in this browser. You can type your command instead."
    };
    if (event.error !== "aborted") addMessage(errors[event.error] || "Voice recognition ran into a problem. Please try again or type your command.", "assistant");
  };
  recognition.onend = () => {
    isListening = false;
    activateButton.classList.remove("is-listening");
    activateLabel.textContent = "ACTIVATE VOICE";
    micHint.innerHTML = "TAP TO SPEAK <span>·</span> OR TYPE BELOW";
    setStatus(isSpeaking ? "speaking" : "online");
  };
} else {
  activateButton.disabled = true;
  activateButton.title = "Speech recognition is not supported in this browser. Use the text box instead.";
  micHint.textContent = "VOICE INPUT NOT SUPPORTED — TYPE BELOW";
}

// Wire up typed commands, example chips, and the speech mute switch.
textForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCommand(textInput.value);
});

activateButton.addEventListener("click", () => {
  if (!recognition) return;
  if (isListening) recognition.stop();
  else {
    try {
      recognition.start();
    } catch {
      addMessage("Voice recognition is already starting. Please try again in a moment.", "assistant");
    }
  }
});

document.querySelectorAll(".command-chip").forEach((chip) => {
  chip.addEventListener("click", () => handleCommand(chip.textContent));
});

soundToggle.addEventListener("click", () => {
  isMuted = !isMuted;
  soundToggle.setAttribute("aria-pressed", String(isMuted));
  soundToggle.setAttribute("aria-label", isMuted ? "Unmute voice" : "Mute voice");
  soundLabel.textContent = isMuted ? "VOICE OFF" : "VOICE ON";
  if (isMuted && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    setStatus(isListening ? "listening" : "online");
  }
});

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

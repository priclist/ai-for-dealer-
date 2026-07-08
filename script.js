/* ============================================
   IRONMAN AI — Dealer Assistant Chat
   v1.1 — Arc Reactor
   ============================================ */

// === Configuration ===
const CONFIG = {
  apiUrl: (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3101/chat';
    }
    if (host === 'industrialiot1001.com' || host.endsWith('.industrialiot1001.com')) {
      return window.location.protocol + '//' + host + '/api/ai-chat';
    }
    return window.OPENCLAW_AI_URL || null;
  })(),
  storageKey: 'ironman-ai-conversations',
  maxConvTitle: 40,
};

// === State ===
let conversations = loadConversations();
let activeConvId = null;
let isProcessing = false;

// === DOM Refs ===
const messagesEl = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const convListEl = document.getElementById('conversationList');

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  autoResize(chatInput);
  renderConversationList();
  openConversation(getOrCreateActiveConv().id);
  scrollToBottom();

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
});

// === Conversations (localStorage) ===
function loadConversations() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) { /* ignore */ }
  return [{ id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now() }];
}

function saveConversations() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(conversations));
  } catch (e) { /* storage full — silently ignore */ }
}

function generateId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function getOrCreateActiveConv() {
  if (!activeConvId) {
    activeConvId = conversations[0]?.id || null;
  }
  if (!activeConvId) {
    conversations.push({ id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now() });
    activeConvId = conversations[conversations.length - 1].id;
    saveConversations();
  }
  return getConv(activeConvId);
}

function getConv(id) {
  return conversations.find(c => c.id === id);
}

function msgTitle(msgs) {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  const t = first.text.trim();
  return t.length > CONFIG.maxConvTitle ? t.slice(0, CONFIG.maxConvTitle) + '…' : t;
}

// === Conversation List (Sidebar) ===
function renderConversationList() {
  if (!convListEl) return;
  // Show latest first
  const sorted = [...conversations].sort((a, b) => (b.lastActivity || b.createdAt) - (a.lastActivity || a.createdAt));

  if (sorted.length === 0) {
    convListEl.innerHTML = '<div class="conv-empty">No conversations yet</div>';
    return;
  }

  convListEl.innerHTML = sorted.map(c => `
    <div class="conv-item ${c.id === activeConvId ? 'active' : ''}" data-id="${c.id}" onclick="switchConversation('${c.id}')">
      <div class="conv-title">${escapeHtml(msgTitle(c.messages))}</div>
      <div class="conv-meta">${c.messages.length} messages</div>
      <button class="conv-del" onclick="event.stopPropagation(); deleteConversation('${c.id}')" title="Delete">✕</button>
    </div>
  `).join('');
}

function switchConversation(id) {
  if (id === activeConvId) return;
  if (window.innerWidth <= 768) sidebar.classList.remove('open');
  activeConvId = id;
  renderConversationList();
  renderMessages(getConv(id));
}

function deleteConversation(id) {
  if (!confirm('Delete this conversation?')) return;
  conversations = conversations.filter(c => c.id !== id);
  if (conversations.length === 0) {
    conversations.push({ id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now() });
  }
  if (activeConvId === id || !getConv(activeConvId)) {
    activeConvId = conversations[conversations.length - 1].id;
  }
  saveConversations();
  renderConversationList();
  renderMessages(getConv(activeConvId));
}

// === Render Messages ===
function renderMessages(conv) {
  messagesEl.querySelectorAll('.message').forEach(el => el.remove());

  const welcome = document.querySelector('.welcome');
  if (welcome) welcome.remove();

  if (!conv || conv.messages.length === 0) {
    showWelcome();
    return;
  }

  conv.messages.forEach(m => addMessageDOM(m.text, m.role, m.time));
  scrollToBottom();
}

function showWelcome() {
  // Re-inject welcome if it was removed and there are no messages
  const existing = document.querySelector('.welcome');
  if (existing) return;
  messagesEl.insertAdjacentHTML('afterbegin', `
    <div class="welcome">
      <div class="welcome-icon">
        <div class="arc-reactor-lg"></div>
      </div>
      <h2>Hey, I'm Ironman 🦾</h2>
      <p>Your AI-powered dealer assistant. Ask me anything about your deals, inventory, customers, or strategy.</p>
      <div class="suggestions">
        <button class="suggestion-chip" onclick="sendSuggestion('Analyze my current deals')">Analyze my current deals</button>
        <button class="suggestion-chip" onclick="sendSuggestion('Show me today\\'s priorities')">Show me today's priorities</button>
        <button class="suggestion-chip" onclick="sendSuggestion('How\\'s the market looking?')">How's the market looking?</button>
        <button class="suggestion-chip" onclick="sendSuggestion('What should I focus on?')">What should I focus on?</button>
      </div>
    </div>
  `);
}

// === Send Message ===
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isProcessing) return;

  chatInput.value = '';
  autoResize(chatInput);
  sendBtn.disabled = true;

  const conv = getOrCreateActiveConv();

  // Remove welcome
  const welcome = document.querySelector('.welcome');
  if (welcome) welcome.remove();

  // Add user message
  conv.messages.push({ role: 'user', text, time: new Date().toISOString() });
  addMessageDOM(text, 'user');
  conv.title = msgTitle(conv.messages);
  conv.lastActivity = Date.now();
  saveConversations();
  renderConversationList();

  // Typing indicator
  const typingId = showTyping();

  isProcessing = true;

  try {
    const response = await callBackend(text);
    hideTyping(typingId);
    conv.messages.push({ role: 'assistant', text: response, time: new Date().toISOString() });
    addMessageDOM(response, 'assistant');
    conv.lastActivity = Date.now();
    saveConversations();
    renderConversationList();
  } catch (err) {
    hideTyping(typingId);
    const errMsg = `⚠️ ${err.message}`;
    conv.messages.push({ role: 'assistant', text: errMsg, time: new Date().toISOString() });
    addMessageDOM(errMsg, 'error');
    conv.lastActivity = Date.now();
    saveConversations();
    renderConversationList();
  } finally {
    isProcessing = false;
    updateSendBtn();
  }
}

// === Backend Call ===
async function callBackend(message) {
  if (CONFIG.apiUrl) {
    try {
      const res = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionKey: activeConvId }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`API error (${res.status}): ${errText || 'Unknown error'}`);
      }

      const data = await res.json();
      if (data.reply) return data.reply;
      if (data.error) throw new Error(data.error);
      return 'Got it.';
    } catch (err) {
      console.warn('Live API failed, falling back:', err);
    }
  }

  return generateLocalResponse(message);
}

// === Local Response Generator (Fallback) ===
function generateLocalResponse(msg) {
  const input = msg.toLowerCase();
  const name = 'Zooro';

  const responses = [
    { match: /deal|inventory|stock|customer|lead|sale|pipeline/, response: `Looking at your data, ${name}... Here's what I've got: Your pipeline is looking solid. I'd recommend focusing on follow-ups with your warm leads — those convert at 3x the rate of cold ones. Want me to dig into specifics?` },
    { match: /analyze|report|numbers|metrics|kpi|performance/, response: `Running analysis now, ${name}. 📊 Your key metrics are trending well. Revenue per deal is up 12% this quarter, and your close rate has improved by 5%. The area that needs attention is response time — leads contacted within 5 minutes convert 8x better.` },
    { match: /priority|focus|urgent|important|next/, response: `Here's your priority list, ${name}: \n\n1️⃣ **Follow up** with the 3 hot leads from yesterday\n2️⃣ **Review** the inventory that's been sitting 60+ days\n3️⃣ **Prepare** for tomorrow's market shift report\n\nWant me to dive into any of these?` },
    { match: /market|trend|competitor|competition|pricing/, response: `Market intel coming in hot 🔥 Prices have shifted 2.3% in your segment this week. Competitors are offering extended warranties — could be worth matching. Want me to run a full competitive analysis?` },
    { match: /help|what can you do|capabilities/, response: `I can help you with:\n\n• **Deal analysis** — break down any deal's strengths/risks\n• **Market intelligence** — real-time market trends\n• **Customer insights** — know your buyer before you call\n• **Inventory optimization** — what to move, what to hold\n• **Strategy** — game plans that actually work\n\nJust tell me what you need, ${name}.` },
    { match: /hello|hi|hey|sup|howdy/, response: `Hey ${name} 👋 What's on your mind? Deals, strategy, or just checking in with your friendly neighborhood Ironman?` },
    { match: /how are you|how's it going/, response: `Running at 100%, ${name}. Reactor's glowing, systems are green. Ready to crush it. What do you need?` },
    { match: /thanks|thank you|appreciate/, response: `Anytime, ${name}. That's what I'm here for. 🦾 You take care of the deals, I'll handle the intel.` },
    { match: /joke|funny|laugh/, response: `Alright, here's one: Why did the dealer cross the road? ... To close the deal on the other side! 🥁 \n\nOkay, I'm better with data than standup. What do you actually need?` },
    { match: /who are you|what are you/, response: `I'm Ironman — your AI-powered dealer assistant. Built on OpenClaw, themed with style, coded with purpose. Think Tony Stark, but focused on helping you close deals. 🦾` },
  ];

  for (const entry of responses) {
    if (entry.match.test(input)) {
      return entry.response;
    }
  }

  const defaults = [
    `Interesting point, ${name}. Let me think... Based on what I know, I'd suggest looking at this from the buyer's perspective. Want me to run a deeper analysis?`,
    `Got it, ${name}. I'm noting that down. With the current market conditions, I think there's an opportunity here we should explore. Care to elaborate?`,
    `I hear you, ${name}. Let me check my databases... \n\nHere's what stands out: this aligns with a pattern I've seen in top-performing dealers. The ones who act fast on these signals consistently outperform by 30%+.`,
    `Roger that, ${name}. 🦾 Processing your request... \n\nI'd recommend we look at the numbers first before jumping to conclusions. Can you give me a bit more context?`,
    `On it, ${name}. \n\nQuick thought: sometimes the best move is the obvious one we're overthinking. What does your gut say? My data says trust it — your track record speaks for itself.`,
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}

// === UI Helpers ===
function addMessageDOM(text, role, time) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;

  const ts = time ? formatTime(new Date(time)) : formatTime(new Date());

  if (role === 'assistant' || role === 'error') {
    msgDiv.innerHTML = `
      <div class="assistant-avatar">🦾</div>
      <div>
        <div class="bubble">${formatMessage(text)}</div>
        <div class="message-time">${ts}</div>
      </div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div>
        <div class="bubble">${escapeHtml(text)}</div>
        <div class="message-time" style="text-align:right">${ts}</div>
      </div>
    `;
  }

  messagesEl.appendChild(msgDiv);
  scrollToBottom();
}

function addMessage(text, role) {
  addMessageDOM(text, role);
}

function formatMessage(text) {
  let formatted = escapeHtml(text);

  // Code blocks (```...```)
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const trimmed = code.trim();
    const langClass = lang ? ` class="lang-${escapeHtml(lang)}"` : '';
    return `<div class="code-block"><div class="code-header">${lang || 'code'}</div><pre${langClass}><code>${escapeHtml(trimmed)}</code></pre></div>`;
  });

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Lists
  formatted = formatted.replace(/^\s*•\s*/gm, '<span class="bullet">•</span> ');
  formatted = formatted.replace(/^\s*-\s*/gm, '<span class="bullet">•</span> ');
  // Numbered lists
  formatted = formatted.replace(/^(\d+\.)\s+/gm, '<span class="num-list">$1</span> ');
  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showTyping() {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = id;
  div.innerHTML = `
    <div class="assistant-avatar">🦾</div>
    <div>
      <div class="bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  messagesEl.appendChild(div);
  scrollToBottom();
  return id;
}

function hideTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateSendBtn() {
  sendBtn.disabled = !chatInput.value.trim() || isProcessing;
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  updateSendBtn();
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function sendSuggestion(text) {
  chatInput.value = text;
  autoResize(chatInput);
  sendMessage();
}

function clearChat() {
  if (!confirm('Clear the current conversation?')) return;
  const conv = getConv(activeConvId);
  if (conv) {
    conv.messages = [];
    conv.title = 'New Chat';
    delete conv.lastActivity;
    saveConversations();
    renderConversationList();
    renderMessages(conv);
  }
}

function newChat() {
  const conv = { id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now() };
  conversations.push(conv);
  activeConvId = conv.id;
  saveConversations();
  renderConversationList();
  renderMessages(conv);
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
  }
}

// State
let allModules = [];
let currentFilter = 'all';
let currentDomain = 'all';
let currentSearch = '';
let chatHistory = [];
let isStreaming = false;

// DOM Elements
const modulesGrid = document.getElementById('modulesGrid');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const domainSelect = document.getElementById('domainSelect');
const filterPills = document.querySelectorAll('.filter-pill');
const chatDrawer = document.getElementById('chatDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const heroOpenChatBtn = document.getElementById('heroOpenChatBtn');
const stickyQuizBtn = document.getElementById('stickyQuizBtn');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const countdownClock = document.getElementById('countdownClock');

// Modal Elements
const navKeyBtn = document.getElementById('navKeyBtn');
const keyStatusDot = document.getElementById('keyStatusDot');
const keyModalOverlay = document.getElementById('keyModalOverlay');
const modalApiKeyInput = document.getElementById('modalApiKeyInput');
const modalSaveKeyBtn = document.getElementById('modalSaveKeyBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalKeyMsg = document.getElementById('modalKeyMsg');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchModules();
  setupEventListeners();
  startCountdown();
  checkApiStatus();
});

// Check API status
async function checkApiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.groq_configured) {
      keyStatusDot.style.background = '#34d399';
      keyStatusDot.style.boxShadow = '0 0 8px #34d399';
    } else {
      keyStatusDot.style.background = '#eab308';
      keyStatusDot.style.boxShadow = '0 0 8px #eab308';
      // Auto open modal if not configured
      openKeyModal();
    }
  } catch (e) {
    console.error('Failed to check status:', e);
  }
}

function openKeyModal() {
  keyModalOverlay.classList.add('active');
  modalApiKeyInput.focus();
}

function closeKeyModal() {
  keyModalOverlay.classList.remove('active');
  modalKeyMsg.style.display = 'none';
}

// Fetch modules
async function fetchModules() {
  try {
    const res = await fetch('/api/modules');
    allModules = await res.json();
    renderModules();
  } catch (err) {
    console.error('Failed to load modules:', err);
  }
}

// Render Module Cards
function renderModules() {
  const filtered = allModules.filter(m => {
    // Week filter
    if (currentFilter !== 'all' && m.id !== currentFilter) return false;

    // Domain filter
    if (currentDomain !== 'all' && m.category !== currentDomain) return false;

    // Search filter
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      const matchText = (m.title + ' ' + m.description + ' ' + m.topics.join(' ')).toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  resultsCount.textContent = `${filtered.length} module${filtered.length === 1 ? '' : 's'} available for midterm prep`;

  if (filtered.length === 0) {
    modulesGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">No modules matched your search.</p>
        <button onclick="resetFilters()" class="filter-pill active" style="margin: 0 auto;">Reset Filters</button>
      </div>
    `;
    return;
  }

  modulesGrid.innerHTML = filtered.map(m => `
    <article class="module-card">
      <div class="card-image-box">
        <img src="${m.image}" alt="${m.title}" loading="lazy" />
        <span class="card-slide-pill">${m.slides}</span>
      </div>

      <div class="card-body">
        <div class="card-meta-line">
          <span class="card-institution">${m.institution}</span>
          <span class="card-category-tag">${m.category}</span>
        </div>

        <h3 class="card-title">${m.title}</h3>
        <p class="card-desc">${m.description}</p>

        <div class="card-topics">
          ${m.topics.map(t => `<span class="topic-tag">${t}</span>`).join('')}
        </div>

        <div class="card-footer">
          <button class="card-btn primary" onclick="askAboutModule('${m.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Ask AI
          </button>
          <button class="card-btn" onclick="quizOnModule('${m.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            Quiz Me
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();
    renderModules();
  });

  // Domain dropdown
  domainSelect.addEventListener('change', (e) => {
    currentDomain = e.target.value;
    renderModules();
  });

  // Filter pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderModules();
    });
  });

  // Drawer toggles
  heroOpenChatBtn.addEventListener('click', openDrawer);
  stickyQuizBtn.addEventListener('click', () => {
    openDrawer();
    sendQuery("Generate 5 tricky midterm multiple-choice questions covering all 6 weeks, with detailed explanations.");
  });
  // Modal toggles
  navKeyBtn.addEventListener('click', openKeyModal);
  modalCloseBtn.addEventListener('click', closeKeyModal);
  keyModalOverlay.addEventListener('click', (e) => {
    if (e.target === keyModalOverlay) closeKeyModal();
  });

  modalSaveKeyBtn.addEventListener('click', async () => {
    const key = modalApiKeyInput.value.trim();
    if (!key) {
      modalKeyMsg.style.display = 'block';
      modalKeyMsg.style.color = '#dc2626';
      modalKeyMsg.textContent = 'Please paste your Groq API key.';
      return;
    }

    modalSaveKeyBtn.disabled = true;
    modalSaveKeyBtn.textContent = 'Saving...';
    modalKeyMsg.style.display = 'none';

    try {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key })
      });
      const data = await res.json();
      if (res.ok) {
        modalKeyMsg.style.display = 'block';
        modalKeyMsg.style.color = '#16a34a';
        modalKeyMsg.textContent = data.message || 'Key activated!';
        keyStatusDot.style.background = '#34d399';
        keyStatusDot.style.boxShadow = '0 0 8px #34d399';
        setTimeout(() => closeKeyModal(), 1200);
      } else {
        modalKeyMsg.style.display = 'block';
        modalKeyMsg.style.color = '#dc2626';
        modalKeyMsg.textContent = data.detail || 'Failed to save key.';
      }
    } catch (e) {
      modalKeyMsg.style.display = 'block';
      modalKeyMsg.style.color = '#dc2626';
      modalKeyMsg.textContent = 'Error connecting to server.';
    } finally {
      modalSaveKeyBtn.disabled = false;
      modalSaveKeyBtn.textContent = 'Save & Activate Key';
    }
  });

  // Quick Chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      sendQuery(q);
    });
  });

  // Form submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || isStreaming) return;
    sendQuery(text);
    chatInput.value = '';
    chatInput.style.height = 'auto';
  });

  // Auto-resize chat textarea
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });
}

// Drawer Controls
function openDrawer() {
  chatDrawer.classList.add('active');
  drawerOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => chatInput.focus(), 300);
}

function closeDrawer() {
  chatDrawer.classList.remove('active');
  drawerOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Card Actions
window.askAboutModule = function(moduleId) {
  const m = allModules.find(x => x.id === moduleId);
  if (!m) return;
  openDrawer();
  sendQuery(`Explain the key concepts from ${m.week} (${m.title}) that are most likely to appear on the midterm exam.`);
};

window.quizOnModule = function(moduleId) {
  const m = allModules.find(x => x.id === moduleId);
  if (!m) return;
  openDrawer();
  sendQuery(`Give me 3 practice midterm exam questions (including 1 case study dilemma) specifically on ${m.week}: ${m.title}. Provide hints and full explanations.`);
};

window.resetFilters = function() {
  currentFilter = 'all';
  currentDomain = 'all';
  currentSearch = '';
  searchInput.value = '';
  domainSelect.value = 'all';
  filterPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-filter') === 'all'));
  renderModules();
};

// Send Query with SSE streaming
async function sendQuery(userMessage) {
  if (isStreaming) return;
  isStreaming = true;

  // Append user message bubble
  appendBubble('user', userMessage);
  chatHistory.push({ role: 'user', content: userMessage });

  // Append empty assistant message bubble with typing indicator
  const assistantBubble = appendBubble('assistant', '<span class="typing-cursor"></span>');
  const bubbleBody = assistantBubble.querySelector('.bubble-body');

  let accumulatedText = '';
  let sourcesList = [];

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: chatHistory.slice(-4),
        week_filter: currentFilter
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop(); // keep last incomplete chunk

      for (const evt of events) {
        if (!evt.trim()) continue;

        const lines = evt.split('\n');
        let eventType = '';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.substring(7).trim();
          if (line.startsWith('data: ')) dataStr = line.substring(6).trim();
        }

        if (eventType === 'sources') {
          try {
            sourcesList = JSON.parse(dataStr);
          } catch (e) {}
        } else if (eventType === 'token') {
          try {
            const parsed = JSON.parse(dataStr);
            accumulatedText += parsed.token;
            bubbleBody.innerHTML = formatMarkdown(accumulatedText) + '<span class="typing-cursor"></span>';
            chatMessages.scrollTop = chatMessages.scrollHeight;
          } catch (e) {}
        } else if (eventType === 'error') {
          try {
            const err = JSON.parse(dataStr);
            accumulatedText += `\n\n*(Error: ${err.error})*`;
          } catch (e) {}
        }
      }
    }

    // Done streaming - append citations if available
    let finalText = formatMarkdown(accumulatedText);
    if (sourcesList && sourcesList.length > 0) {
      const pillsHtml = sourcesList.map(s => `
        <span class="citation-pill" title="${s.snippet}">
          📄 ${s.file} (p. ${s.page})
        </span>
      `).join('');

      finalText += `
        <div class="citations-wrapper">
          <div class="citations-header">📚 Referenced Lecture Slides:</div>
          <div>${pillsHtml}</div>
        </div>
      `;
    }

    bubbleBody.innerHTML = finalText;
    chatHistory.push({ role: 'assistant', content: accumulatedText });

  } catch (err) {
    bubbleBody.innerHTML = `<p style="color: #c53030;">Error: ${err.message}. Please check that the server is running.</p>`;
  } finally {
    isStreaming = false;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Append Bubble Helper
function appendBubble(role, htmlContent) {
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.innerHTML = `
    <div class="bubble-avatar">${role === 'user' ? '👤' : '⚖️'}</div>
    <div class="bubble-body">${htmlContent}</div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// Simple Markdown Formatter
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h4 style="margin: 12px 0 4px; font-weight: 700; color: var(--color-forest);">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="margin: 14px 0 6px; font-weight: 700; color: var(--color-forest); font-family: var(--font-serif); font-size: 1.2rem;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="margin: 16px 0 8px; font-weight: 700; color: var(--color-forest); font-family: var(--font-serif);">$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background: rgba(23,52,38,0.08); padding: 2px 5px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.85em;">$1</code>')
    .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 18px; margin-bottom: 4px;">$1</li>')
    .replace(/\n\n/gim, '<br/><br/>')
    .replace(/\n/gim, '<br/>');
}

// Live Countdown Clock (Countdown to 24 hours from now)
function startCountdown() {
  let target = new Date().getTime() + (24 * 60 * 60 * 1000);
  setInterval(() => {
    const now = new Date().getTime();
    const diff = target - now;
    if (diff <= 0) {
      countdownClock.textContent = "00:00:00";
      return;
    }
    const h = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    const m = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    countdownClock.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

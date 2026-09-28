// State
let allModules = [];
let currentFilter = 'all';
let chatHistory = [];
let isStreaming = false;

// DOM Elements
const modulesGrid = document.getElementById('modulesGrid');
const filterPillsContainer = document.getElementById('filterPillsContainer');
const mainQuestionInput = document.getElementById('mainQuestionInput');
const mainSubmitBtn = document.getElementById('mainSubmitBtn');

const studyDrawer = document.getElementById('studyDrawer');
const chatOverlay = document.getElementById('chatOverlay');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const drawerChatForm = document.getElementById('drawerChatForm');
const drawerInput = document.getElementById('drawerInput');
const drawerMessages = document.getElementById('drawerMessages');

// Key Modal Elements
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
  checkApiStatus();
  initFramerMotion();
});

// Framer Motion Initial Page Animation
function initFramerMotion() {
  if (window.Motion) {
    const { animate, stagger, spring } = window.Motion;

    // Stagger in hero elements
    animate(
      '.animate-in',
      { opacity: [0, 1], y: [16, 0] },
      { delay: stagger(0.08), duration: 0.5, easing: spring({ stiffness: 220, damping: 24 }) }
    );
  }
}

// Check Groq API Key Status
async function checkApiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.groq_configured) {
      keyStatusDot.style.background = '#10b981';
      keyStatusDot.style.boxShadow = '0 0 8px #10b981';
    } else {
      keyStatusDot.style.background = '#eab308';
      keyStatusDot.style.boxShadow = '0 0 8px #eab308';
      // Automatically prompt key modal if missing
      openKeyModal();
    }
  } catch (e) {
    console.error('Status check error:', e);
  }
}

// Fetch Modules
async function fetchModules() {
  try {
    const res = await fetch('/api/modules');
    allModules = await res.json();
    renderModules();
  } catch (err) {
    console.error('Failed to load modules:', err);
  }
}

// Render Bento Modules
function renderModules() {
  const filtered = allModules.filter(m => {
    if (currentFilter !== 'all' && m.id !== currentFilter) return false;
    return true;
  });

  modulesGrid.innerHTML = filtered.map(m => `
    <article class="bento-card" onclick="askAboutModule('${m.id}')">
      <div class="card-top-row">
        <span class="card-week-pill">${m.week.toUpperCase()}</span>
        <span class="card-slides-badge">${m.slides}</span>
      </div>

      <h3 class="bento-title">${m.title}</h3>
      <p class="bento-desc">${m.description}</p>

      <div class="bento-tags">
        ${m.topics.slice(0, 3).map(t => `<span class="bento-tag">${t}</span>`).join('')}
      </div>

      <div class="bento-footer">
        <button class="card-study-btn" onclick="event.stopPropagation(); askAboutModule('${m.id}')">
          <span>Study Guide</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
        <button class="card-quiz-btn" onclick="event.stopPropagation(); quizOnModule('${m.id}')">
          ⚡ Quiz Me
        </button>
      </div>
    </article>
  `).join('');

  // Animate cards on filter change
  if (window.Motion) {
    const { animate, stagger, spring } = window.Motion;
    animate(
      '.bento-card',
      { opacity: [0, 1], scale: [0.98, 1], y: [10, 0] },
      { delay: stagger(0.04), duration: 0.35, easing: spring({ stiffness: 260, damping: 24 }) }
    );
  }
}

// Event Listeners
function setupEventListeners() {
  // Main Spotlight Search
  mainSubmitBtn.addEventListener('click', () => {
    const q = mainQuestionInput.value.trim();
    if (!q) return;
    openDrawer();
    sendQuery(q);
    mainQuestionInput.value = '';
  });

  mainQuestionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      mainSubmitBtn.click();
    }
  });

  // Global shortcut (Ctrl + K or Cmd + K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      mainQuestionInput.focus();
    }
  });

  // Prompt Chips
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      openDrawer();
      sendQuery(q);
    });
  });

  // Filter Pills
  filterPillsContainer.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      filterPillsContainer.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderModules();
    });
  });

  // Drawer Controls
  drawerCloseBtn.addEventListener('click', closeDrawer);
  chatOverlay.addEventListener('click', closeDrawer);

  // Drawer Form Submit
  drawerChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = drawerInput.value.trim();
    if (!q || isStreaming) return;
    sendQuery(q);
    drawerInput.value = '';
    drawerInput.style.height = 'auto';
  });

  drawerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      drawerChatForm.dispatchEvent(new Event('submit'));
    }
  });

  drawerInput.addEventListener('input', () => {
    drawerInput.style.height = 'auto';
    drawerInput.style.height = Math.min(drawerInput.scrollHeight, 120) + 'px';
  });

  // API Key Modal Listeners
  navKeyBtn.addEventListener('click', openKeyModal);
  modalCloseBtn.addEventListener('click', closeKeyModal);
  keyModalOverlay.addEventListener('click', (e) => {
    if (e.target === keyModalOverlay) closeKeyModal();
  });

  modalSaveKeyBtn.addEventListener('click', async () => {
    const key = modalApiKeyInput.value.trim();
    if (!key) {
      modalKeyMsg.style.display = 'block';
      modalKeyMsg.style.color = '#ef4444';
      modalKeyMsg.textContent = 'Please enter a valid Groq API key.';
      return;
    }

    modalSaveKeyBtn.disabled = true;
    modalSaveKeyBtn.textContent = 'Activating...';
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
        modalKeyMsg.style.color = '#10b981';
        modalKeyMsg.textContent = 'Groq API Key active and verified!';
        keyStatusDot.style.background = '#10b981';
        keyStatusDot.style.boxShadow = '0 0 8px #10b981';
        setTimeout(() => closeKeyModal(), 1000);
      } else {
        modalKeyMsg.style.display = 'block';
        modalKeyMsg.style.color = '#ef4444';
        modalKeyMsg.textContent = data.detail || 'Failed to activate key.';
      }
    } catch (e) {
      modalKeyMsg.style.display = 'block';
      modalKeyMsg.style.color = '#ef4444';
      modalKeyMsg.textContent = 'Server connection error.';
    } finally {
      modalSaveKeyBtn.disabled = false;
      modalSaveKeyBtn.textContent = 'Save & Activate';
    }
  });
}

// Drawer Controls
function openDrawer() {
  studyDrawer.classList.add('active');
  chatOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => drawerInput.focus(), 250);
}

function closeDrawer() {
  studyDrawer.classList.remove('active');
  chatOverlay.classList.remove('active');
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
  sendQuery(`Generate 3 practice midterm exam questions (including 1 dilemma scenario) specifically on ${m.week}: ${m.title}. Provide step-by-step reasoning.`);
};

// Modal Controls
function openKeyModal() {
  keyModalOverlay.classList.add('active');
  modalApiKeyInput.focus();
}

function closeKeyModal() {
  keyModalOverlay.classList.remove('active');
  modalKeyMsg.style.display = 'none';
}

// Send Query with SSE streaming
async function sendQuery(userMessage) {
  if (isStreaming) return;
  isStreaming = true;

  appendBubble('user', userMessage);
  chatHistory.push({ role: 'user', content: userMessage });

  const assistantBubble = appendBubble('assistant', '<span class="cursor-blink"></span>');
  const bubbleText = assistantBubble.querySelector('.bubble-text');

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
      buffer = events.pop();

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
            bubbleText.innerHTML = formatMarkdown(accumulatedText) + '<span class="cursor-blink"></span>';
            drawerMessages.scrollTop = drawerMessages.scrollHeight;
          } catch (e) {}
        } else if (eventType === 'error') {
          try {
            const err = JSON.parse(dataStr);
            accumulatedText += `\n\n*(Error: ${err.error})*`;
          } catch (e) {}
        }
      }
    }

    // Done streaming - append citations cleanly
    let finalText = formatMarkdown(accumulatedText);
    if (sourcesList && sourcesList.length > 0) {
      const pillsHtml = sourcesList.map(s => `
        <span class="citation-chip" title="${s.snippet}">
          📄 ${s.file} (p. ${s.page})
        </span>
      `).join('');

      finalText += `
        <div class="citations-box">
          <div class="citations-label">Course Slide Citations:</div>
          <div>${pillsHtml}</div>
        </div>
      `;
    }

    bubbleText.innerHTML = finalText;
    chatHistory.push({ role: 'assistant', content: accumulatedText });

  } catch (err) {
    bubbleText.innerHTML = `<p style="color: #ef4444;">Error: ${err.message}. Please verify server connection.</p>`;
  } finally {
    isStreaming = false;
    drawerMessages.scrollTop = drawerMessages.scrollHeight;
  }
}

// Append Bubble Helper
function appendBubble(role, contentHtml) {
  const div = document.createElement('div');
  div.className = `message-bubble ${role}`;
  div.innerHTML = `
    <div class="bubble-header">
      <span class="avatar-badge">${role === 'user' ? '👤' : '⚖️'}</span>
      <span class="sender-name">${role === 'user' ? 'You' : 'Ethica Tutor'}</span>
    </div>
    <div class="bubble-text">${contentHtml}</div>
  `;
  drawerMessages.appendChild(div);
  drawerMessages.scrollTop = drawerMessages.scrollHeight;
  return div;
}

// Simple Markdown Formatter
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h4 style="margin: 12px 0 4px; font-weight: 600; color: #f4f4f5;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="margin: 14px 0 6px; font-weight: 600; color: #f4f4f5; font-size: 1.15rem;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="margin: 16px 0 8px; font-weight: 700; color: #f4f4f5;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #ffffff;">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.85em; color: #e4e4e7;">$1</code>')
    .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 18px; margin-bottom: 4px; color: #d4d4d8;">$1</li>')
    .replace(/\n\n/gim, '<br/><br/>')
    .replace(/\n/gim, '<br/>');
}

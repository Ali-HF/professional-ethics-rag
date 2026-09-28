// State
let allModules = [];
let activeModuleFilter = 'all';
let chatHistory = [];
let isStreaming = false;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
const modulesList = document.getElementById('modulesList');
const newChatBtn = document.getElementById('newChatBtn');

const activeScopeLabel = document.getElementById('activeScopeLabel');
const welcomeView = document.getElementById('welcomeView');
const chatThread = document.getElementById('chatThread');
const messagesContainer = document.getElementById('messagesContainer');

const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Key Modal Elements
const navKeyBtn = document.getElementById('navKeyBtn');
const keyStatusDot = document.getElementById('keyStatusDot');
const keyModalOverlay = document.getElementById('keyModalOverlay');
const modalApiKeyInput = document.getElementById('modalApiKeyInput');
const modalSaveKeyBtn = document.getElementById('modalSaveKeyBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalKeyMsg = document.getElementById('modalKeyMsg');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchModules();
  setupEventListeners();
  checkApiStatus();
});

// Fetch Modules
async function fetchModules() {
  try {
    const res = await fetch('/api/modules');
    allModules = await res.json();
    renderSidebarModules();
  } catch (err) {
    console.error('Failed to load modules:', err);
  }
}

// Render Course Modules in Left Sidebar (Claude style)
function renderSidebarModules() {
  modulesList.innerHTML = allModules.map(m => `
    <div class="module-nav-item ${activeModuleFilter === m.id ? 'active' : ''}" data-id="${m.id}">
      <div class="module-item-top">
        <span class="module-week-tag">${m.week.toUpperCase()}</span>
        <span class="module-slides-count">${m.slides}</span>
      </div>
      <div class="module-item-title" title="${m.title}">${m.title}</div>
      <div class="module-item-actions">
        <button class="mini-action-pill" onclick="event.stopPropagation(); selectModuleAndAction('${m.id}', 'study')">Study</button>
        <button class="mini-action-pill" onclick="event.stopPropagation(); selectModuleAndAction('${m.id}', 'quiz')">Quiz</button>
      </div>
    </div>
  `).join('');

  // Attach click listener to each module
  modulesList.querySelectorAll('.module-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      selectModule(id);
    });
  });
}

// Module Selection
function selectModule(id) {
  activeModuleFilter = id;
  const m = allModules.find(x => x.id === id);

  modulesList.querySelectorAll('.module-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-id') === id);
  });

  if (m) {
    activeScopeLabel.textContent = `${m.week}: ${m.title}`;
  } else {
    activeScopeLabel.textContent = 'All 6 Weeks Active';
  }
}

function selectModuleAndAction(id, action) {
  selectModule(id);
  const m = allModules.find(x => x.id === id);
  if (!m) return;

  if (action === 'study') {
    sendQuery(`Explain the key concepts and exam-relevant topics from ${m.week} (${m.title}) based on our slides.`);
  } else if (action === 'quiz') {
    sendQuery(`Generate 3 practice midterm exam questions (including 1 case dilemma) specifically on ${m.week}: ${m.title}. Provide hints and full step-by-step reasoning.`);
  }
}

// Event Listeners
function setupEventListeners() {
  // Sidebar Toggle (Desktop)
  sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // Mobile Sidebar Toggle
  mobileSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  // New Chat
  newChatBtn.addEventListener('click', resetChat);

  // Suggestion Cards
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      sendQuery(query);
    });
  });

  // Form Submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || isStreaming) return;
    sendQuery(text);
    messageInput.value = '';
    messageInput.style.height = 'auto';
  });

  // Auto-resize & Enter to send
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
  });

  // API Key Modal Listeners
  navKeyBtn.addEventListener('click', openKeyModal);
  modalCloseBtn.addEventListener('click', closeKeyModal);
  modalCancelBtn.addEventListener('click', closeKeyModal);
  keyModalOverlay.addEventListener('click', (e) => {
    if (e.target === keyModalOverlay) closeKeyModal();
  });

  modalSaveKeyBtn.addEventListener('click', async () => {
    const key = modalApiKeyInput.value.trim();
    if (!key) {
      modalKeyMsg.style.display = 'block';
      modalKeyMsg.style.color = '#ef4444';
      modalKeyMsg.textContent = 'Please enter your Groq API key.';
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
        modalKeyMsg.style.color = '#34d399';
        modalKeyMsg.textContent = 'Key verified and active!';
        keyStatusDot.style.background = '#34d399';
        setTimeout(() => closeKeyModal(), 1000);
      } else {
        modalKeyMsg.style.display = 'block';
        modalKeyMsg.style.color = '#ef4444';
        modalKeyMsg.textContent = data.detail || 'Failed to save key.';
      }
    } catch (e) {
      modalKeyMsg.style.display = 'block';
      modalKeyMsg.style.color = '#ef4444';
      modalKeyMsg.textContent = 'Server connection error.';
    } finally {
      modalSaveKeyBtn.disabled = false;
      modalSaveKeyBtn.textContent = 'Save Key';
    }
  });
}

// Reset Chat Session (New Chat)
function resetChat() {
  chatHistory = [];
  chatThread.innerHTML = '';
  welcomeView.style.display = 'block';
  selectModule('all');
  activeScopeLabel.textContent = 'All 6 Weeks Active';
  messageInput.focus();
}

// Check API status
async function checkApiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.groq_configured) {
      keyStatusDot.style.background = '#34d399';
    } else {
      keyStatusDot.style.background = '#eab308';
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

// Send Query with SSE streaming (Claude Canvas)
async function sendQuery(userMessage) {
  if (isStreaming) return;
  isStreaming = true;

  // Hide welcome view
  welcomeView.style.display = 'none';

  // Append user bubble
  appendUserMessage(userMessage);
  chatHistory.push({ role: 'user', content: userMessage });

  // Append assistant message container with typing cursor
  const assistantWrap = appendAssistantMessage('<span class="typing-cursor"></span>');
  const bodyEl = assistantWrap.querySelector('.assistant-body');

  let accumulatedText = '';
  let sourcesList = [];

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: chatHistory.slice(-4),
        week_filter: activeModuleFilter
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
            bodyEl.innerHTML = formatMarkdown(accumulatedText) + '<span class="typing-cursor"></span>';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          } catch (e) {}
        } else if (eventType === 'error') {
          try {
            const err = JSON.parse(dataStr);
            accumulatedText += `\n\n*(Error: ${err.error})*`;
          } catch (e) {}
        }
      }
    }

    // Done streaming - append slide citations
    let finalText = formatMarkdown(accumulatedText);
    if (sourcesList && sourcesList.length > 0) {
      const pillsHtml = sourcesList.map(s => `
        <span class="citation-pill" title="${s.snippet}">
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

    bodyEl.innerHTML = finalText;
    chatHistory.push({ role: 'assistant', content: accumulatedText });

  } catch (err) {
    bodyEl.innerHTML = `<p style="color: #ef4444;">Error: ${err.message}. Please check your server connection.</p>`;
  } finally {
    isStreaming = false;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// User Bubble
function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  chatThread.appendChild(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Assistant Bubble
function appendAssistantMessage(htmlContent) {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.innerHTML = `
    <div class="assistant-wrap">
      <div class="assistant-avatar">⚖️</div>
      <div class="assistant-body">${htmlContent}</div>
    </div>
  `;
  chatThread.appendChild(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return row;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Simple Markdown Formatter
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/^# (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.88em; color: #eceae5;">$1</code>')
    .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>')
    .replace(/\n\n/gim, '<br/><br/>')
    .replace(/\n/gim, '<br/>');
}

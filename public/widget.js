/**
 * Vernacular Chat Widget v2
 * AI-powered support chat with iMessage handoff.
 *
 * Usage:
 *   <script src="https://vernacular.chat/widget.js"
 *           data-token="EMBED_TOKEN_HERE"
 *           data-position="right">
 *   </script>
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var CONFIG = {
    token: script.getAttribute('data-token') || '',
    position: script.getAttribute('data-position') || 'right',
    apiBase: script.getAttribute('data-api') || 'https://vernacular.chat',
    // These get filled from /api/widget/config
    color: '#378ADD',
    name: 'Support',
    greeting: 'Hi! How can I help you today?',
    stationPhone: '',
  };

  var state = {
    open: false,
    messages: [],
    conversationId: '',
    sessionId: '',
    unread: false,
    typing: false,
    handoffOffered: false,
    resolved: false,
    hasAIReply: false,
  };

  // Generate session ID
  state.sessionId = sessionStorage.getItem('vnc-session') || ('vnc-' + Math.random().toString(36).slice(2));
  sessionStorage.setItem('vnc-session', state.sessionId);

  var host = document.createElement('div');
  host.id = 'vnc-widget-host';
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: 'open' });

  // ── Fetch config ────────────────────────────────────────────────────
  if (CONFIG.token) {
    fetch(CONFIG.apiBase + '/api/widget/config/' + CONFIG.token)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.client_name) CONFIG.name = data.client_name;
        if (data.brand_color) CONFIG.color = data.brand_color;
        if (data.greeting) CONFIG.greeting = data.greeting;
        if (data.station_phone) CONFIG.stationPhone = data.station_phone;
        state.messages = [{ text: CONFIG.greeting, from: 'bot', time: Date.now() }];
        render();
      })
      .catch(function () {
        state.messages = [{ text: CONFIG.greeting, from: 'bot', time: Date.now() }];
        render();
      });
  }

  // ── Create session ──────────────────────────────────────────────────
  function ensureSession(cb) {
    if (state.conversationId) return cb();
    fetch(CONFIG.apiBase + '/api/widget/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embed_token: CONFIG.token, session_id: state.sessionId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.conversationId = data.conversation_id || '';
        cb();
      })
      .catch(function () { cb(); });
  }

  // ── Send message to AI ──────────────────────────────────────────────
  function sendToAI(text) {
    if (!state.conversationId) return;
    state.typing = true;
    render();

    fetch(CONFIG.apiBase + '/api/widget/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: state.conversationId,
        embed_token: CONFIG.token,
        message: text,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.typing = false;
        if (data.reply) {
          state.messages.push({ text: data.reply, from: 'bot', time: Date.now() });
          state.hasAIReply = true;
        }
        if (data.offer_handoff && !state.handoffOffered) {
          state.handoffOffered = true;
          state.messages.push({
            text: '__HANDOFF__',
            from: 'system',
            time: Date.now(),
          });
        }
        render();
        scrollToBottom();
      })
      .catch(function () {
        state.typing = false;
        state.messages.push({ text: 'Sorry, something went wrong. Please try again.', from: 'bot', time: Date.now() });
        render();
      });
  }

  // ── Handoff to iMessage ─────────────────────────────────────────────
  function doHandoff() {
    fetch(CONFIG.apiBase + '/api/widget/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: state.conversationId,
        embed_token: CONFIG.token,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.sms_link) {
          window.open(data.sms_link, '_self');
        }
        resolveConversation('imessage_handoff');
      })
      .catch(function () {});
  }

  // ── Resolve (bill) ──────────────────────────────────────────────────
  function resolveConversation(method) {
    if (state.resolved || !state.conversationId || !state.hasAIReply) return;
    state.resolved = true;
    fetch(CONFIG.apiBase + '/api/widget/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: state.conversationId,
        embed_token: CONFIG.token,
        resolution_method: method || 'ai',
        source: 'widget',
      }),
    }).catch(function () {});
  }

  // ── Render ──────────────────────────────────────────────────────────
  function render() {
    var c = CONFIG.color;
    var pos = CONFIG.position === 'left' ? 'left: 20px;' : 'right: 20px;';

    var messagesHtml = state.messages.map(function (m) {
      if (m.from === 'system' && m.text === '__HANDOFF__') {
        return '<div class="vnc-handoff-card">' +
          '<div class="vnc-handoff-icon">💬</div>' +
          '<div class="vnc-handoff-title">Continue in iMessage?</div>' +
          '<div class="vnc-handoff-desc">Get a direct text from our team — faster, personal, blue bubbles.</div>' +
          '<button class="vnc-handoff-btn" data-action="handoff">Text Us →</button>' +
          '</div>';
      }
      var cls = m.from === 'user' ? 'vnc-msg-user' : 'vnc-msg-bot';
      return '<div class="' + cls + '"><div class="vnc-bubble">' + escHtml(m.text) + '</div></div>';
    }).join('');

    if (state.typing) {
      messagesHtml += '<div class="vnc-msg-bot"><div class="vnc-bubble vnc-typing"><span></span><span></span><span></span></div></div>';
    }

    shadow.innerHTML = '<style>' +
      '.vnc-launcher{position:fixed;bottom:20px;' + pos + 'width:56px;height:56px;border-radius:28px;background:' + c + ';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:99999;border:none;transition:transform .15s}' +
      '.vnc-launcher:hover{transform:scale(1.08)}' +
      '.vnc-launcher svg{fill:#fff;width:24px;height:24px}' +
      '.vnc-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:7px;background:#EF4444;border:2px solid #fff}' +
      '.vnc-panel{position:fixed;bottom:88px;' + pos + 'width:368px;height:520px;border-radius:16px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,0.15);z-index:99999;display:flex;flex-direction:column;overflow:hidden;font-family:Inter,-apple-system,sans-serif}' +
      '.vnc-header{padding:16px 18px;background:' + c + ';color:#fff;display:flex;align-items:center;justify-content:space-between}' +
      '.vnc-header-name{font-size:16px;font-weight:700}' +
      '.vnc-header-sub{font-size:11px;opacity:.7;margin-top:2px}' +
      '.vnc-close{background:none;border:none;color:#fff;cursor:pointer;font-size:18px;opacity:.7;padding:4px}' +
      '.vnc-close:hover{opacity:1}' +
      '.vnc-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}' +
      '.vnc-msg-user{display:flex;justify-content:flex-end}' +
      '.vnc-msg-bot{display:flex;justify-content:flex-start}' +
      '.vnc-msg-user .vnc-bubble{background:' + c + ';color:#fff;border-radius:18px 18px 4px 18px;padding:10px 14px;max-width:80%;font-size:14px;line-height:1.5}' +
      '.vnc-msg-bot .vnc-bubble{background:#f0f0f5;color:#1c1c1e;border-radius:18px 18px 18px 4px;padding:10px 14px;max-width:80%;font-size:14px;line-height:1.5}' +
      '.vnc-typing span{display:inline-block;width:6px;height:6px;border-radius:3px;background:#8e8e93;margin:0 2px;animation:vncDot 1.2s ease-in-out infinite}' +
      '.vnc-typing span:nth-child(2){animation-delay:.15s}' +
      '.vnc-typing span:nth-child(3){animation-delay:.3s}' +
      '@keyframes vncDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}' +
      '.vnc-handoff-card{background:linear-gradient(135deg,rgba(55,138,221,.08),rgba(55,138,221,.03));border:1px solid rgba(55,138,221,.2);border-radius:14px;padding:18px;text-align:center;margin:6px 0}' +
      '.vnc-handoff-icon{font-size:28px;margin-bottom:8px}' +
      '.vnc-handoff-title{font-size:15px;font-weight:700;color:#1c1c1e;margin-bottom:4px}' +
      '.vnc-handoff-desc{font-size:12px;color:#8e8e93;margin-bottom:12px;line-height:1.4}' +
      '.vnc-handoff-btn{background:' + c + ';color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer}' +
      '.vnc-handoff-btn:hover{opacity:.9}' +
      '.vnc-input-bar{padding:12px;border-top:1px solid rgba(0,0,0,.06);display:flex;gap:8px;align-items:center}' +
      '.vnc-input{flex:1;padding:10px 14px;border-radius:20px;border:1px solid rgba(0,0,0,.1);font-size:14px;outline:none;font-family:inherit}' +
      '.vnc-input:focus{border-color:' + c + '}' +
      '.vnc-send{width:36px;height:36px;border-radius:18px;background:' + c + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
      '.vnc-send svg{fill:#fff;width:16px;height:16px}' +
      '.vnc-powered{text-align:center;padding:6px;font-size:10px;color:#c4c4c6;border-top:1px solid rgba(0,0,0,.03)}' +
      '</style>' +

      // Launcher button
      '<button class="vnc-launcher" aria-label="Open chat">' +
      (state.unread ? '<div class="vnc-badge"></div>' : '') +
      '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '</button>' +

      // Panel
      (state.open ? (
        '<div class="vnc-panel">' +
        '<div class="vnc-header">' +
        '<div><div class="vnc-header-name">' + escHtml(CONFIG.name) + '</div><div class="vnc-header-sub">Powered by Vernacular</div></div>' +
        '<button class="vnc-close" data-action="close">✕</button>' +
        '</div>' +
        '<div class="vnc-body">' + messagesHtml + '</div>' +
        '<div class="vnc-input-bar">' +
        '<input class="vnc-input" placeholder="Type a message..." />' +
        '<button class="vnc-send"><svg viewBox="0 0 24 24"><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
        '</div>' +
        '<div class="vnc-powered">vernacular.chat</div>' +
        '</div>'
      ) : '');

    // Events
    var launcher = shadow.querySelector('.vnc-launcher');
    if (launcher) launcher.addEventListener('click', togglePanel);

    var closeBtn = shadow.querySelector('[data-action="close"]');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      state.open = false;
      if (state.hasAIReply) resolveConversation('ai');
      render();
    });

    var input = shadow.querySelector('.vnc-input');
    var sendBtn = shadow.querySelector('.vnc-send');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      if (state.open) setTimeout(function () { input.focus(); }, 50);
    }
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    var handoffBtn = shadow.querySelector('[data-action="handoff"]');
    if (handoffBtn) handoffBtn.addEventListener('click', doHandoff);
  }

  function togglePanel() {
    state.open = !state.open;
    if (state.open) {
      state.unread = false;
      ensureSession(function () {});
    }
    render();
  }

  function sendMessage() {
    var input = shadow.querySelector('.vnc-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    state.messages.push({ text: text, from: 'user', time: Date.now() });
    input.value = '';
    render();
    scrollToBottom();

    ensureSession(function () {
      sendToAI(text);
    });
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function scrollToBottom() {
    var body = shadow.querySelector('.vnc-body');
    if (body) setTimeout(function () { body.scrollTop = body.scrollHeight; }, 50);
  }

  // Init
  state.messages.push({ text: CONFIG.greeting, from: 'bot', time: Date.now() });
  render();
})();

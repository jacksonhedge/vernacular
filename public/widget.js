/**
 * Vernacular Chat Widget
 * Embeddable customer support chat that bridges web visitors to iMessage.
 *
 * Usage:
 *   <script src="https://vernacular.chat/widget.js"
 *           data-station="Wade"
 *           data-color="#378ADD"
 *           data-org="org_123"
 *           data-greeting="Hi! How can we help you today?"
 *           data-position="right"
 *           data-name="Vernacular">
 *   </script>
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var CONFIG = {
    color: script.getAttribute('data-color') || '#378ADD',
    station: script.getAttribute('data-station') || 'Wade',
    org: script.getAttribute('data-org') || '',
    greeting: script.getAttribute('data-greeting') || 'Hi! How can we help you today?',
    position: script.getAttribute('data-position') || 'right',
    name: script.getAttribute('data-name') || 'Vernacular',
    apiBase: 'https://vernacular.chat',
  };

  // ── State ──────────────────────────────────────────────────────────
  var state = {
    open: false,
    messages: [],          // { text, from: 'user'|'bot', time }
    phase: 'welcome',      // welcome | prompt | phone | chat | sent
    unread: false,
    phone: '',
    firstUserMessage: '',
    waitingForResponse: false,
  };

  // ── Shadow DOM host ────────────────────────────────────────────────
  var host = document.createElement('div');
  host.id = 'vnc-widget-host';
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: 'open' });

  // ── Styles ─────────────────────────────────────────────────────────
  var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }

  var colorRgb = hexToRgb(CONFIG.color);
  var posLeft = CONFIG.position === 'left';

  var css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

    :host{
      all:initial;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      font-size:14px;
      color:${isDark ? '#e4e4e7' : '#18181b'};
      line-height:1.5;
    }

    /* ── Fab ──────────────────────────────────────────────────────── */
    .vnc-fab{
      position:fixed;
      bottom:24px;
      ${posLeft ? 'left' : 'right'}:24px;
      width:56px;height:56px;
      border-radius:50%;
      background:${CONFIG.color};
      border:none;cursor:pointer;
      z-index:999999;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(${colorRgb},0.45);
      transition:transform .2s ease,box-shadow .2s ease;
      animation:vnc-bounce .6s ease;
    }
    .vnc-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(${colorRgb},0.55);}
    .vnc-fab svg{width:26px;height:26px;fill:#fff;}
    .vnc-fab.open svg.chat-icon{display:none;}
    .vnc-fab.open svg.close-icon{display:block;}
    .vnc-fab:not(.open) svg.close-icon{display:none;}

    .vnc-badge{
      position:absolute;top:2px;right:2px;
      width:12px;height:12px;border-radius:50%;
      background:#ef4444;border:2px solid #fff;
      display:none;
    }
    .vnc-badge.show{display:block;}

    @keyframes vnc-bounce{
      0%{transform:scale(0);}
      50%{transform:scale(1.15);}
      100%{transform:scale(1);}
    }

    /* ── Panel ────────────────────────────────────────────────────── */
    .vnc-panel{
      position:fixed;
      bottom:92px;
      ${posLeft ? 'left' : 'right'}:24px;
      width:360px;height:500px;
      border-radius:16px;
      background:${isDark ? '#1c1c1e' : '#ffffff'};
      box-shadow:0 12px 40px rgba(0,0,0,${isDark ? '0.5' : '0.18'});
      display:flex;flex-direction:column;
      overflow:hidden;
      z-index:999999;
      transform:translateY(20px);opacity:0;pointer-events:none;
      transition:transform .25s ease,opacity .25s ease;
    }
    .vnc-panel.open{transform:translateY(0);opacity:1;pointer-events:auto;}

    /* ── Header ───────────────────────────────────────────────────── */
    .vnc-header{
      display:flex;align-items:center;gap:10px;
      padding:14px 16px;
      background:${CONFIG.color};
      color:#fff;
    }
    .vnc-header-logo{
      width:28px;height:28px;border-radius:8px;
      background:rgba(255,255,255,0.2);
      display:flex;align-items:center;justify-content:center;
    }
    .vnc-header-logo svg{width:18px;height:18px;fill:#fff;}
    .vnc-header-title{flex:1;font-weight:600;font-size:15px;}
    .vnc-header-close{
      background:none;border:none;cursor:pointer;
      width:28px;height:28px;display:flex;align-items:center;justify-content:center;
      border-radius:6px;
    }
    .vnc-header-close:hover{background:rgba(255,255,255,0.15);}
    .vnc-header-close svg{width:16px;height:16px;fill:#fff;}

    /* ── Body ─────────────────────────────────────────────────────── */
    .vnc-body{
      flex:1;overflow-y:auto;padding:16px;
      display:flex;flex-direction:column;gap:8px;
      background:${isDark ? '#111113' : '#f4f4f5'};
    }

    .vnc-msg{
      max-width:80%;padding:10px 14px;border-radius:18px;
      font-size:14px;line-height:1.45;word-break:break-word;
      animation:vnc-msg-in .2s ease;
    }
    @keyframes vnc-msg-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

    .vnc-msg.user{
      align-self:flex-end;
      background:${CONFIG.color};color:#fff;
      border-bottom-right-radius:4px;
    }
    .vnc-msg.bot{
      align-self:flex-start;
      background:${isDark ? '#2c2c2e' : '#ffffff'};
      color:${isDark ? '#e4e4e7' : '#18181b'};
      border-bottom-left-radius:4px;
      box-shadow:0 1px 3px rgba(0,0,0,0.06);
    }

    /* ── Typing / Pac-Man ─────────────────────────────────────────── */
    .vnc-typing{
      align-self:flex-start;
      padding:10px 18px;border-radius:18px;
      background:${isDark ? '#2c2c2e' : '#ffffff'};
      border-bottom-left-radius:4px;
      box-shadow:0 1px 3px rgba(0,0,0,0.06);
      display:none;
    }
    .vnc-typing.show{display:flex;align-items:center;gap:2px;}

    /* pac-man */
    .pacman{
      width:18px;height:18px;position:relative;
    }
    .pacman-body{
      width:18px;height:18px;border-radius:50%;
      background:${CONFIG.color};
      position:relative;
      animation:pac-chomp .35s ease infinite alternate;
    }
    .pacman-body::before,.pacman-body::after{
      content:'';position:absolute;
      right:0;width:50%;height:50%;
      background:${isDark ? '#2c2c2e' : '#ffffff'};
      transform-origin:bottom right;
    }
    .pacman-body::before{top:0;transform-origin:bottom right;}
    .pacman-body::after{bottom:0;transform-origin:top right;}
    @keyframes pac-chomp{
      0%{clip-path:polygon(100% 0,100% 100%,50% 50%,100% 0);}
      100%{clip-path:polygon(100% 35%,100% 65%,50% 50%,100% 35%);}
    }
    .pacman-body{
      clip-path:none;
      animation:none;
    }
    /* simpler approach: wedge cutout */
    .pac{
      width:18px;height:18px;
      border-radius:50%;
      background:${CONFIG.color};
      position:relative;
      animation:pac-eat .4s ease infinite;
    }
    @keyframes pac-eat{
      0%,100%{clip-path:polygon(50% 50%,100% 10%,100% 0,0 0,0 100%,100% 100%,100% 90%);}
      50%{clip-path:polygon(50% 50%,100% 50%,100% 0,0 0,0 100%,100% 100%,100% 50%);}
    }
    .pac-dots{
      display:flex;align-items:center;gap:4px;margin-left:4px;
    }
    .pac-dot{
      width:4px;height:4px;border-radius:50%;
      background:${isDark ? '#52525b' : '#a1a1aa'};
      animation:pac-dot-fade .8s ease infinite;
    }
    .pac-dot:nth-child(2){animation-delay:.15s;}
    .pac-dot:nth-child(3){animation-delay:.3s;}
    @keyframes pac-dot-fade{
      0%,100%{opacity:1;}50%{opacity:.3;}
    }

    /* ── Prompt card ──────────────────────────────────────────────── */
    .vnc-card{
      align-self:flex-start;
      background:${isDark ? '#2c2c2e' : '#ffffff'};
      border-radius:14px;padding:14px;
      box-shadow:0 1px 3px rgba(0,0,0,0.06);
      display:flex;flex-direction:column;gap:10px;
      max-width:88%;
      animation:vnc-msg-in .2s ease;
    }
    .vnc-card p{font-size:13px;color:${isDark ? '#a1a1aa' : '#52525b'};}
    .vnc-card-btns{display:flex;gap:8px;}
    .vnc-card-btn{
      flex:1;padding:8px 12px;border-radius:10px;
      font-size:13px;font-weight:600;cursor:pointer;
      border:none;transition:opacity .15s;
    }
    .vnc-card-btn:hover{opacity:.85;}
    .vnc-card-btn.primary{background:${CONFIG.color};color:#fff;}
    .vnc-card-btn.secondary{
      background:${isDark ? '#3a3a3c' : '#f4f4f5'};
      color:${isDark ? '#e4e4e7' : '#18181b'};
    }

    /* ── Phone input ──────────────────────────────────────────────── */
    .vnc-phone-card{
      align-self:flex-start;
      background:${isDark ? '#2c2c2e' : '#ffffff'};
      border-radius:14px;padding:16px;
      box-shadow:0 1px 3px rgba(0,0,0,0.06);
      max-width:88%;
      animation:vnc-msg-in .2s ease;
    }
    .vnc-phone-row{
      display:flex;gap:0;margin-top:10px;
      border:1.5px solid ${isDark ? '#3a3a3c' : '#e4e4e7'};
      border-radius:10px;overflow:hidden;
    }
    .vnc-phone-prefix{
      padding:10px 10px;
      background:${isDark ? '#3a3a3c' : '#f4f4f5'};
      font-size:14px;font-weight:600;
      color:${isDark ? '#a1a1aa' : '#71717a'};
      display:flex;align-items:center;
    }
    .vnc-phone-input{
      flex:1;border:none;outline:none;
      padding:10px 10px;font-size:14px;
      background:transparent;
      color:${isDark ? '#e4e4e7' : '#18181b'};
      font-family:inherit;
    }
    .vnc-phone-input::placeholder{color:${isDark ? '#52525b' : '#a1a1aa'};}
    .vnc-phone-submit{
      margin-top:10px;width:100%;
      padding:10px;border:none;border-radius:10px;
      background:${CONFIG.color};color:#fff;
      font-size:14px;font-weight:600;cursor:pointer;
      transition:opacity .15s;
    }
    .vnc-phone-submit:hover{opacity:.85;}
    .vnc-phone-submit:disabled{opacity:.5;cursor:not-allowed;}

    /* ── Success ──────────────────────────────────────────────────── */
    .vnc-success{
      align-self:center;text-align:center;
      padding:24px 16px;
      animation:vnc-msg-in .3s ease;
    }
    .vnc-success-icon{font-size:36px;margin-bottom:8px;}
    .vnc-success-title{font-size:16px;font-weight:700;margin-bottom:4px;}
    .vnc-success-sub{font-size:13px;color:${isDark ? '#a1a1aa' : '#71717a'};}

    /* ── Input bar ────────────────────────────────────────────────── */
    .vnc-input-bar{
      display:flex;align-items:center;gap:8px;
      padding:10px 12px;
      border-top:1px solid ${isDark ? '#2c2c2e' : '#e4e4e7'};
      background:${isDark ? '#1c1c1e' : '#ffffff'};
    }
    .vnc-input{
      flex:1;border:none;outline:none;
      padding:10px 14px;border-radius:20px;
      font-size:14px;
      background:${isDark ? '#2c2c2e' : '#f4f4f5'};
      color:${isDark ? '#e4e4e7' : '#18181b'};
      font-family:inherit;
    }
    .vnc-input::placeholder{color:${isDark ? '#52525b' : '#a1a1aa'};}
    .vnc-send{
      width:36px;height:36px;border-radius:50%;
      background:${CONFIG.color};
      border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:opacity .15s,transform .15s;
      flex-shrink:0;
    }
    .vnc-send:hover{opacity:.85;transform:scale(1.05);}
    .vnc-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}
    .vnc-send svg{width:16px;height:16px;fill:#fff;transform:rotate(-45deg);}

    /* ── Powered by ───────────────────────────────────────────────── */
    .vnc-powered{
      text-align:center;padding:6px;
      font-size:10px;
      color:${isDark ? '#52525b' : '#a1a1aa'};
      background:${isDark ? '#1c1c1e' : '#ffffff'};
    }
    .vnc-powered a{color:${CONFIG.color};text-decoration:none;font-weight:600;}

    /* ── Mobile ───────────────────────────────────────────────────── */
    @media(max-width:480px){
      .vnc-panel{
        width:100%;height:100%;
        bottom:0;${posLeft ? 'left' : 'right'}:0;
        border-radius:0;
      }
      .vnc-fab{bottom:16px;${posLeft ? 'left' : 'right'}:16px;}
    }
  `;

  // ── Icons ──────────────────────────────────────────────────────────
  var ICON_CHAT = '<svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7z"/></svg>';
  var ICON_CLOSE = '<svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  var ICON_MINIMIZE = '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>';
  var ICON_LOGO = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';

  // ── Build DOM ──────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  shadow.appendChild(styleEl);

  var root = document.createElement('div');
  shadow.appendChild(root);

  function render() {
    root.innerHTML = `
      <button class="vnc-fab ${state.open ? 'open' : ''}" aria-label="Toggle chat">
        ${ICON_CHAT}${ICON_CLOSE}
        <span class="vnc-badge ${state.unread && !state.open ? 'show' : ''}"></span>
      </button>
      <div class="vnc-panel ${state.open ? 'open' : ''}">
        <div class="vnc-header">
          <div class="vnc-header-logo">${ICON_LOGO}</div>
          <span class="vnc-header-title">Chat with ${escHtml(CONFIG.name)}</span>
          <button class="vnc-header-close" aria-label="Minimize">${ICON_MINIMIZE}</button>
        </div>
        <div class="vnc-body">
          ${renderMessages()}
          <div class="vnc-typing ${state.waitingForResponse ? 'show' : ''}">
            <div class="pac"></div>
            <div class="pac-dots">
              <span class="pac-dot"></span>
              <span class="pac-dot"></span>
              <span class="pac-dot"></span>
            </div>
          </div>
        </div>
        ${renderFooter()}
        <div class="vnc-powered">Powered by <a href="https://vernacular.chat" target="_blank" rel="noopener">Vernacular</a></div>
      </div>
    `;
    bindEvents();
    scrollToBottom();
  }

  function renderMessages() {
    var html = '';
    state.messages.forEach(function (m) {
      html += '<div class="vnc-msg ' + m.from + '">' + escHtml(m.text) + '</div>';
    });

    if (state.phase === 'prompt') {
      html += `
        <div class="vnc-card">
          <p>Want to continue this conversation in iMessage? You'll get responses as blue bubbles on your phone.</p>
          <div class="vnc-card-btns">
            <button class="vnc-card-btn primary" data-action="yes-text">Yes, text me</button>
            <button class="vnc-card-btn secondary" data-action="continue-here">Continue here</button>
          </div>
        </div>`;
    }

    if (state.phase === 'phone') {
      html += `
        <div class="vnc-phone-card">
          <p style="font-size:13px;color:${isDark ? '#a1a1aa' : '#52525b'};margin-bottom:4px;">Enter your phone number and we'll text you via iMessage:</p>
          <div class="vnc-phone-row">
            <span class="vnc-phone-prefix">+1</span>
            <input class="vnc-phone-input" type="tel" placeholder="(555) 123-4567" maxlength="14" value="${escHtml(state.phone)}" />
          </div>
          <button class="vnc-phone-submit" ${state.phone.replace(/\D/g, '').length < 10 ? 'disabled' : ''}>Send me a text</button>
        </div>`;
    }

    if (state.phase === 'sent') {
      html += `
        <div class="vnc-success">
          <div class="vnc-success-icon">\u2705</div>
          <div class="vnc-success-title">Check your phone!</div>
          <div class="vnc-success-sub">We sent you a blue iMessage. You can close this tab \u2014 the conversation continues on your phone.</div>
        </div>`;
    }

    return html;
  }

  function renderFooter() {
    if (state.phase === 'sent' || state.phase === 'prompt' || state.phase === 'phone') return '';
    return `
      <div class="vnc-input-bar">
        <input class="vnc-input" type="text" placeholder="Type a message\u2026" />
        <button class="vnc-send" aria-label="Send">${ICON_SEND}</button>
      </div>`;
  }

  // ── Event binding ──────────────────────────────────────────────────
  function bindEvents() {
    var fab = shadow.querySelector('.vnc-fab');
    var close = shadow.querySelector('.vnc-header-close');
    var input = shadow.querySelector('.vnc-input');
    var sendBtn = shadow.querySelector('.vnc-send');
    var phoneInput = shadow.querySelector('.vnc-phone-input');
    var phoneSubmit = shadow.querySelector('.vnc-phone-submit');

    if (fab) fab.addEventListener('click', togglePanel);
    if (close) close.addEventListener('click', togglePanel);

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      // auto-focus when panel is open
      if (state.open) setTimeout(function () { input.focus(); }, 50);
    }
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    // prompt buttons
    var yesBtn = shadow.querySelector('[data-action="yes-text"]');
    var contBtn = shadow.querySelector('[data-action="continue-here"]');
    if (yesBtn) yesBtn.addEventListener('click', function () { state.phase = 'phone'; render(); });
    if (contBtn) contBtn.addEventListener('click', function () { state.phase = 'chat'; render(); });

    // phone input
    if (phoneInput) {
      phoneInput.addEventListener('input', function (e) {
        state.phone = formatPhone(e.target.value);
        e.target.value = state.phone;
        var submit = shadow.querySelector('.vnc-phone-submit');
        if (submit) submit.disabled = state.phone.replace(/\D/g, '').length < 10;
      });
    }
    if (phoneSubmit) phoneSubmit.addEventListener('click', submitPhone);
  }

  // ── Actions ────────────────────────────────────────────────────────
  function togglePanel() {
    state.open = !state.open;
    if (state.open) state.unread = false;
    render();
  }

  function sendMessage() {
    var input = shadow.querySelector('.vnc-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    state.messages.push({ text: text, from: 'user', time: Date.now() });

    if (state.phase === 'welcome') {
      state.firstUserMessage = text;
      state.phase = 'prompt';
      // add a small delay for the prompt card
      state.messages.push({ text: 'Thanks for reaching out!', from: 'bot', time: Date.now() });
    } else if (state.phase === 'chat') {
      // send to API
      postMessage(text);
    }

    render();
  }

  function postMessage(text, phoneNumber) {
    var phone = phoneNumber || '';
    var payload = {
      phoneNumber: phone,
      message: text,
      contactName: '',
      sourceSystem: 'widget',
      organizationId: CONFIG.org,
    };
    fetch(CONFIG.apiBase + '/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function () { /* silent fail for widget */ });
  }

  function submitPhone() {
    var digits = state.phone.replace(/\D/g, '');
    if (digits.length < 10) return;

    var fullPhone = '+1' + digits;
    state.phase = 'sent';
    state.waitingForResponse = true;
    render();

    // Send the welcome iMessage
    postMessage(
      'Hey! Thanks for reaching out. A member of our team will follow up with you shortly via iMessage. \uD83D\uDCAC',
      fullPhone
    );

    // Send the user's original message as context
    if (state.firstUserMessage) {
      setTimeout(function () {
        postMessage(state.firstUserMessage, fullPhone);
      }, 500);
    }

    // stop the pac-man after a bit
    setTimeout(function () {
      state.waitingForResponse = false;
      state.unread = true;
      render();
    }, 2500);
  }

  // ── Helpers ────────────────────────────────────────────────────────
  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function formatPhone(val) {
    var digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  function scrollToBottom() {
    var body = shadow.querySelector('.vnc-body');
    if (body) setTimeout(function () { body.scrollTop = body.scrollHeight; }, 30);
  }

  // ── Init ───────────────────────────────────────────────────────────
  state.messages.push({ text: CONFIG.greeting, from: 'bot', time: Date.now() });
  render();
})();

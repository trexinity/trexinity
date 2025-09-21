(function(){
  const CONFIG = {
    mainWorker: "https://trexinity.shauryaagarwal-id.workers.dev/",
    loginWorker: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
    googleClientId: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com"
  };

  // Enhanced element selection
  const els = {
    app: document.querySelector('.app'),
    stream: document.getElementById('stream'),
    composer: document.getElementById('composer'),
    sendBtn: document.getElementById('sendBtn'),
    toasts: document.getElementById('toasts'),
    chatList: document.getElementById('chatList'),
    newChatBtn: document.getElementById('newChatBtn'),
    clearChatsBtn: document.getElementById('clearChatsBtn'),
    themeToggle: document.getElementById('themeToggle'),
    userAvatar: document.getElementById('userAvatar'),
    profilePic: document.querySelector('.profile-pic'),
    sourcesPanel: document.getElementById('sourcesPanel'),
    videoPanel: document.getElementById('videoPanel'),
    rightRail: document.querySelector('.right'),
    brandLogo: document.getElementById('brandLogo'),
    settingsBtn: document.getElementById('settingsBtn'),
    dialogBackdrop: document.getElementById('dialogBackdrop'),
    splash: document.getElementById('splash'),
    googleBtn: document.getElementById('googleBtn'),
    tabs: document.querySelectorAll('.tab'),
    pages: {
      chat: document.getElementById('page-chat'),
      about: document.getElementById('page-about'),
      credits: document.getElementById('page-credits'),
      posts: document.getElementById('page-posts')
    },
    toggles: {
      videos: document.getElementById('opt-videos'),
      photos: document.getElementById('opt-photos'),
      detail: document.getElementById('opt-detail')
    }
  };

  // Enhanced state management
  const state = {
    chats: JSON.parse(localStorage.getItem('trex-chats') || '[]'),
    currentChatId: null,
    user: JSON.parse(localStorage.getItem('trex-user') || 'null'),
    isTyping: false,
    currentTypingAnimation: null
  };

  // Smart suggestions based on context
  const SMART_SUGGESTIONS = [
    { title: "Quick Search", prompt: "Search for", desc: "Find information quickly" },
    { title: "Explain Code", prompt: "Explain this code:", desc: "Understand programming concepts" },
    { title: "Summarize", prompt: "Summarize", desc: "Get concise overviews" },
    { title: "Compare", prompt: "Compare", desc: "Side-by-side analysis" },
    { title: "Create List", prompt: "Create a list of", desc: "Organized information" },
    { title: "How-to Guide", prompt: "How do I", desc: "Step-by-step instructions" }
  ];

  // Utility functions
  const utils = {
    makeId: () => Math.random().toString(36).slice(2) + Date.now().toString(36),
    escapeHtml: s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])),
    debounce: (fn, ms) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }; },
    formatTime: date => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date)
  };

  // Enhanced toast system
  const toastSystem = {
    show(msg, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>${msg}</span>
      `;
      els.toasts.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }
  };

  // Theme management with enhanced transitions
  const themeManager = {
    init() {
      try {
        const pref = localStorage.getItem("trex-theme");
        const sys = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        const theme = pref || sys;
        if (theme === 'light') document.body.classList.add('light');
        this.updateLogos();
      } catch(e) {}
    },
    toggle() {
      const isLight = document.body.classList.toggle('light');
      localStorage.setItem("trex-theme", isLight ? 'light' : 'dark');
      this.updateLogos();
      toastSystem.show(`Switched to ${isLight ? 'light' : 'dark'} mode`);
    },
    updateLogos() {
      const isLight = document.body.classList.contains('light');
      els.brandLogo.src = isLight
        ? "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png"
        : "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png";
    }
  };

  // Enhanced typing animation
  const typingAnimation = {
    async typeText(element, text, speed = 20) {
      if (state.currentTypingAnimation) {
        clearInterval(state.currentTypingAnimation);
      }
      
      element.innerHTML = '';
      let i = 0;
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      
      return new Promise(resolve => {
        const timer = setInterval(() => {
          if (i < text.length) {
            element.textContent = text.slice(0, i + 1);
            element.appendChild(cursor);
            i++;
          } else {
            cursor.remove();
            clearInterval(timer);
            state.currentTypingAnimation = null;
            resolve();
          }
        }, speed);
        state.currentTypingAnimation = timer;
      });
    },

    createTypingIndicator() {
      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.innerHTML = `
        <video src="https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-animation.mp4" 
               autoplay loop muted playsinline style="height:20px;border-radius:4px"></video>
        <span>AI is thinking</span>
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      `;
      return indicator;
    }
  };

  // Enhanced chat management
  const chatManager = {
    ensureChat() {
      if (!state.currentChatId) {
        const id = utils.makeId();
        state.chats.unshift({
          id,
          title: "New conversation",
          created: Date.now(),
          messages: []
        });
        state.currentChatId = id;
        this.saveChats();
        this.renderChatList();
      }
      return state.currentChatId;
    },

    currentChat() {
      return state.chats.find(c => c.id === state.currentChatId);
    },

    saveChats() {
      localStorage.setItem('trex-chats', JSON.stringify(state.chats));
    },

    renderChatList() {
      els.chatList.innerHTML = '';
      state.chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        if (chat.id === state.currentChatId) div.classList.add('active');
        
        const time = utils.formatTime(new Date(chat.created));
        div.innerHTML = `
          <div style="font-weight:500;margin-bottom:4px;">${chat.title || 'Untitled'}</div>
          <div style="font-size:12px;opacity:0.6;">${time}</div>
        `;
        div.onclick = () => {
          state.currentChatId = chat.id;
          this.renderMessages();
          this.renderChatList();
        };
        els.chatList.appendChild(div);
      });
    },

    renderMessages() {
      els.stream.innerHTML = '';
      const chat = this.currentChat();
      if (!chat) return;
      
      chat.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `msg ${msg.role === 'user' ? 'user' : 'assistant'}`;
        div.innerHTML = msg.html || utils.escapeHtml(msg.content || '');
        els.stream.appendChild(div);
      });
      els.stream.scrollTop = els.stream.scrollHeight;
    }
  };

  // Enhanced Google Identity Services
  const authManager = {
    init() {
      window.handleGoogleCredential = async (response) => {
        try {
          const r = await fetch(`${CONFIG.loginWorker}?id_token=${encodeURIComponent(response.credential)}`);
          if (!r.ok) throw new Error('Login failed');
          const profile = await r.json();
          
          state.user = profile;
          localStorage.setItem('trex-user', JSON.stringify(profile));
          
          if (profile.picture) {
            els.userAvatar.src = profile.picture;
            if (els.profilePic) els.profilePic.src = profile.picture;
          }
          
          toastSystem.show(`Welcome, ${profile.name}!`, 'success');
        } catch(e) {
          toastSystem.show("Login failed", 'error');
        }
      };

      this.renderButton();
    },

    renderButton() {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: CONFIG.googleClientId,
          callback: window.handleGoogleCredential,
          auto_select: false
        });
        window.google.accounts.id.renderButton(els.googleBtn, {
          theme: document.body.classList.contains('light') ? 'outline' : 'filled_black',
          size: 'medium',
          shape: 'pill'
        });
        window.google.accounts.id.prompt();
      } else {
        const checkInterval = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(checkInterval);
            this.renderButton();
          }
        }, 100);
      }
    }
  };

  // Enhanced AI interaction
  const aiManager = {
    async ask(question) {
      if (state.isTyping) return;
      state.isTyping = true;

      chatManager.ensureChat();
      const chat = chatManager.currentChat();
      
      // Add user message
      chat.messages.push({
        role: 'user',
        content: question,
        timestamp: Date.now()
      });
      chatManager.saveChats();
      chatManager.renderMessages();

      // Show right panel with animation
      els.app.classList.add('right-open');
      els.rightRail.classList.remove('hidden');

      // Add typing indicator
      const typingMsg = document.createElement('div');
      typingMsg.className = 'msg assistant';
      typingMsg.appendChild(typingAnimation.createTypingIndicator());
      els.stream.appendChild(typingMsg);
      els.stream.scrollTop = els.stream.scrollHeight;

      try {
        // Prepare request with options
        const detail = els.toggles.detail?.value || "default";
        const decorated = `${question}${detail === 'short' ? ' (brief)' : detail === 'detailed' ? ' (comprehensive)' : ''}`;
        
        const response = await fetch(CONFIG.mainWorker, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: [decorated],
            maxVideos: els.toggles.videos?.checked ? 1 : 0
          })
        });

        if (!response.ok) throw new Error(`Service error: ${response.status}`);
        
        const data = await response.json();
        const result = data.answers?.[0] || { answer: '' };
        
        // Remove typing indicator
        typingMsg.remove();

        // Create response message
        const answerMsg = document.createElement('div');
        answerMsg.className = 'msg assistant';
        els.stream.appendChild(answerMsg);

        // Render content with typing animation
        const content = this.formatResponse(result, els.toggles.videos?.checked);
        await typingAnimation.typeText(answerMsg, content.text);
        
        // Add rich content after typing
        if (content.html !== content.text) {
          answerMsg.innerHTML = content.html;
        }

        // Update chat history
        chat.messages.push({
          role: 'assistant',
          content: result.answer || '',
          html: content.html,
          timestamp: Date.now()
        });
        
        // Update chat title
        if (chat.title === 'New conversation') {
          chat.title = question.slice(0, 50) + (question.length > 50 ? '...' : '');
        }

        chatManager.saveChats();
        chatManager.renderChatList();

        // Update right panel
        this.updateRightPanel(result);

      } catch(error) {
        typingMsg.innerHTML = `
          <div style="color:var(--orange);display:flex;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            Error: ${utils.escapeHtml(error.message)}
          </div>
        `;
        toastSystem.show("Failed to get response", 'error');
      } finally {
        state.isTyping = false;
      }
    },

    formatResponse(result, includeVideos) {
      const text = result.answer || 'No response available';
      const videos = includeVideos && result.videos ? result.videos : [];
      const sources = result.sources || [];

      let html = utils.escapeHtml(text).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
      
      if (videos.length > 0) {
        html += `
          <div style="margin-top:16px;">
            <iframe width="100%" height="240" 
                    src="https://www.youtube.com/embed/${utils.escapeHtml(videos[0].id || '')}"
                    title="${utils.escapeHtml(videos[0].title || 'Video')}"
                    frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
            </iframe>
          </div>
        `;
      }

      if (sources.length > 0) {
        html += `
          <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
            ${sources.slice(0, 6).map(src => 
              `<a href="${utils.escapeHtml(src)}" target="_blank" class="pill" style="font-size:12px;">Source</a>`
            ).join('')}
          </div>
        `;
      }

      return { text, html };
    },

    updateRightPanel(result) {
      // Update sources
      els.sourcesPanel.innerHTML = '';
      (result.sources || []).slice(0, 8).forEach(source => {
        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.textContent = new URL(source).hostname;
        pill.onclick = () => window.open(source, '_blank');
        els.sourcesPanel.appendChild(pill);
      });

      // Update video panel
      if (els.videoPanel && result.videos?.length > 0) {
        els.videoPanel.innerHTML = `
          <div style="margin-top:12px;">
            <h4 style="margin:0 0 8px;color:var(--orange);font-size:14px;">Related Video</h4>
            <div style="font-size:13px;opacity:0.8;">${utils.escapeHtml(result.videos[0].title || '')}</div>
          </div>
        `;
      }
    }
  };

  // Event listeners with enhanced UX
  function initializeEventListeners() {
    // Send button with loading state
    els.sendBtn.addEventListener('click', () => {
      const question = els.composer.value.trim();
      if (!question || state.isTyping) return;
      els.composer.value = '';
      aiManager.ask(question);
    });

    // Enhanced enter key handling
    els.composer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !state.isTyping) {
        e.preventDefault();
        const question = els.composer.value.trim();
        if (!question) return;
        els.composer.value = '';
        aiManager.ask(question);
      }
    });

    // Theme toggle
    els.themeToggle.addEventListener('click', () => themeManager.toggle());

    // Chat management
    els.newChatBtn.addEventListener('click', () => {
      state.currentChatId = null;
      chatManager.ensureChat();
      chatManager.renderMessages();
      chatManager.renderChatList();
    });

    els.clearChatsBtn.addEventListener('click', () => {
      if (confirm('Clear all conversations?')) {
        state.chats = [];
        state.currentChatId = null;
        chatManager.saveChats();
        chatManager.renderChatList();
        chatManager.renderMessages();
        toastSystem.show('All conversations cleared');
      }
    });

    // Tab navigation
    els.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.id === 'themeToggle' || tab.id === 'settingsBtn') return;
        
        els.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        Object.values(els.pages).forEach(p => p.classList.remove('active'));
        els.pages[tab.dataset.page]?.classList.add('active');
      });
    });

    // Settings dialog
    if (els.settingsBtn && els.dialogBackdrop) {
      els.settingsBtn.addEventListener('click', () => {
        els.dialogBackdrop.style.display = 'flex';
      });
      
      els.dialogBackdrop.addEventListener('click', (e) => {
        if (e.target === els.dialogBackdrop) {
          els.dialogBackdrop.style.display = 'none';
        }
      });

      document.getElementById('closeDialog')?.addEventListener('click', () => {
        els.dialogBackdrop.style.display = 'none';
      });
    }
  }

  // Initialize smart suggestions
  function initializeSuggestions() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const suggestionsGrid = document.createElement('div');
    suggestionsGrid.className = 'suggestions-grid';
    
    SMART_SUGGESTIONS.forEach(suggestion => {
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      card.innerHTML = `
        <h4>${suggestion.title}</h4>
        <p>${suggestion.desc}</p>
      `;
      card.onclick = () => {
        els.composer.value = suggestion.prompt + ' ';
        els.composer.focus();
      };
      suggestionsGrid.appendChild(card);
    });
    
    hero.appendChild(suggestionsGrid);
  }

  // Application initialization
  function initialize() {
    // Initialize managers
    themeManager.init();
    chatManager.renderChatList();
    authManager.init();
    
    // Initialize UI components
    initializeEventListeners();
    initializeSuggestions();
    
    // Restore user state
    if (state.user?.picture) {
      els.userAvatar.src = state.user.picture;
      if (els.profilePic) els.profilePic.src = state.user.picture;
    }

    // Load existing chat
    if (state.chats.length > 0) {
      state.currentChatId = state.chats[0].id;
      chatManager.renderMessages();
    }

    // Hide splash with delay
    setTimeout(() => {
      if (els.splash) {
        els.splash.style.opacity = '0';
        setTimeout(() => {
          els.splash.style.display = 'none';
        }, 300);
      }
    }, 1000);
  }

  // Start the application
  initialize();
})();

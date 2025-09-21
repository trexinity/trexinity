(function(){
  const CONFIG = {
    mainWorker: "https://trexinity.shauryaagarwal-id.workers.dev/",
    loginWorker: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
    googleClientId: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com"
  };

  // Elements
  const app = document.querySelector('.app');
  const streamEl = document.getElementById('stream');
  const composerEl = document.getElementById('composer');
  const sendBtn = document.getElementById('sendBtn');
  const toasts = document.getElementById('toasts');
  const chatList = document.getElementById('chatList');
  const newChatBtn = document.getElementById('newChatBtn');
  const clearChatsBtn = document.getElementById('clearChatsBtn');
  const themeToggle = document.getElementById('themeToggle');
  const userAvatar = document.getElementById('userAvatar');
  const sourcesPanel = document.getElementById('sourcesPanel');
  const videoPanel = document.getElementById('videoPanel');
  const rightRail = document.querySelector('.right');
  const brandLogo = document.getElementById('brandLogo');
  const settingsBtn = document.getElementById('settingsBtn');
  const dialogBackdrop = document.getElementById('dialogBackdrop');
  const splash = document.getElementById('splash');
  const googleBtn = document.getElementById('googleBtn');
  const loginStatus = document.getElementById('loginStatus');

  const tabs = document.querySelectorAll('.tab');
  const pages = {
    chat: document.getElementById('page-chat'),
    about: document.getElementById('page-about'),
    credits: document.getElementById('page-credits'),
    posts: document.getElementById('page-posts'),
  };

  const chkVideos = document.getElementById('opt-videos');
  const chkPhotos = document.getElementById('opt-photos');
  const respSwitch = document.getElementById('opt-detail');

  // State
  let chats = JSON.parse(localStorage.getItem('trex-chats') || '[]');
  let currentChatId = null;
  let user = JSON.parse(localStorage.getItem('trex-user') || 'null');
  let abortCurrent = null;

  // Utils
  function saveChats(){ localStorage.setItem('trex-chats', JSON.stringify(chats)); }
  function makeId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function toast(msg){ const d=document.createElement('div'); d.className='toast'; d.textContent=msg; toasts.appendChild(d); setTimeout(()=>d.remove(), 4200); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // Theme + logos
  (function initTheme(){
    try{
      const pref = localStorage.getItem("trex-theme");
      const sys = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      const t = pref || sys;
      if (t==='light') document.body.classList.add('light');
      brandLogo.src = document.body.classList.contains('light')
        ? "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png"
        : "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png";
    }catch(e){}
  })();
  themeToggle.addEventListener('click', ()=>{
    const light = document.body.classList.toggle('light');
    localStorage.setItem("trex-theme", light ? 'light' : 'dark');
    brandLogo.src = light
      ? "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png"
      : "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png";
  });

  // Tabs
  tabs.forEach(t => t.addEventListener('click', () => {
    if (t.id==='themeToggle' || t.id==='settingsBtn') return;
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[t.dataset.page]?.classList.add('active');
  }));

  // Chat helpers
  function ensureChat(){
    if (!currentChatId){
      const id = makeId();
      chats.unshift({ id, title: "New conversation", created: Date.now(), messages: [] });
      currentChatId = id; saveChats(); renderChatList();
    }
    return currentChatId;
  }
  function currentChat(){ return chats.find(c => c.id === currentChatId); }
  function renderChatList(){
    chatList.innerHTML = '';
    chats.forEach(c=>{
      const div = document.createElement('div');
      div.className = 'chat-item' + (c.id===currentChatId?' active':'');
      div.innerHTML = `<div style="font-weight:500">${c.title||'Untitled'}</div>`;
      div.onclick = ()=>{ currentChatId = c.id; renderMessages(); renderChatList(); };
      chatList.appendChild(div);
    });
  }
  function renderMessages(){
    streamEl.innerHTML = '';
    const c = currentChat(); if (!c) return;
    c.messages.forEach(m=>{
      const div = document.createElement('div');
      div.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');
      div.innerHTML = m.html || escapeHtml(m.content||'');
      streamEl.appendChild(div);
    });
    streamEl.scrollTop = streamEl.scrollHeight;
  }

  // Typing effect (cancelable)
  async function typeInto(el, html, ms=2){
    if (abortCurrent) abortCurrent();
    let cancel=false; abortCurrent=()=>{cancel=true;};
    el.innerHTML='';
    const tmp=document.createElement('div'); tmp.innerHTML=html;
    const text = tmp.textContent || '';
    for (let i=0;i<text.length;i++){
      if (cancel) return;
      el.textContent = text.slice(0,i+1);
      await new Promise(r=>setTimeout(r, ms));
    }
    if (!cancel) el.innerHTML = html;
    abortCurrent=null;
  }

  // Google Identity Services
  window.handleGoogleCredential = async (response) => {
    try{
      const r = await fetch(CONFIG.loginWorker + "?id_token=" + encodeURIComponent(response.credential));
      if(!r.ok) throw new Error("Login failed");
      const profile = await r.json();
      user = profile; localStorage.setItem('trex-user', JSON.stringify(user));
      if (user?.picture) userAvatar.src = user.picture;
      if (loginStatus) loginStatus.textContent = user?.name || 'User';
      toast("Logged in");
    }catch(e){ toast("Login error"); }
  };
  function renderGIS(){
    if (window.google?.accounts?.id){
      window.google.accounts.id.initialize({ client_id: CONFIG.googleClientId, callback: window.handleGoogleCredential, auto_select:false });
      window.google.accounts.id.renderButton(googleBtn, { theme: document.body.classList.contains('light')?'outline':'filled_black', size:"medium", shape:"pill" });
      window.google.accounts.id.prompt();
    }
  }
  if (window.google?.accounts?.id) renderGIS(); else {
    const i=setInterval(()=>{ if (window.google?.accounts?.id){ clearInterval(i); renderGIS(); } }, 120);
  }

  // Ask
  async function ask(question){
    if (abortCurrent) abortCurrent();
    ensureChat();
    const chat = currentChat();
    chat.messages.push({ role:'user', content:question });
    saveChats(); renderMessages();

    app.classList.add('right-open');
    rightRail.classList.remove('hidden');

    const holder = document.createElement('div');
    holder.className='msg assistant';
    holder.innerHTML = `
      <div class="typing-indicator">
        <video src="https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-animation.mp4" autoplay loop muted playsinline style="height:20px;border-radius:4px"></video>
        <span>AI is thinking</span>
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>`;
    streamEl.appendChild(holder);
    streamEl.scrollTop = streamEl.scrollHeight;

    try{
      const detail = respSwitch?.value || "default";
      const decorated = `${question}${detail==='short'?' (brief)':detail==='detailed'?' (comprehensive)':''}`;
      const includeVideos = chkVideos?.checked;

      const r = await fetch(CONFIG.mainWorker, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ questions:[decorated], maxVideos: includeVideos ? 1 : 0 })
      });
      if (!r.ok) throw new Error("Service unavailable "+r.status);
      const j = await r.json();
      const out = j.answers && j.answers[0] ? j.answers[0] : { answer:'' };
      const answer = out.answer || '';
      const vids = includeVideos ? (Array.isArray(out.videos)?out.videos:[]) : [];
      const sources = Array.isArray(out.sources)?out.sources:[];
      const html = (()=> {
        const safe = (answer||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>');
        const video = vids.length ? `
          <div style="margin-top:12px">
            <iframe width="100%" height="230" src="<https://www.youtube.com/embed/${vids>[0].id}?modestbranding=1&rel=0"
              title="${(vids[0].title||'Video').replace(/"/g,'&quot;')}" frameborder="0"
              allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>` : '';
        const srcs = sources.length ? `
          <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
            ${sources.slice(0,8).map(s=>`<a class="pill" href="${s}" target="_blank" rel="noopener">Source</a>`).join('')}
          </div>` : '';
        return `<div>${safe}</div>${video}${srcs}`;
      })();

      holder.innerHTML = '';
      await typeInto(holder, html, 2);

      chat.messages.push({ role:'assistant', content:answer, html });
      if (chat.title==='New conversation'){ chat.title = question.slice(0,60); }
      saveChats(); renderChatList();

      // Right rail
      if (sourcesPanel){
        sourcesPanel.innerHTML='';
        sources.slice(0,10).forEach(u=>{
          const pill=document.createElement('div'); pill.className='pill';
          try{ pill.textContent=new URL(u).hostname; }catch{ pill.textContent='Source'; }
          pill.onclick=()=>window.open(u,'_blank');
          sourcesPanel.appendChild(pill);
        });
      }
      if (videoPanel){
        videoPanel.innerHTML = vids.length ? `<div style="font-size:13px;opacity:0.85;margin-top:8px;">${(vids[0].title||'Related video').replace(/</g,'&lt;')}</div>` : '';
      }
    }catch(e){
      holder.innerHTML = `<div style="color:var(--orange)">Error: ${(e.message||'Failed')}</div>`;
    }
  }

  // Events
  sendBtn.addEventListener('click', ()=>{ const q=composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q); });
  composerEl.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const q=composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q); } });
  newChatBtn.addEventListener('click', ()=>{ currentChatId=null; ensureChat(); renderMessages(); renderChatList(); });
  clearChatsBtn.addEventListener('click', ()=>{ if(confirm('Clear all chats?')){ chats=[]; currentChatId=null; saveChats(); renderChatList(); renderMessages(); } });

  // Init
  (function init(){
    if (user?.picture) userAvatar.src = user.picture;
    if (document.getElementById('loginStatus')) loginStatus.textContent = user?.name || 'Guest';
    renderChatList();
    if (chats.length){ currentChatId = chats[0].id; renderMessages(); }
    // Hide splash
    setTimeout(()=>{ if(splash){ splash.style.opacity='0'; setTimeout(()=>splash.style.display='none',300); } }, 1000);
  })();
})();

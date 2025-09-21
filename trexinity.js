// Trexinity UI logic: tabs, theme, chats, Cloudflare integration (no modules for Blogger)
(function(){
  const CONFIG = {
    mainWorker: "https://trexinity.shauryaagarwal-id.workers.dev/",
    loginWorker: "https://trexinity-login.shauryaagarwal-id.workers.dev/"
  };

  // Grab elements
  const streamEl = document.getElementById('stream');
  const composerEl = document.getElementById('composer');
  const sendBtn = document.getElementById('sendBtn');
  const toasts = document.getElementById('toasts');
  const chatList = document.getElementById('chatList');
  const newChatBtn = document.getElementById('newChatBtn');
  const clearChatsBtn = document.getElementById('clearChatsBtn');
  const loginBtn = document.getElementById('loginBtn');
  const userAvatar = document.getElementById('userAvatar');
  const themeToggle = document.getElementById('themeToggle');
  const sourcesPanel = document.getElementById('sourcesPanel');
  const tabs = document.querySelectorAll('.tab');

  const pages = {
    chat: document.getElementById('page-chat'),
    about: document.getElementById('page-about'),
    credits: document.getElementById('page-credits'),
    posts: document.getElementById('page-posts')
  };

  // Tabs
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[t.dataset.page].classList.add('active');
  }));

  // Theme init + toggle
  try {
    const pref = localStorage.getItem("trex-theme");
    const sys = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    const theme = pref || sys;
    if (theme === 'light') document.body.classList.add('light');
  } catch(e){}
  themeToggle.addEventListener('click', ()=>{
    const light = document.body.classList.toggle('light');
    localStorage.setItem("trex-theme", light ? 'light' : 'dark');
    document.getElementById('brandLogo').src = light
      ? "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png"
      : "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png";
  });

  // State
  let chats = JSON.parse(localStorage.getItem('trex-chats') || '[]');
  let currentChatId = null;
  let user = JSON.parse(localStorage.getItem('trex-user') || 'null');

  function saveChats(){ localStorage.setItem('trex-chats', JSON.stringify(chats)); }
  function setUser(u){
    user = u; localStorage.setItem('trex-user', JSON.stringify(u));
    if (u && u.picture) userAvatar.src = u.picture;
    toast(u ? "Logged in" : "Logged out");
  }
  function toast(msg){
    const div = document.createElement('div'); div.className='toast'; div.textContent = msg;
    toasts.appendChild(div); setTimeout(()=>div.remove(), 4200);
  }
  function makeId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function ensureChat(){
    if (!currentChatId){
      const id = makeId();
      chats.unshift({ id, title: "New chat", created: Date.now(), messages: [] });
      currentChatId = id; saveChats(); renderChatList();
    }
    return currentChatId;
  }
  function currentChat(){ return chats.find(c => c.id === currentChatId); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function renderChatList(){
    chatList.innerHTML = '';
    chats.forEach(c=>{
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.textContent = c.title || 'Untitled';
      div.onclick = ()=>{ currentChatId = c.id; renderMessages(); };
      chatList.appendChild(div);
    });
  }
  function renderMessages(){
    streamEl.innerHTML = '';
    const c = currentChat(); if (!c) return;
    c.messages.forEach(m=>{
      const div = document.createElement('div');
      div.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');
      div.innerHTML = m.html || escapeHtml(m.content || '');
      streamEl.appendChild(div);
    });
    streamEl.scrollTop = streamEl.scrollHeight;
  }
  function renderAnswer(text, vids, sources){
    const p = String(text||'').split(/\n{2,}/).map(x=>`<p>${escapeHtml(x).replace(/\n/g,'<br/>')}</p>`).join('');
    const v = vids && vids.length ? `
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
        ${vids.slice(0,2).map(v=>`<iframe width="100%" height="250" src="${v.url}" title="${escapeHtml(v.title||'Video')}" frameborder="0" allowfullscreen></iframe>`).join('')}
      </div>` : '';
    const s = sources && sources.length ? `
      <div style="margin-top:10px;opacity:.85;font-size:13px;">
        Sources: ${sources.slice(0,6).map(x=>`<span class="pill" style="margin-right:6px;">${escapeHtml(x)}</span>`).join('')}
      </div>` : '';
    return p+v+s;
  }
  function renderSources(sources){
    const panel = document.getElementById('sourcesPanel');
    if (!panel) return;
    panel.innerHTML = '';
    (sources||[]).slice(0,10).forEach(src=>{
      const b = document.createElement('div'); b.className='pill'; b.textContent=src; panel.appendChild(b);
    });
  }

  // Login (dev simple)
  if (loginBtn){
    loginBtn.addEventListener('click', async ()=>{
      try{
        const id_token = prompt("Paste Google ID token (temporary)");
        if (!id_token) return;
        const r = await fetch(CONFIG.loginWorker+"?id_token="+encodeURIComponent(id_token));
        if (!r.ok) throw new Error("Login failed");
        const profile = await r.json();
        setUser(profile);
      }catch(e){ toast("Login error"); }
    });
  }

  // Ask
  async function ask(question){
    ensureChat();
    const chat = currentChat();
    chat.messages.push({ role:'user', content:question });
    saveChats(); renderMessages();

    // loading bubble with animation mp4
    const pid = makeId();
    chat.messages.push({ id:pid, role:'assistant', content:'', html:
      `<div style="display:flex;align-items:center;gap:10px;">
         <video src="https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-animation.mp4" autoplay loop muted playsinline style="height:28px;border-radius:8px"></video>
         <em>Thinking…</em>
       </div>` });
    saveChats(); renderMessages();

    try{
      const r = await fetch(CONFIG.mainWorker, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ questions:[question] })
      });
      if (!r.ok) throw new Error("Service unavailable");
      const j = await r.json();
      const out = j.answers && j.answers[0] ? j.answers[0] : { answer:'' };
      const answer = out.answer || '';
      const vids = Array.isArray(out.videos)?out.videos:[];
      const sources = Array.isArray(out.sources)?out.sources:[];
      const html = renderAnswer(answer, vids, sources);

      const msg = chat.messages.find(m=>m.id===pid);
      if (msg){ msg.content=answer; msg.html=html; }
      if (chat.title==='New chat'){ chat.title = question.slice(0,60); }
      saveChats(); renderMessages(); renderSources(sources);
    }catch(e){
      const msg = chat.messages.find(m=>m.id===pid);
      if (msg){ msg.html = `<span style="color:var(--brand-orange)">Error: ${escapeHtml(e.message)}</span>`; }
      saveChats(); renderMessages(); toast("Partial results due to errors");
    }
  }

  // Events
  if (sendBtn){
    sendBtn.addEventListener('click', ()=>{
      const q = composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q);
    });
  }
  if (composerEl){
    composerEl.addEventListener('keydown', (e)=>{
      if (e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        const q = composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q);
      }
    });
  }
  if (newChatBtn){
    newChatBtn.addEventListener('click', ()=>{ currentChatId=null; ensureChat(); renderMessages(); });
  }
  if (clearChatsBtn){
    clearChatsBtn.addEventListener('click', ()=>{
      if (confirm('Clear all chats?')){ chats=[]; currentChatId=null; saveChats(); renderChatList(); renderMessages(); }
    });
  }

  // Init
  (function init(){
    if (user && user.picture) userAvatar.src = user.picture;
    renderChatList();
    if (chats.length){ currentChatId = chats[0].id; renderMessages(); }
  })();
})();


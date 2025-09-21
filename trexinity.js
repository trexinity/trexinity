(function(){
  // Config
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
  const rightRail = document.querySelector('.right');
  const brandLogo = document.getElementById('brandLogo');
  const settingsBtn = document.getElementById('settingsBtn');
  const dialogBackdrop = document.getElementById('dialogBackdrop');
  const dialogEl = document.getElementById('settingsDialog');
  const splash = document.getElementById('splash');
  const tabs = document.querySelectorAll('.tab');
  const pages = {
    chat: document.getElementById('page-chat'),
    about: document.getElementById('page-about'),
    credits: document.getElementById('page-credits'),
    posts: document.getElementById('page-posts'),
  };

  // Feature toggles under composer
  const chkVideos = document.getElementById('opt-videos');
  const chkPhotos = document.getElementById('opt-photos');
  const respSwitch = document.getElementById('opt-detail'); // values: short|default|detailed

  // State
  let chats = JSON.parse(localStorage.getItem('trex-chats') || '[]');
  let currentChatId = null;
  let user = JSON.parse(localStorage.getItem('trex-user') || 'null');

  function saveChats(){ localStorage.setItem('trex-chats', JSON.stringify(chats)); }
  function makeId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function toast(msg){
    const div = document.createElement('div'); div.className='toast'; div.textContent = msg;
    toasts.appendChild(div); setTimeout(()=>div.remove(), 4200);
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // Theme init + toggle with logo swap
  (function initTheme(){
    try{
      const pref = localStorage.getItem("trex-theme");
      const sys = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      const theme = pref || sys;
      if (theme==='light') document.body.classList.add('light');
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
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[t.dataset.page].classList.add('active');
  }));

  // Chats
  function ensureChat(){
    if (!currentChatId){
      const id = makeId();
      chats.unshift({ id, title: "New chat", created: Date.now(), messages: [] });
      currentChatId = id; saveChats(); renderChatList();
    }
    return currentChatId;
  }
  function currentChat(){ return chats.find(c=>c.id===currentChatId); }
  function renderChatList(){
    chatList.innerHTML = '';
    chats.forEach(c=>{
      const div = document.createElement('div'); div.className='chat-item'; div.textContent = c.title || 'Untitled';
      div.onclick = ()=>{ currentChatId = c.id; renderMessages(); };
      chatList.appendChild(div);
    });
  }
  function renderMessages(){
    streamEl.innerHTML=''; const c=currentChat(); if(!c) return;
    c.messages.forEach(m=>{
      const div=document.createElement('div'); div.className='msg '+(m.role==='user'?'user':'assistant');
      div.innerHTML = m.html || escapeHtml(m.content||''); streamEl.appendChild(div);
    });
    streamEl.scrollTop=streamEl.scrollHeight;
  }
  function renderAnswer(text, vids, sources){
    const p = String(text||'').split(/\n{2,}/).map(x=>`<p>${escapeHtml(x).replace(/\n/g,'<br/>')}</p>`).join('');
    const v = vids && vids.length ? `
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
        ${vids.slice(0,3).map(v=>`<iframe width="100%" height="230"
          src="https://www.youtube.com/embed/${escapeHtml(v.id||'')}"
          title="${escapeHtml(v.title||'Video')}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"></iframe>`).join('')}
      </div>` : '';
    const s = sources && sources.length ? `
      <div style="margin-top:10px;opacity:.85;font-size:13px;">
        ${sources.slice(0,8).map(x=>`<a class="pill" href="${escapeHtml(x)}" target="_blank" rel="noopener" style="margin-right:6px;">Source</a>`).join('')}
      </div>` : '';
    return p+v+s;
  }
  function renderSources(sources){
    sourcesPanel.innerHTML=''; (sources||[]).slice(0,12).forEach(src=>{
      const b=document.createElement('div'); b.className='pill'; b.textContent=src; sourcesPanel.appendChild(b);
    });
  }

  // Google Identity Services (button + One Tap)
  window.handleGoogleCredential = async (response) => {
    try{
      // Send credential to login worker to validate and map profile
      const r = await fetch(CONFIG.loginWorker+"?id_token="+encodeURIComponent(response.credential));
      if(!r.ok) throw new Error("Login failed");
      const profile = await r.json();
      user = profile; localStorage.setItem('trex-user', JSON.stringify(user));
      if (user && user.picture) userAvatar.src = user.picture;
      toast("Logged in");
    }catch(e){ toast("Login error"); }
  };

  function loadGIS(){
    if (window.google && window.google.accounts && window.google.accounts.id){
      window.google.accounts.id.initialize({ client_id: CONFIG.googleClientId, callback: window.handleGoogleCredential, auto_select:false });
      window.google.accounts.id.renderButton(document.getElementById('googleBtn'), { theme: document.body.classList.contains('light')?'outline':'filled_black', size:"medium", shape:"pill" });
      window.google.accounts.id.prompt(); // One Tap
    }
  }
  // Inject GIS script
  (function injectGIS(){
    const s = document.createElement('script');
    s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
    s.onload = loadGIS; document.head.appendChild(s);
  })();

  // Ask flow
  async function ask(question){
    ensureChat(); const chat=currentChat();
    chat.messages.push({ role:'user', content:question }); saveChats(); renderMessages();

    // Open right rail after first question with animation
    app.classList.add('right-open');
    rightRail.classList.remove('hidden');

    // Placeholder with inline animation
    const pid = makeId();
    chat.messages.push({ id:pid, role:'assistant', content:'', html:
      `<div style="display:flex;align-items:center;gap:10px;">
         <video src="https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-animation.mp4" autoplay loop muted playsinline style="height:28px;border-radius:8px"></video>
         <em>Thinking…</em>
       </div>` });
    saveChats(); renderMessages();

    // Build payload options
    const optionsNote = [];
    if (chkVideos && chkVideos.checked) optionsNote.push("videos");
    if (chkPhotos && chkPhotos.checked) optionsNote.push("photos");
    const detail = respSwitch ? respSwitch.value : "default";

    try{
      const r = await fetch(CONFIG.mainWorker, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ questions:[`${question}${detail==='short'?' (short answer)':detail==='detailed'?' (detailed answer)':''}`] })
      });
      if (!r.ok) throw new Error("Service unavailable "+r.status);
      const j = await r.json();
      const out = j.answers && j.answers[0] ? j.answers[0] : { answer:'' };
      const answer = out.answer || '';
      let vids = Array.isArray(out.videos)?out.videos:[];
      // If Include videos is disabled, drop embedded videos
      if (chkVideos && !chkVideos.checked) vids = [];

      const sources = Array.isArray(out.sources)?out.sources:[];
      const html = renderAnswer(answer, vids, sources);

      const msg = chat.messages.find(m=>m.id===pid);
      if (msg){ msg.content=answer; msg.html=html; }
      if (chat.title==='New chat'){ chat.title = question.slice(0,60); }
      saveChats(); renderMessages(); renderSources(sources);
    }catch(e){
      const msg = chat.messages.find(m=>m.id===pid);
      if (msg){
        msg.html = `<div><span style="color:var(--orange)">Partial results due to error:</span> ${escapeHtml(e.message)}</div>`;
      }
      saveChats(); renderMessages();
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
      if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const q = composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q); }
    });
  }
  if (newChatBtn){ newChatBtn.addEventListener('click', ()=>{ currentChatId=null; ensureChat(); renderMessages(); }); }
  if (clearChatsBtn){ clearChatsBtn.addEventListener('click', ()=>{ if(confirm('Clear all chats?')){ chats=[]; currentChatId=null; saveChats(); renderChatList(); renderMessages(); } }); }

  // Settings dialog
  if (settingsBtn){
    settingsBtn.addEventListener('click', ()=>{ dialogBackdrop.style.display='flex'; });
  }
  if (dialogBackdrop){
    dialogBackdrop.addEventListener('click', (e)=>{ if (e.target===dialogBackdrop) dialogBackdrop.style.display='none'; });
    document.getElementById('closeDialog').addEventListener('click', ()=> dialogBackdrop.style.display='none');
  }

  // Init
  (function init(){
    renderChatList();
    if (chats.length){ currentChatId = chats[0].id; renderMessages(); }
    if (user && user.picture) userAvatar.src = user.picture;

    // Splash loading animation; hide after short delay
    setTimeout(()=>{ if (splash) splash.style.display='none'; }, 1200);
  })();
})();

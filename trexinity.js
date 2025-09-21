(function(){
  const CONFIG = {
    mainWorker: "https://trexinity.shauryaagarwal-id.workers.dev/",
    loginWorker: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
    googleClientId: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com"
  };

  // Elements
  const app = document.querySelector('.app'), streamEl = document.getElementById('stream'), composerEl = document.getElementById('composer'),
        sendBtn = document.getElementById('sendBtn'), toasts = document.getElementById('toasts'), chatList = document.getElementById('chatList'),
        newChatBtn = document.getElementById('newChatBtn'), clearChatsBtn = document.getElementById('clearChatsBtn'),
        themeToggle = document.getElementById('themeToggle'), userAvatar = document.getElementById('userAvatar'),
        sourcesPanel = document.getElementById('sourcesPanel'), videoPanel = document.getElementById('videoPanel'),
        rightRail = document.querySelector('.right'), brandLogo = document.getElementById('brandLogo'),
        settingsBtn = document.getElementById('settingsBtn'), dialogBackdrop = document.getElementById('dialogBackdrop'),
        splash = document.getElementById('splash'), tabs = document.querySelectorAll('.tab'),
        pages = { chat:document.getElementById('page-chat'), about:document.getElementById('page-about'), credits:document.getElementById('page-credits'), posts:document.getElementById('page-posts') },
        googleBtn = document.getElementById('googleBtn');

  const chkVideos = document.getElementById('opt-videos'), chkPhotos = document.getElementById('opt-photos'), respSwitch = document.getElementById('opt-detail');

  // State
  let chats = JSON.parse(localStorage.getItem('trex-chats') || '[]'), currentChatId = null, user = JSON.parse(localStorage.getItem('trex-user') || 'null');

  function saveChats(){ localStorage.setItem('trex-chats', JSON.stringify(chats)); }
  function makeId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function toast(msg){ const d=document.createElement('div'); d.className='toast'; d.textContent=msg; toasts.appendChild(d); setTimeout(()=>d.remove(),4200); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // Theme
  (function tInit(){ try{ const pref=localStorage.getItem("trex-theme"); const sys=(matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark'; const theme=pref||sys; if(theme==='light') document.body.classList.add('light'); brandLogo.src=document.body.classList.contains('light')?"https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png":"https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png"; }catch{} })();
  themeToggle.addEventListener('click', ()=>{ const light=document.body.classList.toggle('light'); localStorage.setItem("trex-theme", light?'light':'dark'); brandLogo.src=light?"https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png":"https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png"; });

  // Tabs (no navigation)
  tabs.forEach(t=>t.addEventListener('click',()=>{ if(t.id==='themeToggle'||t.id==='settingsBtn') return; tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); Object.values(pages).forEach(p=>p.classList.remove('active')); pages[t.dataset.page].classList.add('active'); }));

  // Chats
  function ensureChat(){ if(!currentChatId){ const id=makeId(); chats.unshift({ id, title:"New chat", created:Date.now(), messages:[] }); currentChatId=id; saveChats(); renderChatList(); } return currentChatId; }
  function currentChat(){ return chats.find(c=>c.id===currentChatId); }
  function renderChatList(){ chatList.innerHTML=''; chats.forEach(c=>{ const d=document.createElement('div'); d.className='chat-item'; d.textContent=c.title||'Untitled'; d.onclick=()=>{ currentChatId=c.id; renderMessages(); }; chatList.appendChild(d); }); }
  function renderMessages(){ streamEl.innerHTML=''; const c=currentChat(); if(!c) return; c.messages.forEach(m=>{ const d=document.createElement('div'); d.className='msg '+(m.role==='user'?'user':'assistant'); d.innerHTML=m.html||escapeHtml(m.content||''); streamEl.appendChild(d); }); streamEl.scrollTop=streamEl.scrollHeight; }

  // Typing effect
  async function typeIn(el, html){ el.innerHTML=''; let i=0; const plain=html; while(i<plain.length){ el.innerHTML = plain.slice(0, ++i); await new Promise(r=>setTimeout(r, 2)); } }

  function renderAnswer(answer, vids, sources){
    const safe=escapeHtml(answer||''); const paras=safe.split(/\n{2,}/).map(x=>`<p>${x.replace(/\n/g,'<br/>')}</p>`).join('');
    const v=(vids&&vids.length)?`<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;"><iframe width="100%" height="230" src="https://www.youtube.com/embed/${escapeHtml(vids[0].id||'')}?modestbranding=1&rel=0&enablejsapi=1" title="${escapeHtml(vids[0].title||'Video')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`:'';
    const s=(sources&&sources.length)?`<div style="margin-top:10px;opacity:.85;font-size:13px;">${sources.slice(0,8).map(x=>`<a class="pill" href="${escapeHtml(x)}" target="_blank" rel="noopener" style="margin-right:6px;">Source</a>`).join('')}</div>`:'';
    return {html:paras+v+s, videoHTML:v};
  }

  // GIS
  window.handleGoogleCredential = async (resp)=>{ try{ const r=await fetch(CONFIG.loginWorker+"?id_token="+encodeURIComponent(resp.credential)); if(!r.ok) throw new Error('Login failed'); const profile=await r.json(); user=profile; localStorage.setItem('trex-user', JSON.stringify(user)); if(user?.picture) userAvatar.src=user.picture; toast("Logged in"); }catch{ toast("Login error"); } };
  function renderGIS(){ if(window.google?.accounts?.id){ window.google.accounts.id.initialize({ client_id:CONFIG.googleClientId, callback:window.handleGoogleCredential, auto_select:false }); window.google.accounts.id.renderButton(googleBtn,{ theme:document.body.classList.contains('light')?'outline':'filled_black', size:"medium", shape:"pill" }); window.google.accounts.id.prompt(); } }
  if (window.google?.accounts?.id) renderGIS(); else { const t=setInterval(()=>{ if(window.google?.accounts?.id){ clearInterval(t); renderGIS(); } },150); }

  // Ask
  async function ask(q){
    ensureChat(); const chat=currentChat();
    chat.messages.push({ role:'user', content:q }); saveChats(); renderMessages();

    app.classList.add('right-open'); rightRail.classList.remove('hidden');

    const placeholder=document.createElement('div'); placeholder.className='msg assistant'; placeholder.innerHTML=`<div style="display:flex;align-items:center;gap:10px;"><video src="https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-animation.mp4" autoplay loop muted playsinline style="height:28px;border-radius:8px"></video><em>Thinking…</em></div>`;
    streamEl.appendChild(placeholder); streamEl.scrollTop=streamEl.scrollHeight;

    const detail = respSwitch ? respSwitch.value : "default";
    const decorated = `${q}${detail==='short'?' (short answer)':detail==='detailed'?' (detailed answer)':''}`;
    try{
      const r = await fetch(CONFIG.mainWorker, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ questions:[decorated], maxVideos:(chkVideos?.checked?1:0) }) });
      if(!r.ok) throw new Error('Service unavailable '+r.status);
      const j = await r.json(); const out = j.answers?.[0]||{ answer:'' };
      const answer = out.answer||''; const vids = (chkVideos?.checked? (out.videos||[]): []); const sources = out.sources||[];
      const rendered = renderAnswer(answer, vids, sources);
      await typeIn(placeholder, rendered.html);
      chat.messages.push({ role:'assistant', content:answer, html:rendered.html });
      if (chat.title==='New chat') chat.title=q.slice(0,60);
      saveChats(); renderChatList();

      // Fill right rail
      sourcesPanel.innerHTML=''; (sources||[]).slice(0,12).forEach(s=>{ const b=document.createElement('div'); b.className='pill'; b.textContent=s; sourcesPanel.appendChild(b); });
      videoPanel.innerHTML = rendered.videoHTML || '';
    }catch(e){
      placeholder.innerHTML = `<div><span style="color:var(--orange)">Error:</span> ${escapeHtml(e.message)}</div>`;
    }
  }

  // Events (prevent Blogger navigation)
  sendBtn.addEventListener('click', ()=>{ const q=composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q); });
  composerEl.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const q=composerEl.value.trim(); if(!q) return; composerEl.value=''; ask(q); } });
  newChatBtn.addEventListener('click', ()=>{ currentChatId=null; ensureChat(); renderMessages(); });
  clearChatsBtn.addEventListener('click', ()=>{ if(confirm('Clear all chats?')){ chats=[]; currentChatId=null; saveChats(); renderChatList(); renderMessages(); } });

  // Settings dialog
  settingsBtn.addEventListener('click', ()=>{ dialogBackdrop.style.display='flex'; });
  dialogBackdrop.addEventListener('click', e=>{ if(e.target===dialogBackdrop) dialogBackdrop.style.display='none'; });
  document.getElementById('closeDialog').addEventListener('click', ()=> dialogBackdrop.style.display='none');

  // Init
  (function init(){
    renderChatList(); if (chats.length){ currentChatId=chats[0].id; renderMessages(); }
    if (user?.picture) userAvatar.src=user.picture;
    setTimeout(()=>{ if(splash) splash.style.display='none'; }, 900);
  })();
})();

/* trexinity.js — Trexinity UI & worker integration
   Requirements: include Google Identity <script src="https://accounts.google.com/gsi/client" async defer></script>
*/

(function(){
  // initial defaults (will be overridden by mountApp config)
  let CONFIG = {
    workerUrl: "",
    loginWorkerUrl: "",
    googleClientId: "",
    youtubeApiKey: "",
    taglines: [],
    logos: { black:"", white:"", anim:"" },
    uiOptions: {}
  };

  // runtime state
  let state = {
    user: null,          // {name,email,picture,sub}
    driveToken: null,
    history: [],         // [{role,text,image,video,sources,ts}]
    activeChatId: null,
    chats: []            // array of chat objects
  };

  // utility
  const el = id => document.getElementById(id);
  const TIMEOUT = 30000;

  // ----------------- mountApp (entry) -----------------
  window.mountApp = function(cfg){
    CONFIG = {...CONFIG, ...cfg};
    // ensure GSI script loaded
    if (!window.google || !google.accounts){
      const s = document.createElement('script');
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true;
      s.onload = () => initAfterScripts();
      document.head.appendChild(s);
    } else initAfterScripts();
  };

  function initAfterScripts(){
    buildUI();
    initGsi();
    loadLocalHistory();
    startTaglineSlider();
    playBootAnimation();
  }

  // ----------------- UI build -----------------
  function buildUI(){
    // root container provided by Blogger: #trexinity-root
    const root = document.getElementById('trexinity-root');
    root.innerHTML = `
      <div id="trex-sidebar">
        <h3>Chats</h3>
        <div id="chat-list"></div>
        <hr/>
        <div style="font-size:13px;color:var(--muted);margin-top:8px">Saved locally or on Google when logged in</div>
      </div>
      <div id="trex-shell">
        <div id="trex-top">
          <div id="trex-logo-wrap">
            <div id="trex-logo-img" style="background-image:url('${CONFIG.logos.black}')"></div>
            <div id="top-tabs"></div>
            <div id="trex-title">Trexinity</div>
          </div>
          <div id="trex-status">Ready</div>
          <div id="trex-controls-right" style="display:flex;gap:8px;align-items:center">
            <div id="trex-profile" style="width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;cursor:pointer">👤</div>
          </div>
        </div>

        <div id="trex-tagline">${(CONFIG.taglines && CONFIG.taglines[0]) || ""}</div>

        <div id="trex-messages" role="log" aria-live="polite"></div>

        <div id="trex-input-island">
          <textarea id="trex-input" placeholder="Ask one or more questions — use Enter to send, Shift+Enter for newline"></textarea>
          <div id="trex-controls">
            <div style="display:flex;flex-direction:column;gap:8px">
              <button id="send-btn" class="trex-btn trex-send">Send</button>
              <button id="clear-btn" class="trex-btn trex-clear">Clear</button>
            </div>
          </div>
        </div>
      </div>

      <div id="login-capsule">
        <div style="font-size:13px;margin-right:10px">Sign in with Google to save chats</div>
        <button class="login-btn" id="login-capsule-btn">Sign in</button>
      </div>

      <div id="trex-loading"><video id="trex-loading-video" autoplay loop muted playsinline src="${CONFIG.logos.anim}"></video></div>

      <div class="trex-modal" id="trex-modal"><img id="trex-modal-img" alt="Preview"></div>
    `;

    // top tabs
    const tabs = CONFIG.uiOptions.topTabs || ["Chats","About","Credits","Pages"];
    const tabsWrap = document.getElementById('top-tabs');
    tabs.forEach((t,i)=>{
      const btn = document.createElement('button');
      btn.className = 'tab' + (i===0 ? ' active' : '');
      btn.textContent = t;
      btn.addEventListener('click', ()=>onTabClick(t));
      tabsWrap.appendChild(btn);
    });

    // wire events
    document.getElementById('send-btn').addEventListener('click', onSend);
    document.getElementById('clear-btn').addEventListener('click', onClear);
    document.getElementById('login-capsule-btn').addEventListener('click', onLoginCapsuleClick);
    document.getElementById('trex-profile').addEventListener('click', onProfileClick);
    const txt = document.getElementById('trex-input');
    txt.addEventListener('keydown', e=>{
      if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }
    });
    // autosize
    txt.addEventListener('input', ()=>autosize(txt));

    renderChatList();
    renderTheme(); // ensure logo shows right
    // show login capsule if not logged in
    toggleLoginCapsule(!state.user);
  }

  // ----------------- Tagline slider -----------------
  let taglineIdx = 0;
  function startTaglineSlider(){
    if(!CONFIG.taglines || !CONFIG.taglines.length) return;
    const elTag = document.getElementById('trex-tagline');
    elTag.textContent = CONFIG.taglines[0];
    setInterval(()=>{
      taglineIdx = (taglineIdx + 1) % CONFIG.taglines.length;
      elTag.style.opacity = 0;
      setTimeout(()=>{ elTag.textContent = CONFIG.taglines[taglineIdx]; elTag.style.opacity = 1; }, 300);
    }, 5000);
  }

  // ----------------- GSI (Google Sign-In) -----------------
  let tokenClient = null;
  function initGsi(){
    if (!CONFIG.googleClientId) return;
    google.accounts.id.initialize({
      client_id: CONFIG.googleClientId,
      callback: handleCredentialResponse,
      ux_mode: 'popup'
    });
    // token client for Drive access (appData)
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.googleClientId,
      scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
      callback: (resp) => {
        if (resp && resp.access_token){
          state.driveToken = resp.access_token;
          // try load drive history
          loadHistoryFromDrive().catch(()=>{});
        }
      }
    });
  }

  // when google returns id_token (credential)
  async function handleCredentialResponse(resp){
    if(!resp || !resp.credential) return;
    // verify id_token with login worker
    try{
      const r = await fetch(CONFIG.loginWorkerUrl + '?id_token=' + encodeURIComponent(resp.credential));
      const j = await r.json();
      if (j && j.sub){
        state.user = { name: j.name, email: j.email, picture: j.picture, sub: j.sub };
        document.getElementById('trex-profile').style.backgroundImage = `url(${j.picture})`;
        document.getElementById('trex-profile').textContent = '';
        toggleLoginCapsule(false);
        // request Drive token silently (prompt: none) if needed later
        // tokenClient.requestAccessToken({prompt: ''});
      } else {
        console.warn('login worker verification failed', j);
      }
    }catch(e){ console.error('credential verification failed', e); }
  }

  // show small capsule sign-in (in-UI)
  function toggleLoginCapsule(show){
    const box = document.getElementById('login-capsule');
    if(show) box.style.display = 'flex'; else box.style.display = 'none';
  }

  async function onLoginCapsuleClick(){
    // use one-tap GSI prompt
    try{
      google.accounts.id.prompt(); // shows sign in UI
    }catch(e){
      alert('Google sign-in not ready: ' + e.message);
    }
  }

  // profile click: open menu (simple confirm for sign out)
  function onProfileClick(){
    if (!state.user){
      // open login capsule
      toggleLoginCapsule(true);
      return;
    }
    const ok = confirm(`Signed in as ${state.user.name}\nSign out?`);
    if (ok){
      state.user = null; state.driveToken = null;
      document.getElementById('trex-profile').style.backgroundImage = '';
      document.getElementById('trex-profile').textContent = '👤';
      // show capsule again
      toggleLoginCapsule(true);
    }
  }

  // ----------------- local history persistence -----------------
  function loadLocalHistory(){
    try{
      const raw = localStorage.getItem('trex_history_v1') || '[]';
      state.history = JSON.parse(raw);
      renderMessagesFromHistory();
    }catch(e){ state.history = []; }
  }
  function saveLocalHistory(){
    try{ localStorage.setItem('trex_history_v1', JSON.stringify(state.history)); }catch(e){}
  }

  // ----------------- Drive appData saving (optional) -----------------
  async function saveHistoryToDrive(){
    if(!state.driveToken) {
      // request token
      if(tokenClient) tokenClient.requestAccessToken({prompt: 'consent'});
      return;
    }
    const content = JSON.stringify(state.history);
    // find file:
    const listUrl = 'https://www.googleapis.com/drive/v3/files?q=name=%27trexinity_history.json%27 and spaces=appDataFolder&fields=files(id,name)';
    const listResp = await fetch(listUrl, { headers: { Authorization: 'Bearer ' + state.driveToken }});
    const listJson = await listResp.json();
    const boundary = '-------trexinity' + Date.now();
    const metadata = { name: 'trexinity_history.json', parents: ['appDataFolder'] };
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    if(listJson.files && listJson.files.length){
      const fileId = listJson.files[0].id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&supportsAllDrives=true`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + state.driveToken, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipart
      });
    } else {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + state.driveToken, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipart
      });
    }
  }

  async function loadHistoryFromDrive(){
    if(!state.driveToken) return;
    const listUrl = 'https://www.googleapis.com/drive/v3/files?q=name=%27trexinity_history.json%27 and spaces=appDataFolder&fields=files(id,name)';
    const listResp = await fetch(listUrl, { headers: { Authorization: 'Bearer ' + state.driveToken }});
    const listJson = await listResp.json();
    if(listJson.files && listJson.files.length){
      const fileId = listJson.files[0].id;
      const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: 'Bearer ' + state.driveToken }});
      const content = await fileResp.text();
      try{
        state.history = JSON.parse(content);
        saveLocalHistory();
        renderMessagesFromHistory();
      }catch(e){}
    }
  }

  // ----------------- message rendering -----------------
  function renderMessagesFromHistory(){
    const container = document.getElementById('trex-messages');
    container.innerHTML = '';
    state.history.forEach(m => {
      appendMessageToDOM(m.role, m.text, m.image, m.videos, m.sources);
    });
    container.scrollTop = container.scrollHeight;
  }

  function appendMessageToDOM(role, text, image=null, videos=null, sources=[]){
    const container = document.getElementById('trex-messages');
    const row = document.createElement('div');
    row.className = 'row ' + (role === 'user' ? 'user' : 'bot');
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (role === 'user' ? 'user' : 'bot');
    bubble.innerHTML = escapeHtml(text || '');
    if(image){
      const img = document.createElement('img');
      img.src = image; img.className = 'msg-media';
      img.addEventListener('click', ()=>openModal(image));
      bubble.appendChild(img);
    }
    if(videos && videos.length){
      videos.forEach(v=>{
        const ifr = document.createElement('iframe');
        ifr.className = 'msg-video';
        ifr.width = 420; ifr.height = 236;
        ifr.src = v.url.includes('embed') ? v.url : `https://www.youtube.com/embed/${v.id || ''}`;
        ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        bubble.appendChild(ifr);
      });
    }
    if(sources && sources.length){
      const s = document.createElement('div');
      s.className = 'msg-sources';
      s.textContent = 'Sources: ' + sources.join(', ');
      bubble.appendChild(s);
    }
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function openModal(src){
    const modal = document.getElementById('trex-modal');
    const img = document.getElementById('trex-modal-img');
    img.src = src;
    modal.classList.add('open');
    modal.addEventListener('click', ()=> modal.classList.remove('open'), {once:true});
  }

  // ----------------- send flow (core) -----------------
  async function onSend(){
    const input = document.getElementById('trex-input');
    const raw = input.value.trim();
    if(!raw) return;
    // allow multiple lines: split into questions when user typed multiple lines separated by blank line or newline?
    const questions = raw.split('\n').map(s=>s.trim()).filter(Boolean);
    // show user message
    appendMessageToDOM('user', raw);
    state.history.push({role:'user', text: raw, ts: Date.now()});
    saveLocalHistory();
    input.value = '';
    autosize(input);
    // show typing UI
    showLoading(true);
    // logo animation on
    playLogoAnim(true);

    try{
      // prepare payload
      const payload = { questions, context: lastNContext(8), prefs: { includePhotos: false } };
      const controller = new AbortController();
      const timeout = setTimeout(()=> controller.abort(), TIMEOUT);
      const resp = await fetch(CONFIG.workerUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const text = await resp.text();
      let data;
      try{ data = JSON.parse(text); } catch(e){ data = { error: 'Invalid JSON from worker', raw: text }; }
      if(data.error){ appendMessageToDOM('bot', '⚠️ Server error: ' + (data.error || 'unknown')); }
      else {
        // data.answers expected to be array: [{question, answer, image, videos, sources}]
        const answers = Array.isArray(data.answers) ? data.answers : (data.answer ? [{answer: data.answer, image: data.image || null, videos: data.videos || []}] : []);
        for(const ans of answers){
          appendMessageToDOM('bot', ans.answer || 'No answer', ans.image || null, ans.videos || [], ans.sources || []);
          state.history.push({role:'bot', text: ans.answer || '', image: ans.image || null, videos: ans.videos || [], sources: ans.sources || [], ts: Date.now()});
          saveLocalHistory();
        }
      }
    }catch(err){
      if(err.name === 'AbortError') appendMessageToDOM('bot', '⚠️ Request timed out');
      else appendMessageToDOM('bot', '⚠️ Network error: ' + (err.message || err));
    }finally{
      showLoading(false);
      playLogoAnim(false);
    }
  }

  function lastNContext(n){
    const msgs = state.history.slice(-n*2); // approximate
    return msgs.map(m=>({role:m.role, text:m.text}));
  }

  // ----------------- helper UI functions -----------------
  function onClear(){
    if(!confirm('Clear chat history?')) return;
    state.history = [];
    saveLocalHistory();
    document.getElementById('trex-messages').innerHTML = '';
  }

  function autosize(textarea){
    textarea.style.height = 'auto';
    textarea.style.height = (Math.min(textarea.scrollHeight, 400)) + 'px';
  }

  function renderChatList(){
    const list = document.getElementById('chat-list');
    if(!list) return;
    list.innerHTML = '';
    // we show last 12 messages as items (simple)
    const chunks = chunkArray(state.history.filter(m=>m.role==='user').reverse(), 30);
    chunks.forEach((c,i)=>{
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.textContent = c[0] ? (c[0].text.slice(0,60) + (c[0].text.length>60 ? '...' : '')) : 'Conversation';
      item.onclick = ()=> loadConversationChunk(c);
      list.appendChild(item);
    });
  }
  function loadConversationChunk(chunk){
    // render only chunk (simple)
    const container = document.getElementById('trex-messages');
    container.innerHTML = '';
    chunk.slice().reverse().forEach(m => appendMessageToDOM(m.role, m.text, m.image, m.videos, m.sources));
  }

  function chunkArray(arr, maxLen){
    const out = [];
    for(let i=0;i<arr.length;i+=maxLen){
      out.push(arr.slice(i, i+maxLen));
    }
    return out;
  }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ----------------- loading & logo animation -----------------
  function showLoading(flag){
    const el = document.getElementById('trex-loading');
    if(flag) el.style.display = 'block'; else el.style.display = 'none';
  }

  // logo animation control: show anim video while typing or on load
  function playBootAnimation(){
    const anim = document.getElementById('trex-loading-video');
    if(anim){
      // play once on mount
      anim.play().catch(()=>{});
      const el = document.getElementById('trex-loading');
      el.style.display = 'block';
      setTimeout(()=> el.style.display = 'none', 1200);
    }
  }
  function playLogoAnim(on){
    const animWrap = document.getElementById('trex-loading');
    if(on) animWrap.style.display = 'block'; else animWrap.style.display = 'none';
  }

  // ----------------- tab click */
  function onTabClick(tab){
    if(tab === 'About') return showAbout();
    if(tab === 'Credits') return showCredits();
    if(tab === 'Pages') return showPages();
    // default: Chats
    document.getElementById('trex-messages').innerHTML = '';
    renderMessagesFromHistory();
  }

  function showAbout(){
    const c = document.getElementById('trex-messages');
    c.innerHTML = '';
    appendMessageToDOM('bot', 'Trexinity is a multi-worker AI platform combining many free APIs to answer questions. Use the chat below.');
  }
  function showCredits(){
    const c = document.getElementById('trex-messages');
    c.innerHTML = '';
    appendMessageToDOM('bot', 'Built by Shaurya — Trexinity. Logos and assets included.');
  }
  function showPages(){
    const c = document.getElementById('trex-messages');
    c.innerHTML = '';
    appendMessageToDOM('bot', 'Use Blogger pages/posts area to publish content and apply for AdSense.');
  }

  // ----------------- final init helpers -----------------
  function renderTheme(){
    const logoImg = document.getElementById('trex-logo-img');
    logoImg.style.backgroundImage = `url('${CONFIG.logos.black}')`;
    // change when toggled later
  }

  // ----------------- PUBLIC: nothing else -----------------
})();

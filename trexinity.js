/* trexinity.js — frontend (polished, GSI, liquid glass, autosize) */

/* Default config — overridden by mountApp() call from Blogger */
const CONFIG = {
  workerUrl: "https://trexinity.shauryaagarwal-id.workers.dev/",
  loginWorkerUrl: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
  googleClientId: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com",
  youtubeApiKey: "AIzaSyDPf8/* trexinity.js — mounts UI, animations, typing pill, GSI login capsule, worker calls */

/* Default config (overridden by mountApp from Blogger) */
const CONFIG = {
  workerUrl: "https://trexinity.shauryaagarwal-id.workers.dev/",
  loginWorkerUrl: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
  googleClientId: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com",
  assets: {
    logoBlack: "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-black.png",
    logoWhite: "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-white.png",
    logoTextBlack: "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-text-black.png",
    logoTextWhite: "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-text-white.png",
    anim: "https://cdn.jsdelivr.net/gh/trexinity/trexinity/trexinity-logo-animation.mp4"
  },
  taglines: [
    "The first ever knowledge chatbot of India",
    "The most safe and secure chat model",
    "The most fluid and polished interface",
    "The answers are provided by massive intelligences",
    "The best answering model for research works",
    "May fail; can make mistakes or show any error, WE ACCEPT OUR DEMERITS"
  ],
  showLoginCapsuleOnLoad: true,
  loginCapsuleDuration: 6000
};

let STATE = { user: null, history: [] };

/* small DOM helpers */
const $ = id => document.getElementById(id);
const create = (tag, attrs={}, parent=null) => { const el=document.createElement(tag); for(const k in attrs){ if(k==='text') el.textContent=attrs[k]; else if(k==='html') el.innerHTML=attrs[k]; else el.setAttribute(k, attrs[k]); } if(parent) parent.appendChild(el); return el; };

/* export mountApp to let Blogger override config */
window.mountApp = function(opts){
  if(opts) Object.assign(CONFIG, opts);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
};

function init(){
  const root = $('trexinity-root');
  if(!root){ console.error('trexinity-root not found'); return; }

  root.innerHTML = `
    <div class="shell">
      <div class="left">
        <h2>Chats</h2>
        <div id="chat-list"></div>
        <hr />
        <div style="font-size:13px;color:var(--muted);margin-top:8px">Saved locally or in Google Drive (when signed in)</div>
      </div>

      <div class="right">
        <div class="topbar">
          <div class="logo-wrap">
            <div class="logo-img" id="logo-img" style="background-image:url('${CONFIG.assets.logoBlack}')"></div>
            <div class="logo-text">Trexinity</div>
          </div>
          <div class="top-spacer">
            <div id="status" style="color:var(--muted);font-size:13px">Ready</div>
            <div id="profile" class="profile-pic" title="Sign in">👤</div>
          </div>
        </div>

        <div class="tagline" id="top-tagline" style="text-align:center;padding:12px;font-size:15px;color:var(--accent)">${CONFIG.taglines[0]}</div>

        <div class="messages" id="messages" role="log" aria-live="polite"></div>

        <div class="input-row" id="input-row">
          <textarea id="input-field" class="input-field pill" placeholder="Ask one or more questions — Shift+Enter = newline"></textarea>
          <div class="controls">
            <button class="btn send" id="btn-send">Send</button>
            <button class="btn clear" id="btn-clear">Clear</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Start screen with logo animation + taglines (centered) -->
    <div class="start-screen" id="start-screen">
      <div class="start-card" id="start-card">
        <div class="start-logo" id="start-logo"><video id="start-video" src="${CONFIG.assets.anim}" autoplay muted playsinline loop></video></div>
        <div class="start-taglines" id="start-taglines">${CONFIG.taglines[0]}</div>
      </div>
    </div>

    <!-- Login capsule top-right -->
    <div class="login-capsule" id="login-capsule" style="display:none;">
      <div style="font-size:13px;color:var(--muted);">Sign in with Google to sync chats</div>
      <button class="login-button" id="login-button">Sign in</button>
    </div>

    <!-- Loading overlay using same anim -->
    <div class="loading-overlay" id="loading-overlay">
      <div class="loading-card">
        <video id="loading-video" class="loading-video" src="${CONFIG.assets.anim}" autoplay muted playsinline loop></video>
        <div style="color:var(--muted);font-size:14px">Trexinity is loading…</div>
      </div>
    </div>

    <!-- modal for image preview -->
    <div class="trex-modal" id="trex-modal"><img id="trex-modal-img" alt="Preview"></div>
  `;

  // wire up events
  document.getElementById('btn-send').addEventListener('click', onSend);
  document.getElementById('btn-clear').addEventListener('click', onClear);
  const txt = $('input-field');
  txt.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }});
  txt.addEventListener('input', ()=>autoSize(txt));
  $('profile').addEventListener('click', onProfileClick);
  $('login-button').addEventListener('click', showGsiPrompt);

  // start tagline rotator (top center)
  startTopTaglines();
  // show start screen briefly (3s) then auto-hide
  showStartScreen();
  // login capsule briefly
  if(CONFIG.showLoginCapsuleOnLoad) showLoginCapsule(CONFIG.loginCapsuleDuration || 6000);
  // load local history
  loadLocalHistory();
  // init Google identity
  setupGSI();
}

/* auto-resize & pill toggling */
function autoSize(el){
  el.style.height = 'auto';
  const h = Math.min(el.scrollHeight, 420);
  el.style.height = h + 'px';
  if(h > 56) el.classList.remove('pill'); else el.classList.add('pill');
}

/* start screen control */
function showStartScreen(){
  const scr = $('start-screen');
  if(!scr) return;
  // keep visible while first animation plays; hide after 2600ms
  setTimeout(()=>{ scr.style.opacity = 0; scr.style.pointerEvents = 'none'; setTimeout(()=> scr.style.display = 'none', 400); }, 2600);
}

/* top tagline rotator */
function startTopTaglines(){
  const el = $('start-taglines');
  const top = $('top-tagline');
  let i = 0;
  setInterval(()=>{
    i = (i + 1) % CONFIG.taglines.length;
    if(el){ el.style.opacity = 0; setTimeout(()=>{ el.textContent = CONFIG.taglines[i]; el.style.opacity = 1; }, 260); }
    if(top){ top.style.opacity = 0; setTimeout(()=>{ top.textContent = CONFIG.taglines[i]; top.style.opacity = 1; }, 260); }
  }, 5000);
}

/* show login capsule top-right for ms milliseconds */
function showLoginCapsule(ms=6000){
  const cap = $('login-capsule');
  cap.style.display = 'flex';
  setTimeout(()=> cap.style.display = 'none', ms);
}
function toggleLoginCapsule(show){ $('login-capsule').style.display = show ? 'flex' : 'none'; }

/* loading overlay */
function showLoading(on){
  const overlay = $('loading-overlay');
  if(!overlay) return;
  overlay.style.display = on ? 'flex' : 'none';
  if(on) { const v = $('loading-video'); if(v) v.play().catch(()=>{}); }
}

/* message helpers & history */
function appendMessage(role, text, image=null, videos=null, sources=[]){
  appendToDom(role, text, image, videos, sources);
  STATE.history.push({role,text,image, videos, sources, ts:Date.now()});
  saveLocalHistory();
}
function appendToDom(role, text, image=null, videos=null, sources=[]){
  const messages = $('messages');
  const row = create('div',{class:'row ' + (role === 'user' ? 'user' : 'bot')}, messages);
  const bubble = create('div',{class:'bubble ' + (role === 'user' ? 'user' : 'bot'), html:escapeHtml(text)}, row);

  // if waiting and we want a typing animation (video) include it
  if(role === 'bot' && text && text.includes('Trexinity is thinking')) {
    const vid = create('video',{class:'typing-video', src:CONFIG.assets.anim, autoplay:true, loop:true, muted:true, playsinline:true}, bubble);
    vid.style.width = '56px'; vid.style.height = '56px'; vid.style.borderRadius = '8px';
  }

  if(image){
    const img = create('img',{src:image, class:'msg-img'}, bubble);
    img.addEventListener('click', ()=> openModal(image));
  }
  if(Array.isArray(videos) && videos.length){
    videos.forEach(v=>{
      const iframe = create('iframe',{class:'msg-video',width:420,height:236,src:v.url,allow:'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'}, bubble);
    });
  }
  if(sources && sources.length) create('div',{class:'msg-sources', text:'Sources: ' + sources.join(', ')}, bubble);
  messages.scrollTop = messages.scrollHeight;
}

/* modal preview */
function openModal(src){ const modal = $('trex-modal'); $('trex-modal-img').src = src; modal.classList.add('open'); modal.addEventListener('click', ()=> modal.classList.remove('open'), {once:true}); }

/* escape html */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* autosize on load */
function loadLocalHistory(){
  try{ STATE.history = JSON.parse(localStorage.getItem('trexinity_history_v3') || '[]'); }catch(e){ STATE.history = []; }
  STATE.history.forEach(m => appendToDom(m.role, m.text, m.image, m.videos, m.sources));
}
function saveLocalHistory(){ try{ localStorage.setItem('trexinity_history_v3', JSON.stringify(STATE.history)); }catch(e){} }

/* send flow to main worker with typing video until response */
async function onSend(){
  const txt = $('input-field');
  const raw = txt.value.trim();
  if(!raw) return;
  appendMessage('user', raw);
  txt.value = ''; autoSize(txt);

  // show typing stub with typing video
  appendToDom('bot', 'Trexinity is thinking...'); // will cause typing video to be appended
  showLoading(true);
  setStatus('Thinking...');

  try{
    const controller = new AbortController();
    const to = setTimeout(()=> controller.abort(), 30000);
    const resp = await fetch(CONFIG.workerUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ questions: [ raw ] }),
      signal: controller.signal
    });
    clearTimeout(to);

    // remove previous typing stub (last bot entry if it had 'Trexinity is thinking...')
    const messages = $('messages');
    for(let i = messages.children.length-1; i>=0; i--){
      const b = messages.children[i].querySelector('.bubble');
      if(b && b.textContent && b.textContent.includes('Trexinity is thinking')){ messages.children[i].remove(); break; }
    }

    showLoading(false);
    if(!resp.ok){
      const t = await resp.text().catch(()=>'');
      appendMessage('bot', `⚠️ Server error ${resp.status}: ${t ? t.slice(0,800) : resp.statusText}`);
      setStatus('Server error');
      return;
    }

    const text = await resp.text();
    let data;
    try{ data = JSON.parse(text); } catch(e){
      appendMessage('bot', '⚠️ Server error: Invalid JSON from worker. Response (truncated): ' + (text ? text.slice(0,800) : 'empty'));
      setStatus('Server error');
      return;
    }

    if(data.error){
      appendMessage('bot', '⚠️ Server error: ' + (data.error || 'unknown'));
      setStatus('Server error');
      return;
    }

    const answers = Array.isArray(data.answers) ? data.answers : (data.answer ? [{answer: data.answer, image: data.image||null, videos: data.videos||[], sources: data.sources||[]}] : []);
    if(answers.length === 0){
      appendMessage('bot','No answer found.');
      setStatus('Done');
      return;
    }

    for(const ans of answers){
      const textAns = ans.answer || (ans.text || '');
      appendMessage('bot', textAns, ans.image || null, ans.videos || [], ans.sources || []);
    }
    setStatus('Done');
  }catch(err){
    // remove typing stub
    const messages = $('messages');
    for(let i = messages.children.length-1; i>=0; i--){
      const b = messages.children[i].querySelector('.bubble');
      if(b && b.textContent && b.textContent.includes('Trexinity is thinking')){ messages.children[i].remove(); break; }
    }
    showLoading(false);
    appendMessage('bot', '⚠️ Network error: ' + (err && err.message ? err.message : String(err)));
    setStatus('Network error');
    console.error('fetch error', err);
  }
}

/* simple setStatus */
function setStatus(t){ const e=$('status'); if(e) e.textContent = t; }

/* clear chat */
function onClear(){ if(!confirm('Clear local history?')) return; STATE.history = []; saveLocalHistory(); $('messages').innerHTML = ''; setStatus('Cleared'); }

/* profile click -> open/hide login capsule */
function onProfileClick(){
  if(STATE.user){
    if(confirm(`Signed in as ${STATE.user.name || STATE.user.email}. Sign out?`)){
      STATE.user = null; $('profile').textContent = '👤'; $('profile').style.backgroundImage = ''; toggleLoginCapsule(true);
    }
  } else toggleLoginCapsule(true);
}
function toggleLoginCapsule(show){ const el = $('login-capsule'); el.style.display = show ? 'flex' : 'none'; }

/* --------- Google Identity (GSI) ------------- */
/* load GSI script if missing, then initialize */
function setupGSI(){
  if(!window.google || !google.accounts){
    const s = document.createElement('script'); s.src = "https://accounts.google.com/gsi/client"; s.async=true; s.defer=true;
    s.onload = initGSI; document.head.appendChild(s);
  } else initGSI();
}
function initGSI(){
  try{
    google.accounts.id.initialize({
      client_id: CONFIG.googleClientId,
      callback: handleCredentialResponse,
      ux_mode: 'popup'
    });
  }catch(e){ console.warn('GSI init error', e); }
}
function showGsiPrompt(){ if(window.google && google.accounts && google.accounts.id){ google.accounts.id.prompt(); } else alert('Google Sign-In not ready'); }

/* when Google returns id_token */
async function handleCredentialResponse(resp){
  if(!resp || !resp.credential){ console.warn('no credential'); return; }
  setStatus('Verifying login...');
  try{
    const r = await fetch(CONFIG.loginWorkerUrl + '?id_token=' + encodeURIComponent(resp.credential));
    if(!r.ok){ const t = await r.text().catch(()=>''); throw new Error('Login worker error: ' + (t || r.statusText)); }
    const profile = await r.json();
    if(profile && profile.sub){
      STATE.user = { name: profile.name, email: profile.email, picture: profile.picture, sub: profile.sub };
      $('profile').style.backgroundImage = `url(${profile.picture})`; $('profile').textContent = '';
      toggleLoginCapsule(false); setStatus('Signed in as ' + (profile.name || profile.email));
    } else throw new Error('Invalid profile');
  }catch(e){ console.error('login verify failed', e); alert('Sign-in failed: ' + (e.message || e)); setStatus('Login failed'); }
}

/* auto-init if script loaded after DOM */
if(document.readyState !== 'loading' && document.getElementById('trexinity-root')) init();
wiThLUNFcxjsfCEiUYvqQNjROs8Uk",
  assets: {
    logoBlack: "https://drive.google.com/uc?export=download&id=1Oq1vF434FQDwx-NUBy7sIIepo3fD523J",
    logoWhite: "https://drive.google.com/uc?export=download&id=1xgljbKtsoRgtyKBzEbQH1e_D4j8PZgCI",
    anim: "https://drive.google.com/uc?export=download&id=1PpcxbsZxYROKOjJYNylZ0cU-wpcILcwo"
  },
  taglines: [
    "The first ever knowledge chatbot of India",
    "The most safe and secure chat model",
    "The most fluid and polished interface",
    "The answers are provided by massive intelligences",
    "May fail; can make mistakes or show errors — WE ACCEPT OUR DEMERITS"
  ],
  autoShowLoginCapsule:true, // show login top-right briefly on load
  loginCapsuleDuration: 6000 // ms
};

let STATE = { user:null, history:[], loading:false };

/* small helpers */
const $ = id => document.getElementById(id);
const create = (tag, attrs={}, parent=null) => { const el=document.createElement(tag); for(const k in attrs){ if(k==='text') el.textContent=attrs[k]; else if(k==='html') el.innerHTML=attrs[k]; else el.setAttribute(k, attrs[k]); } if(parent) parent.appendChild(el); return el; };

/* mountApp: override defaults (called from Blogger config) */
window.mountApp = function(opts){
  if(!opts) return init();
  if(opts.workerUrl) CONFIG.workerUrl = opts.workerUrl;
  if(opts.loginWorkerUrl) CONFIG.loginWorkerUrl = opts.loginWorkerUrl;
  if(opts.googleClientId) CONFIG.googleClientId = opts.googleClientId;
  if(opts.youtubeApiKey) CONFIG.youtubeApiKey = opts.youtubeApiKey;
  if(opts.assets) CONFIG.assets = Object.assign(CONFIG.assets, opts.assets);
  if(opts.taglines) CONFIG.taglines = opts.taglines;
  if(opts.autoShowLoginCapsule !== undefined) CONFIG.autoShowLoginCapsule = opts.autoShowLoginCapsule;
  if(opts.loginCapsuleDuration) CONFIG.loginCapsuleDuration = opts.loginCapsuleDuration;
  init();
};

/* init: build UI and wire events */
function init(){
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', buildUI); }
  else buildUI();
}

/* build UI: inject HTML */
function buildUI(){
  const root = document.getElementById('trexinity-root');
  if(!root){ console.error('trexinity-root not found'); return; }

  root.innerHTML = `
    <div class="shell">
      <div class="left">
        <h2>Chats</h2>
        <div id="chat-list"></div>
        <hr/>
        <div style="font-size:13px;color:var(--muted);margin-top:8px">Saved locally or in Google (when signed in)</div>
      </div>

      <div class="right">
        <div class="topbar">
          <div class="logo-wrap">
            <div class="logo-img" id="logo-img" style="background-image:url('${CONFIG.assets.logoBlack}')"></div>
            <div class="logo-text">Trexinity</div>
            <div class="top-tabs" id="top-tabs"></div>
          </div>
          <div class="top-spacer">
            <div id="status" style="color:var(--muted);font-size:13px">Ready</div>
            <div id="profile" class="profile-pic" title="Sign in">👤</div>
          </div>
        </div>

        <div class="tagline" id="tagline">${CONFIG.taglines[0] || ''}</div>

        <div class="messages" id="messages" role="log" aria-live="polite"></div>

        <div class="input-row" id="input-row">
          <textarea id="input-field" class="input-field pill" placeholder="Ask one or more questions — Shift+Enter = newline"></textarea>
          <div class="controls">
            <button class="btn send" id="btn-send">Send</button>
            <button class="btn clear" id="btn-clear">Clear</button>
          </div>
        </div>
      </div>
    </div>

    <div class="login-capsule" id="login-capsule" style="display:none;">
      <div style="font-size:13px;color:var(--muted);margin-right:8px">Sign in with Google to sync chats</div>
      <button class="login-button" id="login-btn">Sign in</button>
    </div>

    <div class="loading-overlay" id="loading-overlay"><video id="loading-video" src="${CONFIG.assets.anim}" autoplay loop muted playsinline></video></div>

    <div class="trex-modal" id="trex-modal"><img id="trex-modal-img" alt="Preview"></div>
  `;

  // wire events
  document.getElementById('btn-send').addEventListener('click', onSend);
  document.getElementById('btn-clear').addEventListener('click', onClear);
  const txt = document.getElementById('input-field');
  txt.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }});
  txt.addEventListener('input', ()=>autoSize(txt));
  document.getElementById('profile').addEventListener('click', onProfileClick);
  document.getElementById('login-btn').addEventListener('click', showGsiPrompt);

  // initialize more bits
  startTaglines();
  loadLocalHistory();
  setupGSI();
  // show login capsule briefly if configured
  if(CONFIG.autoShowLoginCapsule) {
    showLoginCapsuleTemporarily(CONFIG.loginCapsuleDuration);
  }
  // small boot animation
  playLoading(true);
  setTimeout(()=>playLoading(false), 900);
}

/* autosize text area and toggle pill class */
function autoSize(el){
  el.style.height = 'auto';
  const h = Math.min(el.scrollHeight, 420);
  el.style.height = h + 'px';
  if(h > 60) el.classList.remove('pill'); else el.classList.add('pill');
}

/* taglines */
function startTaglines(){
  const el = $('tagline');
  let idx = 0;
  setInterval(()=>{
    idx = (idx + 1) % CONFIG.taglines.length;
    el.style.opacity = 0;
    setTimeout(()=>{ el.textContent = CONFIG.taglines[idx]; el.style.opacity = 1; }, 260);
  }, 5000);
}

/* show/hide login capsule temporarily */
function showLoginCapsuleTemporarily(ms = 6000){
  const cap = $('login-capsule');
  cap.style.display = 'flex';
  setTimeout(()=>{ cap.style.display = 'none'; }, ms);
}
function toggleLoginCapsule(show){ $('login-capsule').style.display = show ? 'flex' : 'none'; }

/* loading (logo animation overlay) */
function playLoading(show){
  const wrap = $('loading-overlay');
  if(!wrap) return;
  wrap.style.display = show ? 'flex' : 'none';
  const v = $('loading-video');
  if(v && show) v.play().catch(()=>{});
}

/* DOM helper */
function $(id){ return document.getElementById(id); }

/* local history */
function loadLocalHistory(){
  try{
    const arr = JSON.parse(localStorage.getItem('trexinity_history_v2')||'[]');
    STATE.history = arr;
    STATE.history.forEach(m => appendToDom(m.role, m.text, m.image, m.videos, m.sources));
  }catch(e){ STATE.history=[]; }
}
function saveLocalHistory(){ try{ localStorage.setItem('trexinity_history_v2', JSON.stringify(STATE.history)); }catch(e){} }

/* append message and scroll */
function appendToDom(role, text, image=null, videos=null, sources=[]){
  const messages = $('messages');
  const row = create('div',{class:'row ' + (role==='user'?'user':'bot')}, messages);
  const bubble = create('div',{class:'bubble ' + (role==='user'?'user':'bot'), html:escapeHtml(text)}, row);
  if(image){
    const img = create('img',{src:image,class:'msg-img'}, bubble);
    img.addEventListener('click', ()=>openModal(image));
  }
  if(Array.isArray(videos) && videos.length){
    videos.forEach(v=>{
      const iframe = create('iframe',{class:'msg-video',width:420,height:236,src:v.url,allow:'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'}, bubble);
    });
  }
  if(sources && sources.length){
    create('div',{class:'msg-sources', text:'Sources: ' + sources.join(', ')}, bubble);
  }
  messages.scrollTop = messages.scrollHeight;
}

/* create util */
function create(tag, attrs={}, parent){
  const el = document.createElement(tag);
  for(const k in attrs){
    if(k==='text') el.textContent = attrs[k];
    else if(k==='html') el.innerHTML = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  if(parent) parent.appendChild(el);
  return el;
}
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function setStatus(t){ const e=$('status'); if(e) e.textContent=t; }

/* append typing indicator */
function appendTyping(){
  const messages = $('messages');
  const row = create('div',{class:'row bot'}, messages);
  create('div',{class:'bubble bot', html:'<span class="typing"><span class="dots"><span></span><span></span><span></span></span> Trexinity is thinking...</span>'}, row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

/* send flow to main worker */
async function onSend(){
  const txt = $('input-field');
  const raw = txt.value.trim();
  if(!raw) return;
  appendToDom('user', raw);
  STATE.history.push({role:'user', text:raw, ts:Date.now()});
  saveLocalHistory();
  txt.value=''; autoSize(txt);

  const typingNode = appendTyping();
  playLoading(true);
  setStatus('Thinking...');

  // robust fetch with friendly messages
  try{
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 30000);
    const resp = await fetch(CONFIG.workerUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ questions: [ raw ] }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if(!resp.ok){
      const txtErr = await resp.text().catch(()=> '');
      typingNode.remove(); playLoading(false);
      appendToDom('bot', `⚠️ Server error ${resp.status}: ${txtErr ? txtErr.slice(0,800) : resp.statusText}`);
      setStatus('Server error');
      return;
    }
    const text = await resp.text();
    let data;
    try{ data = JSON.parse(text); } catch(e){
      typingNode.remove(); playLoading(false);
      appendToDom('bot', `⚠️ Server error: Invalid JSON from worker. Response (truncated): ${text ? text.slice(0,800) : 'empty'}`);
      setStatus('Server error');
      return;
    }

    typingNode.remove(); playLoading(false);
    if(data.error){
      appendToDom('bot','⚠️ Server error: ' + (data.error || 'unknown'));
      setStatus('Server error');
      return;
    }

    const answers = Array.isArray(data.answers) ? data.answers : (data.answer ? [{answer: data.answer, image: data.image || null, videos: data.videos || []}] : []);
    if(answers.length===0){
      appendToDom('bot','No answer found.');
      STATE.history.push({role:'bot', text:'No answer found.'});
      saveLocalHistory();
      setStatus('Done');
      return;
    }
    for(const ans of answers){
      const textAns = ans.answer || (ans.text || '');
      appendToDom('bot', textAns, ans.image || null, ans.videos || [], ans.sources || []);
      STATE.history.push({role:'bot', text:textAns, image:ans.image||null, videos:ans.videos||[], sources:ans.sources||[], ts:Date.now()});
      saveLocalHistory();
    }
    setStatus('Done');
  }catch(err){
    typingNode.remove();
    playLoading(false);
    const msg = err.name === 'AbortError' ? 'Request timed out' : (err.message || String(err));
    appendToDom('bot', '⚠️ Network error: ' + msg);
    setStatus('Network error');
    console.error('fetch error', err);
  }
}

/* clear chat */
function onClear(){
  if(!confirm('Clear chat history?')) return;
  STATE.history = []; saveLocalHistory(); $('messages').innerHTML=''; setStatus('Cleared');
}

/* profile click -> show login capsule */
function onProfileClick(){
  if(STATE.user){
    if(confirm('Signed in as ' + STATE.user.name + '. Sign out?')){
      STATE.user = null;
      $('profile').textContent='👤'; $('profile').style.backgroundImage='';
      toggleLoginCapsule(true);
    }
  } else toggleLoginCapsule(true);
}

/* ---------------- Google Identity (GSI) integration ---------------- */
function setupGSI(){
  // If google accounts script not loaded, dynamically load
  if(!window.google || !google.accounts){
    const s = document.createElement('script');
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = ()=>initGSIClient();
    document.head.appendChild(s);
  } else initGSIClient();
}

function initGSIClient(){
  try{
    google.accounts.id.initialize({
      client_id: CONFIG.googleClientId,
      callback: handleCredentialResponse,
      ux_mode: 'popup'
    });
    // we won't render the default button; we'll call prompt() or use the one-tap when user clicks our capsule button
  }catch(e){ console.warn('GSI init error', e); }
}

/* show GSI prompt (called from login capsule button) */
function showGsiPrompt(){
  if(window.google && google.accounts && google.accounts.id){
    google.accounts.id.prompt(); // shows either one-tap or button depending on UA
  } else alert('Google Sign-In not loaded');
}

/* handle credential response from Google (id_token) */
async function handleCredentialResponse(response){
  if(!response || !response.credential){ console.warn('no credential'); return; }
  setStatus('Verifying login...');
  try{
    // Send id_token to login worker for verification (POST JSON)
    const r = await fetch(CONFIG.loginWorkerUrl + '?id_token=' + encodeURIComponent(response.credential));
    if(!r.ok){
      const txt = await r.text().catch(()=>'');
      throw new Error('Login worker error: ' + (txt || r.statusText));
    }
    const profile = await r.json();
    if(profile && profile.sub){
      STATE.user = { name: profile.name, email: profile.email, picture: profile.picture, sub: profile.sub };
      const p = $('profile');
      p.style.backgroundImage = `url(${profile.picture})`;
      p.textContent = '';
      toggleLoginCapsule(false);
      setStatus('Signed in as ' + (profile.name||profile.email));
    } else {
      throw new Error('Invalid profile from login worker');
    }
  }catch(e){
    console.error('GSI verify failed', e);
    setStatus('Login failed');
    alert('Login failed: ' + (e.message || e));
  }
}

/* show/hide login capsule */
function toggleLoginCapsule(show){
  const el = $('login-capsule');
  el.style.display = show ? 'flex' : 'none';
}

/* show GSI prompt when login capsule button clicked */
document.addEventListener('click', function(e){
  if(e.target && e.target.id === 'login-btn') showGsiPrompt();
});

/* Initialization: mount automatically if script loaded after DOM */
if(document.readyState !== 'loading' && document.getElementById('trexinity-root')) init();

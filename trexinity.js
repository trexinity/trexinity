/* trexinity.js — frontend (polished, GSI, liquid glass, autosize) */

/* Default config — overridden by mountApp() call from Blogger */
const CONFIG = {
  workerUrl: "https://trexinity.shauryaagarwal-id.workers.dev/",
  loginWorkerUrl: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
  googleClientId: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com",
  youtubeApiKey: "AIzaSyDPf8wiThLUNFcxjsfCEiUYvqQNjROs8Uk",
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

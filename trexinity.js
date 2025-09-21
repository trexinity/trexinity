/* trexinity.js — Trexinity frontend (mounts UI, login, worker calls, animations) */

/* CONFIG — these will be overridden in Blogger mount if provided */
const CONFIG = {
  WORKER_URL: "https://trexinity.shauryaagarwal-id.workers.dev/",
  LOGIN_WORKER_URL: "https://trexinity-login.shauryaagarwal-id.workers.dev/",
  GOOGLE_CLIENT_ID: "1064519564013-te1h9ad7eutj2avr9m0s4kf05p2c57bj.apps.googleusercontent.com",
  YOUTUBE_KEY: "AIzaSyDPf8wiThLUNFcxjsfCEiUYvqQNjROs8Uk",
  ASSETS: {
    logoBlack: "https://drive.google.com/uc?export=download&id=1Oq1vF434FQDwx-NUBy7sIIepo3fD523J",
    logoWhite: "https://drive.google.com/uc?export=download&id=1xgljbKtsoRgtyKBzEbQH1e_D4j8PZgCI",
    anim: "https://drive.google.com/uc?export=download&id=1PpcxbsZxYROKOjJYNylZ0cU-wpcILcwo"
  },
  TAGLINES: [
    "<the first ever knowledge chatbot of India>",
    "<the most safe and secure chat model>",
    "<the most fluid and polished interface>",
    "<the answers are provided by massive intelligences>",
    "<the best answering model for research works>",
    "<may fail, can make mistakes or show any error, WE ACCEPT OUR DEMERITS>"
  ]
};

/* runtime state */
let STATE = { user: null, history: [], isLoading: false };

/* small helpers */
const $ = id => document.getElementById(id);
const create = (t, attrs={}, parent=null) => { const e=document.createElement(t); for(let k in attrs){ if(k==='text') e.textContent=attrs[k]; else if(k==='html') e.innerHTML=attrs[k]; else e.setAttribute(k, attrs[k]); } if(parent) parent.appendChild(e); return e; };

/* mountApp exposed to Blogger config: overrides CONFIG when provided */
function mountApp(opts){
  if(opts) Object.assign(CONFIG, opts);
  if(!document.readyState || document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', _mount); }
  else _mount();
}

/* core mount */
function _mount(){
  const root = $('trexinity-root');
  if(!root){ console.error('trexinity-root not found'); return; }

  root.innerHTML = `
    <div class="shell">
      <div class="left">
        <h2>Chats</h2>
        <div id="chat-list"></div>
        <hr/>
        <div style="font-size:13px;color:var(--muted);margin-top:8px">History saved locally or in Google Drive (when signed in)</div>
      </div>

      <div class="right">
        <div class="topbar">
          <div class="logo-wrap">
            <div class="logo-img" id="logo-img" style="background-image:url('${CONFIG.ASSETS.logoBlack}')"></div>
            <div class="logo-text">Trexinity</div>
            <div class="top-tabs" id="top-tabs"></div>
          </div>
          <div class="top-spacer">
            <div id="status" style="color:var(--muted);font-size:13px">Ready</div>
            <div id="profile" class="profile-pic" title="Sign in"></div>
          </div>
        </div>

        <div class="tagline" id="tagline">${CONFIG.TAGLINES[0] || ''}</div>
        <div class="messages" id="messages" role="log" aria-live="polite"></div>

        <div class="input-row" id="input-row">
          <textarea id="input-field" class="input-field" placeholder="Ask one or more questions — each on its own line. Shift+Enter for newline."></textarea>
          <div class="controls">
            <button class="btn send" id="btn-send">Send</button>
            <button class="btn clear" id="btn-clear">Clear</button>
          </div>
        </div>
      </div>
    </div>

    <div class="login-capsule" id="login-capsule">
      <div style="font-size:13px;color:var(--muted);margin-right:10px">Sign in with Google to sync chats</div>
      <button class="login-btn" id="login-capsule-btn">Sign in</button>
    </div>

    <div class="loading-wrap" id="loading-wrap"><video id="loading-video" src="${CONFIG.ASSETS.anim}" autoplay loop muted playsinline></video></div>

    <div class="trex-modal" id="trex-modal"><img id="trex-modal-img" alt="Preview"></div>
  `;

  // wire UI
  document.getElementById('btn-send').addEventListener('click', onSend);
  document.getElementById('btn-clear').addEventListener('click', onClear);
  const txt = document.getElementById('input-field');
  txt.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }});
  txt.addEventListener('input', ()=>autoSize(txt));

  document.getElementById('profile').addEventListener('click', onProfileClick);
  document.getElementById('login-capsule-btn').addEventListener('click', showGsiPrompt);

  // tagline slider
  startTaglines();

  // load history
  loadLocalHistory();

  // init google identity
  loadGoogleIdentity();

  // play boot animation briefly
  playLoading( true );
  setTimeout(()=>playLoading(false), 900);
}

/* autosize textarea */
function autoSize(el){
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 420) + 'px';
}

/* taglines */
function startTaglines(){
  const wraps = CONFIG.TAGLINES;
  let i=0;
  const el = $('tagline');
  setInterval(()=>{ i=(i+1)%wraps.length; el.style.opacity=0; setTimeout(()=>{ el.textContent = wraps[i]; el.style.opacity=1; }, 260); }, 5000);
}

/* loading (logo video) on/off */
function playLoading(flag){
  const w = $('loading-wrap');
  if(!w) return;
  w.style.display = flag ? 'block' : 'none';
  const v = $('loading-video');
  if(v && flag) v.play().catch(()=>{});
}

/* history */
function loadLocalHistory(){
  try{
    const raw = localStorage.getItem('trexinity_history_v1') || '[]';
    STATE.history = JSON.parse(raw);
    renderHistory();
  }catch(e){ STATE.history = []; }
}
function saveLocalHistory(){ try{ localStorage.setItem('trexinity_history_v1', JSON.stringify(STATE.history)); }catch(e){} }
function renderHistory(){
  const messagesEl = $('messages');
  messagesEl.innerHTML = '';
  STATE.history.forEach(m => appendToDOM(m.role, m.text, m.image, m.videos, m.sources));
}

/* append message to DOM */
function appendToDOM(role, text, image=null, videos=null, sources=[]){
  const messagesEl = $('messages');
  const row = create('div',{class:'row '+(role==='user'?'user':'bot')}, messagesEl);
  const bubble = create('div',{class:'bubble '+(role==='user'?'user':'bot'), html:escapeHtml(text)}, row);

  if(image){
    const img = create('img',{src:image,class:'msg-img'}, bubble);
    img.addEventListener('click', ()=>openModal(image));
  }
  if(videos && videos.length){
    videos.forEach(v=>{
      const iframe = create('iframe',{class:'msg-video',width:420,height:236,src:v.url,allow:'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'}, bubble);
    });
  }
  if(sources && sources.length){
    create('div',{class:'msg-sources', text:'Sources: '+sources.join(', ')}, bubble);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* modal */
function openModal(src){
  const modal = $('trex-modal');
  $('trex-modal-img').src = src;
  modal.classList.add('open');
  modal.addEventListener('click', ()=>modal.classList.remove('open'), {once:true});
}

/* escape HTML */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* send flow */
async function onSend(){
  const raw = $('input-field').value.trim();
  if(!raw) return;
  // append user
  appendToDOM('user', raw);
  STATE.history.push({role:'user', text:raw, ts:Date.now()});
  saveLocalHistory();
  $('input-field').value = ''; autoSize($('input-field'));

  // show thinking
  const typingNode = appendTyping();
  playLoading(true);
  setStatus('Thinking...');

  try{
    const payload = { questions: [ raw ] };
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), 30000);
    const res = await fetch(CONFIG.WORKER_URL, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: controller.signal
    });
    clearTimeout(t);
    const text = await res.text();
    let data;
    try{ data = JSON.parse(text); } catch(e){
      // worker returned invalid JSON — show raw text for debug and friendly message
      typingNode.remove();
      playLoading(false);
      appendToDOM('bot', '⚠️ Server error: Invalid JSON from worker. Response: ' + (text ? (text.slice(0,800)) : 'empty'));
      setStatus('Server error');
      return;
    }

    // handle structured response
    typingNode.remove();
    playLoading(false);
    if(data.error){
      appendToDOM('bot', '⚠️ Server error: ' + (data.error || 'unknown'));
      setStatus('Server error');
      return;
    }
    const answers = Array.isArray(data.answers) ? data.answers : (data.answer ? [{answer: data.answer, image: data.image || null, videos: data.videos || [], sources: data.sources || []}] : []);
    if(answers.length === 0){
      appendToDOM('bot', 'No answer found.');
      setStatus('Done');
      STATE.history.push({role:'bot', text:'No answer found.'});
      saveLocalHistory();
      return;
    }
    for(const ans of answers){
      const textAns = ans.answer || (ans.text || '');
      appendToDOM('bot', textAns, ans.image || null, ans.videos || [], ans.sources || []);
      STATE.history.push({role:'bot', text:textAns, image:ans.image||null, videos: ans.videos||[], sources: ans.sources||[], ts: Date.now()});
      saveLocalHistory();
    }
    setStatus('Done');
  }catch(err){
    typingNode.remove();
    playLoading(false);
    appendToDOM('bot', '⚠️ Network error: ' + (err && err.message ? err.message : String(err)));
    setStatus('Network error');
  }
}

/* append temporary typing node */
function appendTyping(){
  const messagesEl = $('messages');
  const row = create('div',{class:'row bot'}, messagesEl);
  const bubble = create('div',{class:'bubble bot', html:'<span class="typing"><span class="dots"><span></span><span></span><span></span></span> Trexinity is thinking...</span>'}, row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}

function setStatus(s){ const el = $('status'); if(el) el.textContent = s; }

/* clear */
function onClear(){
  if(!confirm('Clear local chat history?')) return;
  STATE.history = [];
  saveLocalHistory();
  $('messages').innerHTML = '';
  setStatus('Cleared');
}

/* profile click */
function onProfileClick(){
  if(STATE.user){
    if(confirm('Signed in as ' + STATE.user.name + '. Sign out?')){
      STATE.user = null;
      document.getElementById('profile').textContent = '👤';
      toggleLoginCapsule(true);
    }
  } else {
    toggleLoginCapsule(true);
  }
}

function toggleLoginCapsule(show){
  const el = $('login-capsule');
  el.style.display = show ? 'flex' : 'none';
}

/* Google Identity integration (GSI) */
function loadGoogleIdentity(){
  // initialize GSI if available
  if(window.google && google.accounts && google.accounts.id){
    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      ux_mode: 'popup'
    });
    // place a small invisible button inside the capsule to trigger one-tap / popup
    // we will call google.accounts.id.prompt() when user clicks capsule button
  }
}

/* show the Google One Tap / prompt */
function showGsiPrompt(){
  if(window.google && google.accounts && google.accounts.id){
    google.accounts.id.prompt();
    // also explicitly open popup for sign-in
    // But we prefer one-tap; the callback will provide id_token
  } else {
    alert('Google Sign-In not ready yet.');
  }
}

/* handle credential token returned by Google */
async function handleCredentialResponse(resp){
  if(!resp || !resp.credential) { console.warn('No credential'); return; }
  // send id_token to login worker to verify and get profile
  try{
    const verifyUrl = CONFIG.LOGIN_WORKER_URL + '?id_token=' + encodeURIComponent(resp.credential);
    const r = await fetch(verifyUrl);
    if(!r.ok){ throw new Error('Login worker error'); }
    const profile = await r.json();
    if(profile && profile.sub){
      STATE.user = { name: profile.name, email: profile.email, picture: profile.picture, sub: profile.sub };
      const p = $('profile');
      p.style.backgroundImage = `url(${profile.picture})`;
      p.textContent = '';
      toggleLoginCapsule(false);
      setStatus('Signed in as ' + (profile.name || profile.email));
      // optional: request Drive appData scope for saving history — not implemented by default
    } else {
      alert('Login verification failed');
    }
  }catch(e){
    console.error('verify error', e); alert('Sign-in failed: '+(e.message||e));
  }
}

/* utility to create DOM nodes */
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

/* export mountApp so Blogger template can call mountApp({ ... }) */
window.mountApp = function(cfg){
  if(cfg){
    if(cfg.workerUrl) CONFIG.WORKER_URL = cfg.workerUrl;
    if(cfg.loginWorkerUrl) CONFIG.LOGIN_WORKER_URL = cfg.loginWorkerUrl;
    if(cfg.googleClientId) CONFIG.GOOGLE_CLIENT_ID = cfg.googleClientId;
    if(cfg.youtubeApiKey) CONFIG.YOUTUBE_KEY = cfg.youtubeApiKey;
    if(cfg.assets) CONFIG.ASSETS = Object.assign(CONFIG.ASSETS, cfg.assets);
    if(cfg.taglines) CONFIG.TAGLINES = cfg.taglines;
  }
  mountApp(); // mount now
};

/* ready: if script loaded after DOM, mount automatically */
if(document.readyState !== 'loading' && document.getElementById('trexinity-root')) mountApp();

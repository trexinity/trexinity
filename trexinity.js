(() => {
  const MAIN_WORKER = "https://trexinity.shauryaagarwal-id.workers.dev/";
  const LOGIN_WORKER = "https://trexinity-login.shauryaagarwal-id.workers.dev/";
  const YOUTUBE_KEY = "AIzaSyDPf8wiThLUNFcxjsfCEiUYvqQNjROs8Uk";

  const TAGLINES = [
    "The first ever knowledge chatbot of India",
    "The most safe and secure chat model",
    "The most fluid and polished interface",
    "The answers are provided by massive intelligences",
    "It may fail, can make mistakes or show errors — WE ACCEPT OUR DEMERITS"
  ];

  const LOGOS = {
    black: "https://drive.google.com/uc?id=1Oq1vF434FQDwx-NUBy7sIIepo3fD523J",
    white: "https://drive.google.com/uc?id=1xgljbKtsoRgtyKBzEbQH1e_D4j8PZ",
    blackText: "https://drive.google.com/uc?id=11bAQhNmmSUqf1Mu9X66Xo1CiKNa92cVt",
    whiteText: "https://drive.google.com/uc?id=1UYyXlOVh4CiH_J1ce00Or-YVyEpq6BK3",
    animationVideo: "https://drive.google.com/uc?id=1PpcxbsZxYROKOjJYNylZ0cU-wpcILcwo"
  };

  // Utility functions for DOM creation
  function create(tag, attrs={}, parent=null){
    const el = document.createElement(tag);
    Object.keys(attrs).forEach(k=>{
      if(k==="text") el.textContent = attrs[k];
      else if(k==="html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    if(parent) parent.appendChild(el);
    return el;
  }

  // ---------- Mount App ----------
  function mountApp() {
    const mount = document.getElementById("trexinity-root");
    if(!mount) return console.error("Mount not found");

    mount.innerHTML = `
      <div class="trex-shell">
        <div class="trex-header">
          <div id="trex-logo-container">
            <img src="${LOGOS.black}" id="trex-logo" style="width:60px;border-radius:12px;">
          </div>
          <div class="trex-title">Trexinity</div>
          <div id="trex-profile" style="margin-left:auto;cursor:pointer;">👤</div>
          <div class="trex-settings">⚙️</div>
        </div>

        <div class="trex-tagline" id="trex-tagline"></div>
        <div class="trex-messages" id="trex_messages"></div>

        <div class="trex-input-row" id="trex-input-row">
          <textarea id="trex-text" class="trex-text" placeholder="Ask your question..."></textarea>
          <div class="trex-controls">
            <button class="trex-btn trex-send" id="trex_send">Send</button>
            <button class="trex-btn trex-clear" id="trex_clear">Clear</button>
          </div>
          <div class="trex-options">
            <label><input type="checkbox" id="moreImages"> More Images</label>
            <label><input type="checkbox" id="moreVideos"> More Videos</label>
          </div>
        </div>
      </div>
    `;

    // Initialize tagline animation
    let index = 0;
    const taglineEl = document.getElementById("trex-tagline");
    taglineEl.textContent = TAGLINES[index];
    setInterval(()=>{
      index = (index+1) % TAGLINES.length;
      taglineEl.textContent = TAGLINES[index];
    }, 5000);

    // Wire buttons
    document.getElementById("trex_send").addEventListener("click", onSend);
    document.getElementById("trex_clear").addEventListener("click", ()=>{
      localStorage.removeItem("trexinity_history_v1");
      document.getElementById("trex_messages").innerHTML = "";
    });

    // Google login popup logic here
    initGoogleLogin();

    // Load history
    renderHistory();
  }

  // ---------- Google Login ----------
  function initGoogleLogin(){
    // logic to fetch profile photo via LOGIN_WORKER
  }

  // ---------- Chat Logic ----------
  async function onSend(){
    const textarea = document.getElementById("trex-text");
    const query = textarea.value.trim();
    if(!query) return;
    appendMessage("user", query);
    textarea.value = "";
    await fetchMainWorker(query);
  }

  async function fetchMainWorker(query){
    const typingNode = appendMessage("bot", "Trexinity is thinking...", true);
    try{
      const resp = await fetch(MAIN_WORKER,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ questions:[query] })
      });
      const data = await resp.json();
      typingNode.remove();
      if(data.answers){
        data.answers.forEach(ans=>{
          appendMessage("bot", ans.answer || "No answer", ans.image, ans.sources);
        });
      }
    }catch(e){
      typingNode.remove();
      appendMessage("bot", "⚠️ Network error or worker error");
    }
  }

  function appendMessage(role, text, image=null, sources=[]){
    const container = document.getElementById("trex_messages");
    const row = create("div",{class:`trex-row ${role}`}, container);
    const bubble = create("div",{class:`trex-bubble ${role}`, text:text}, row);
    if(image) create("img",{src:image,class:"trex-img"}, bubble);
    if(sources.length>0) create("div",{class:"trex-srcs", text:"Sources: "+sources.join(", ")}, bubble);
    container.scrollTop = container.scrollHeight;
    return row;
  }

  // ---------- History ----------
  function renderHistory(){
    const hist = JSON.parse(localStorage.getItem("trexinity_history_v1")||"[]");
    hist.forEach(msg=>appendMessage(msg.role,msg.text,msg.image||null,msg.sources||[]));
  }

  // ---------- Init ----------
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", mountApp);
  else mountApp();

})();

/* trexinity.js — Trexinity Chat frontend (vanilla JS) */
(() => {
  const WORKER_URL = "https://trexinity.shauryaagarwal-id.workers.dev/"; // your worker
  const HISTORY_KEY = "trexinity_history_v1";
  const FETCH_TIMEOUT = 30000;

  function mountApp(mountId="trexinity-root") {
    const mount=document.getElementById(mountId);
    if(!mount){ console.error("mount not found"); return; }
    mount.innerHTML=`
      <div class="trex-shell" role="application" aria-label="Trexinity chat">
        <div class="trex-header">
          <div class="trex-logo">T</div>
          <div class="trex-title">Trexinity</div>
          <div class="trex-status" id="trex_status">Ready</div>
        </div>
        <div class="trex-intro">Trexinity is an AI assistant for tech & product questions. Try: "Nothing Phone 1 specs".</div>
        <div class="trex-ads" id="trex_ads_top">[Ad placeholder — paste AdSense here after approval]</div>
        <div class="trex-messages" id="trex_messages" role="log" aria-live="polite"></div>
        <div class="trex-input-row">
          <textarea id="trex_text" class="trex-text" placeholder="Ask one or more questions — each on its own line. Shift+Enter for newline."></textarea>
          <div class="trex-controls">
            <button class="trex-btn trex-send" id="trex_send">Send</button>
            <button class="trex-btn trex-clear" id="trex_clear">Clear</button>
          </div>
        </div>
        <div class="trex-ads" id="trex_ads_bottom">[Footer Ad placeholder]</div>
      </div>
      <div class="trex-modal" id="trex_modal"><img id="trex_modal_img" alt="Preview"></div>
    `;

    document.getElementById("trex_send").addEventListener("click", onSend);
    document.getElementById("trex_clear").addEventListener("click", onClear);
    document.getElementById("trex_text").addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); onSend(); }
    });

    renderHistory();
  }

  function loadHistory(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]"); }catch(e){ return []; } }
  function saveHistory(h){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }catch(e){} }

  function appendMessage(role, text, image=null, sources=[]) {
    const container=document.getElementById("trex_messages");
    const row=document.createElement("div"); row.className=`trex-row ${role==='user'?'user':'bot'}`;
    const bubble=document.createElement("div"); bubble.className=`trex-bubble ${role==='user'?'user':'bot'}`;
    bubble.textContent = text || "";
    if(image){
      bubble.appendChild(document.createElement("br"));
      const img=document.createElement("img"); img.src=image; img.className="trex-img"; img.alt="Image";
      img.addEventListener("click", ()=> openModal(image));
      bubble.appendChild(img);
    }
    if(Array.isArray(sources) && sources.length){
      const s=document.createElement("div"); s.className="trex-srcs"; s.textContent="Sources: "+sources.join(", ");
      bubble.appendChild(s);
    }
    row.appendChild(bubble); container.appendChild(row); container.scrollTop = container.scrollHeight;
  }

  function openModal(src){ const modal=document.getElementById("trex_modal"); document.getElementById("trex_modal_img").src=src; modal.classList.add("open");
    modal.addEventListener("click", ()=> modal.classList.remove("open"), { once:true });
  }

  function showTyping(){
    const container=document.getElementById("trex_messages");
    const node=document.createElement("div"); node.className="trex-row bot typing-node";
    node.innerHTML = `<div class="trex-bubble bot"><span class="trex-typing"><span class="trex-dots"><span></span><span></span><span></span></span> Trexinity is thinking...</span></div>`;
    container.appendChild(node); container.scrollTop = container.scrollHeight; return node;
  }

  async function onSend(){
    const textEl=document.getElementById("trex_text");
    const raw = textEl.value.trim();
    if(!raw) return;
    const questions = raw.split("\n").map(s=>s.trim()).filter(Boolean);
    appendMessage("user", questions.join("\n"));
    const hist = loadHistory(); hist.push({ role:"user", text:questions.join("\n"), t:Date.now() }); saveHistory(hist);
    textEl.value = "";
    const typingNode = showTyping();
    document.getElementById("trex_status").textContent = "Thinking...";
    document.getElementById("trex_send").disabled = true;

    // fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(()=> controller.abort(), FETCH_TIMEOUT);
    try {
      const r = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ questions }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const rawResp = await r.text(); // read body once
      let data;
      try { data = JSON.parse(rawResp); } catch(e){
        typingNode.remove();
        appendMessage("bot", "⚠️ Invalid server response: " + rawResp);
        document.getElementById("trex_status").textContent = "Server error";
        return;
      }
      if(data.error){ typingNode.remove(); appendMessage("bot", "⚠️ Server error: "+(data.error||"unknown")); document.getElementById("trex_status").textContent="Server error"; return; }
      typingNode.remove();
      const answers = Array.isArray(data.answers) ? data.answers : [];
      for(const a of answers){
        appendMessage("bot", a.answer||"No answer", a.image||null, Array.isArray(a.sources)?a.sources:[]);
        const hist2 = loadHistory(); hist2.push({ role:"bot", text: a.answer||"", image: a.image||null, sources: a.sources||[], t:Date.now() }); saveHistory(hist2);
      }
      document.getElementById("trex_status").textContent = "Done";
    } catch (err){
      typingNode.remove();
      const msg = err.name==="AbortError" ? "Request timed out" : "Network error: "+(err.message||err);
      appendMessage("bot", "⚠️ " + msg);
      document.getElementById("trex_status").textContent = "Network error";
      console.error("Trexinity error", err);
    } finally {
      document.getElementById("trex_send").disabled = false;
      clearTimeout(timeout);
    }
  }

  function onClear(){ if(!confirm("Clear chat history?")) return; localStorage.removeItem(HISTORY_KEY); document.getElementById("trex_messages").innerHTML=""; }

  function renderHistory(){ const h = loadHistory()||[]; for(const m of h){ appendMessage(m.role, m.text, m.image||null, m.sources||[]); } document.getElementById("trex_messages").scrollTop = document.getElementById("trex_messages").scrollHeight; }

  // init
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ()=>mountApp());
  else mountApp();
})();

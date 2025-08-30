(() => {
  const WORKER_URL = "https://trexinity.shauryaagarwal-id.workers.dev/"; // your Worker endpoint
  const HISTORY_KEY = "trexinity_history_v1";

  function mountApp(mountId="trexinity-root") {
    const mount=document.getElementById(mountId);
    mount.innerHTML=`
      <div class="trex-shell">
        <div class="trex-header">
          <div class="trex-logo">T</div>
          <div class="trex-title">Trexinity</div>
          <div class="trex-status" id="trex_status">Ready</div>
        </div>
        <div class="trex-intro">Ask me tech/product questions. Example: "Nothing Phone 1 specs".</div>
        <div class="trex-ads" id="trex_ads_top">[AdSense top here]</div>
        <div class="trex-messages" id="trex_messages"></div>
        <div class="trex-input-row">
          <textarea id="trex_text" class="trex-text" placeholder="Ask multiple questions (one per line)..."></textarea>
          <div class="trex-controls">
            <button class="trex-btn trex-send" id="trex_send">Send</button>
            <button class="trex-btn trex-clear" id="trex_clear">Clear</button>
          </div>
        </div>
        <div class="trex-ads" id="trex_ads_bottom">[AdSense footer here]</div>
      </div>
      <div class="trex-modal" id="trex_modal"><img id="trex_modal_img"></div>
    `;

    document.getElementById("trex_send").addEventListener("click", onSend);
    document.getElementById("trex_clear").addEventListener("click", onClear);
    renderHistory();
  }

  function loadHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");}catch(e){return[];}}
  function saveHistory(h){localStorage.setItem(HISTORY_KEY,JSON.stringify(h));}

  function appendMessage(role,text,image=null,sources=[]) {
    const container=document.getElementById("trex_messages");
    const row=document.createElement("div");row.className=`trex-row ${role}`;
    const bubble=document.createElement("div");bubble.className=`trex-bubble ${role}`;
    bubble.textContent=text;
    if(image){const img=document.createElement("img");img.src=image;img.className="trex-img";bubble.appendChild(document.createElement("br"));bubble.appendChild(img);}
    if(sources.length){const src=document.createElement("div");src.className="trex-srcs";src.textContent="Sources: "+sources.join(", ");bubble.appendChild(src);}
    row.appendChild(bubble);container.appendChild(row);container.scrollTop=container.scrollHeight;
  }

  async function onSend(){
    const textEl=document.getElementById("trex_text");
    const qs=textEl.value.trim().split("\n").filter(Boolean); if(!qs.length)return;
    appendMessage("user",qs.join("\n"));
    saveHistory([...loadHistory(),{role:"user",text:qs.join("\n")}]);
    textEl.value="";
    const typing=document.createElement("div");typing.className="trex-row bot";typing.innerHTML=`<div class="trex-bubble bot">…Thinking</div>`;document.getElementById("trex_messages").appendChild(typing);
    try{
      const resp=await fetch(WORKER_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({questions:qs})});
      const data=await resp.json();
      typing.remove();
      (data.answers||[]).forEach(ans=>{
        appendMessage("bot",ans.answer||"No answer",ans.image||null,ans.sources||[]);
        saveHistory([...loadHistory(),{role:"bot",text:ans.answer}]);
      });
    }catch(e){typing.remove();appendMessage("bot","⚠️ Error: "+e.message);}
  }

  function onClear(){localStorage.removeItem(HISTORY_KEY);document.getElementById("trex_messages").innerHTML="";}
  function renderHistory(){loadHistory().forEach(m=>appendMessage(m.role,m.text,m.image||null,m.sources||[]));}

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>mountApp());
  else mountApp();
})();

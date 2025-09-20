const MAIN_WORKER = "https://trexinity.shauryaagarwal-id.workers.dev/";
const LOGIN_WORKER = "https://trexinity-login.shauryaagarwal-id.workers.dev/";

let isLoggedIn = false;
let userProfile = null;

document.addEventListener("DOMContentLoaded", () => {
  mountUI();
  setupLogin();
});

function mountUI() {
  const root = document.getElementById("trexinity-root");
  root.innerHTML = `
    <div id="trex-sidebar"></div>
    <div id="trex-chat-area">
      <div id="trex-header">
        <div id="trex-logo"></div>
        <div id="trex-settings">⚙️</div>
      </div>
      <div id="trex-tagline"></div>
      <div id="trex-messages"></div>
      <div id="trex-input-container">
        <textarea id="trex-input" placeholder="Ask anything..."></textarea>
        <button id="trex-send">Send</button>
      </div>
      <div id="trex-login-capsule">Login with Google</div>
      <div id="trex-loading"><video autoplay loop muted src="https://drive.google.com/uc?export=view&id=1PpcxbsZxYROKOjJYNylZ0cU-wpcILcwo"></video></div>
    </div>
  `;

  document.getElementById("trex-send").addEventListener("click", sendMessage);
  document.getElementById("trex-input").addEventListener("keydown", e => {
    if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}

function setupLogin() {
  const capsule = document.getElementById("trex-login-capsule");
  capsule.style.display = "flex";

  capsule.addEventListener("click", async () => {
    const res = await fetch(LOGIN_WORKER);
    const data = await res.json();
    if(data.loggedIn){
      isLoggedIn = true;
      userProfile = data.profile;
      capsule.style.display = "none";
      alert(`Welcome ${userProfile.name}`);
    }
  });
}

async function sendMessage() {
  const inputEl = document.getElementById("trex-input");
  const text = inputEl.value.trim();
  if(!text) return;

  appendMessage("user", text);
  inputEl.value = "";
  showLoading(true);

  try {
    const resp = await fetch(MAIN_WORKER, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({question: text, includeYT:true})
    });
    const data = await resp.json();
    showLoading(false);
    appendMessage("bot", data.answer || "No answer");
  } catch(err){
    showLoading(false);
    appendMessage("bot", "⚠️ Error fetching response");
  }
}

function appendMessage(role, text){
  const container = document.getElementById("trex-messages");
  const div = document.createElement("div");
  div.className = `trex-message ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showLoading(flag){
  const load = document.getElementById("trex-loading");
  load.style.display = flag ? "block" : "none";
}

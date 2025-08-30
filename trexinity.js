// Trexinity Chat UI Script

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("trexinity-root");
  root.innerHTML = `
    <div id="chat-window"></div>
    <div id="input-area">
      <input id="input-box" type="text" placeholder="Ask me anything..."/>
      <button id="send-btn">Send</button>
    </div>
  `;

  const chatWindow = document.getElementById("chat-window");
  const inputBox = document.getElementById("input-box");
  const sendBtn = document.getElementById("send-btn");

  function addMsg(text, sender) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.textContent = text;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  async function askTrexinity(question) {
    addMsg(question, "user");
    inputBox.value = "";
    try {
      let res = await fetch("https://trexinity.shauryaagarwal-id.workers.dev/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: [question] })
      });

      let data = await res.json();
      addMsg(data.answer || "⚠️ No answer received", "bot");
    } catch (err) {
      addMsg("⚠️ Network error: " + err.message, "bot");
    }
  }

  sendBtn.onclick = () => {
    if (inputBox.value.trim() !== "") askTrexinity(inputBox.value.trim());
  };
  inputBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && inputBox.value.trim() !== "") {
      askTrexinity(inputBox.value.trim());
    }
  });
});

// Röstinmatning (Web Speech API)
document.getElementById("speakBtn").addEventListener("click", () => {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "sv-SE";
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    handleVoiceCommand(transcript);
  };
  recognition.start();
});

// Text-till-tal
document.querySelector('.tts-btn').addEventListener('click', () => {
  const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
  const tasks = reminders.map(r => `${r.time} ${r.text}`);
  const msg = new SpeechSynthesisUtterance(tasks.join(". "));
  msg.lang = "sv-SE";
  speechSynthesis.speak(msg);
});

// Röstkommando-hantering
function handleVoiceCommand(text) {
  const now = new Date();
  const timeMatch = text.match(/\b(\d{1,2})[:.]?(\d{2})?\b/);
  const hour = timeMatch ? timeMatch[1].padStart(2, "0") : now.getHours();
  const minute = timeMatch ? (timeMatch[2] || "00").padStart(2, "0") : now.getMinutes();
  const time = `${hour}:${minute}`;

  const lower = text.toLowerCase();
  let category = "påminnelse";
  if (lower.includes("inköp") || lower.includes("handla")) category = "inköp";
  if (lower.includes("mål")) category = "mål";

  const reminderText = text.replace(/.*?(:|med)\s*/i, "").trim();
  const shareMatch = text.match(/milo-[a-z0-9]{4}/i);
  const shareTo = shareMatch ? shareMatch[0].toUpperCase() : null;

  const reminder = { time: time, text: reminderText, category };

  if (shareTo) {
    let shared = JSON.parse(localStorage.getItem("sharedReminders")) || {};
    if (!shared[shareTo]) shared[shareTo] = [];
    shared[shareTo].push(reminder);
    localStorage.setItem("sharedReminders", JSON.stringify(shared));
    alert(`Delad påminnelse till ${shareTo}: ${reminderText}`);
  } else {
    if (category === "inköp") {
      let shopping = JSON.parse(localStorage.getItem("shoppingList")) || [];
      const items = reminderText.split(" och ").flatMap(x => x.split(","));
      items.forEach(item => shopping.push(item.trim()));
      localStorage.setItem("shoppingList", JSON.stringify(shopping));
    } else if (category === "mål") {
      let goals = JSON.parse(localStorage.getItem("goalList")) || [];
      let tag = "allmänt";
      if (text.includes("jobb") || text.includes("arbete")) tag = "arbete";
      if (text.includes("hem") || text.includes("fritid")) tag = "privat";
      goals.push({ text: reminderText, tag: tag });
      localStorage.setItem("goalList", JSON.stringify(goals));
    } else {
      let local = JSON.parse(localStorage.getItem("reminders")) || [];
      local.push(reminder);
      localStorage.setItem("reminders", JSON.stringify(local));
    }
  }

  renderReminders();
  renderShoppingList();
  renderGoals();
}

// Render påminnelser
function renderReminders() {
  const list = document.querySelector(".tasks ul");
  list.innerHTML = "";

  const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
  reminders.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type="checkbox" data-index="${index}" /> <strong>${item.time}</strong> ${item.text}`;
    list.appendChild(li);
  });

  list.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      const i = cb.dataset.index;
      reminders.splice(i, 1);
      localStorage.setItem("reminders", JSON.stringify(reminders));
      renderReminders();
    });
  });
}

// Render inköpslista
function renderShoppingList() {
  const shopping = JSON.parse(localStorage.getItem("shoppingList")) || [];
  const ul = document.getElementById("shoppingList");
  ul.innerHTML = "";
  shopping.forEach(item => {
    const li = document.createElement("li");
    li.textContent = "• " + item;
    ul.appendChild(li);
  });
}

// Rensa inköpslista
document.getElementById("clearShoppingList").addEventListener("click", () => {
  if (confirm("Vill du verkligen tömma inköpslistan?")) {
    localStorage.removeItem("shoppingList");
    renderShoppingList();
  }
});

// Render mål
function renderGoals() {
  const goals = JSON.parse(localStorage.getItem("goalList")) || [];
  const ul = document.getElementById("goalList");
  ul.innerHTML = "";

  goals.forEach((g, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type="checkbox" data-index="${index}" /> • ${g.text} <span class="goal-tag">(${g.tag})</span>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      goals.splice(cb.dataset.index, 1);
      localStorage.setItem("goalList", JSON.stringify(goals));
      renderGoals();
    });
  });
}

// Familjekod-hantering
function getOrCreateMiloCode() {
  let code = localStorage.getItem("miloCode");
  if (!code) {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `MILO-${suffix}`;
    localStorage.setItem("miloCode", code);
  }
  return code;
}

document.getElementById("myCode").textContent = getOrCreateMiloCode();

document.getElementById("shareCode").addEventListener("click", () => {
  const code = getOrCreateMiloCode();
  const url = `${location.origin}${location.pathname}?join=${code}`;
  if (navigator.share) {
    navigator.share({
      title: "Lägg till mig i Milo",
      text: "Här är min Milo-kod!",
      url: url
    });
  } else {
    navigator.clipboard.writeText(url);
    alert("Länk kopierad till urklipp!");
  }
});

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get("join");
  if (joinCode) {
    let family = JSON.parse(localStorage.getItem("family")) || [];
    if (!family.includes(joinCode)) {
      family.push(joinCode);
      localStorage.setItem("family", JSON.stringify(family));
      alert(`Du har lagt till ${joinCode} som familjemedlem.`);
    }
  }

  renderReminders();
  renderShoppingList();
  renderGoals();
});
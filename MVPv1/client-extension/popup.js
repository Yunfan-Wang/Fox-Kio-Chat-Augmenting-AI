const API_BASE = "http://127.0.0.1:8000";

const koiSelect = document.getElementById("koiSelect");
const foxSelect = document.getElementById("foxSelect");

const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");

const statusEl = document.getElementById("status");
const koiOutEl = document.getElementById("koiOut");
const optionsEl = document.getElementById("options");

const conversationEl = document.getElementById("conversation");
const draftEl = document.getElementById("draft");

const aggrEl = document.getElementById("aggr");
const intrEl = document.getElementById("intr");
const structEl = document.getElementById("struct");

const aggrValEl = document.getElementById("aggrVal");
const intrValEl = document.getElementById("intrVal");
const structValEl = document.getElementById("structVal");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function updateSliderLabels() {
  aggrValEl.textContent = Number(aggrEl.value).toFixed(2);
  intrValEl.textContent = Number(intrEl.value).toFixed(2);
  structValEl.textContent = Number(structEl.value).toFixed(2);
}

aggrEl.addEventListener("input", updateSliderLabels);
intrEl.addEventListener("input", updateSliderLabels);
structEl.addEventListener("input", updateSliderLabels);

async function loadPersonas() {
  setStatus("Loading personas...");
  try {
    const res = await fetch(`${API_BASE}/personas`);
    if (!res.ok) {
      setStatus(`Failed to load personas: ${res.status}`);
      return;
    }
    const data = await res.json();

    const koi = data.personas.filter(p => p.module === "koi");
    const fox = data.personas.filter(p => p.module === "fox");

    koiSelect.innerHTML = koi.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
    foxSelect.innerHTML = fox.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");

    setStatus("Ready.");
  } catch (e) {
    setStatus(`Error: ${e}`);
  }
}

function renderFoxOptions(replyOptions) {
  optionsEl.innerHTML = "";
  if (!replyOptions || replyOptions.length === 0) {
    optionsEl.innerHTML = `<div class="hint">No reply options returned.</div>`;
    return;
  }

  replyOptions.forEach((opt) => {
    const div = document.createElement("div");
    div.className = "option";

    div.innerHTML = `
      <div class="tag">${escapeHtml(opt.tag)}</div>
      <div class="text">${escapeHtml(opt.text)}</div>
      <div class="why">Why: ${escapeHtml(opt.why)}</div>
      <div class="actions">
        <button class="copyBtn">Copy</button>
        <button class="useBtn">Use as Draft</button>
      </div>
    `;

    div.querySelector(".copyBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText(opt.text);
      setStatus(`Copied: ${opt.tag}`);
    });

    div.querySelector(".useBtn").addEventListener("click", async () => {
      draftEl.value = opt.text;
      setStatus(`Draft replaced with: ${opt.tag}`);
    });

    optionsEl.appendChild(div);
  });
}

clearBtn.addEventListener("click", () => {
  conversationEl.value = "";
  draftEl.value = "";
  koiOutEl.textContent = "";
  optionsEl.innerHTML = "";
  setStatus("Cleared.");
});

analyzeBtn.addEventListener("click", async () => {
  const conversation = conversationEl.value.trim();
  const userDraft = draftEl.value.trim();

  if (!conversation || !userDraft) {
    setStatus("Please paste conversation context and write a draft.");
    return;
  }

  setStatus("Analyzing...");
  koiOutEl.textContent = "";
  optionsEl.innerHTML = "";

  const payload = {
    session_id: "demo",
    conversation,
    user_draft: userDraft,
    koi_persona_id: koiSelect.value,
    fox_persona_id: foxSelect.value,
    aggressiveness: Number(aggrEl.value),
    interruptiveness: Number(intrEl.value),
    structure_strength: Number(structEl.value)
  };

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      setStatus(`Error: ${err}`);
      return;
    }

    const data = await res.json();

    koiOutEl.textContent = JSON.stringify(data.koi, null, 2);
    renderFoxOptions(data.fox.reply_options);

    setStatus("Done.");
  } catch (e) {
    setStatus(`Failed: ${e}`);
  }
});

updateSliderLabels();
loadPersonas();

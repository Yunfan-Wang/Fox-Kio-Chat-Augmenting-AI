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

// Goal mode
const goalModeRadios = document.querySelectorAll('input[name="goalMode"]');
const goalModeHint = document.getElementById("goalModeHint");
const wizardEl = document.getElementById("wizard");

// Wizard inputs
const wizardStepLabel = document.getElementById("wizardStepLabel");
const wizStatus = document.getElementById("wizStatus");

const wiz1 = document.getElementById("wiz1");
const wiz2 = document.getElementById("wiz2");
const wiz3 = document.getElementById("wiz3");

const wizGoal = document.getElementById("wizGoal");
const wizRelationship = document.getElementById("wizRelationship");
const wizGoalType = document.getElementById("wizGoalType");
const wizConstraints = document.getElementById("wizConstraints");

const wizBack = document.getElementById("wizBack");
const wizNext = document.getElementById("wizNext");

// Wizard state
let wizardStep = 1;
let goalMode = "guided"; // default

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

function getGoalMode() {
  const checked = Array.from(goalModeRadios).find(r => r.checked);
  return checked ? checked.value : "guided";
}

function setWizardVisibility() {
  goalMode = getGoalMode();
  if (goalMode === "guided") {
    wizardEl.classList.remove("hidden");
    goalModeHint.textContent = "Guided mode: Koi/Fox will follow your explicit goal spec.";
  } else {
    wizardEl.classList.add("hidden");
    goalModeHint.textContent = "Infer mode: Koi will infer the goal from context (V1).";
  }
  validateAnalyzeEnabled();
}

goalModeRadios.forEach(r => r.addEventListener("change", setWizardVisibility));

function showWizardStep(step) {
  wizardStep = step;
  wizardStepLabel.textContent = `Step ${wizardStep} / 3`;

  wiz1.classList.toggle("hidden", wizardStep !== 1);
  wiz2.classList.toggle("hidden", wizardStep !== 2);
  wiz3.classList.toggle("hidden", wizardStep !== 3);

  wizBack.disabled = wizardStep === 1;
  wizNext.textContent = wizardStep === 3 ? "Finish" : "Next";

  wizStatus.textContent = "";
  validateAnalyzeEnabled();
}

function parseConstraints(text) {
  return text
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
}

function getGoalSpec() {
  return {
    goal: wizGoal.value.trim(),
    goal_type: wizGoalType.value,
    relationship: wizRelationship.value,
    constraints: parseConstraints(wizConstraints.value),
    success_criteria: [] // optional for MVP
  };
}

function isWizardComplete() {
  const gs = getGoalSpec();
  return gs.goal.length >= 3; // simple validation
}

function validateAnalyzeEnabled() {
  if (getGoalMode() === "guided") {
    analyzeBtn.disabled = !isWizardComplete();
    if (!isWizardComplete()) {
      analyzeBtn.title = "Complete the wizard (Step 1 goal is required).";
    } else {
      analyzeBtn.title = "";
    }
  } else {
    analyzeBtn.disabled = false;
    analyzeBtn.title = "";
  }
}

wizGoal.addEventListener("input", validateAnalyzeEnabled);

wizBack.addEventListener("click", () => {
  if (wizardStep > 1) showWizardStep(wizardStep - 1);
});

wizNext.addEventListener("click", () => {
  if (wizardStep === 1) {
    if (!wizGoal.value.trim()) {
      wizStatus.textContent = "Please enter a goal (one sentence).";
      return;
    }
    showWizardStep(2);
    return;
  }
  if (wizardStep === 2) {
    showWizardStep(3);
    return;
  }
  if (wizardStep === 3) {
    wizStatus.textContent = "Wizard complete ✓ You can analyze now.";
    validateAnalyzeEnabled();
  }
});

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

  const mode = getGoalMode();
  const endpoint = mode === "guided" ? "/v2/analyze" : "/analyze";

  setStatus(`Analyzing (${mode})...`);
  koiOutEl.textContent = "";
  optionsEl.innerHTML = "";

  let payload = {
    session_id: "demo",
    conversation,
    user_draft: userDraft,
    koi_persona_id: koiSelect.value,
    fox_persona_id: foxSelect.value,
    aggressiveness: Number(aggrEl.value),
    interruptiveness: Number(intrEl.value),
    structure_strength: Number(structEl.value)
  };

  if (mode === "guided") {
    payload.goal_spec = getGoalSpec();
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
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

// Init
updateSliderLabels();
setWizardVisibility();
showWizardStep(1);
loadPersonas();

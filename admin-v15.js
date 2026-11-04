let config = loadConfig();
let currentAdminPin = sessionStorage.getItem(ADMIN_PIN_SESSION_KEY) || "";

const pinGate = document.getElementById("pinGate");
const pinForm = document.getElementById("pinForm");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const adminPanel = document.getElementById("adminPanel");
const teamNameInput = document.getElementById("teamNameInput");
const rosterGrid = document.getElementById("rosterGrid");
const liberoNameInput = document.getElementById("liberoNameInput");
const liberoRotationGrid = document.getElementById("liberoRotationGrid");
const subsGrid = document.getElementById("subsGrid");
const addSubBtn = document.getElementById("addSubBtn");
const saveBtn = document.getElementById("saveBtn");
const previewBtn = document.getElementById("previewBtn");
const resetBtn = document.getElementById("resetBtn");
const saveStatus = document.getElementById("saveStatus");
const syncBadge = document.getElementById("syncBadge");
const syncText = document.getElementById("syncText");


function setAdminSyncBadge(state, text) {
  if (!syncBadge || !syncText) return;
  syncBadge.classList.remove("sync-live", "sync-pending", "sync-offline", "sync-local");
  syncBadge.classList.add(`sync-${state}`);
  syncText.textContent = text;
}

function adminSyncedLabel(prefix = "LIVE") {
  const now = new Date();
  return `${prefix} • ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

if (isSupabaseConfigured()) setAdminSyncBadge("pending", "CONNECTING…");
else setAdminSyncBadge("local", "LOCAL • not connected");

const ROLE_OPTIONS = [
  ["S", "Setter"],
  ["RS", "Right Side"],
  ["OH", "Outside Hitter"],
  ["MB", "Middle Blocker"],
  ["DS", "Defensive Specialist"],
  ["LIB", "Libero"]
];

function roleOptions(selectedRole) {
  return ROLE_OPTIONS.map(([value, label]) => `<option value="${value}" ${selectedRole === value ? "selected" : ""}>${label}</option>`).join("");
}

async function unlockAdmin({ refreshCloud = true } = {}) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  pinGate.hidden = true;
  adminPanel.hidden = false;
  renderEditor();

  if (refreshCloud && isSupabaseConfigured()) {
    const localBeforeCloud = loadConfig();
    showStatus("Loading shared roster from Supabase…");
    setAdminSyncBadge("pending", "SYNCING…");
    const { data, error } = await loadConfigFromCloud();
    if (data && !error) {
      const clean = (value) => {
        const copy = normalizeConfig(value);
        delete copy.adminPin;
        return JSON.stringify(copy);
      };
      const cloudIsSeedDemo = clean(data) === clean(cloneDefaultConfig());
      const localHasEdits = clean(localBeforeCloud) !== clean(cloneDefaultConfig());

      if (cloudIsSeedDemo && localHasEdits && currentAdminPin) {
        const useLocal = window.confirm(
          "I found an existing lineup saved on this browser, while Supabase still has the demo lineup. Upload your existing names/settings to Supabase?"
        );
        if (useLocal) {
          const uploaded = await saveConfigToCloud(localBeforeCloud, currentAdminPin);
          if (uploaded.data && !uploaded.error) {
            config = uploaded.data;
            renderEditor();
            showStatus("Existing browser lineup uploaded to Supabase. It is now the shared roster.");
            return;
          }
        }
      }

      config = data;
      renderEditor();
      showStatus("Cloud roster loaded. Changes here will sync to every device.");
      setAdminSyncBadge("live", adminSyncedLabel());
    } else if (error) {
      showStatus(`Could not load cloud roster: ${error.message}`, true);
      setAdminSyncBadge("offline", "SYNC ERROR");
    }
  }
}

function renderEditor() {
  config = loadConfig();
  teamNameInput.value = config.teamName || "";
  liberoNameInput.value = config.libero?.name || "Libero";
  renderRoster();
  renderLiberoRotations();
  renderSubs();
}

function renderRoster() {
  rosterGrid.innerHTML = "";
  config.players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "player-edit-card";
    card.innerHTML = `
      <div class="slot-number">Starting Slot ${index + 1}</div>
      <label>
        Player Name
        <input class="player-name-input" data-index="${index}" value="${escapeAttribute(player.name)}" maxlength="24" />
      </label>
      <label>
        Position / Role
        <select class="player-role-input" data-index="${index}">${roleOptions(player.role)}</select>
      </label>
    `;
    rosterGrid.appendChild(card);
  });
}

function getBackRowStarterOptions(rotation) {
  return config.players
    .map((player, index) => ({ player, zone: getZoneForPlayer(index, rotation) }))
    .filter(({ zone }) => !isFrontRow(zone));
}

function renderLiberoRotations() {
  liberoRotationGrid.innerHTML = "";
  for (let rotation = 1; rotation <= 6; rotation += 1) {
    const selected = config.libero?.rotations?.[String(rotation)] || "";
    const backRow = getBackRowStarterOptions(rotation);
    const options = [
      '<option value="">Off Court</option>',
      ...backRow.map(({ player, zone }) => `<option value="${player.id}" ${selected === player.id ? "selected" : ""}>${escapeHtml(player.name)} — Zone ${zone}</option>`)
    ].join("");

    const card = document.createElement("label");
    card.className = "libero-rotation-card";
    card.innerHTML = `
      <span><b>Rotation ${rotation}</b><small>Who comes OUT?</small></span>
      <select class="libero-rotation-select" data-rotation="${rotation}">${options}</select>
    `;
    liberoRotationGrid.appendChild(card);
  }
}

function renderSubs() {
  subsGrid.innerHTML = "";
  if (!config.subs.length) {
    subsGrid.innerHTML = '<div class="empty-subs">No DS / automatic subs yet. Tap <strong>+ Add Substitute</strong> if you need one.</div>';
    return;
  }

  config.subs.forEach((sub, index) => {
    const card = document.createElement("div");
    card.className = "sub-edit-card";
    const starterOptions = config.players.map((player) => `<option value="${player.id}" ${sub.linkedPlayerId === player.id ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("");
    card.innerHTML = `
      <div class="sub-card-head">
        <div class="slot-number">Sub ${index + 1}</div>
        <button class="remove-sub-btn" data-sub-index="${index}" type="button">Remove</button>
      </div>
      <div class="sub-fields">
        <label>
          Player Name
          <input class="sub-name-input" data-sub-index="${index}" value="${escapeAttribute(sub.name)}" maxlength="24" />
        </label>
        <label>
          Position / Role
          <select class="sub-role-input" data-sub-index="${index}">${roleOptions(sub.role)}</select>
        </label>
        <label>
          Linked to
          <select class="sub-link-input" data-sub-index="${index}">${starterOptions}</select>
        </label>
        <label>
          Automatically enters when linked player is…
          <select class="sub-trigger-input" data-sub-index="${index}">
            <option value="back" ${sub.trigger === "back" ? "selected" : ""}>Back Row</option>
            <option value="front" ${sub.trigger === "front" ? "selected" : ""}>Front Row</option>
            <option value="always" ${sub.trigger === "always" ? "selected" : ""}>Always On Court</option>
          </select>
        </label>
      </div>
    `;
    subsGrid.appendChild(card);
  });
}

function syncDraftFromInputs() {
  config.teamName = teamNameInput.value.trim() || "5-1 Rotation";

  document.querySelectorAll(".player-name-input").forEach((input) => {
    const index = Number(input.dataset.index);
    config.players[index].name = input.value.trim() || `Player ${index + 1}`;
  });
  document.querySelectorAll(".player-role-input").forEach((select) => {
    const index = Number(select.dataset.index);
    config.players[index].role = select.value;
  });

  config.libero.name = liberoNameInput.value.trim() || "Libero";
  document.querySelectorAll(".libero-rotation-select").forEach((select) => {
    config.libero.rotations[String(select.dataset.rotation)] = select.value;
  });

  document.querySelectorAll(".sub-name-input").forEach((input) => {
    const index = Number(input.dataset.subIndex);
    if (config.subs[index]) config.subs[index].name = input.value.trim() || `Sub ${index + 1}`;
  });
  document.querySelectorAll(".sub-role-input").forEach((select) => {
    const index = Number(select.dataset.subIndex);
    if (config.subs[index]) config.subs[index].role = select.value;
  });
  document.querySelectorAll(".sub-link-input").forEach((select) => {
    const index = Number(select.dataset.subIndex);
    if (config.subs[index]) config.subs[index].linkedPlayerId = select.value;
  });
  document.querySelectorAll(".sub-trigger-input").forEach((select) => {
    const index = Number(select.dataset.subIndex);
    if (config.subs[index]) config.subs[index].trigger = select.value;
  });
}

function showStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle("error-text", isError);
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    saveStatus.textContent = "";
    saveStatus.classList.remove("error-text");
  }, 4800);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

pinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const enteredPin = pinInput.value;
  pinError.textContent = "";

  if (isSupabaseConfigured()) {
    pinError.textContent = "Checking PIN…";
    const { ok, error } = await verifyAdminPinCloud(enteredPin);
    if (ok) {
      pinError.textContent = "";
      currentAdminPin = enteredPin;
      sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, enteredPin);
      await unlockAdmin();
    } else {
      pinError.textContent = error ? `Could not verify PIN: ${error.message}` : "Incorrect PIN.";
      pinInput.select();
    }
    return;
  }

  // Local-only fallback before Supabase is connected.
  config = loadConfig();
  if (enteredPin === config.adminPin) {
    currentAdminPin = enteredPin;
    sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, enteredPin);
    pinError.textContent = "";
    await unlockAdmin({ refreshCloud: false });
  } else {
    pinError.textContent = "Incorrect PIN.";
    pinInput.select();
  }
});

addSubBtn.addEventListener("click", () => {
  syncDraftFromInputs();
  const starterId = config.players[0]?.id || "p1";
  config.subs.push({
    id: `sub_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: "New DS",
    role: "DS",
    linkedPlayerId: starterId,
    trigger: "back"
  });
  renderRoster();
  renderLiberoRotations();
  renderSubs();
});

subsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-sub-btn");
  if (!button) return;
  syncDraftFromInputs();
  const index = Number(button.dataset.subIndex);
  config.subs.splice(index, 1);
  renderRoster();
  renderLiberoRotations();
  renderSubs();
});

async function saveCurrentDraftToSharedRoster() {
  syncDraftFromInputs();

  if (!isSupabaseConfigured()) {
    saveConfig(config);
    return { ok: true, cloud: false };
  }

  if (!currentAdminPin) return { ok: false, error: new Error("Please enter the coach PIN again.") };
  const { data, error } = await saveConfigToCloud(config, currentAdminPin);
  if (error || !data) return { ok: false, error: error || new Error("Cloud save failed.") };
  config = data;
  return { ok: true, cloud: true };
}

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  showStatus(isSupabaseConfigured() ? "Saving to Supabase…" : "Saving on this browser…");
  setAdminSyncBadge(isSupabaseConfigured() ? "pending" : "local", isSupabaseConfigured() ? "SYNCING…" : "LOCAL • not connected");
  const result = await saveCurrentDraftToSharedRoster();
  saveBtn.disabled = false;

  if (!result.ok) {
    showStatus(`Save failed: ${result.error.message}`, true);
    return;
  }

  renderEditor();
  showStatus(result.cloud
    ? "Saved to Supabase! Player names, roles, subs, and libero assignments are now shared across devices."
    : "Saved on this browser. Add your Supabase URL/key to turn on shared sync."
  );
  setAdminSyncBadge(result.cloud ? "live" : "local", result.cloud ? adminSyncedLabel() : "LOCAL • not connected");
});

previewBtn.addEventListener("click", async () => {
  previewBtn.disabled = true;
  const result = await saveCurrentDraftToSharedRoster();
  previewBtn.disabled = false;
  if (!result.ok) {
    showStatus(`Could not save before preview: ${result.error.message}`, true);
    return;
  }
  window.location.href = "index.html";
});

resetBtn.addEventListener("click", async () => {
  const confirmed = window.confirm("Reset all names, positions, substitutions, and libero assignments to the demo lineup?");
  if (!confirmed) return;

  const resetConfig = cloneDefaultConfig();
  if (isSupabaseConfigured()) {
    if (!currentAdminPin) {
      showStatus("Please enter the coach PIN again before resetting.", true);
      return;
    }
    const { data, error } = await saveConfigToCloud(resetConfig, currentAdminPin);
    if (error || !data) {
      showStatus(`Reset failed: ${error?.message || "Cloud save failed."}`, true);
      return;
    }
  } else {
    saveConfig(resetConfig);
  }

  renderEditor();
  showStatus(isSupabaseConfigured() ? "Demo lineup restored in Supabase." : "Demo lineup restored on this browser.");
});

if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") {
  if (!isSupabaseConfigured() || currentAdminPin) {
    unlockAdmin();
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

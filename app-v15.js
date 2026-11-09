let config = loadConfig();
let currentRotation = 1;
let currentSet = Math.max(1, Number(localStorage.getItem("volleyball51SelectedSet_v3")) || 1);
let currentMode = "serve";
let selectedPlayerId = null;
let roleFilter = "ALL";
let animationTimers = [];

const rotationButtons = document.getElementById("rotationButtons");
const setSelector = document.getElementById("setSelector");
const previousRotationBtn = document.getElementById("previousRotationBtn");
const nextRotationBtn = document.getElementById("nextRotationBtn");
const lineupPanel = document.getElementById("lineupPanel");
const modeButtons = document.getElementById("modeButtons");
const playerLayer = document.getElementById("playerLayer");
const playerFocus = document.getElementById("playerFocus");
const teamTitle = document.getElementById("teamTitle");
const rotationLabel = document.getElementById("rotationLabel");
const modeTitle = document.getElementById("modeTitle");
const modeHint = document.getElementById("modeHint");
const selectedPlayerCard = document.getElementById("selectedPlayerCard");
const lessonHeading = document.getElementById("lessonHeading");
const lessonText = document.getElementById("lessonText");
const lessonSteps = document.getElementById("lessonSteps");
const roleTabs = document.getElementById("roleTabs");
const roleExplanation = document.getElementById("roleExplanation");
const receiveFlowBtn = document.getElementById("receiveFlowBtn");
const serveFlowBtn = document.getElementById("serveFlowBtn");
const setTarget = document.getElementById("setTarget");
const syncBadge = document.getElementById("syncBadge");
const syncText = document.getElementById("syncText");
let liveChannel = null;

const MODE_COPY = {
  serve: {
    title: "Serve",
    hint: "Stack in legal order so everyone can release straight to base.",
    heading: "Serving Formation",
    text: "The serving team stays in rotational order until contact. The front row stacks tightly, the back row stays ordered, and the Zone 1 player serves from behind the end line. After contact, everyone releases directly to base.",
    steps: ["Find legal order", "Front row stacks", "Zone 1 serves", "Release to base"]
  },
  receive: {
    title: "Serve Receive",
    hint: "Follow the 5-1 Option 1 receive diagram; the setter releases to set.",
    heading: "Serve Receive",
    text: "Use the six Option 1 serve-receive patterns from the coach’s diagram. The setter stays out of passing and releases to the target after contact; the Right Side plays back-right defense when back row, not setter.",
    steps: ["Stay legal", "Hide the setter", "Build the passing lanes", "Pass to target"]
  },
  set: {
    title: "Setter Release",
    hint: "The setter releases between the middle and right side to set.",
    heading: "Setter Release",
    text: "As soon as the serve is controlled, the setter releases to the target between the middle and right side. The hitters transition, then the team resets into defensive base.",
    steps: ["Pass is controlled", "Setter releases", "Set from target", "Reset to base"]
  },
  base: {
    title: "Base",
    hint: "Front row on the net; back row in defensive base.",
    heading: "Defensive Base",
    text: "Anastasiia is front row in Rotations 1–3 and blocks right front in Base, then returns to set. In Rotations 4–6 she sets from the back row. Talia replaces Ava only when Ava is back row (Rotations 2–4).",
    steps: ["Setter blocks right when front", "RS defends back right when back", "Middle closes block", "Release to attack"]
  },
  attack_oh: {
    title: "Outside Hit",
    hint: "Defend the opponent outside: block right and shift behind the block.",
    heading: "Defense vs. Outside Hit",
    text: "This is your defensive shape when the opponent OUTSIDE is attacking. The right-side blocker owns the pin, the middle closes to her, the left-front player releases off the net, and the back row shifts behind the block.",
    steps: ["RS takes the pin", "Middle closes right", "OH releases off net", "Back row shifts"]
  },
  attack_mb: {
    title: "Middle Hit",
    hint: "Middle blocks; both pins release and the back row pinches in.",
    heading: "Defense vs. Middle Hit",
    text: "When the opponent middle attacks, your middle stays centered on the hitter. The pin players release into short defense while the back row protects the seams and deep middle.",
    steps: ["Middle reads hitter", "Pins release", "Defenders pinch in", "Deep middle protects"]
  },
  attack_rs: {
    title: "Right Side Hit",
    hint: "Defend the opponent right side: block left and shift behind the block.",
    heading: "Defense vs. Right-Side Hit",
    text: "This is the mirror of outside defense. The outside blocker owns the left pin, the middle closes left, the right-front player releases off the net, and the back row shifts behind the block.",
    steps: ["OH takes the pin", "Middle closes left", "RS releases off net", "Back row shifts"]
  },
  freeball: {
    title: "Free Ball",
    hint: "Call FREE, pass to target, and get all hitters off the net to approach.",
    heading: "Free Ball",
    text: "On a free ball, the setter gets to the pass / set target and the available front-row hitters get off the net so they can transition into full approaches. The back-row players balance the passing lanes.",
    steps: ["Call FREE", "Setter gets to target", "Hitters get off net", "Pass and run offense"]
  }
};

const ROLE_COPY = {
  S: {
    title: "All-Around Setter",
    body: "This setter runs the offense in all six rotations, including when she is front row. She releases to the setting target after the serve or pass."
  },
  RS: {
    title: "Right Side / Back-Right Defender",
    body: "Ava attacks when she is front row (Rotations 1, 5 and 6). Talia is the regular DS in Ava’s back-row rotations (2–4). In serve receive, she is tucked out of the primary passing lanes."
  },
  OH: {
    title: "Outside Hitter",
    body: "The outside is a major serve-receive passer. In base she owns the left-front pin when front row or the left-side defensive base when back row, then adjusts based on which opponent hitter attacks."
  },
  MB: {
    title: "Middle",
    body: "The middle starts centered on the net, reads the opponent setter/hitter, and closes to either pin when needed. In the back row, this slot can be replaced by the libero or a DS."
  },
  DS: {
    title: "Defensive Specialist",
    body: "A DS replaces a linked starter according to the automatic substitution rule in Coach Admin. Her bubble follows the defensive responsibility of the lineup slot she replaces."
  },
  LIB: {
    title: "Libero",
    body: "The libero has her own navy bubble and can be assigned separately for every rotation in Coach Admin. Choose exactly who she replaces in Rotation 1, Rotation 2, and so on."
  },
  ALL: {
    title: "Whole Team",
    body: "Work through all six 5-1 rotations based on the coach reference. Check serve-receive overlaps on court before using them in competition. Serve → Serve Receive → Base → defense against Outside / Middle / Right Side → Free Ball. The attack tabs describe YOUR defensive movement when that opponent hitter attacks."
  }
};

function starterRoleForFilter(entry) { return entry.starter.role; }

function roleMatchesFilter(entry) {
  if (roleFilter === "ALL") return true;
  const displayedRole = entry.player.role;
  const systemRole = getSystemRole(entry.player, entry.zone);
  const formationRole = getFormationRole(entry);
  if (roleFilter === "RS") return displayedRole === "RS" || starterRoleForFilter(entry) === "RS";
  if (roleFilter === "S") return displayedRole === "S" || starterRoleForFilter(entry) === "S";
  return displayedRole === roleFilter || systemRole === roleFilter || formationRole === roleFilter;
}

function buildControls() {
  rotationButtons.innerHTML = "";
  if (setSelector) setSelector.value = String(currentSet);
  for (let i = 1; i <= 6; i += 1) {
    const button = document.createElement("button");
    button.textContent = i;
    button.dataset.rotation = i;
    if (i === currentRotation) button.classList.add("active");
    button.addEventListener("click", () => {
      currentRotation = i;
      stopAnimations();
      render();
    });
    rotationButtons.appendChild(button);
  }

  const previousFocus = selectedPlayerId || playerFocus.value;
  playerFocus.innerHTML = '<option value="">Everyone</option>';
  config.players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.name} — ${getPositionLabel(player.role)}`;
    playerFocus.appendChild(option);
  });
  (config.subs || []).forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub.id;
    option.textContent = `${sub.name} — ${getPositionLabel(sub.role)} (Sub)`;
    playerFocus.appendChild(option);
  });
  if (config.libero) {
    const option = document.createElement("option");
    option.value = config.libero.id;
    option.textContent = `${config.libero.name} — Libero`;
    playerFocus.appendChild(option);
  }
  playerFocus.value = [...playerFocus.options].some((option) => option.value === previousFocus) ? previousFocus : "";
}

function coordsFor(entry, mode, activeCourt = []) {
  if (mode === "serve") return getServeCoords(entry.zone, currentRotation);
  if (mode === "receive") return getServeReceiveCoords(entry, activeCourt, currentRotation);
  if (mode === "set") return getSetterReleaseCoords(entry);
  if (mode === "base") return getBaseCoords(entry);
  if (mode === "attack_oh") return getDefenseCoords(entry, "OH");
  if (mode === "attack_mb") return getDefenseCoords(entry, "MB");
  if (mode === "attack_rs") return getDefenseCoords(entry, "RS");
  if (mode === "freeball") return getFreeballCoords(entry);
  return getBaseCoords(entry);
}

function getActivePlayerInstruction(entry) {
  const { player, starter, zone, isSub, isLibero } = entry;
  const role = getFormationRole(entry);
  const replacementText = isLibero
    ? ` ${player.name} is the libero in for ${starter.name}.`
    : isSub
      ? ` ${player.name} is automatically in for ${starter.name}.`
      : "";
  const base = `${player.name} is in rotational Zone ${zone}.${replacementText}`;

  if (currentMode === "serve") {
    if (zone === 1) return `${base} Serve from behind the end line. After contact, release immediately to your normal base responsibility.`;
    return `${base} Hold the compact serving stack until contact, then release straight to base.`;
  }

  if (currentMode === "receive") {
    if (role === "S") return `${base} Stay clear of the passing lane. Once the pass is controlled, release to the target between the middle and right side.`;
    if (starter.role === "RS" && !isFrontRow(zone)) return `${base} Talia is in Ava’s back-row slot this rotation. Play defense and serve receive as assigned; you do not set.`;
    if (role === "OH") return `${base} Join the serve-receive shape, call seams, and pass toward the target.`;
    if (role === "MB" && isFrontRow(zone)) return `${base} Hold the corrected front-row overlap, then transition as soon as the pass is made.`;
    if (role === "RS" && isFrontRow(zone)) return `${base} Hold the corrected serve-receive relationship and transition after the pass.`;
    return `${base} Help hold the passing shape and communicate seams.`;
  }

  if (currentMode === "set") {
    if (role === "S") return `${base} Release to the target between the middle and right side, square up, and set.`;
    if (isFrontRow(zone)) return `${base} Transition off the net for an approach, except the front-row setter who runs the offense.`;
    return `${base} Balance behind the offense, then reset to defensive base.`;
  }

  if (currentMode === "base") {
    if (starter.role === "RS" && !isFrontRow(zone)) return `${base} You are a BACK-ROW DEFENDER in the back-right area; do not set.`;
    if (isFrontRow(zone) && role === "OH") return `${base} Start on the LEFT pin at the net and read the opponent.`;
    if (isFrontRow(zone) && role === "MB") return `${base} Start CENTERED on the net and read the opponent setter.`;
    if (isFrontRow(zone) && role === "S") return `${base} Block at the RIGHT pin in base, then transition back to the setting target to set.`;
    if (isFrontRow(zone) && role === "RS") return `${base} Cover your assigned front-row block and hit in transition.`;
    if (role === "S") return `${base} When front row (1–3), BLOCK RIGHT FRONT and return to setting; when back row (4–6), set from behind the attack line.`;
    if (role === "OH") return `${base} Start at the LEFT sideline / 10-ft-line base.`;
    return `${base} Start deep middle and read the hitter.`;
  }

  if (currentMode === "attack_oh") {
    if (isFrontRow(zone) && (role === "RS" || role === "S")) return `${base} The opponent outside is hitting: take the RIGHT pin block.`;
    if (isFrontRow(zone) && role === "MB") return `${base} Close RIGHT to the pin blocker and form the block.`;
    if (isFrontRow(zone) && role === "OH") return `${base} Release off the net into short / tip defense.`;
    if (role === "S") return `${base} Defend back-right, then release to set on offense.`;
    if (role === "OH") return `${base} Shift into left-middle defensive coverage.`;
    return `${base} Get deep cross-court behind the block.`;
  }

  if (currentMode === "attack_mb") {
    if (isFrontRow(zone) && role === "MB") return `${base} Stay centered and block the opponent middle.`;
    if (isFrontRow(zone)) return `${base} Release off the net into short defense.`;
    if (role === "S") return `${base} Hold back-right when in the back row; block right front if front row.`;
    if (role === "OH") return `${base} Hold the left-side seam.`;
    return `${base} Protect deep middle.`;
  }

  if (currentMode === "attack_rs") {
    if (isFrontRow(zone) && role === "OH") return `${base} The opponent right side is hitting: take the LEFT pin block.`;
    if (isFrontRow(zone) && role === "MB") return `${base} Close LEFT to the pin blocker and form the block.`;
    if (isFrontRow(zone) && (role === "RS" || role === "S")) return `${base} Release off the net into short / tip defense.`;
    if (role === "S") return `${base} Defend right-back if back row; block/cover right front if front row.`;
    if (role === "OH") return `${base} Hold the left-side defensive lane.`;
    return `${base} Get deep cross-court behind the block.`;
  }

  if (currentMode === "freeball") {
    if (role === "S") return `${base} Get to the pass / set target early and call for the ball.`;
    if (isFrontRow(zone)) return `${base} Get OFF the net to the 10-ft line so you have room for a full approach.`;
    return `${base} Balance the passing lanes and send a high controlled pass to target.`;
  }

  return base;
}

function renderPlayers() {
  const focusId = playerFocus.value;
  const activeCourt = getActiveCourt(config, currentRotation, currentSet);
  playerLayer.innerHTML = "";

  activeCourt.forEach((entry) => {
    const coords = coordsFor(entry, currentMode, activeCourt);
    const { player, starter, zone, isSub, isLibero, index } = entry;
    const circle = document.createElement("button");
    circle.className = "player-circle";
    circle.style.left = `${coords.x}%`;
    circle.style.top = `${coords.y}%`;
    circle.dataset.playerId = player.id;
    circle.dataset.slotIndex = index;
    circle.setAttribute("aria-label", `${player.name}, ${getPositionLabel(player.role)}, Zone ${zone}`);

    const focusMatchesSlot = focusId && (focusId === player.id || focusId === starter.id);
    if ((focusId && !focusMatchesSlot) || !roleMatchesFilter(entry)) circle.classList.add("dimmed");
    if (selectedPlayerId && (selectedPlayerId === player.id || selectedPlayerId === starter.id)) circle.classList.add("selected");
    if (focusMatchesSlot) circle.classList.add("selected");
    if (currentMode === "serve" && zone === 1) circle.classList.add("server");
    if (isSub) circle.classList.add("subbed-in");
    if (isLibero) circle.classList.add("libero-on-court");
    if (currentMode === "receive" && getFormationRole(entry) === "S") circle.classList.add("hidden-setter");

    const systemRole = getSystemRole(player, zone);
    circle.innerHTML = `
      <span class="player-name">${escapeHtml(player.name)}</span>
      <span class="player-role">${escapeHtml(player.role)}</span>
      ${player.role === "RS" ? `<span class="system-role">${isFrontRow(zone) ? "Front-row hitter" : "Back-right defender"}</span>` : ""}
      <span class="zone-badge">${zone}</span>
      ${isLibero ? '<span class="lib-badge">LIB</span>' : isSub ? '<span class="sub-badge">SUB</span>' : ""}
    `;

    circle.addEventListener("click", () => {
      selectedPlayerId = player.id;
      playerFocus.value = player.id;
      renderPlayers();
      renderSelectedPlayer();
    });

    playerLayer.appendChild(circle);
  });
}

function renderSelectedPlayer() {
  const focusId = playerFocus.value || selectedPlayerId;
  if (!focusId) {
    selectedPlayerCard.innerHTML = '<strong>Tap a player circle</strong><span>to see her job in this situation.</span>';
    return;
  }

  const activeCourt = getActiveCourt(config, currentRotation, currentSet);
  const activeEntry = activeCourt.find((entry) => entry.player.id === focusId || entry.starter.id === focusId);
  const starter = config.players.find((player) => player.id === focusId);
  const sub = (config.subs || []).find((player) => player.id === focusId);
  const isLiberoFocus = config.libero?.id === focusId;

  if (isLiberoFocus) {
    const entryWhereActive = activeCourt.find((entry) => entry.isLibero);
    if (!entryWhereActive) {
      selectedPlayerCard.innerHTML = `<div><strong>${escapeHtml(config.libero.name)} — Libero</strong><span>Off court in Rotation ${currentRotation}. Change her Rotation ${currentRotation} replacement in Coach Admin.</span></div>`;
      return;
    }
  }

  if (sub) {
    const entryWhereActive = activeCourt.find((entry) => entry.player.id === sub.id);
    if (!entryWhereActive) {
      const linked = config.players.find((player) => player.id === sub.linkedPlayerId);
      const triggerText = sub.trigger === "front" ? "front row" : sub.trigger === "back" ? "back row" : "every rotation";
      selectedPlayerCard.innerHTML = `<div><strong>${escapeHtml(sub.name)} — ${escapeHtml(getPositionLabel(sub.role))}</strong><span>Not on the court in this rotation. She is linked to ${escapeHtml(linked?.name || "a starter")} and enters when that player is in the ${escapeHtml(triggerText)}.</span></div>`;
      return;
    }
  }

  if (starter && activeEntry && (activeEntry.isSub || activeEntry.isLibero) && activeEntry.starter.id === starter.id) {
    selectedPlayerCard.innerHTML = `<div><strong>${escapeHtml(starter.name)} — ${escapeHtml(getPositionLabel(starter.role))}</strong><span>${escapeHtml(activeEntry.player.name)} is in for her during Rotation ${currentRotation}.</span></div>`;
    return;
  }

  if (activeEntry) {
    selectedPlayerCard.innerHTML = `<div><strong>${escapeHtml(activeEntry.player.name)} — ${escapeHtml(getPositionLabel(activeEntry.player.role))}</strong><span>${escapeHtml(getActivePlayerInstruction(activeEntry))}</span></div>`;
  }
}

function renderLesson() {
  const copy = MODE_COPY[currentMode] || MODE_COPY.base;
  rotationLabel.textContent = currentRotation;
  modeTitle.textContent = copy.title;
  modeHint.textContent = copy.hint;
  lessonHeading.textContent = copy.heading;
  lessonText.textContent = copy.text;
  lessonSteps.innerHTML = copy.steps.map((step, index) => `<div><b>${index + 1}</b><span>${escapeHtml(step)}</span></div>`).join("");
  setTarget.hidden = !["receive", "set", "freeball"].includes(currentMode);
}

function renderRoleCopy() {
  const copy = ROLE_COPY[roleFilter];
  roleExplanation.innerHTML = `<h3>${escapeHtml(copy.title)}</h3><p>${escapeHtml(copy.body)}</p>`;
  [...roleTabs.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.role === roleFilter);
  });
}

function renderLineupSummary() {
  if (!lineupPanel) return;
  const court = getActiveCourt(config, currentRotation, currentSet);
  const ordered = [4,3,2,5,6,1].map(z => court.find(p => p.zone === z));
  const onCourtIds = new Set(court.map(entry => entry.player.id));
  const candidates = [...config.players, ...(config.subs || [])];
  const bench = candidates.filter(player => !onCourtIds.has(player.id));
  const labels = ordered.map(e => `<div class="lineup-item"><b>Z${e.zone} · ${isFrontRow(e.zone) ? "Front" : "Back"}</b><span>${escapeHtml(e.player.name)}${e.starter.id !== e.player.id ? ` <small>(for ${escapeHtml(e.starter.name)})</small>` : ""}${e.starter.role === "S" ? ' <small>SETTER</small>' : ""}</span></div>`).join("");
  lineupPanel.innerHTML = `<div class="lineup-header"><strong>Set ${currentSet} · Rotation ${currentRotation}</strong><span>6 on court · ${bench.length} on bench</span></div><div class="lineup-grid">${labels}</div><div class="bench-strip"><b>BENCH</b> ${bench.map(p => escapeHtml(p.name)).join(" · ")}</div><p class="substitution-notice">Talia ↔ Ava is a regular substitution: enter/return only at a legal dead ball and record each exchange on your score sheet. The view shows the planned lineup, not a completed referee-authorized substitution.</p>`;
}

function render() {
  config = loadConfig();
  teamTitle.textContent = config.teamName || "5-1 Rotation";
  document.title = `${config.teamName || "5-1 Rotation"} — Rotation ${currentRotation}`;
  buildControls();
  if (selectedPlayerId && [...playerFocus.options].some((option) => option.value === selectedPlayerId)) playerFocus.value = selectedPlayerId;
  renderLesson();
  renderRoleCopy();
  renderPlayers();
  renderSelectedPlayer();
  renderLineupSummary();
  [...modeButtons.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
  });
}

function stopAnimations() {
  animationTimers.forEach((timer) => clearTimeout(timer));
  animationTimers = [];
  receiveFlowBtn.textContent = "▶ Show Serve Receive → Base";
  serveFlowBtn.textContent = "▶ Show Serve → Base";
}

function applyModeToExistingPlayers(mode) {
  currentMode = mode;
  const activeCourt = getActiveCourt(config, currentRotation, currentSet);
  activeCourt.forEach((entry) => {
    const circle = playerLayer.querySelector(`[data-slot-index="${entry.index}"]`);
    if (!circle) return;
    const coords = coordsFor(entry, currentMode, activeCourt);
    circle.style.left = `${coords.x}%`;
    circle.style.top = `${coords.y}%`;
    circle.classList.toggle("server", currentMode === "serve" && entry.zone === 1);
    circle.classList.toggle("hidden-setter", currentMode === "receive" && getFormationRole(entry) === "S");
  });
  [...modeButtons.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
  });
  renderLesson();
  renderSelectedPlayer();
}

function runReceiveFlowAnimation() {
  stopAnimations();
  currentMode = "receive";
  render();
  receiveFlowBtn.textContent = "Setter releasing…";
  animationTimers.push(setTimeout(() => applyModeToExistingPlayers("set"), 1200));
  animationTimers.push(setTimeout(() => applyModeToExistingPlayers("base"), 2700));
  animationTimers.push(setTimeout(() => {
    receiveFlowBtn.textContent = "↻ Play Again";
    animationTimers = [];
  }, 4100));
}

function runServeBaseAnimation() {
  stopAnimations();
  currentMode = "serve";
  render();
  serveFlowBtn.textContent = "Serving…";
  animationTimers.push(setTimeout(() => applyModeToExistingPlayers("base"), 1100));
  animationTimers.push(setTimeout(() => {
    serveFlowBtn.textContent = "↻ Play Again";
    animationTimers = [];
  }, 2500));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

modeButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  stopAnimations();
  currentMode = button.dataset.mode;
  render();
});

roleTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-role]");
  if (!button) return;
  roleFilter = button.dataset.role;
  renderRoleCopy();
  renderPlayers();
});

playerFocus.addEventListener("change", () => {
  selectedPlayerId = playerFocus.value || null;
  renderPlayers();
  renderSelectedPlayer();
});

receiveFlowBtn.addEventListener("click", runReceiveFlowAnimation);
serveFlowBtn.addEventListener("click", runServeBaseAnimation);


if (setSelector) {
  setSelector.addEventListener("change", () => {
    currentSet = Math.max(1, Number(setSelector.value) || 1);
    localStorage.setItem("volleyball51SelectedSet_v3", String(currentSet));
    stopAnimations();
    selectedPlayerId = null;
    render();
  });
}
if (previousRotationBtn) previousRotationBtn.addEventListener("click", () => {
  currentRotation = ((currentRotation + 4) % 6) + 1;
  stopAnimations(); render();
});
if (nextRotationBtn) nextRotationBtn.addEventListener("click", () => {
  currentRotation = (currentRotation % 6) + 1;
  stopAnimations(); render();
});

render();

function setSyncBadge(state, text) {
  if (!syncBadge || !syncText) return;
  syncBadge.classList.remove("sync-live", "sync-pending", "sync-offline", "sync-local");
  syncBadge.classList.add(`sync-${state}`);
  syncText.textContent = text;
}

function syncedLabel(prefix = "LIVE") {
  const now = new Date();
  return `${prefix} • ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

async function syncPlayerViewFromCloud({ quiet = false } = {}) {
  if (!isSupabaseConfigured()) {
    setSyncBadge("local", "LOCAL • not connected");
    return;
  }
  if (!quiet) setSyncBadge("pending", "SYNCING…");

  const before = JSON.stringify(loadConfig());
  const { data, error } = await loadConfigFromCloud();
  if (error || !data) {
    setSyncBadge("offline", "SYNC ERROR");
    console.warn("Supabase roster sync failed:", error);
    return;
  }

  const after = JSON.stringify(data);
  if (after !== before) {
    config = data;
    render();
  } else {
    config = data;
  }
  setSyncBadge("live", syncedLabel());
}

function startLiveRosterSync() {
  if (!isSupabaseConfigured()) {
    setSyncBadge("local", "LOCAL • not connected");
    return;
  }

  liveChannel = subscribeToTeamConfigChanges(
    (newConfig) => {
      config = newConfig;
      render();
      setSyncBadge("live", "LIVE • updated now");
    },
    (status) => {
      if (status === "SUBSCRIBED") setSyncBadge("live", syncedLabel());
      else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        setSyncBadge("offline", "LIVE unavailable • retrying");
      }
    }
  );
}

// Load once from Supabase, then listen for instant changes. A short polling
// fallback also keeps devices matched if Realtime is temporarily unavailable.
syncPlayerViewFromCloud().finally(startLiveRosterSync);
setInterval(() => syncPlayerViewFromCloud({ quiet: true }), 5000);
window.addEventListener("focus", () => syncPlayerViewFromCloud());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncPlayerViewFromCloud();
});

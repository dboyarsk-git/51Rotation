const STORAGE_KEY = "volleyball51Config_v2";
const LEGACY_STORAGE_KEY = "volleyball51LegacyDisabled_v2";
const ADMIN_SESSION_KEY = "volleyball51AdminUnlocked";
const ADMIN_PIN_SESSION_KEY = "volleyball51AdminCloudPin";

const DEFAULT_CONFIG = {
  teamName: "5-1 Rotation",
  adminPin: "5151",
  players: [
    { id: "p1", name: "Setter", role: "S" },
    { id: "p2", name: "Outside 1", role: "OH" },
    { id: "p3", name: "Middle 1", role: "MB" },
    { id: "p4", name: "Right Side", role: "RS" },
    { id: "p5", name: "Outside 2", role: "OH" },
    { id: "p6", name: "Middle 2", role: "MB" }
  ],
  subs: [],
  libero: {
    id: "libero_1",
    name: "Libero",
    role: "LIB",
    rotations: { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "" }
  }
};

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeConfig(raw) {
  const fallback = cloneDefaultConfig();
  const parsed = raw && typeof raw === "object" ? raw : {};
  const players = Array.isArray(parsed.players) && parsed.players.length === 6
    ? parsed.players.map((player, index) => ({
        id: player.id || `p${index + 1}`,
        name: player.name || `Player ${index + 1}`,
        role: player.role || fallback.players[index].role
      }))
    : fallback.players;

  const subs = Array.isArray(parsed.subs)
    ? parsed.subs.map((sub, index) => ({
        id: sub.id || `sub_${Date.now()}_${index}`,
        name: sub.name || `Sub ${index + 1}`,
        role: sub.role || "DS",
        linkedPlayerId: sub.linkedPlayerId || players[0].id,
        trigger: ["front", "back", "always"].includes(sub.trigger) ? sub.trigger : "back"
      }))
    : [];

  const parsedLibero = parsed.libero && typeof parsed.libero === "object" ? parsed.libero : {};
  const rotations = {};
  for (let rotation = 1; rotation <= 6; rotation += 1) {
    const value = parsedLibero.rotations?.[String(rotation)] || "";
    rotations[String(rotation)] = players.some((player) => player.id === value) ? value : "";
  }

  return {
    ...fallback,
    ...parsed,
    players,
    subs,
    libero: {
      id: parsedLibero.id || fallback.libero.id,
      name: parsedLibero.name || fallback.libero.name,
      role: "LIB",
      rotations
    }
  };
}

function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeConfig(JSON.parse(stored));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = normalizeConfig(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return cloneDefaultConfig();
  } catch (error) {
    return cloneDefaultConfig();
  }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeConfig(config)));
}

// ---------- Supabase shared sync ----------
let _supabaseClient = null;

function getSupabaseSettings() {
  return window.VBALL_SUPABASE || {};
}

function isSupabaseConfigured() {
  const settings = getSupabaseSettings();
  return Boolean(
    settings.url &&
    settings.publishableKey &&
    settings.teamSlug &&
    !settings.url.includes("PASTE_YOUR") &&
    !settings.publishableKey.includes("PASTE_YOUR") &&
    window.supabase?.createClient
  );
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (_supabaseClient) return _supabaseClient;
  const settings = getSupabaseSettings();
  _supabaseClient = window.supabase.createClient(settings.url, settings.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return _supabaseClient;
}

async function loadConfigFromCloud() {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error("Supabase is not configured yet.") };
  const settings = getSupabaseSettings();

  // Preferred path: protected RPC.
  const rpcResult = await client.rpc("get_team_config", { team_slug: settings.teamSlug });
  if (!rpcResult.error && rpcResult.data) {
    const normalized = normalizeConfig(rpcResult.data);
    saveConfig(normalized);
    return { data: normalized, error: null, source: "rpc" };
  }

  // v15 fallback: the player-facing mirror table is intentionally public-read.
  // This keeps LIVE roster loading working even if PostgREST has a stale RPC schema cache.
  const tableResult = await client
    .from("volleyball_team_public")
    .select("config, updated_at")
    .eq("slug", settings.teamSlug)
    .maybeSingle();

  if (!tableResult.error && tableResult.data?.config) {
    const normalized = normalizeConfig(tableResult.data.config);
    saveConfig(normalized);
    return { data: normalized, error: null, source: "table", updatedAt: tableResult.data.updated_at || null };
  }

  const error = tableResult.error || rpcResult.error || new Error("No shared team configuration was found.");
  return { data: null, error };
}

async function verifyAdminPinCloud(pin) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: new Error("Supabase is not configured yet.") };
  const settings = getSupabaseSettings();
  const { data, error } = await client.rpc("verify_team_admin", {
    team_slug: settings.teamSlug,
    coach_pin: String(pin)
  });
  return { ok: data === true && !error, error };
}

async function saveConfigToCloud(config, pin) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error("Supabase is not configured yet.") };
  const settings = getSupabaseSettings();
  const payload = normalizeConfig(config);
  delete payload.adminPin;
  const { data, error } = await client.rpc("save_team_config", {
    team_slug: settings.teamSlug,
    payload,
    coach_pin: String(pin)
  });
  if (error) return { data: null, error };
  const normalized = normalizeConfig(data);
  saveConfig(normalized);
  return { data: normalized, error: null };
}

async function refreshConfigFromCloudIfAvailable() {
  if (!isSupabaseConfigured()) return false;
  const { data, error } = await loadConfigFromCloud();
  if (error || !data) return false;
  return true;
}

function subscribeToTeamConfigChanges(onUpdate, onStatus) {
  const client = getSupabaseClient();
  if (!client) {
    onStatus?.("LOCAL_ONLY");
    return null;
  }

  const settings = getSupabaseSettings();
  const channel = client
    .channel(`volleyball-team-${settings.teamSlug}-${Math.random().toString(16).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "volleyball_team_public",
        filter: `slug=eq.${settings.teamSlug}`
      },
      (payload) => {
        const cloudConfig = payload?.new?.config;
        if (!cloudConfig) return;
        const normalized = normalizeConfig(cloudConfig);
        saveConfig(normalized);
        onUpdate?.(normalized, payload?.new?.updated_at || null);
      }
    )
    .subscribe((status) => onStatus?.(status));

  return channel;
}

// Volleyball zones: 1=right back/server, 2=right front, 3=middle front,
// 4=left front, 5=left back, 6=middle back.
const ROTATION_COORDS = {
  1: { x: 78, y: 76 },
  2: { x: 79, y: 25 },
  3: { x: 50, y: 24 },
  4: { x: 21, y: 25 },
  5: { x: 21, y: 76 },
  6: { x: 50, y: 78 }
};

function getRotationMap(rotationNumber) {
  let mapping = [0, 1, 2, 3, 4, 5];
  const turns = Math.max(0, rotationNumber - 1);
  for (let i = 0; i < turns; i += 1) {
    mapping = [mapping[1], mapping[2], mapping[3], mapping[4], mapping[5], mapping[0]];
  }
  return mapping;
}

function getZoneForPlayer(playerIndex, rotationNumber) {
  const map = getRotationMap(rotationNumber);
  return map.indexOf(playerIndex) + 1;
}

function isFrontRow(zone) {
  return zone === 2 || zone === 3 || zone === 4;
}

function rowMatchesTrigger(zone, trigger) {
  if (trigger === "always") return true;
  if (trigger === "front") return isFrontRow(zone);
  return !isFrontRow(zone);
}

function getSystemRole(player, zone) {
  // 5-1: one designated setter in all six rotations.
  // The opposite/right side never becomes a setter in the back row.
  return player.role;
}

function getActiveCourt(config, rotationNumber) {
  const liberoTarget = config.libero?.rotations?.[String(rotationNumber)] || "";

  return config.players.map((starter, index) => {
    const zone = getZoneForPlayer(index, rotationNumber);
    const linkedSub = (config.subs || []).find(
      (sub) => sub.linkedPlayerId === starter.id && rowMatchesTrigger(zone, sub.trigger)
    );

    const liberoCanEnter = liberoTarget === starter.id && !isFrontRow(zone);
    const player = liberoCanEnter ? config.libero : (linkedSub || starter);

    return {
      index,
      zone,
      starter,
      player,
      isSub: Boolean(linkedSub) && !liberoCanEnter,
      isLibero: liberoCanEnter
    };
  });
}

// DS/libero bubbles keep the formation responsibility of the starter they replace.
function getFormationRole(entry) {
  if ((entry.isSub || entry.isLibero) && ["DS", "LIB"].includes(entry.player.role)) {
    return getSystemRole(entry.starter, entry.zone);
  }
  return getSystemRole(entry.player, entry.zone);
}

function getServeCoords(zone, rotationNumber = 1) {
  // Rotation 3 custom serving stack from coach reference: Zone 5 tucks into
  // the middle of the court instead of staying wide on the left sideline.
  if (rotationNumber === 3 && zone === 5) return { x: 46, y: 49 };

  const compactServe = {
    4: { x: 43, y: 17 },
    3: { x: 50, y: 7 },
    2: { x: 58, y: 14 },
    5: { x: 5, y: 43 },
    6: { x: 50, y: 92 },
    1: { x: 80, y: 105 }
  };
  return compactServe[zone] || ROTATION_COORDS[zone];
}

// Serve-receive patterns from the coach's six Option 1 diagrams.
// Coordinates are schematic percentages (net at top). Players are indexed
// by their ORIGINAL rotational slot, so substitutions inherit the same spot.
// In the diagram some arrows illustrate releases after serve contact. Coaches
// must check overlap legality in the actual starting positions for each serve.
const RECEIVE_BY_ROTATION = {
  1: {p1:[90,22],p2:[81,14],p3:[57,20],p4:[18,73],p5:[47,73],p6:[82,73]},
  2: {p1:[61,23],p2:[82,73],p3:[89,29],p4:[49,17],p5:[18,73],p6:[49,76]},
  3: {p1:[17,28],p2:[27,76],p3:[54,76],p4:[85,76],p5:[49,24],p6:[16,15]},
  4: {p1:[23,14],p2:[23,76],p3:[53,76],p4:[86,76],p5:[73,39],p6:[27,34]},
  5: {p1:[62,21],p2:[20,33],p3:[20,77],p4:[52,77],p5:[84,77],p6:[87,35]},
  6: {p1:[73,19],p2:[49,36],p3:[20,35],p4:[22,77],p5:[53,77],p6:[83,77]}
};

function getServeReceiveCoords(entry, activeCourt = [], rotationNumber = 1) {
  const coord = RECEIVE_BY_ROTATION[rotationNumber]?.[entry.starter.id];
  if (coord) return {x:coord[0],y:coord[1]};
  // Fallback if an administrator changes the starter identifiers.
  return ROTATION_COORDS[entry.zone];
}

function getSetterReleaseCoords(entry) {
  const role = getFormationRole(entry), {zone} = entry;
  if (role === "S") return {x:74,y:14};
  if (isFrontRow(zone)) {
    if (role === "OH") return {x:16,y:37};
    if (role === "MB") return {x:50,y:37};
    if (role === "RS") return {x:84,y:37};
  }
  if (role === "RS") return {x:84,y:76};
  if (role === "OH") return {x:zone === 6 ? 49 : 22,y:zone === 6 ? 80 : 67};
  return {x:49,y:83};
}

// On defense the front-row setter replaces the opposite at right front.
// On offense that SAME setter goes back to the setting target.
function getBaseCoords(entry) {
  const role = getFormationRole(entry), {zone} = entry;
  if (isFrontRow(zone)) {
    if (role === "S" || role === "RS") return {x:86,y:9};
    if (role === "OH") return {x:13,y:9};
    if (role === "MB") return {x:50,y:9};
  }
  if (role === "RS") return {x:87,y:76}; // Back-right, never sets.
  if (role === "S") return {x:87,y:51}; // Back-right base before releasing to set.
  if (role === "OH") return {x:16,y:62};
  return {x:49,y:87};
}

// These are defensive alignments AGAINST the opponent's selected hitter.
function getDefenseCoords(entry, attackRole) {
  const role = getFormationRole(entry), {zone} = entry;
  const front = isFrontRow(zone);
  const rightBlock = front && (role === "S" || role === "RS");
  const leftBlock = front && role === "OH";
  const middleBlock = front && role === "MB";
  if (attackRole === "OH") {
    if (rightBlock) return {x:86,y:7};
    if (middleBlock) return {x:69,y:7};
    if (leftBlock) return {x:19,y:32};
    if (role === "RS") return {x:89,y:64};
    if (role === "S") return {x:90,y:58};
    if (role === "OH") return {x:29,y:53};
    return {x:38,y:84};
  }
  if (attackRole === "MB") {
    if (middleBlock) return {x:50,y:7};
    if (leftBlock) return {x:19,y:24};
    if (rightBlock) return {x:79,y:24};
    if (role === "RS" || role === "S") return {x:89,y:65};
    if (role === "OH") return {x:12,y:61};
    return {x:50,y:91};
  }
  if (attackRole === "RS") {
    if (leftBlock) return {x:11,y:7};
    if (middleBlock) return {x:28,y:7};
    if (rightBlock) return {x:77,y:26};
    if (role === "RS" || role === "S") return {x:85,y:63};
    if (role === "OH") return {x:12,y:62};
    return {x:66,y:85};
  }
  return getBaseCoords(entry);
}

function getFreeballCoords(entry) {
  const role = getFormationRole(entry), {zone} = entry;
  if (role === "S") return {x:74,y:14};
  if (isFrontRow(zone) && role === "OH") return {x:16,y:42};
  if (isFrontRow(zone) && role === "MB") return {x:50,y:40};
  if (isFrontRow(zone) && role === "RS") return {x:84,y:42};
  if (role === "RS") return {x:84,y:77};
  if (role === "OH") return {x:18,y:69};
  return {x:51,y:80};
}

function getPositionLabel(role) {
  return {
    "S/RS": "Setter / Right Side",
    S: "Setter",
    RS: "Right Side",
    OH: "Outside Hitter",
    MB: "Middle Blocker",
    DS: "Defensive Specialist",
    LIB: "Libero"
  }[role] || role;
}

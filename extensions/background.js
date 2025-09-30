/** background.js **/
"use strict";

const PUSH_INTERVAL_MS = 2 * 60 * 1000;
const DOMAIN_CACHE_TTL_MS = 15 * 1000;

let envConfig = { supabaseUrl: "", supabaseKey: "" };
let currentUser = null;
// accum[goal_id][domain] = seconds
let accum = {};
let lastPushAt = 0;
let domainCache = { ts: 0, allowed: [], rejected: [], rows: [] };
let goalRows = [];            // cache of Extensions rows
let lastRowsRefresh = 0;

let softBlockState = {
  remainingSecs: 0,
  timer: null,
  isPaused: false
};

// --- NEW for local-day reset ---
function getLocalToday() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}
let currentLocalDate = getLocalToday();


async function startSoftBlock(timeoutMins, options = { preserve: false }) {
  console.log(`${safeLogPrefix()} Starting soft block, preserve: ${options.preserve}, remaining: ${softBlockState.remainingSecs}s`);

  if (!(options.preserve && softBlockState.remainingSecs > 0)) {
    softBlockState.remainingSecs = (timeoutMins || 5) * 60;
  }

  if (softBlockState.timer) {
    clearInterval(softBlockState.timer);
    softBlockState.timer = null;
  }
  softBlockState.isPaused = false;

  broadcastSoftBlockTick();

  const { rejected } = await fetchAndCacheDomains();
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = activeTabs && activeTabs[0] ? activeTabs[0] : null;
  const activeDomain = activeTab ? normalizeDomainFromUrl(activeTab.url) : null;
  if (!activeDomain || !rejected.some(p => isDomainMatch(activeDomain, p))) {
    pauseSoftBlock();
    return;
  }

  softBlockState.timer = setInterval(async () => {
    try {
      const { rejected } = await fetchAndCacheDomains();
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = activeTabs && activeTabs[0] ? activeTabs[0] : null;
      const activeDomain = activeTab ? normalizeDomainFromUrl(activeTab.url) : null;

      if (!activeDomain || !rejected.some(p => isDomainMatch(activeDomain, p))) {
        pauseSoftBlock();
        return;
      }

      if (!softBlockState.isPaused) {
        softBlockState.remainingSecs = Math.max(0, softBlockState.remainingSecs - 1);
        broadcastSoftBlockTick();

        if (softBlockState.remainingSecs <= 0) {
          clearInterval(softBlockState.timer);
          softBlockState.timer = null;
          console.log(`${safeLogPrefix()} ⛔ Soft block timer expired, enforcing block`);

          const tabs = await chrome.tabs.query({});
          const blockedTabs = tabs.filter(t => {
            const d = normalizeDomainFromUrl(t.url);
            return d && rejected.some(p => isDomainMatch(d, p));
          });

          for (const tab of blockedTabs) {
            try {
              checkAndBlock(tab.id, tab.url, true);
            } catch (e) {
              console.error(`${safeLogPrefix()} error forcing block on tab ${tab.id}:`, e);
            }
          }
        }
      }
    } catch (err) {
      console.error(`${safeLogPrefix()} softBlock timer tick error:`, err);
    }
  }, 1000);

  console.log(`${safeLogPrefix()} Soft block timer started with ${softBlockState.remainingSecs}s`);
}

function pauseSoftBlock() {
  if (softBlockState.timer && !softBlockState.isPaused) {
    softBlockState.isPaused = true;
    broadcastSoftBlockTick();
    console.log(`${safeLogPrefix()} ⏸️ Soft block paused (${softBlockState.remainingSecs}s remaining)`);
  }
}

function resumeSoftBlock() {
  if (softBlockState.isPaused && softBlockState.remainingSecs > 0) {
    softBlockState.isPaused = false;
    console.log(`${safeLogPrefix()} ▶️ Soft block resumed (${softBlockState.remainingSecs}s remaining)`);
    broadcastSoftBlockTick();
  }
}

function broadcastSoftBlockTick() {
  try {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "softBlockTick",
            remainingSecs: softBlockState.remainingSecs
          }, () => {});
        }
      }
    });
  } catch (e) {
    console.warn(`${safeLogPrefix()} broadcast tick failed:`, e);
  }
}

fetch(chrome.runtime.getURL("env.json"))
  .then(r => r.json())
  .then(cfg => {
    envConfig = cfg || envConfig;
    console.log("✅ Loaded env.json", envConfig);
  })
  .catch(err => console.warn("⚠️ Could not load env.json", err));

chrome.storage.local.get(["currentUser"], (data) => {
  if (data.currentUser) {
    currentUser = data.currentUser;
    console.log("🔁 Restored currentUser from storage:", currentUser);
  }
});

chrome.runtime.onMessage.addListener(async(msg, sender, sendResponse) => {
  try {
    if (msg?.type === "saveSession") {
      currentUser = {
        access_token: msg.access_token || null,
        profile_id: msg.profile_id || null
      };
      chrome.storage.local.set({ currentUser });
      console.log("🔑 Received saveSession:", currentUser);

      resolveProfileId().then(pid => {
        console.log("🔎 resolveProfileId result:", pid);
        sendResponse({ ok: true, resolved_profile_id: pid });
      }).catch(err => {
        console.error("❌ resolveProfileId error:", err);
        sendResponse({ ok: false, error: String(err) });
      });

      domainCache = { ts: 0, allowed: [], rejected: [], rows: [] };
      return true;
    }

    if (msg?.type === "refreshDomainCache") {
      domainCache = { ts: 0, allowed: [], rejected: [], rows: [] };
      console.log("🔄 Manual domain cache refresh requested");
      sendResponse({ ok: true });
      return true;
    }

    if (msg?.type === "testDomain") {
      testDomainBlocking(msg.testUrl);
      sendResponse({ ok: true });
      return true;
    }

    if (msg?.type === "getOverlaySetting") {
      fetchOverlaySetting()
        .then(overlay => {
          Promise.resolve().then(() => sendResponse({ overlay }));
        })
        .catch(err => {
          console.error("❌ getOverlaySetting error:", err);
          Promise.resolve().then(() => sendResponse({ overlay: false }));
        });
      return true;
    }

    if (msg?.type === "getSoftBlockTime") {
      const settings = await fetchSettings();
      const defaultTimeout = settings?.timeout || 5;
      let secs = softBlockState.remainingSecs;

      if (settings?.soft_block && secs <= 0 && !softBlockState.timer) {
        secs = defaultTimeout * 60;
      }

      sendResponse({
        remainingSecs: secs,
        defaultTimeout,
        isPaused: softBlockState.isPaused
      });
      return true;
    }

  } catch (e) {
    console.error("❌ onMessage handler threw:", e);
  }

  sendResponse({ ok: true });
  return false;
});

function safeLogPrefix() {
  return `[sw ${new Date().toISOString()}]`;
}

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4;
    const padded = pad ? (payload + "=".repeat(4 - pad)) : payload;
    const json = atob(padded);
    return JSON.parse(json);
  } catch (e) {
    console.warn("⚠️ decodeJwt failed:", e);
    return null;
  }
}

function normalizeDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function parseDomainsField(raw) {
  let domains = [];
  if (!raw) return domains;

  if (Array.isArray(raw)) {
    domains = raw.map(d => String(d).trim());
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();

    // 🔑 Handle Postgres text[] like {instagram.com,youtube.com}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      domains = trimmed
        .slice(1, -1)                // remove outer { }
        .split(",")
        .map(d => d.trim().replace(/^"|"$/g, "")) // strip optional quotes
        .filter(Boolean);
    } else if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      // also handle JSON array format
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) domains = parsed.map(d => String(d).trim());
      } catch {}
    }

    if (!domains.length) {
      domains = raw.split(",").map(d => d.trim()).filter(Boolean);
    }
  }

  return domains.map(d => {
    let domain = d.toLowerCase().replace(/^www\./, "");
    if (!domain.includes(".")) domain += ".com";
    return domain;
  });
}

function isDomainMatch(domain, pat) {
  const a = String(domain || "").replace(/^www\./, "").toLowerCase();
  const b = String(pat || "").replace(/^www\./, "").toLowerCase();
  return a === b || a.endsWith("." + b);
}

async function resolveProfileId() {
  if (!currentUser) throw new Error("no currentUser");
  if (currentUser.profile_id) {
    console.log(`${safeLogPrefix()} profile_id already present:`, currentUser.profile_id);
    return currentUser.profile_id;
  }
  if (!envConfig.supabaseUrl) throw new Error("no supabaseUrl in env");
  if (!currentUser.access_token) throw new Error("no access_token provided");

  let jwtSub = null;
  const payload = decodeJwt(currentUser.access_token);
  if (payload?.sub) {
    jwtSub = payload.sub;
    console.log(`${safeLogPrefix()} decoded JWT sub:`, jwtSub);
  } else {
    console.warn(`${safeLogPrefix()} JWT decode didn't reveal sub`);
  }

  const headers = {
    apikey: envConfig.supabaseKey,
    Authorization: `Bearer ${currentUser.access_token}`
  };

  if (jwtSub) {
    try {
      const url = `${envConfig.supabaseUrl}/rest/v1/Profiles?id=eq.${encodeURIComponent(jwtSub)}&select=id`;
      console.log(`${safeLogPrefix()} trying Profiles by id GET: ${url}`);
      const res = await fetch(url, { headers });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].id) {
          currentUser.profile_id = rows[0].id;
          chrome.storage.local.set({ currentUser });
          console.log(`${safeLogPrefix()} resolved profile_id by sub:`, currentUser.profile_id);
          return currentUser.profile_id;
        }
        console.log(`${safeLogPrefix()} Profiles by id returned 0 rows`);
      } else {
        const txt = await res.text();
        console.warn(`${safeLogPrefix()} Profiles by id returned status ${res.status}: ${txt}`);
      }
    } catch (e) {
      console.error(`${safeLogPrefix()} error fetching Profiles by id:`, e);
    }
  }

  try {
    const url2 = `${envConfig.supabaseUrl}/rest/v1/Profiles?select=id`;
    console.log(`${safeLogPrefix()} trying Profiles no-filter GET: ${url2}`);
    const res2 = await fetch(url2, { headers });
    if (res2.ok) {
      const rows2 = await res2.json();
      if (rows2 && rows2.length > 0 && rows2[0].id) {
        currentUser.profile_id = rows2[0].id;
        chrome.storage.local.set({ currentUser });
        console.log(`${safeLogPrefix()} resolved profile_id via Profiles list:`, currentUser.profile_id);
        return currentUser.profile_id;
      }
      console.log(`${safeLogPrefix()} Profiles no-filter returned 0 rows`);
    } else {
      const txt2 = await res2.text();
      console.warn(`${safeLogPrefix()} Profiles no-filter returned ${res2.status}: ${txt2}`);
    }
  } catch (e) {
    console.error(`${safeLogPrefix()} error fetching Profiles no-filter:`, e);
  }

  if (payload) {
    const possible = payload.sub || payload.user_id || payload.uid || payload.aud || null;
    if (possible) {
      console.log(`${safeLogPrefix()} trying fallback id from JWT fields:`, possible);
      try {
        const url3 = `${envConfig.supabaseUrl}/rest/v1/Profiles?id=eq.${encodeURIComponent(possible)}&select=id`;
        const res3 = await fetch(url3, { headers });
        if (res3.ok) {
          const rows3 = await res3.json();
          if (rows3 && rows3.length > 0 && rows3[0].id) {
            currentUser.profile_id = rows3[0].id;
            chrome.storage.local.set({ currentUser });
            console.log(`${safeLogPrefix()} resolved profile_id via fallback field:`, currentUser.profile_id);
            return currentUser.profile_id;
          }
        }
      } catch (e) {
        console.warn(`${safeLogPrefix()} fallback fetch error:`, e);
      }
    }
  }

  console.warn(`${safeLogPrefix()} could not resolve profile_id for current token`);
  return null;
}

async function fetchOverlaySetting() {
  const pid = await resolveProfileId();
  if (!pid) return false;
  if (!envConfig.supabaseUrl) return false;

  const url = `${envConfig.supabaseUrl}/rest/v1/Settings?id=eq.${encodeURIComponent(pid)}&select=overlay`;
  const headers = {
    apikey: envConfig.supabaseKey,
    Authorization: `Bearer ${currentUser.access_token}`
  };
  console.log(`${safeLogPrefix()} fetching overlay setting -> ${url}`);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`${safeLogPrefix()} Settings fetch failed ${res.status}`);
    return false;
  }
  const rows = await res.json();
  if (rows && rows.length > 0) {
    return !!rows[0].overlay;
  }
  return false;
}

async function fetchSettings() {
  try {
    const pid = await resolveProfileId();
    if (!pid) return null;

    const url = `${envConfig.supabaseUrl}/rest/v1/Settings?id=eq.${encodeURIComponent(pid)}&select=hard_block,soft_block,timeout`;
    const headers = {
      apikey: envConfig.supabaseKey,
      Authorization: `Bearer ${currentUser.access_token}`
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`${safeLogPrefix()} Settings fetch failed ${res.status}`);
      return null;
    }

    const rows = await res.json();
    return rows && rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.error("❌ fetchSettings error:", e);
    return null;
  }
}

async function fetchExtensionsRows() {
  try {
    const pid = await resolveProfileId();
    if (!pid) {
      console.warn("⚠️ fetchExtensionsRows: no profile_id resolved");
      return [];
    }
    if (!envConfig.supabaseUrl) {
      console.warn("⚠️ fetchExtensionsRows: no supabaseUrl");
      return [];
    }

    const url = `${envConfig.supabaseUrl}/rest/v1/Extensions?id=eq.${encodeURIComponent(pid)}&select=*`;
    const headers = {
      apikey: envConfig.supabaseKey,
      Authorization: `Bearer ${currentUser.access_token}`
    };
    console.log(`${safeLogPrefix()} fetching Extensions for profile_id ${pid} -> ${url}`);
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const txt = await resp.text();
      console.warn(`${safeLogPrefix()} Extensions fetch failed ${resp.status}: ${txt}`);
      return [];
    }
    const rows = await resp.json();
    console.log(`${safeLogPrefix()} Got Extensions rows:`, rows.length, "for profile_id:", pid);
    return rows;
  } catch (e) {
    console.error("❌ fetchExtensionsRows error:", e);
    return [];
  }
}

// --- helper: reset a single Extensions row if its stored date != local date ---
async function resetRowIfOld(row) {
     const today = getLocalToday();
     // row.date might be returned as "YYYY-MM-DD"
     const rowDate = row.date ? row.date.slice(0, 10) : null;
     if (rowDate !== today) {
       console.log(`${safeLogPrefix()} 🔄 Resetting row ${row.id} (stored date ${rowDate}) → ${today}`);
       const url = `${envConfig.supabaseUrl}/rest/v1/Extensions?id=eq.${encodeURIComponent(row.id)}`;
       const headers = {
         apikey: envConfig.supabaseKey,
         Authorization: `Bearer ${currentUser.access_token}`,
         "Content-Type": "application/json",
       };
       const payload = {
         focused_time: 0,
         distracted_time: 0,
         deviation_warning: 0,
         date: today
       };
       const resp = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(payload) });
       if (!resp.ok) {
         const txt = await resp.text();
         console.warn(`${safeLogPrefix()} ⚠️ Failed to reset row ${row.id}: ${resp.status} ${txt}`);
       }
     }
  }
  

// --- NEW: reset all Extension rows for the new local day ---
async function resetExtensionsForNewDay() {
  try {
    // Fetch the current Extensions rows for this profile
     const rows = await fetchExtensionsRows();
     if (!rows.length) return;
 
     // For each row, compare its `date` column to today's local date
     // and reset timers if it is an old date.
     for (const row of rows) {
       await resetRowIfOld(row);
     }
  } catch (e) {
    console.error(`${safeLogPrefix()} ❌ resetExtensionsForNewDay error:`, e);
  }
}

async function fetchAndCacheDomains() {
  const now = Date.now();
  if (now - domainCache.ts < DOMAIN_CACHE_TTL_MS && domainCache.rows.length) return domainCache;

  const rows = await fetchExtensionsRows();
  let allowed = [], rejected = [];
  for (const row of rows) {
    allowed.push(...parseDomainsField(row.allowed_domains));
    rejected.push(...parseDomainsField(row.rejected_domains));
  }
  domainCache = { ts: now, allowed: [...new Set(allowed)], rejected: [...new Set(rejected)], rows };
  console.log(`${safeLogPrefix()} Domain cache:`, domainCache);
  return domainCache;
}

async function checkAndBlock(tabId, url, force = false) {
  const domain = normalizeDomainFromUrl(url);
  if (!domain) return;
  if (!currentUser?.access_token) return;

  const { allowed, rejected, rows } = await fetchAndCacheDomains();
  if (!rejected || rejected.length === 0) return;

  const isBlocked = rejected.some(p => isDomainMatch(domain, p));
  const isAllowed = allowed.some(p => isDomainMatch(domain, p));
  
  if (isBlocked) {
    // 🔹 NEW: Increment deviation_warning for the matching Extensions row(s)
    try {
      for (const row of rows) {
        const rejectedList = parseDomainsField(row.rejected_domains);
        if (rejectedList.some(p => isDomainMatch(domain, p))) {
          const patchUrl = `${envConfig.supabaseUrl}/rest/v1/Extensions?id=eq.${encodeURIComponent(row.id)}&goal_id=eq.${encodeURIComponent(row.goal_id)}`;
          const headers = {
            apikey: envConfig.supabaseKey,
            Authorization: `Bearer ${currentUser.access_token}`,
            "Content-Type": "application/json",
          };
          const newCount = (row.deviation_warning || 0) + 1;
          await fetch(patchUrl, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ deviation_warning: newCount }),
          });
          console.log(`${safeLogPrefix()} 🔹 deviation_warning incremented for domain: ${domain}`);
        }
      }
    } catch (e) {
      console.error(`${safeLogPrefix()} error incrementing deviation_warning:`, e);
    }
    // 🔹 END of new code

    const settings = await fetchSettings();
    if (!settings) return;
  
if (settings.hard_block || force) {
  console.warn(`${safeLogPrefix()} HARD BLOCK → closing ${domain} and focusing Supervisor page`);
chrome.tabs.remove(tabId, () => {
  // Look for any tab that is already showing your site (any page)
  chrome.tabs.query({ url: "http://localhost:5173/*" }, (tabs) => {
    if (tabs.length > 0) {
      // If a tab is already open on your site, navigate it to SupervisorPage
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { 
        url: "http://localhost:5173/supervisor", // force it to this page
        active: true
      });
      chrome.windows.update(tab.windowId, { focused: true });
    } else {
      // If no tab from your site is open, open a brand new tab at SupervisorPage
      chrome.tabs.create({ url: "http://localhost:5173/supervisor" });
    }
  });
});

  delete accum[domain];
  return;
}

  
    if (settings.soft_block) {
      if (softBlockState.remainingSecs <= 0 || !softBlockState.timer) {
        console.log(`${safeLogPrefix()} Starting new SOFT BLOCK countdown for blocked domains`);
        startSoftBlock(settings.timeout || 5, { preserve: false });
        return;
      }

      if (softBlockState.isPaused) {
        console.log(`${safeLogPrefix()} Resuming SOFT BLOCK timer (${softBlockState.remainingSecs}s left)`);
        resumeSoftBlock();
        return;
      }

      console.log(`${safeLogPrefix()} soft-block already active (${softBlockState.remainingSecs}s left)`);
      return;
    }

    const showOverlay = await fetchOverlaySetting();
if (!showOverlay) {
  console.warn(`${safeLogPrefix()} overlay disabled → closing ${domain} and focusing Supervisor page`);
chrome.tabs.remove(tabId, () => {
  // Look for any tab that is already showing your site (any page)
  chrome.tabs.query({ url: "http://localhost:5173/*" }, (tabs) => {
    if (tabs.length > 0) {
      // If a tab is already open on your site, navigate it to SupervisorPage
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { 
        url: "http://localhost:5173/supervisor", // force it to this page
        active: true
      });
      chrome.windows.update(tab.windowId, { focused: true });
    } else {
      // If no tab from your site is open, open a brand new tab at SupervisorPage
      chrome.tabs.create({ url: "http://localhost:5173/supervisor" });
    }
  });
});

  delete accum[domain];
  return;
}


    console.warn(`${safeLogPrefix()} blocking ${domain} with overlay`);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (videoUrl) => {
          try {
            document.head && (document.head.innerHTML = "");
            document.body && (document.body.innerHTML = "");
          } catch (e) {}
          const overlay = document.createElement("div");
          Object.assign(overlay.style, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "black",
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          });
          const video = document.createElement("video");
          video.autoplay = true;
          video.controls = false;
          video.muted = false;
          video.style.maxWidth = "100%";
          video.style.maxHeight = "100%";
          video.src = videoUrl;
          overlay.appendChild(video);
          document.documentElement.appendChild(overlay);
        },
        args: [chrome.runtime.getURL("assets/default-video.mp4")],
      });
} catch (e) {
  console.error(`${safeLogPrefix()} scripting.executeScript error:`, e);
chrome.tabs.remove(tabId, () => {
  // Look for any tab that is already showing your site (any page)
  chrome.tabs.query({ url: "http://localhost:5173/*" }, (tabs) => {
    if (tabs.length > 0) {
      // If a tab is already open on your site, navigate it to SupervisorPage
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { 
        url: "http://localhost:5173/supervisor", // force it to this page
        active: true
      });
      chrome.windows.update(tab.windowId, { focused: true });
    } else {
      // If no tab from your site is open, open a brand new tab at SupervisorPage
      chrome.tabs.create({ url: "http://localhost:5173/supervisor" });
    }
  });
});

}

      delete accum[domain];
      return;}

  if (isAllowed || !rejected.some(p => isDomainMatch(domain, p))) {
    pauseSoftBlock();
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && tab.url) checkAndBlock(tab.id, tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete" && tab.url) checkAndBlock(tabId, tab.url);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab?.url) checkAndBlock(tab.id, tab.url);
  });
});

async function tickAccum() {
  const now = Date.now();

  if (now - lastRowsRefresh > 30_000) {
    goalRows = await fetchExtensionsRows();
    lastRowsRefresh = now;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.url) return;

  const domain = normalizeDomainFromUrl(tabs[0].url);
  if (!domain) return;

// accum[goal_id][domain] = seconds
if (!accum) accum = {};

for (const row of goalRows) {               // goalRows already refreshed every 30 s
  const gid = row.goal_id;
  if (!accum[gid]) accum[gid] = {};
  const d = normalizeDomainFromUrl(tabs[0].url);
  if (!d) continue;
  accum[gid][d] = (accum[gid][d] || 0) + 1;
}


  if (now - lastPushAt >= PUSH_INTERVAL_MS) {
    pushToSupabase();
    lastPushAt = now;
  }
}

setInterval(tickAccum, 1000);
// --- NEW: check every minute if local date rolled over ---
setInterval(() => {
  // Check database rows once a minute and reset any whose stored date is old
  resetExtensionsForNewDay();
}, 60 * 1000);

async function pushToSupabase() {
  if (!currentUser?.access_token) {
    console.log(`${safeLogPrefix()} pushToSupabase: no session, skipping`);
    return;
  }

  // 1️⃣ Get all Extensions rows for this profile
  const rows = await fetchExtensionsRows();
  if (!rows.length) {
    console.log(`${safeLogPrefix()} pushToSupabase: no Extensions rows, skipping`);
    return;
  }

  // --- NEW: we now have accum per goal ---
  for (const row of rows) {
    const gid = row.goal_id;
    const allowedList  = parseDomainsField(row.allowed_domains);
    const rejectedList = parseDomainsField(row.rejected_domains);
  
    let focusedForRow    = 0;
    let distractedForRow = 0;
  
    const perGoal = accum[gid] || {};

    for (const domain in perGoal) {
      const secs = perGoal[domain];

      console.log('Goal', gid,
        'allowedList', allowedList,
        'rejectedList', rejectedList);
      
      
      if (allowedList.some(p => isDomainMatch(domain, p)))  focusedForRow    += secs;
      if (rejectedList.some(p => isDomainMatch(domain, p))) distractedForRow += secs;
    } 

  const payload = {
    focused_time:    (row.focused_time    || 0) + focusedForRow,
    distracted_time: (row.distracted_time || 0) + distractedForRow,
  };

  try {
    const url = `${envConfig.supabaseUrl}/rest/v1/Extensions?id=eq.${encodeURIComponent(row.id)}&goal_id=eq.${encodeURIComponent(row.goal_id)}`;
    const headers = {
      apikey: envConfig.supabaseKey,
      Authorization: `Bearer ${currentUser.access_token}`,
      "Content-Type": "application/json",
    };
    const resp = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(payload) });
    if (!resp.ok) {
      const txt = await resp.text();
      console.warn(`${safeLogPrefix()} PATCH Extensions returned ${resp.status}: ${txt}`);
    } else {
      console.log(`${safeLogPrefix()} Updated Extensions row: ${row.id}`, payload);
    }
  } catch (e) {
    console.error(`${safeLogPrefix()} pushToSupabase error:`, e);
  }
}

// 🔹 Clear the accumulator only after processing every goal
accum = {};
}


function testDomainBlocking(testUrl) {
  const domain = normalizeDomainFromUrl(testUrl);
  if (!domain) return;
  fetchAndCacheDomains().then(({ rejected }) => {
    for (const pat of rejected) {
      if (isDomainMatch(domain, pat)) {
        console.log(`🚫 ${domain} WOULD BE BLOCKED by ${pat}`);
        return;
      }
    }
    console.log(`✅ ${domain} would be ALLOWED`);
  });
}
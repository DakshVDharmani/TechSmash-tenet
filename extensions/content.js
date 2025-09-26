/** content.js **/
(function () {
  if (window.__nexora_injected) return;
  window.__nexora_injected = true;

  // ---- Bridge: forward SAVE_SESSION + UPDATE_OVERLAY ----
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data?.type === "SAVE_SESSION") {
      const payload = {
        type: "saveSession",
        access_token: event.data.access_token || null,
        profile_id: event.data.profile_id || null,
      };
      try {
        chrome.runtime.sendMessage(payload, (resp) => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || "";
            console.warn("⚠️ content.js sendMessage error:", msg);

            if (msg.includes("Extension context invalidated")) {
              console.log("🔄 Retrying SAVE_SESSION after 500ms...");
              setTimeout(() => {
                chrome.runtime.sendMessage(payload, (resp2) => {
                  if (chrome.runtime.lastError) {
                    console.warn("⚠️ Retry failed:", chrome.runtime.lastError.message);
                  } else {
                    console.log("📩 SAVE_SESSION retried successfully:", resp2);
                  }
                });
              }, 500);
            }
          } else {
            console.log("📩 content.js forwarded SAVE_SESSION to extension:", resp);
          }
        });
      } catch (e) {
        console.error("❌ content.js runtime.sendMessage failed:", e);
      }
    }

    if (event.data?.type === "UPDATE_OVERLAY") {
      try {
        chrome.runtime.sendMessage(
          {
            type: "updateOverlay",
            overlay: event.data.overlay,
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              console.warn("⚠️ content.js updateOverlay error:", chrome.runtime.lastError.message);
            } else {
              console.log("📩 content.js forwarded UPDATE_OVERLAY:", resp);
            }
          }
        );
      } catch (e) {
        console.error("❌ content.js runtime.sendMessage failed:", e);
      }
    }
  });

  // ---- Floating Icon Injection ----
  function injectFloatingIcon() {
    if (document.getElementById("nexora-floating-icon")) return;

    const icon = document.createElement("div");
    icon.id = "nexora-floating-icon";
    Object.assign(icon.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      width: "72px",
      height: "72px",
      borderRadius: "16px",
      zIndex: 2147483647,
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(10px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "grab",
      boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      transition: "transform 0.25s ease, box-shadow 0.25s ease, left 0.1s ease, top 0.1s ease",
      opacity: "0.9",
    });

    const countdown = document.createElement("div");
    countdown.id = "nexora-countdown";
    Object.assign(countdown.style, {
      position: "absolute",
      top: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "6px 12px",
      borderRadius: "8px",
      background: "rgba(0,0,0,0.75)",
      color: "#00ff99",
      fontFamily: "monospace",
      fontSize: "15px",
      fontWeight: "bold",
      letterSpacing: "1px",
      zIndex: 2147483647,
      boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
      display: "none",
    });
    countdown.textContent = "00:00";

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("assets/icon.jpg");
    Object.assign(img.style, {
      width: "70%",
      height: "70%",
      borderRadius: "12px",
      objectFit: "cover",
      pointerEvents: "none",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
    });

    icon.appendChild(img);
    icon.appendChild(countdown);
    document.body.appendChild(icon);

    // Initialize countdown
    function initializeCountdown() {
      chrome.runtime.sendMessage({ type: "getSoftBlockTime" }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn("⚠️ getSoftBlockTime error:", chrome.runtime.lastError.message);
          return;
        }
        if (resp && typeof resp.remainingSecs === "number") {
          const mins = Math.floor(resp.remainingSecs / 60).toString().padStart(2, "0");
          const secsStr = (resp.remainingSecs % 60).toString().padStart(2, "0");
          countdown.textContent = `${mins}:${secsStr}`;
        } else {
          countdown.textContent = "00:00";
        }
      });
    }

    initializeCountdown();

    let countdownVisible = false;
    icon.addEventListener("click", () => {
      countdownVisible = !countdownVisible;
      countdown.style.display = countdownVisible ? "block" : "none";
      if (countdownVisible) {
        initializeCountdown();
      }
    });

    icon.addEventListener("mouseenter", () => {
      icon.style.transform = "scale(1.08)";
      icon.style.boxShadow = "0 10px 28px rgba(0,0,0,0.4)";
      icon.style.opacity = "1";
    });
    icon.addEventListener("mouseleave", () => {
      icon.style.transform = "scale(1)";
      icon.style.boxShadow = "0 6px 20px rgba(0,0,0,0.25)";
      icon.style.opacity = "0.9";
    });

    chrome.storage.local.get(["widgetPos"], (data) => {
      if (data.widgetPos) {
        icon.style.left = data.widgetPos.x + "px";
        icon.style.top = data.widgetPos.y + "px";
        icon.style.right = "";
        icon.style.bottom = "";
      }
    });

    let isDragging = false,
      offsetX = 0,
      offsetY = 0,
      targetX = 0,
      targetY = 0;
    icon.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - icon.getBoundingClientRect().left;
      offsetY = e.clientY - icon.getBoundingClientRect().top;
      document.body.style.userSelect = "none";
      icon.style.cursor = "grabbing";
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      targetX = e.clientX - offsetX;
      targetY = e.clientY - offsetY;
      requestAnimationFrame(() => {
        icon.style.left = targetX + "px";
        icon.style.top = targetY + "px";
        icon.style.right = "";
        icon.style.bottom = "";
      });
    });
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = "";
      icon.style.cursor = "grab";
      chrome.storage.local.set({ widgetPos: { x: targetX, y: targetY } });
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "softBlockTick") {
        const mins = Math.floor(msg.remainingSecs / 60).toString().padStart(2, "0");
        const secs = (msg.remainingSecs % 60).toString().padStart(2, "0");
        countdown.textContent = `${mins}:${secs}`;
      }
    });
  }

  const HOSTNAME = window.location.hostname;
  const PORT = window.location.port;
  console.log("Nexora extension injected on:", window.location.href);

  const isNexoraSite =
    (HOSTNAME === "localhost" && PORT === "5173") ||
    (HOSTNAME && HOSTNAME.includes("nexora.com"));

  if (HOSTNAME && !isNexoraSite) {
    chrome.runtime.sendMessage({ type: "getOverlaySetting" }, (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("⚠️ Could not fetch overlay setting:", chrome.runtime.lastError.message);
        injectFloatingIcon();
        return;
      }
      console.log("📥 overlay setting response:", resp);
      if (!resp?.overlay) {
        console.log("🚫 Overlay disabled → not injecting floating icon");
        return;
      }
      injectFloatingIcon();
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "thresholdExceeded") {
      const ev = new CustomEvent("nexora:thresholdExceeded", { detail: msg });
      window.dispatchEvent(ev);
    }
  });
})();
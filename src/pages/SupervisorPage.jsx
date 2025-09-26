import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

// Enhanced SupervisorPage.jsx
// - Sticky, always-visible "Get Supervisor Advice" button
// - Animated "thinking" dots
// - Subtle glow while advice is loading
// - Parallax 3D tilt on the avatar video using mousemove + requestAnimationFrame
// - Small CSS injected at runtime so you don't need to change Tailwind config

const SupervisorPage = () => {
  const [user, setUser] = useState(null);
  const [avatars, setAvatars] = useState([]); // all avatars from DB (with fullname merged)
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [loading, setLoading] = useState(true);

  // Supervisor advice states
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState(null);
  const [advicePoints, setAdvicePoints] = useState([]); // array of 3 strings

  // Refs for tilt effect
  const videoWrapRef = useRef(null);
  const rafRef = useRef(null);
  const pointerStateRef = useRef({ x: 0, y: 0, isActive: false });

  // Map avatar_index to video + description (as before)
  const avatarAssets = {
    1: {
      video: "/avatar1idle.mp4",
      description:
        "Neo – a strategist who thrives on logic and efficiency. Specializes in structured operations.",
    },
    2: {
      video: "/avatar2idle.mp4",
      description:
        "Bond – smooth operator, adaptable in any scenario. Balances intuition with discipline.",
    },
    3: {
      video: "/avatar3idle.mp4",
      description:
        "Ciphera – master of cryptic analysis and sharp insights. Excels in problem-solving under pressure.",
    },
    4: {
      video: "/avatar4idle.mp4",
      description:
        "Agent Hill – resilient and precise. Known for tactical execution and strong leadership.",
    },
  };

  // Inject a small set of helper CSS keyframes/classes so this file works without editing Tailwind config.
  useEffect(() => {
    const styleId = "supervisor-page-enhanced-css";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
      .animate-fadeIn { animation: fadeInUp 360ms ease-in-out both; }

      /* three-dot loader */
      @keyframes dotPulse {
        0% { transform: translateY(0); opacity: .35}
        40% { transform: translateY(-6px); opacity: 1}
        80% { transform: translateY(0); opacity: .35}
      }
      .dot { width: 6px; height: 6px; border-radius: 9999px; display: inline-block; margin-left: 6px; }
      .dot--delay-1 { animation: dotPulse 900ms ease-in-out infinite; animation-delay: 0ms; }
      .dot--delay-2 { animation: dotPulse 900ms ease-in-out infinite; animation-delay: 150ms; }
      .dot--delay-3 { animation: dotPulse 900ms ease-in-out infinite; animation-delay: 300ms; }

      /* glowing border when AI is thinking */
      .advice-loading { box-shadow: 0 10px 30px rgba(99,102,241,0.06), inset 0 0 30px rgba(99,102,241,0.03); border-color: rgba(99,102,241,0.28) !important; }
      .advice-loading::after { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: 8px; box-shadow: 0 0 40px rgba(99,102,241,0.06); }

      /* glitchy console title (subtle) */
      @keyframes flicker {
        0% { opacity: 1; transform: translateX(0);} 50% { opacity: .85; transform: translateX(.5px);} 100% { opacity: 1; transform: translateX(0);} }
      .console-title { animation: flicker 2.6s linear infinite; }

      /* video shadow pulse */
      @keyframes videoPulse { 0%{ box-shadow: 0 10px 30px rgba(0,0,0,0.18);} 50%{ box-shadow: 0 16px 48px rgba(0,0,0,0.28);} 100%{ box-shadow: 0 10px 30px rgba(0,0,0,0.18);} }
      .video-pulse { animation: videoPulse 6s ease-in-out infinite; }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Get supervisor user
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData?.user || null);

        // Fetch avatars
        const { data: avatarsData, error: avatarsError } = await supabase
          .from("avatars")
          .select("*");

        if (avatarsError) {
          console.error("Error fetching avatars:", avatarsError.message);
          setLoading(false);
          return;
        }

        // Fetch profiles in one go (to map fullname)
        const { data: profilesData, error: profilesError } = await supabase
          .from("Profiles")
          .select("id, fullname");

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError.message);
        }

        // Merge fullname into avatars
        const enrichedAvatars = (avatarsData || []).map((avatar) => {
          const profile = (profilesData || []).find((p) => p.id === avatar.user_id);
          return { ...avatar, fullname: profile?.fullname || "Unnamed" };
        });

        setAvatars(enrichedAvatars);
        if (enrichedAvatars.length > 0) setSelectedAvatar(enrichedAvatars[0]);
      } catch (err) {
        console.error("Supervisor init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ==== Helper: parse response text into 3 points (robust)
  const parseThreePoints = (text) => {
    if (!text) return [];
    // Try to split on numbered lines "1)" or "1." or "1 -"
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // If we detect numbered lines, group them
    const numbered = lines.join("\n").split(/\n(?=\s*\d+[\).\-\s])/);
    if (numbered.length >= 3) {
      return numbered.slice(0, 3).map((s) => s.trim());
    }
    // fallback: split by double newlines or by sentences
    const byDouble = text.split(/\n\s*\n/).filter(Boolean);
    if (byDouble.length >= 3) return byDouble.slice(0, 3).map(s => s.trim());
    // fallback: split by sentences
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    const groups = [];
    let idx = 0;
    while (groups.length < 3 && idx < sentences.length) {
      groups.push((groups.length === 0 ? '' : '') + sentences[idx].trim());
      idx++;
    }
    return groups.map(s => s.trim()).filter(Boolean).slice(0, 3);
  };

  // ==== Main handler: fetch Supabase rows, build prompt, call Ollama proxy
  const handleGetSupervisorAdvice = async () => {
    setAdviceError(null);
    setAdvicePoints([]);
    if (!selectedAvatar) {
      setAdviceError("No avatar selected.");
      return;
    }
    setAdviceLoading(true);

    try {
      const userId = selectedAvatar.user_id;
      console.debug("DEBUG: Starting advice fetch for user_id:", userId);

      // 1) Extensions: distracted_time, focused_time (all rows for user)
      // Note: Schema has no user_id, assuming goal_id is used to filter
      const { data: extensions, error: extErr } = await supabase
        .from("Extensions")
        .select("distracted_time, focused_time, created_at")
        .eq("goal_id", userId); // Changed from user_id to goal_id

      if (extErr) {
        console.warn("Extensions fetch warning:", extErr.message);
      } else {
        console.debug("DEBUG: Fetched extensions:", extensions);
      }

      // 2) Roadmaps: timeframe (all rows)
      const { data: roadmaps, error: roadErr } = await supabase
        .from("roadmaps")
        .select("timeframe, title, created_at")
        .eq("user_id", userId);

      if (roadErr) {
        console.warn("Roadmaps fetch warning:", roadErr.message);
      } else {
        console.debug("DEBUG: Fetched roadmaps:", roadmaps);
      }

      // 3) Objectives: progress (all user's rows)
      const { data: objectives, error: objErr } = await supabase
        .from("objectives")
        .select("id, title, progress, created_at") // Changed from name to title
        .eq("user_id", userId);

      if (objErr) {
        console.warn("Objectives fetch warning:", objErr.message);
      } else {
        console.debug("DEBUG: Fetched objectives:", objectives);
      }

      // 4) overall_progress table single row (if exists)
      const { data: overallRows, error: overallErr } = await supabase
        .from("overall_progress")
        .select("overall_progress")
        .eq("id", userId) // Changed from user_id to id
        .maybeSingle();

      if (overallErr) {
        console.warn("Overall progress warning:", overallErr.message);
      } else {
        console.debug("DEBUG: Fetched overall_progress:", overallRows);
      }

      // Build a compact, readable summary to send to Ollama
      const summary = {
        user_id: userId,
        avatar_fullname: selectedAvatar.fullname,
        extensions: extensions || [],
        roadmaps: (roadmaps || []).map(r => ({ timeframe: r.timeframe, title: r.title })),
        objectives: (objectives || []).map(o => ({ id: o.id, title: o.title, progress: o.progress })), // Changed from name to title
        overall_progress: overallRows?.overall_progress ?? null,
      };
      console.debug("DEBUG: Built summary:", summary);

      // Create a strong prompt: instruct Ollama to analyze deeply and return EXACTLY three structured points.
      const prompt = `
You are a data-driven mentor. I will provide data for a user. Do a deep analysis using the numbers and return EXACTLY three structured (non-JSON) points labelled "1)", "2)", "3)". Each point should be concise (no more than 3-4 sentences). Use evidence from the provided data to say where the user is going RIGHT or WRONG. If the user is going wrong, recommend concrete actions and prioritize them. If the user is going right, identify strengths and how to amplify them. Finally, encourage the user to improve productivity.

DATA:
${JSON.stringify(summary, null, 2)}

INSTRUCTIONS:
- Point 1) Assessment: give a clear evidence-based assessment (cite numbers from the data, e.g. total focused_time vs distracted_time, average objective progress, overall_progress).
- Point 2) Corrective Actions / Roadmap: Prioritized, actionable steps (what to stop/start/change) if the user is performing poorly; if performing well, suggest next-level actions.
- Point 3) Motivation & Productivity: Encouraging guidance and simple tactics to improve focus and progress.

Make sure the "right/wrong" language is directly supported by the numbers in the DATA. Keep the answer professional and concise.
`;
      console.debug("DEBUG: Generated prompt:", prompt);

      // Call our server-side Ollama proxy (recommended), which will forward to the local Ollama API.
      const proxyUrl = "http://localhost:3001/api/ollama/generate";

      const body = JSON.stringify({ model: "mistral:latest", prompt, stream: false });
      console.debug("DEBUG: Sending request to proxy with body:", body);

      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("DEBUG: Proxy response not OK:", resp.status, txt);
        throw new Error(`Proxy error ${resp.status}: ${txt}`);
      }

      const data = await resp.json();
      console.debug("DEBUG: Received response data:", data);

      const rawText = data?.response ?? data?.output ?? data?.response_text ?? JSON.stringify(data);
      console.debug("DEBUG: Extracted rawText:", rawText);

      // Parse into three points
      const points = parseThreePoints(String(rawText));
      console.debug("DEBUG: Parsed points:", points);

      if (points.length === 0) {
        // fallback: show raw text as one point
        setAdvicePoints([String(rawText)]);
      } else {
        setAdvicePoints(points);
      }
    } catch (err) {
      console.error("Supervisor advice error:", err);
      setAdviceError(err?.message || String(err));
    } finally {
      setAdviceLoading(false);
    }
  };

  // ---------- Tilt handlers (uses requestAnimationFrame to avoid re-renders) ----------
  const onVideoPointerMove = (e) => {
    const el = videoWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1
    pointerStateRef.current.x = x;
    pointerStateRef.current.y = y;
    pointerStateRef.current.isActive = true;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => applyTilt(el));
    }
  };

  const applyTilt = (el) => {
    rafRef.current = null;
    const { x, y, isActive } = pointerStateRef.current;
    if (!isActive) {
      el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
      return;
    }

    // Map x,y to rotate values
    const rotateY = (x - 0.5) * 12; // -6 .. 6 deg
    const rotateX = (0.5 - y) * 12; // -6 .. 6 deg
    el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;

    // keep animating while active
    rafRef.current = requestAnimationFrame(() => applyTilt(el));
  };

  const onVideoPointerLeave = () => {
    pointerStateRef.current.isActive = false;
    const el = videoWrapRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // smooth reset
    el.style.transition = "transform 420ms cubic-bezier(.2,.9,.2,1)";
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    // remove transition after it finishes
    setTimeout(() => {
      if (el) el.style.transition = "";
    }, 450);
  };

  // make select robust: use string matches
  const handleSelectChange = (val) => {
    const match = avatars.find((a) => String(a.user_id) === String(val));
    if (match) setSelectedAvatar(match);
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-6 md:p-8 flex flex-col overflow-hidden">
      <h1 className="font-mono text-2xl md:text-3xl text-primary mb-4 shrink-0 console-title">
        SUPERVISOR_DASHBOARD
      </h1>

      {loading ? (
        <p className="text-secondary font-mono">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden h-full">
          {/* Left Section: Monitoring Insights */}
          <div className="lg:col-span-3 border border-secondary/40 rounded-lg p-6 bg-surface shadow-sm flex flex-col overflow-hidden h-full">
            <h2 className="font-mono text-secondary mb-4 shrink-0">// MONITOR</h2>

            {/* Selector */}
            <select
              value={selectedAvatar?.user_id ?? ""}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="mb-6 px-3 py-2 border border-secondary/50 bg-transparent font-mono text-sm rounded-md focus:border-highlight outline-none w-66 shrink-0"
            >
              {avatars.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.fullname} ({a.role || "No role"})
                </option>
              ))}
            </select>

            {/* Insights */}
            {selectedAvatar && (
              /* IMPORTANT: min-h-0 here lets the grid children shrink so the AI card can get a bounded height */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 pb-4 min-h-0">
                {/* Profile */}
                <div className="border border-secondary/30 rounded-md p-4 hover:border-highlight transition-all">
                  <h3 className="font-mono text-secondary mb-2">// PROFILE</h3>
                  <p className="font-mono text-primary text-sm">{selectedAvatar.fullname}, {selectedAvatar.age} yrs</p>
                  <p className="font-mono text-sm text-secondary">Role: {selectedAvatar.role}</p>
                </div>

                {/* Avatar Description */}
                <div className="border border-secondary/30 rounded-md p-4 hover:border-highlight transition-all">
                  <h3 className="font-mono text-secondary mb-2">// DESCRIPTION</h3>
                  <p className="font-mono text-sm text-secondary leading-relaxed">
                    {avatarAssets[selectedAvatar.avatar_index]?.description || "No description available."}
                  </p>
                </div>

                {/* AI Suggestions + button (only AI card scrolls) */}
                <div
                  className={`md:col-span-2 border border-secondary/30 rounded-md p-4 hover:border-highlight transition-all relative flex flex-col flex-1 min-h-0 ${adviceLoading ? 'advice-loading' : ''}`}
                >
                  <h3 className="font-mono text-secondary mb-2">// AI_INPUT</h3>

                  {/* Content area (scrollable) */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    {adviceLoading ? (
                      <div className="flex items-center space-x-3 font-mono text-secondary text-sm">
                        <span>Thinking</span>
                        <span className="inline-flex items-center">
                          <span className="dot bg-highlight dot--delay-1" />
                          <span className="dot bg-highlight dot--delay-2" />
                          <span className="dot bg-highlight dot--delay-3" />
                        </span>
                      </div>
                    ) : adviceError ? (
                      <div className="text-alert font-mono text-sm">{adviceError}</div>
                    ) : advicePoints.length > 0 ? (
                      <ol className="list-decimal list-inside text-sm text-primary font-mono space-y-2 animate-fadeIn">
                        {advicePoints.map((p, i) => {
                          const cleanedP = p.replace(/^\d+[\).\-\s]*\s*/, '');
                          return (
                            <li key={i} className="text-secondary">
                              <div dangerouslySetInnerHTML={{ __html: cleanedP.replace(/\n/g, "<br/>") }} />
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <ul className="list-disc list-inside text-sm text-secondary font-mono space-y-1 animate-fadeIn">
                        <li>
                          {selectedAvatar.role === "Operator"
                            ? "Maintain operational consistency."
                            : "Adapt profile to match performance goals."}
                        </li>
                        <li>
                          Focus on alignment of {selectedAvatar.age || "??"}-year perspective with timeline goals.
                        </li>
                        <li>Reduce distraction alerts by 10% next cycle.</li>
                      </ul>
                    )}
                  </div>

                  {/* Button Footer */}
                  <div className="bg-surface/90 backdrop-blur-sm pt-2 border-t border-secondary/20 flex justify-end">
                    <button
                      onClick={handleGetSupervisorAdvice}
                      disabled={adviceLoading}
                      className="px-4 py-2 rounded-md font-mono text-sm bg-gradient-to-r from-primary to-highlight hover:from-highlight hover:to-primary transition-all text-surface disabled:opacity-60 shadow-lg hover:shadow-highlight/40"
                      aria-label="Get Supervisor Advice"
                    >
                      {adviceLoading ? "Getting Advice..." : "Get Supervisor Advice"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Slim Fixed Video Panel */}
          <div className="lg:col-span-1 border border-secondary/40 rounded-lg bg-surface shadow-md flex flex-col h-full">
            <div className="border-b border-secondary/40 px-4 py-2">
              <h2 className="font-mono text-secondary text-sm">// SUPERVISOR_FEED</h2>
            </div>
            <div className="flex-1 flex items-center justify-center p-2">
              {selectedAvatar ? (
                <div className="relative w-full h-[500px] flex items-center justify-center">
                  <div
                    ref={videoWrapRef}
                    onMouseMove={onVideoPointerMove}
                    onMouseLeave={onVideoPointerLeave}
                    className="rounded-md overflow-hidden w-full h-full transform-gpu transition-transform duration-300 video-pulse"
                    style={{ willChange: 'transform' }}
                  >
                    <video
                      key={selectedAvatar.avatar_index}
                      src={avatarAssets[selectedAvatar.avatar_index]?.video || ""}
                      autoPlay
                      muted
                      loop
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs font-mono text-highlight">
                    {selectedAvatar.fullname}
                  </div>
                </div>
              ) : (
                <p className="font-mono text-secondary text-sm">No avatar selected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorPage;
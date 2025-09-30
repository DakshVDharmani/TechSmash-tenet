(function () {
    if (window.__nexora_supervisor_video) return;
    window.__nexora_supervisor_video = true;

    // --- Supabase and Ollama Integration ---
    let supabase;

    async function initSupabase() {
        if (supabase) return supabase; // Reuse if already created

        // Check if Supabase client is available
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            console.error("Supabase client is not loaded or createClient is undefined");
            throw new Error("Supabase client not available. Ensure supabase-js is included in the extension.");
        }

        // Load env.json
        const res = await fetch(chrome.runtime.getURL("env.json"));
        if (!res.ok) throw new Error("Cannot load env.json");
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await res.json();

        // Create Supabase client
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized successfully");
        return supabase;
    }

    async function getMotivation(userId, profileId) {
        const sb = await initSupabase();

        // Get user objectives from Supabase
        const { data: objectives, error: objectivesError } = await sb
            .from("objectives")
            .select("title, description, progress")
            .eq("user_id", userId);

        if (objectivesError) {
            console.error("Supabase error fetching objectives:", objectivesError.message);
            throw objectivesError;
        }

        // Get rejected_domains from Extensions table
        const { data: extensions, error: extensionsError } = await sb
            .from("Extensions")
            .select("rejected_domains")
            .eq("id", profileId);  // Assuming 'id' matches profile_id (user.id)

        if (extensionsError) {
            console.error("Supabase error fetching extensions:", extensionsError.message);
            throw extensionsError;
        }

        // Parse and collect unique rejected domains
        let rejectedDomains = [];
        extensions.forEach(row => {
            if (row.rejected_domains) {
                let domains = [];
                const raw = row.rejected_domains;
                if (Array.isArray(raw)) {
                    domains = raw.map(d => String(d).trim().toLowerCase().replace(/^www\./, ""));
                } else if (typeof raw === "string") {
                    const trimmed = raw.trim();
                    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                        domains = trimmed.slice(1, -1).split(",").map(d => d.trim().replace(/^"|"$/g, "").toLowerCase().replace(/^www\./, ""));
                    } else {
                        domains = trimmed.split(",").map(d => d.trim().toLowerCase().replace(/^www\./, ""));
                    }
                }
                rejectedDomains.push(...domains);
            }
        });
        rejectedDomains = [...new Set(rejectedDomains)];  // Unique list

        // Build prompt for Ollama
        const prompt = `
You are a mentor.
User's objectives:
${JSON.stringify(objectives, null, 2)}

User's rejected domains (warn the user to avoid them):
${JSON.stringify(rejectedDomains, null, 2)}

Give a short 4–5 sentence piece of advice, including a warning to stay away from the rejected domains to maintain focus. Finish with a single inspiring quote.
Format exactly:
Advice: [your advice]
Quote: "[quote]" – [Author]
`;

        // Send to local Ollama server
        const response = await fetch("http://localhost:3001/api/ollama/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "mistral:latest",
                prompt,
                stream: false
            })
        });

        if (!response.ok) {
            console.error("Ollama request failed:", response.statusText);
            throw new Error("Ollama request failed");
        }
        const result = await response.json();
        console.log("Ollama response:", result);
        return result.response || result.output || "";
    }

    async function getAvatarIndex(userId) {
        const sb = await initSupabase();

        // Get avatar_index from avatar table
        const { data, error } = await sb
            .from("avatar")
            .select("avatar_index")
            .eq("user_id", userId)
            .single();

        if (error) {
            console.error("Supabase error fetching avatar_index:", error.message);
            return 1;  // Default to 1 on error
        }

        return data?.avatar_index || 1;  // Default to 1 if not found
    }

    // --- Video Element ---
    const video = document.createElement("video");
    video.autoplay = true;
    video.controls = true;
    video.muted = false;
    Object.assign(video.style, {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: "0px",
        position: "relative",
        top: "-3.8px",
        left: "-8px",
    });

    // --- Wrapper ---
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
        position: "fixed",
        top: "calc(4rem - 6px)",
        left: "calc(6% + 1rem - 6px)",
        width: "calc(94% - 2rem)",
        height: "calc(100vh - 0rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        zIndex: 2147483647
    });

    // --- Card Container (Outer Frame) ---
    const card = document.createElement("div");
    Object.assign(card.style, {
        margin: "auto",
        width: "clamp(1385px, 90%, 1585px)",
        height: "clamp(680px, 70%, 880px)",
        background: "var(--surface, #1e1e1e)",
        border: "2px solid var(--secondary, rgba(253, 253, 253, 0.5))",
        borderRadius: "8px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "row",
        pointerEvents: "auto",
        animation: "fadeIn 0.5s ease-in"
    });

    // --- CSS Animation for Fade-In ---
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        .hover-scale:hover {
            transform: scale(1.05);
            transition: transform 0.3s ease;
        }
        .pulse {
            animation: pulse 2s infinite;
        }
    `;
    document.head.appendChild(styleSheet);

    // --- Left Pane (Motivational Content) ---
    const leftPane = document.createElement("div");
    Object.assign(leftPane.style, {
        flex: "2.6",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        color: "var(--primary, #fff)",
        fontFamily: "monospace",
        fontSize: "1rem",
        padding: "1.5rem",
        overflowY: "auto"
    });

    // Header for Left Pane
    const header = document.createElement("div");
    Object.assign(header.style, {
        width: "100%",
        marginBottom: "1rem"
    });
    const title = document.createElement("h1");
    title.textContent = "MOTIVATIONAL_ADVICE";
    title.className = "text-primary text-2xl";
    const status = document.createElement("p");
    status.className = "text-secondary text-sm";
    status.innerHTML = "STATUS: <span id='status-text' class='pulse'>LOADING...</span>";
    header.appendChild(title);
    header.appendChild(status);

    // Motivation Content
    const motivationContainer = document.createElement("div");
    motivationContainer.className = "text-primary text-sm";
    motivationContainer.innerHTML = "<p>Loading motivation...</p>";

    // Status Message
    const statusMsg = document.createElement("div");
    statusMsg.style.display = "none";
    statusMsg.className = "border p-4 rounded-md text-sm mt-3";
    statusMsg.style.animation = "fadeIn 0.5s ease-in";

    leftPane.appendChild(header);
    leftPane.appendChild(motivationContainer);
    leftPane.appendChild(statusMsg);

    // --- Vertical Divider ---
    const divider = document.createElement("div");
    Object.assign(divider.style, {
        width: "1px",
        background: "var(--secondary, rgba(255,255,255,0.15))",
        margin: "0 1rem"
    });

    // --- Right Pane (Video) ---
    const rightPane = document.createElement("div");
    Object.assign(rightPane.style, {
        flex: "1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    });
    rightPane.appendChild(video);

    // --- Assemble ---
    card.appendChild(leftPane);
    card.appendChild(divider);
    card.appendChild(rightPane);
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    // --- Fetch Motivation ---
    async function fetchMotivation() {
        try {
            // Initialize Supabase
            await initSupabase();

            // Get user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.error("Supabase auth error:", userError.message);
                throw userError;
            }
            if (!user) {
                status.querySelector("#status-text").textContent = "ERROR";
                status.querySelector("#status-text").className = "text-alert";
                statusMsg.style.display = "block";
                statusMsg.className = "border border-alert/50 p-4 rounded-md text-sm mt-3 text-alert";
                statusMsg.textContent = "No user logged in.";
                return;
            }

            // Get operator ID (from Profiles)
            const { data: profileData, error: profileError } = await supabase
                .from("Profiles")
                .select("operator_id")
                .eq("id", user.id)
                .single();
            if (profileError) {
                console.error("Supabase profiles error:", profileError.message);
                throw profileError;
            }

            const operatorId = profileData?.operator_id || "NO_ID";
            status.innerHTML = `ID: ${operatorId} | STATUS: <span id='status-text' class='text-success'>NOMINAL</span>`;

            // Get avatar_index
            const avatarIndex = await getAvatarIndex(user.id);
            video.src = chrome.runtime.getURL(`assets/block_${avatarIndex}.mp4`);

            // Fetch motivation (pass user.id as profileId assuming they match)
            const motivationText = await getMotivation(user.id, user.id);
            const adviceMatch = motivationText.match(/Advice:([\s\S]*?)Quote:/);
            const quoteMatch = motivationText.match(/Quote:"([^"]+)" – ([^\n]+)/);

            if (adviceMatch && quoteMatch) {
                motivationContainer.innerHTML = `
                    <p>${adviceMatch[1].trim()}</p>
                    <blockquote class="italic border-l-2 border-primary pl-3 hover-scale" style="margin-top: 1rem;">
                        "${quoteMatch[1].trim()}" – ${quoteMatch[2].trim()}
                    </blockquote>
                `;
                statusMsg.style.display = "block";
                statusMsg.className = "border border-success/50 p-4 rounded-md text-sm mt-3 text-success";
                statusMsg.textContent = "Motivation loaded successfully!";
                setTimeout(() => {
                    statusMsg.style.display = "none";
                }, 4000);
            } else {
                throw new Error("Invalid motivation response format");
            }
        } catch (err) {
            console.error("Error fetching motivation:", err.message);
            status.querySelector("#status-text").textContent = "ERROR";
            status.querySelector("#status-text").className = "text-alert";
            statusMsg.style.display = "block";
            statusMsg.className = "border border-alert/50 p-4 rounded-md text-sm mt-3 text-alert";
            statusMsg.textContent = "Failed to load motivation: " + err.message;
            setTimeout(() => {
                statusMsg.style.display = "none";
            }, 4000);
        }
    }

    // Start fetching motivation
    fetchMotivation();

    // --- Remove when video ends or after 15 seconds ---
    video.addEventListener("ended", () => wrapper.remove());
    setTimeout(() => wrapper.remove(), 15000);  // Ensure removal after 15 seconds regardless
})();
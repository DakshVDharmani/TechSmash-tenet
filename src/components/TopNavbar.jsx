// src/components/TopNavbar.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Sun, Moon, User, Search, Info } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils/cn";
import { supabase } from "../supabaseClient";
import CompactUserResult from "./CompactUserResult"; // ✅ use compact card

const TopNavbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // SEARCH STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // PROFILE AVATAR STATE
  const [pfpUrl, setPfpUrl] = useState(null); // resolved URL for <img>
  const [displayName, setDisplayName] = useState("Guest");
  const [pfpLoading, setPfpLoading] = useState(true);

  const dropdownRef = useRef(null);
  const aboutRef = useRef(null);
  const searchRef = useRef(null);

  // click outside handling
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (aboutRef.current && !aboutRef.current.contains(event.target)) {
        setIsAboutOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ----------------------------
  // FETCH CURRENT USER PROFILE PIC
  // ----------------------------
  useEffect(() => {
    let mounted = true;
    const fetchPfp = async () => {
      setPfpLoading(true);
      try {
        // get current auth user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setDisplayName("Guest");
            setPfpUrl(null);
            setPfpLoading(false);
          }
          return;
        }

        // set display name from metadata (fallback to email)
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "User";
        if (mounted) setDisplayName(name);

        // fetch pfp from Profiles table where id === user.id
        const { data: profile, error } = await supabase
          .from("Profiles") // table name as used elsewhere
          .select("pfp")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile pfp:", error);
          if (mounted) {
            setPfpUrl(null);
            setPfpLoading(false);
          }
          return;
        }

        const pfp = profile?.pfp ?? null;

        if (!pfp) {
          // no pfp set
          if (mounted) {
            setPfpUrl(null);
            setPfpLoading(false);
          }
          return;
        }

        // If pfp is a full URL, use it
        if (/^https?:\/\//i.test(pfp)) {
          if (mounted) {
            setPfpUrl(pfp);
            setPfpLoading(false);
          }
          return;
        }

        // Otherwise assume pfp is a storage path in Supabase Storage bucket.
        // Default bucket name is 'avatars' — change if your bucket is named differently.
        const BUCKET = "avatars"; // <-- change this to your actual bucket name if needed

        // Try to get a public URL first
        try {
          const { data: publicData, error: publicError } =
            supabase.storage.from(BUCKET).getPublicUrl(pfp);

          // Depending on supabase-js version the structure may be { data: { publicUrl } }
          const publicUrl =
            publicData && (publicData.publicUrl || publicData.publicURL);

          if (publicUrl) {
            if (mounted) {
              setPfpUrl(publicUrl);
              setPfpLoading(false);
            }
            return;
          }

          // If public URL not available, attempt signed url (short lived)
          const signedExpirySeconds = 60; // 60s signed url for preview
          const {
            data: signedData,
            error: signErr,
          } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(pfp, signedExpirySeconds);

          // Depending on version: signedData.signedUrl or signedData.signedURL
          const signedUrl =
            signedData && (signedData.signedUrl || signedData.signedURL);

          if (signedUrl) {
            if (mounted) {
              setPfpUrl(signedUrl);
              setPfpLoading(false);
            }
            return;
          }

          // If neither method worked, fallback to null
          if (mounted) {
            setPfpUrl(null);
            setPfpLoading(false);
          }
        } catch (storageErr) {
          console.error("Storage URL resolution error:", storageErr);
          if (mounted) {
            setPfpUrl(null);
            setPfpLoading(false);
          }
        }
      } catch (err) {
        console.error("Error resolving user profile:", err);
        if (mounted) {
          setPfpUrl(null);
          setPfpLoading(false);
        }
      }
    };

    fetchPfp();

    return () => {
      mounted = false;
    };
  }, []); // run once on mount; will pick up current signed in user

  // search effect (debounced)
  useEffect(() => {
    const q = searchQuery?.trim();

    if (!q) {
      setSearchResults([]);
      setNoResults(false);
      setSearchError(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      setNoResults(false);

      try {
        // ✅ get current user id
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from("Profiles")
          .select("id, fullname, operator_id, email")
          .ilike("fullname", `%${q}%`)
          .neq("id", user?.id) // 🚫 exclude current user
          .limit(10);

        if (!mounted) return;

        if (error) {
          setSearchError(error.message || "Search failed");
          setSearchResults([]);
          setNoResults(true);
        } else if (!data || data.length === 0) {
          setSearchResults([]);
          setNoResults(true);
        } else {
          const mapped = data.map((p, idx) => ({
            id: p.id,
            name: p.fullname || "Unknown",
            role: p.operator_id || "Operator",
            goal: p.current_goal || "No active goal",
            alignmentScore: p.alignment_score ?? 0,
            statusNote: p.status_note || "No notes",
            requested: false,
            onConnectClick: () => alert(`Connect request sent to ${p.fullname}`),
            index: idx,
          }));
          setSearchResults(mapped);
          setNoResults(false);
        }
      } catch (err) {
        console.error("TopNavbar search exception:", err);
        if (!mounted) return;
        setSearchError(err?.message || String(err));
        setSearchResults([]);
        setNoResults(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSelectProfile = () => {
    setSearchResults([]);
    setSearchQuery("");
  };

  // helper to compute initial
  const initial = (displayName || "U").charAt(0).toUpperCase();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-b border-secondary/50 z-[1500]",
        "flex items-center justify-between px-4 md:px-8"
      )}
    >
      {/* Left Section (NEXORA with dropdown) */}
      <div className="relative" ref={aboutRef}>
        <button
          onClick={() => setIsAboutOpen(!isAboutOpen)}
          className="font-mono text-xl font-bold text-primary tracking-widest hover:text-highlight transition-colors"
        >
          NEXORA
        </button>
        <AnimatePresence>
          {isAboutOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute top-full left-0 mt-2 w-96 max-w-[90vw] bg-surface border border-secondary/50 shadow-lg font-mono text-sm p-4 z-[2000]"
            >
              <div className="flex items-center gap-2 mb-2">
                <Info size={16} className="text-highlight" />
                <h2 className="text-primary font-bold">ABOUT_NEXORA</h2>
              </div>
              <p className="text-secondary leading-relaxed mb-2">
                <span className="text-primary">NEXORA</span> is a cognitive
                interface designed to help operators monitor, align, and
                optimize their objectives. It bridges human focus with machine
                logic—tracking attention, visualizing goals, and preventing
                deviation.
              </p>
              <p className="text-secondary leading-relaxed mb-2">
                Inspired by <span className="text-primary">The Matrix</span>,
                NEXORA challenges the boundary between digital control and human
                freedom—inviting you to ask whether your environment shapes you,
                or you shape it.
              </p>
              <p className="text-secondary leading-relaxed">
                Like <span className="text-primary">Tenet</span>, NEXORA treats
                time as non-linear. Roadmaps and progress flows can invert and
                overlap—forcing operators to think beyond the present and align
                their missions across multiple temporal layers.
              </p>
              <p className="text-highlight mt-3">
                &gt; Reality is negotiable. Alignment is everything.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center Section (Search) */}
      <div
        className="relative w-full max-w-md hidden md:block mx-4"
        ref={searchRef}
      >
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
          size={18}
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="SEARCH_SYSTEM..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border border-secondary/50 py-2 pl-10 pr-4 text-primary font-mono text-sm focus:border-highlight focus:outline-none transition-colors"
        />

        <AnimatePresence>
          {(loading || searchResults.length > 0 || noResults || searchError) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full mt-2 w-full bg-surface border border-secondary/50 shadow-lg z-[2000] max-h-[50vh] overflow-auto"
            >
              {loading && (
                <div className="text-secondary font-mono text-sm p-3">
                  Searching...
                </div>
              )}

              {!loading && searchError && (
                <div className="text-alert font-mono text-sm p-3">
                  Error: {searchError}
                </div>
              )}

              {!loading && !searchError && noResults && (
                <div className="text-secondary font-mono text-sm p-3">
                  No user with that name exists
                </div>
              )}

              {!loading && !searchError && searchResults.length > 0 && (
                <div>
                  {searchResults.map((userObj) => (
                    <Link
                      key={userObj.id}
                      to={`/profile/${userObj.id}`}
                      onClick={handleSelectProfile}
                      className="block no-underline"
                      aria-label={`Open profile for ${userObj.name}`}
                    >
                      <CompactUserResult user={userObj} />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Section (Theme + User) */}
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={toggleTheme}
          className="text-secondary hover:text-primary transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun size={20} strokeWidth={1.5} />
          ) : (
            <Moon size={20} strokeWidth={1.5} />
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-8 h-8 rounded-full border border-secondary flex items-center justify-center text-secondary hover:border-primary hover:text-primary transition-colors"
            aria-label="Open user menu"
            title={displayName}
          >
            {/* show image if pfpUrl available, otherwise fallback to initial */}
            {pfpLoading ? (
              // skeleton circle while loading
              <div className="w-7 h-7 rounded-full bg-secondary/20 animate-pulse" />
            ) : pfpUrl ? (
              <img
                src={pfpUrl}
                alt={`${displayName} avatar`}
                className="w-8 h-8 rounded-full object-cover"
                onError={() => {
                  // if image fails, fall back to initials
                  setPfpUrl(null);
                }}
              />
            ) : (
              // initials fallback
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                {initial}
              </div>
            )}
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 bg-surface border border-secondary/50 font-mono text-sm z-[2000]"
              >
                <Link
                  to="/avatar"
                  onClick={() => setIsDropdownOpen(false)}
                  className="block w-full text-left px-4 py-2 text-primary hover:bg-secondary/10 transition-colors"
                >
                  Profile
                </Link>
                <Link
                  to="/login"
                  onClick={() => setIsDropdownOpen(false)}
                  className="block w-full text-left px-4 py-2 text-primary hover:bg-secondary/10 transition-colors"
                >
                  Logout
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;

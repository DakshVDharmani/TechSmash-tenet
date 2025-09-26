import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth(); // might be null initially
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);

  // Routes that should always be dark
  const darkOnlyRoutes = ["/", "/landing", "/signup", "/login"];

  useEffect(() => {
    const loadTheme = async () => {
      try {
        // If current route is one of the forced dark ones → lock to dark
        if (darkOnlyRoutes.includes(location.pathname)) {
          setIsDark(true);
          document.documentElement.classList.add("dark");
          localStorage.setItem("nexora-theme", "dark");
          setLoading(false);
          return;
        }

        if (user) {
          // Try fetching theme from Supabase
          const { data, error } = await supabase
            .from("Settings")
            .select("theme")
            .eq("id", user.id)
            .maybeSingle(); // safer than .single()

          if (!error && data?.theme) {
            const dark = data.theme === "dark";
            setIsDark(dark);
            document.documentElement.classList.toggle("dark", dark);
            localStorage.setItem("nexora-theme", data.theme);
            setLoading(false);
            return;
          }
        }

        // Fallback to localStorage if no user or no record
        const savedTheme = localStorage.getItem("nexora-theme");
        if (savedTheme) {
          const dark = savedTheme === "dark";
          setIsDark(dark);
          document.documentElement.classList.toggle("dark", dark);
        }
      } catch (err) {
        console.error("ThemeProvider error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [user, location.pathname]);

  // Keep DOM + localStorage in sync when theme changes
  useEffect(() => {
    if (!loading) {
      const theme = isDark ? "dark" : "light";
      localStorage.setItem("nexora-theme", theme);

      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [isDark, loading]);

  const toggleTheme = async () => {
    // If current route is forced dark → ignore toggle
    if (darkOnlyRoutes.includes(location.pathname)) return;

    const newDark = !isDark;
    setIsDark(newDark);

    // Persist in Supabase if logged in
    if (user) {
      const { error } = await supabase
        .from("Settings")
        .update({ theme: newDark ? "dark" : "light" })
        .eq("id", user.id);

      if (error) console.error("Failed to save theme:", error.message);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, loading }}>
      {!loading && children}
    </ThemeContext.Provider>
  );
};
// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const waitForProfile = async (userId, retries = 5) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from("Profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        console.log("✅ Profile ready for:", userId);
        return data;
      }
      if (error) console.warn("⚠️ Profile fetch error while waiting:", error.message);
      console.log(`⏳ Waiting for profile insert... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, 500)); // wait 0.5s
    }
    console.warn("❌ Profile not found after waiting:", userId);
    return null;
  };

  // Keep user in sync with session
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("🔎 getSession result:", data);
      setUser(data.session?.user || null);
      setLoading(false);

      // 🔥 Post existing session (on reload/restore)
      if (data.session?.access_token) {
        console.log("📤 Posting SAVE_SESSION from getSession:", {
          token: data.session.access_token.slice(0, 12) + "...",
          userId: data.session.user?.id,
        });
        window.postMessage(
          {
            type: "SAVE_SESSION",
            access_token: data.session.access_token,
            profile_id: data.session.user?.id || null,
          },
          "*"
        );
      } else {
        console.log("ℹ️ No access_token found in getSession");
      }
    };

    getSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔔 onAuthStateChange:", event, session);
        setUser(session?.user || null);
        if (session?.user) {
          ensureProfile(session.user); // sync profile on login

          // 🔥 Forward session on login / state change
          console.log("📤 Posting SAVE_SESSION from onAuthStateChange:", {
            token: session?.access_token?.slice(0, 12) + "...",
            userId: session.user?.id,
          });
          window.postMessage(
            {
              type: "SAVE_SESSION",
              access_token: session?.access_token || null,
              profile_id: session?.user?.id || null,
            },
            "*"
          );
        } else {
          console.log("ℹ️ onAuthStateChange fired but no session.user");
        }
      }
    );

    return () => subscription?.subscription?.unsubscribe();
  }, []);

  const ensureProfile = async (user) => {
    if (!user) return;
    try {
      console.log("🛠 ensureProfile called for:", user.id);
      const { data: existing, error } = await supabase
        .from("Profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
  
      if (error) {
        console.error("❌ Profile fetch failed:", error.message);
        return;
      }
  
      if (!existing) {
        console.warn("⚠️ No profile found for:", user.id, " → waiting for DB trigger to insert.");
      } else {
        console.log("✅ Profile already exists for:", existing.id);
      }
    } catch (err) {
      console.error("❌ ensureProfile exception:", err);
    }
  };
  

  // 🔄 Update both auth.user_metadata and Profiles
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: "Not logged in" };

    try {
      console.log("🛠 Updating profile for:", user.id, updates);
      const { data: authData, error: authError } =
        await supabase.auth.updateUser({
          data: {
            fullname: updates.fullname ?? user.user_metadata?.fullname,
            operator_id: updates.operator_id ?? user.user_metadata?.operator_id,
          },
        });

      if (authError) {
        console.error("❌ Auth metadata update error:", authError.message);
        return { success: false, error: "Failed to update user metadata" };
      }

      await ensureProfile(
        authData.user,
        updates.fullname,
        updates.operator_id
      );

      setUser(authData.user);
      console.log("✅ Profile updated successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Update profile exception:", err);
      return { success: false, error: "Something went wrong" };
    }
  };

  // Sign Up
  const signUp = async ({ fullname, operator_id, email, passcode }) => {
    try {
      console.log("📝 Signing up:", { fullname, operator_id, email });
      if (passcode.length < 8 || passcode.length > 32) {
        return {
          success: false,
          error: "Passcode must be between 8 and 32 characters long.",
        };
      }

      const { data: existingOperator, error: operatorError } = await supabase
        .from("Profiles")
        .select("operator_id")
        .eq("operator_id", operator_id)
        .maybeSingle();

      if (operatorError) {
        console.error("❌ Operator ID check error:", operatorError.message);
        return {
          success: false,
          error: "Something went wrong. Please try again.",
        };
      }

      if (existingOperator) {
        return { success: false, error: "This operator ID is already taken." };
      }

      const { data: existingEmail, error: emailError } = await supabase
        .from("Profiles")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (emailError) {
        console.error("❌ Email check error:", emailError.message);
        return {
          success: false,
          error: "Something went wrong. Please try again.",
        };
      }

      if (existingEmail) {
        return { success: false, error: "This email is already registered." };
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: passcode,
        options: { data: { fullname, operator_id } },
      });

      if (authError) {
        console.error("❌ Auth error:", authError.message);
        if (authError.message.toLowerCase().includes("password")) {
          return { success: false, error: "Passcode is too weak." };
        }
        return {
          success: false,
          error: "Unable to create account. Please try again.",
        };
      }

      if (!data.session) {
        console.log("ℹ️ SignUp success, but no session (email confirmation required)");
        return {
          success: true,
          pendingEmailConfirmation: true,
          message:
            "Check your inbox to confirm your email before logging in.",
        };
      }

      setUser(data.user);

      await waitForProfile(data.user.id);

      // 🔥 Forward session on successful signup
      console.log("📤 Posting SAVE_SESSION from signUp:", {
        token: data.session?.access_token?.slice(0, 12) + "...",
        userId: data.user.id,
      });
      window.postMessage(
        {
          type: "SAVE_SESSION",
          access_token: data.session?.access_token || null,
          profile_id: data.user.id,
        },
        "*"
      );

      return { success: true };
    } catch (err) {
      console.error("❌ Signup exception:", err);
      return {
        success: false,
        error: "Something went wrong. Please try again.",
      };
    }
  };

  const signIn = async (email, passcode) => {
    try {
      console.log("🔑 Signing in:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passcode,
      });
  
      if (error) {
        console.error("❌ SignIn error:", error.message);
        if (error.message.toLowerCase().includes("invalid"))
          return { success: false, error: "Invalid email or passcode." };
        return { success: false, error: "Unable to sign in. Please try again." };
      }
  
      if (data.user) {
        setUser(data.user);
  
        // 🔄 wait until Profiles row exists
        const profile = await waitForProfile(data.user.id);
  
        // Post to extension
        console.log("📤 Posting SAVE_SESSION from signIn:", {
          token: data.session?.access_token?.slice(0, 12) + "...",
          userId: data.user.id,
        });
        window.postMessage(
          {
            type: "SAVE_SESSION",
            access_token: data.session?.access_token || null,
            profile_id: profile?.id || data.user.id,
          },
          "*"
        );
  
        return { success: true };
      }
  
      return { success: false, error: "Unable to sign in." };
    } catch (err) {
      console.error("❌ SignIn exception:", err);
      return { success: false, error: "Something went wrong. Please try again." };
    }
  };
  

  // Sign Out
  const signOut = async () => {
    console.log("🚪 Signing out");
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
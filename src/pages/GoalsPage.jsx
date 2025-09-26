import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const emptyTask = () => ({
  id: null,
  position: 0,
  content: "",
  scheduled_date: "",
  budget: "",
  done: false,
});

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Goal form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [blockedDomains, setBlockedDomains] = useState("");

  // Roadmap UI state
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [roadmapSaving, setRoadmapSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // fetch goals
  const fetchGoals = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("objectives")
        .select("*")
        .eq("user_id", user.id)
        .order("last_updated", { ascending: false });

      if (error) {
        console.error("Error fetching goals:", error.message);
      } else {
        setGoals(data || []);
      }
    } catch (err) {
      console.error("Fetch goals error", err);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // create new objective
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in.");
        return;
      }

      const newGoal = {
        user_id: user.id,
        title,
        description,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        allowed_domains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean),
        blocked_domains: blockedDomains.split(",").map((d) => d.trim()).filter(Boolean),
        status: "Aligned",
        last_updated: new Date(),
        progress: 0, // Initialize progress
      };

      const { data, error } = await supabase.from("objectives").insert(newGoal).select();

      if (error) {
        console.error("Error inserting goal:", error.message);
        alert("Error saving goal.");
      } else {
        // refresh list to be safe
        await fetchGoals();
        // reset
        setTitle("");
        setDescription("");
        setTags("");
        setAllowedDomains("");
        setBlockedDomains("");
        setShowModal(false);
      }
    } catch (err) {
      console.error("Submit goal error", err);
      alert("Failed to save goal.");
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title || "");
    setDescription(goal.description || "");
    setTags(goal.tags ? goal.tags.join(", ") : "");
    setAllowedDomains(goal.allowed_domains ? goal.allowed_domains.join(", ") : "");
    setBlockedDomains(goal.blocked_domains ? goal.blocked_domains.join(", ") : "");
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingGoal) return;

    try {
      const updates = {
        title,
        description,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        allowed_domains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean),
        blocked_domains: blockedDomains.split(",").map((d) => d.trim()).filter(Boolean),
        last_updated: new Date(),
      };

      const { error } = await supabase
        .from("objectives")
        .update(updates)
        .eq("id", editingGoal.id);

      if (error) {
        console.error("Error updating goal:", error.message);
        alert("Failed to update goal.");
      } else {
        await fetchGoals();
        setShowEditModal(false);
        setEditingGoal(null);
      }
    } catch (err) {
      console.error("Update goal error:", err);
      alert("Failed to update goal.");
    }
  };

  // delete objective (and cascade-clean roadmaps/tasks)
  const deleteObjective = async (goalId) => {
    if (!confirm("Are you sure you want to delete this objective and its roadmaps?")) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to delete.");
        return;
      }

      // 1) find roadmaps for this goal owned by user
      const { data: roadmapRows, error: roadmapFetchErr } = await supabase
        .from("roadmaps")
        .select("id")
        .eq("goal_id", goalId)
        .eq("user_id", user.id);

      if (roadmapFetchErr) {
        console.error("Error finding roadmaps:", roadmapFetchErr.message);
      } else if (roadmapRows && roadmapRows.length) {
        const roadmapIds = roadmapRows.map((r) => r.id);
        // delete tasks explicitly (in case FK cascade not configured)
        const { error: delTasksErr } = await supabase
          .from("roadmap_tasks")
          .delete()
          .in("roadmap_id", roadmapIds);

        if (delTasksErr) {
          console.warn("Failed to delete roadmap tasks explicitly:", delTasksErr.message);
        }

        // delete roadmap rows
        const { error: delRoadmapsErr } = await supabase
          .from("roadmaps")
          .delete()
          .in("id", roadmapIds);

        if (delRoadmapsErr) {
          console.warn("Failed to delete roadmaps explicitly:", delRoadmapsErr.message);
        }
      }

      // 2) delete objective row (restrict to user's own)
      const { error: objErr } = await supabase
        .from("objectives")
        .delete()
        .match({ id: goalId, user_id: user.id });

      if (objErr) {
        console.error("Error deleting objective:", objErr.message);
        alert("Failed to delete objective.");
        return;
      }

      // update UI
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      alert("Objective deleted.");
    } catch (err) {
      console.error("Delete objective error:", err);
      alert("Failed to delete objective.");
    }
  };

  /* -----------------------
     ROADMAP: open / load
  ----------------------- */
  const openRoadmap = async (goal) => {
    setActiveGoal(goal);
    setShowRoadmap(true);
    setRoadmap(null);
    setTasks([]);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Look up existing roadmap (if any) for this goal + user.
      let rdata = null;
      try {
        const res = await supabase
          .from("roadmaps")
          .select("*")
          .eq("goal_id", goal.id)
          .eq("user_id", user.id)
          .maybeSingle(); // returns null if not found
        rdata = res.data || null;
      } catch (err) {
        // maybeSingle may not be available in some clients; fallback to .single()
        const fallback = await supabase
          .from("roadmaps")
          .select("*")
          .eq("goal_id", goal.id)
          .eq("user_id", user.id)
          .limit(1);
        rdata = (fallback.data && fallback.data.length && fallback.data[0]) || null;
      }

      if (rdata) {
        setRoadmap(rdata);
        // fetch tasks
        const { data: tdata, error: terr } = await supabase
          .from("roadmap_tasks")
          .select("*")
          .eq("roadmap_id", rdata.id)
          .order("position", { ascending: true });

        if (terr) {
          console.error("Error fetching roadmap tasks:", terr.message);
          setTasks([ { ...emptyTask(), position: 0 } ]);
        } else {
          const mapped = (tdata || []).map((t) => ({
            id: t.id,
            position: t.position,
            content: t.content,
            scheduled_date: t.scheduled_date ? t.scheduled_date : "",
            budget: t.budget != null ? String(t.budget) : "",
            done: !!t.done,
          }));
          setTasks(mapped.length ? mapped : [ { ...emptyTask(), position: 0 } ]);
        }
      } else {
        // no roadmap yet - start with a single empty task
        setRoadmap(null);
        setTasks([ { ...emptyTask(), position: 0 } ]);
      }
    } catch (err) {
      console.error("openRoadmap error:", err);
      setTasks([ { ...emptyTask(), position: 0 } ]);
    }
  };

  /* -----------------------
     ROADMAP: local edit helpers
  ----------------------- */
  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      { ...emptyTask(), position: prev.length ? prev[prev.length - 1].position + 1 : 0 },
    ]);
  };

  const updateTask = (index, field, value) => {
    setTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeTask = (index) => {
    setTasks((prev) => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, position: i })));
  };

  const toggleDone = (index) => {
    setTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], done: !copy[index].done };
      return copy;
    });
  };

  const progressPercent = (() => {
    if (!tasks || tasks.length === 0) return 0;
    const doneCount = tasks.filter((t) => t.done).length;
    return Math.round((doneCount / tasks.length) * 100);
  })();

  /* -----------------------
     ROADMAP: save to DB (safe flow)
  ----------------------- */
  const saveRoadmap = async () => {
    try {
      setRoadmapSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in.");
        setRoadmapSaving(false);
        return;
      }

      // 1) ensure roadmap row exists for this user+goal
      let roadmapId = roadmap?.id || null;

      if (!roadmapId) {
        // check if one exists already
        const { data: existing, error: existingErr } = await supabase
          .from("roadmaps")
          .select("id")
          .eq("goal_id", activeGoal.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingErr) {
          console.error("Error checking existing roadmap:", existingErr.message);
        } else if (existing && existing.id) {
          roadmapId = existing.id;
        }
      }

      // 2) create if still missing
      if (!roadmapId) {
        const payload = {
          user_id: user.id,
          goal_id: activeGoal.id,
          title: (roadmap && roadmap.title) || `${activeGoal.title} — Roadmap`,
          timeframe: roadmap?.timeframe ?? null,
          notes: roadmap?.notes ?? null,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from("roadmaps")
          .insert(payload)
          .select()
          .single();

        if (insertErr) {
          // If unique-index race occurred, try to fetch existing one and continue
          console.error("Error creating roadmap:", insertErr.message);
          // try to fetch again:
          const { data: fetched, error: fetchErr } = await supabase
            .from("roadmaps")
            .select("id")
            .eq("goal_id", activeGoal.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (fetchErr) {
            throw insertErr;
          }
          roadmapId = fetched?.id;
          if (!roadmapId) throw insertErr;
        } else {
          roadmapId = inserted.id;
        }
      } else {
        // optional: touch metadata
        await supabase.from("roadmaps").update({ updated_at: new Date() }).eq("id", roadmapId);
      }

      // 3) remove old tasks and insert current tasks
      const { error: delErr } = await supabase.from("roadmap_tasks").delete().eq("roadmap_id", roadmapId);
      if (delErr) {
        console.warn("Warning deleting old tasks:", delErr.message);
      }

      const tasksToInsert = tasks
        .map((t, i) => ({
          roadmap_id: roadmapId,
          position: typeof t.position === "number" ? t.position : i,
          content: (t.content || "").trim(),
          scheduled_date: t.scheduled_date || null,
          budget: t.budget !== "" ? Number(t.budget) : null,
          done: !!t.done,
        }))
        .filter((t) => t.content && t.content.length > 0);

      if (tasksToInsert.length > 0) {
        const { error: insertTasksErr } = await supabase.from("roadmap_tasks").insert(tasksToInsert);
        if (insertTasksErr) {
          console.error("Error inserting tasks:", insertTasksErr.message);
          alert("Failed to save tasks.");
          setRoadmapSaving(false);
          return;
        }
      }

      // 4) Calculate and update objective progress
      const progress = progressPercent; // Use the computed progressPercent
      const { error: updateProgressErr } = await supabase
        .from("objectives")
        .update({ progress, last_updated: new Date() })
        .eq("id", activeGoal.id);

      if (updateProgressErr) {
        console.error("Error updating objective progress:", updateProgressErr.message);
        alert("Failed to update objective progress.");
        setRoadmapSaving(false);
        return;
      }

      // 5) refresh roadmap and tasks
      const { data: refreshedRoadmap } = await supabase.from("roadmaps").select("*").eq("id", roadmapId).single();
      const { data: refreshedTasks } = await supabase
        .from("roadmap_tasks")
        .select("*")
        .eq("roadmap_id", roadmapId)
        .order("position", { ascending: true });

      setRoadmap(refreshedRoadmap || null);
      setTasks((refreshedTasks || []).map((t) => ({
        id: t.id,
        position: t.position,
        content: t.content,
        scheduled_date: t.scheduled_date || "",
        budget: t.budget != null ? String(t.budget) : "",
        done: !!t.done,
      })));

      // success - refresh goals to reflect updated progress
      await fetchGoals();
      setRoadmapSaving(false);
      alert("Roadmap and objective progress saved.");
      setShowRoadmap(false);
    } catch (err) {
      console.error("saveRoadmap error:", err);
      alert("Failed saving roadmap. See console.");
      setRoadmapSaving(false);
    }
  };

  /* -----------------------
     delete roadmap from modal
  ----------------------- */
  const deleteRoadmap = async () => {
    if (!roadmap) {
      setShowRoadmap(false);
      return;
    }
    if (!confirm("Delete this roadmap and all its tasks?")) return;

    try {
      const { error } = await supabase.from("roadmaps").delete().eq("id", roadmap.id);
      if (error) {
        console.error("Error deleting roadmap:", error.message);
        alert("Failed to delete roadmap.");
      } else {
        // Update objective progress to 0 since roadmap is deleted
        const { error: updateProgressErr } = await supabase
          .from("objectives")
          .update({ progress: 0, last_updated: new Date() })
          .eq("id", activeGoal.id);

        if (updateProgressErr) {
          console.error("Error resetting objective progress:", updateProgressErr.message);
        }

        alert("Roadmap deleted.");
        setShowRoadmap(false);
        await fetchGoals(); // Refresh goals to reflect updated progress
      }
    } catch (err) {
      console.error("deleteRoadmap error:", err);
      alert("Failed to delete roadmap.");
    }
  };

  /* -----------------------
     Render
  ----------------------- */
  return (
    <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="font-mono text-3xl text-primary">MISSION_OBJECTIVES</h1>
        <button
          onClick={() => {
            setTitle("");
            setDescription("");
            setTags("");
            setAllowedDomains("");
            setBlockedDomains("");
            setShowModal(true);
          }}
          className="font-mono text-primary border border-primary px-6 py-2 hover:bg-primary hover:text-background transition-colors rounded"
        >
          [ NEW_OBJECTIVE ]
        </button>
      </header>

      {/* Goals Table */}
      <div className="border border-secondary/50 flex-1 overflow-auto rounded-md">
        <div className="grid grid-cols-12 p-4 font-mono text-secondary text-sm border-b border-secondary/50 sticky top-0 bg-background z-10">
          <div className="col-span-4">TITLE</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-4">LAST_UPDATE</div>
          <div className="col-span-2 text-right">ACTIONS</div>
        </div>

        {goals.map((goal, index) => (
          <motion.div
            key={goal.id}
            className="grid grid-cols-12 p-4 font-mono text-primary border-b border-secondary/50 last:border-b-0 hover:bg-secondary/10 transition-colors items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="col-span-4">{goal.title}</div>
            <div className={`col-span-2 ${goal.status === "Aligned" ? "text-success" : "text-alert"}`}>
              {goal.status.toUpperCase()}
            </div>
            <div className="col-span-4 text-secondary">
              {new Date(goal.last_updated).toUTCString()}
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button
                onClick={() => openRoadmap(goal)}
                className="font-mono text-xs border border-highlight text-highlight px-3 py-1 rounded hover:bg-highlight hover:text-background transition-colors"
              >
                [DESIGN_ROADMAP]
              </button>
              <button
                onClick={() => deleteObjective(goal.id)}
                className="font-mono text-xs border border-alert text-alert px-3 py-1 rounded hover:bg-alert hover:text-background transition-colors"
              >
                [DELETE]
              </button>
              <button
                onClick={() => handleEdit(goal)}
                className="font-mono text-xs border border-secondary text-secondary px-3 py-1 rounded hover:bg-secondary hover:text-background transition-colors"
              >
                [EDIT]
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Goal Modal */}
      {showEditModal && (
        <motion.div
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowEditModal(false)}
        >
          <motion.div
            className="w-full max-w-2xl bg-background border border-secondary/50 p-8"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-mono text-2xl text-primary mb-6">EDIT_OBJECTIVE</h2>
            <form className="space-y-4 font-mono" onSubmit={handleUpdate}>
              <input
                type="text"
                placeholder="TITLE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <textarea
                placeholder="DESCRIPTION"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none h-24"
              ></textarea>
              <input
                type="text"
                placeholder="TAGS (COMMA_SEPARATED)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <input
                type="text"
                placeholder="ALLOWED_DOMAINS"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <input
                type="text"
                placeholder="BLOCKED_DOMAINS"
                value={blockedDomains}
                onChange={(e) => setBlockedDomains(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full font-mono text-secondary border border-secondary px-6 py-2 hover:text-primary hover:border-primary transition-colors"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  className="w-full font-mono text-background bg-primary border border-primary px-6 py-2 hover:bg-transparent hover:text-primary transition-colors"
                >
                  [ UPDATE_GOAL ]
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Roadmap Modal */}
      {showRoadmap && (
        <motion.div
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowRoadmap(false)}
        >
          <motion.div
            className="w-full max-w-4xl bg-background border border-secondary/50 p-6 overflow-auto max-h-[88vh] rounded-lg"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-mono text-2xl">ROADMAP — {activeGoal?.title}</h2>
              <div className="text-sm font-mono text-secondary">Progress: {progressPercent}%</div>
            </div>

            <div className="mb-4">
              <label className="font-mono text-xs text-secondary block mb-1">ROADMAP TITLE</label>
              <input
                type="text"
                placeholder="Roadmap title (optional)"
                value={roadmap?.title || `${activeGoal?.title} — Roadmap`}
                onChange={(e) => setRoadmap((r) => ({ ...(r || {}), title: e.target.value }))}
                className="w-full bg-transparent border border-secondary/50 p-2 rounded font-mono text-sm focus:border-highlight outline-none"
              />
            </div>

            {/* Tasks list */}
            <div className="space-y-3">
              {tasks.map((t, idx) => (
                <div
                  key={t.id ?? `new-${idx}`}
                  className="border border-secondary/40 rounded p-3 flex flex-col md:flex-row md:items-center gap-3"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Task / step / topic"
                      value={t.content}
                      onChange={(e) => updateTask(idx, "content", e.target.value)}
                      className="w-full bg-transparent border border-secondary/30 p-2 rounded font-mono text-sm focus:border-highlight outline-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="date"
                        value={t.scheduled_date || ""}
                        onChange={(e) => updateTask(idx, "scheduled_date", e.target.value)}
                        className="px-2 py-1 border border-secondary/30 rounded font-mono text-sm bg-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Budget (optional)"
                        value={t.budget}
                        onChange={(e) => updateTask(idx, "budget", e.target.value)}
                        className="px-2 py-1 border border-secondary/30 rounded font-mono text-sm bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {/* Custom checkbox button so tick is visually prominent */}
                    <button
                      type="button"
                      onClick={() => toggleDone(idx)}
                      aria-pressed={!!t.done}
                      className={`w-8 h-8 flex items-center justify-center rounded border transition ${
                        t.done ? "bg-highlight text-background border-highlight" : "border-secondary/40 text-secondary"
                      }`}
                      title={t.done ? "Mark as not done" : "Mark as done"}
                    >
                      {t.done ? "✓" : ""}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => removeTask(idx)}
                        className="px-3 py-1 border border-alert text-alert text-xs font-mono rounded hover:bg-alert hover:text-background transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={addTask} className="font-mono px-4 py-2 border border-secondary/40 hover:border-highlight hover:text-highlight transition">
                [ + ADD STEP ]
              </button>

              <div className="ml-auto flex gap-2">
                <button type="button" onClick={deleteRoadmap} className="font-mono px-4 py-2 border border-alert text-alert hover:bg-alert hover:text-background transition">
                  [ DELETE ROADMAP ]
                </button>
                <button type="button" onClick={() => setShowRoadmap(false)} className="font-mono px-4 py-2 border border-secondary/40 hover:text-primary transition">
                  [ CANCEL ]
                </button>
                <button
                  type="button"
                  onClick={saveRoadmap}
                  disabled={roadmapSaving}
                  className="font-mono px-4 py-2 bg-primary text-background border border-primary hover:bg-transparent hover:text-primary transition"
                >
                  {roadmapSaving ? "[ SAVING... ]" : "[ SAVE_ROADMAP ]"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* New Goal Modal */}
      {showModal && (
        <motion.div
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
        >
          <motion.div
            className="w-full max-w-2xl bg-background border border-secondary/50 p-8"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-mono text-2xl text-primary mb-6">COMMIT_NEW_GOAL</h2>
            <form className="space-y-4 font-mono" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="TITLE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <textarea
                placeholder="DESCRIPTION"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none h-24"
              ></textarea>
              <input
                type="text"
                placeholder="TAGS (COMMA_SEPARATED)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <input
                type="text"
                placeholder="ALLOWED_DOMAINS"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <input
                type="text"
                placeholder="BLOCKED_DOMAINS"
                value={blockedDomains}
                onChange={(e) => setBlockedDomains(e.target.value)}
                className="w-full bg-transparent border border-secondary/50 p-3 text-primary focus:border-highlight focus:outline-none"
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full font-mono text-secondary border border-secondary px-6 py-2 hover:text-primary hover:border-primary transition-colors"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  className="w-full font-mono text-background bg-primary border border-primary px-6 py-2 hover:bg-transparent hover:text-primary transition-colors"
                >
                  [ COMMIT_GOAL ]
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default GoalsPage;
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Info } from 'lucide-react';

// Error Boundary Component
class TimelineErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col items-center justify-center">
          <h1 className="font-mono text-3xl text-primary mb-6">TIMELINE_ANALYSIS</h1>
          <p className="font-mono text-primary text-lg">
            An error occurred while rendering the timeline. Please try refreshing the page or contact support.
          </p>
          <p className="font-mono text-secondary text-sm mt-2">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const TimelinePage = () => {
  const [timelineIntervals, setTimelineIntervals] = useState([]);
  const [noData, setNoData] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [sliderValue, setSliderValue] = useState(100);
  const [arrowIndex, setArrowIndex] = useState(0);
  const [activeQuote, setActiveQuote] = useState(null);

  useEffect(() => {
    console.debug('[DEBUG] timelineIntervals updated:', timelineIntervals.length, timelineIntervals);
  }, [timelineIntervals]);

  const getLocalToday = () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.debug('[DEBUG] Detected user time zone for history fetch:', tz);
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  };

  useEffect(() => {
    async function loadInitialTimeline() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.debug('[DEBUG] No user found for initial timeline restore');
        setNoData(true);
        return;
      }

      try {
        const today = getLocalToday();
        console.debug('[DEBUG] Fetching timeline history for', today);
        const { data: timelineRow, error: timelineErr } = await supabase
          .from('timeline')
          .select('colour, response, date')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (timelineErr && timelineErr.code !== 'PGRST116') {
          console.error('[DEBUG] Error fetching timeline row:', timelineErr);
          setNoData(true);
          return;
        }

        if (timelineRow) {
          console.debug('[DEBUG] Found existing timeline row:', timelineRow);
          if (!Array.isArray(timelineRow.colour) || !Array.isArray(timelineRow.response)) {
            console.error('[DEBUG] Invalid timeline row data:', timelineRow);
            setNoData(true);
            return;
          }
          const intervalsFromDb = timelineRow.colour.map((c, i) => ({
            time: `${timelineRow.date}T${String(i).padStart(2, '0')}:00:00`,
            color: c === 0 ? 'bg-red-500/80' : 'bg-green-500/80',
            quote: timelineRow.response[i] || '',
          }));
          setTimelineIntervals(intervalsFromDb);
          setNoData(false);
          return;
        }
      } catch (err) {
        console.error('[DEBUG] Exception while fetching timeline history:', err);
        setNoData(true);
      }

      console.debug('[DEBUG] Checking localStorage fallback');
      const savedIntervals = localStorage.getItem(`timelineIntervals_${user.id}`);
      if (savedIntervals) {
        try {
          const parsedIntervals = JSON.parse(savedIntervals);
          if (Array.isArray(parsedIntervals)) {
            console.debug('[DEBUG] Restored intervals from localStorage:', parsedIntervals);
            setTimelineIntervals(parsedIntervals);
            setNoData(false);
          } else {
            console.warn('[DEBUG] Invalid localStorage data format');
            setNoData(true);
          }
        } catch (err) {
          console.error('[DEBUG] Error parsing localStorage:', err);
          setNoData(true);
        }
      } else {
        console.debug('[DEBUG] No saved intervals in localStorage, fetching initial bucket');
        fetchExtensionData();
      }
    }
    loadInitialTimeline();
  }, []);

  useEffect(() => {
    if (timelineIntervals.length > 0) {
      const idx = Math.round((sliderValue / 100) * (timelineIntervals.length - 1));
      const newIndex = Math.max(0, Math.min(idx, timelineIntervals.length - 1));
      setArrowIndex(newIndex);
      setActiveQuote(timelineIntervals[newIndex]?.quote || null);
    } else {
      setActiveQuote(null);
    }
  }, [sliderValue, timelineIntervals]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.debug('[DEBUG] No user found for localStorage save');
        return;
      }
      console.debug('[DEBUG] Saving timelineIntervals to localStorage for user:', user.id);
      localStorage.setItem(`timelineIntervals_${user.id}`, JSON.stringify(timelineIntervals));
    })();
  }, [timelineIntervals]);

  const upsertTimelineHistory = async (userId, colourValue, quoteText) => {
    try {
      const today = getLocalToday();
      console.debug('[DEBUG] Upserting timeline history for', today);

      const { data: existing, error: fetchErr } = await supabase
        .from('timeline')
        .select('id, colour, response')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        console.error('[DEBUG] Error fetching today\'s timeline row:', fetchErr);
        return;
      }

      let newColours = [];
      let newResponses = [];
      if (existing) {
        newColours = [...existing.colour, colourValue];
        newResponses = [...existing.response, quoteText];
        console.debug('[DEBUG] Appending to existing timeline row:', existing.id);
      } else {
        newColours = [colourValue];
        newResponses = [quoteText];
        console.debug('[DEBUG] Creating new timeline row for today');
      }

      const { error: upErr } = await supabase
        .from('timeline')
        .upsert(
          {
            user_id: userId,
            date: today,
            colour: newColours,
            response: newResponses,
          },
          { onConflict: ['user_id', 'date'] }
        );

      if (upErr) console.error('[DEBUG] Timeline upsert error:', upErr);
      else console.debug('[DEBUG] Timeline upsert successful');
    } catch (err) {
      console.error('[DEBUG] upsertTimelineHistory exception:', err);
    }
  };

  const fetchExtensionData = async () => {
    if (isFetching) {
      console.debug('[DEBUG] Skipping fetch: another fetch is in progress');
      return;
    }
    setIsFetching(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('[DEBUG] Authentication error:', authError?.message || 'No user logged in');
        setNoData(true);
        return;
      }

      console.debug('[DEBUG] User ID:', authUser.id);

      const { data: allExtensions, error: allExtensionsError } = await supabase
        .from('Extensions')
        .select('id, goal_id, focused_time, distracted_time')
        .eq('id', authUser.id);
      console.debug('[DEBUG] All Extensions for user:', allExtensions, 'Error:', allExtensionsError);

      if (allExtensionsError || !allExtensions || allExtensions.length === 0) {
        console.warn('[DEBUG] No Extensions data found for user:', authUser.id);
        setNoData(true);
        return;
      }

      // ✅ NEW: compute total focused & total distracted across ALL rows
      const totalFocused = allExtensions.reduce(
        (acc, row) => acc + (row.focused_time || 0),
        0
      );
      const totalDistracted = allExtensions.reduce(
        (acc, row) => acc + (row.distracted_time || 0),
        0
      );

      console.debug('[DEBUG] Total focused across all rows:', totalFocused);
      console.debug('[DEBUG] Total distracted across all rows:', totalDistracted);

      const grandTotal = totalFocused + totalDistracted;
      console.debug('[DEBUG] Grand total time:', grandTotal);

      if (grandTotal <= 0) {
        console.warn('[DEBUG] grandTotal is zero or negative, marking as noData');
        setNoData(true);
        return;
      }

      // ✅ NEW: Check if total focused is at least 70% of the grand total
      const focusedPercent = (totalFocused / grandTotal) * 100;
      console.debug('[DEBUG] focusedPercent:', focusedPercent);

      let color = focusedPercent >= 70 ? 'bg-green-500/80' : 'bg-red-500/80';
      console.debug('[DEBUG] Selected color based on 70% rule:', color);

      const colourValue = color === 'bg-red-500/80' ? 0 : 1;
            const quote = await getQuote(
              timelineIntervals.length,
              authUser.id,
              colourValue    // ✅ pass the colour directly
            );
      console.debug('[DEBUG] Generated quote:', quote);

      const newInterval = {
        time: new Date().toISOString(),
        color,
        quote,
      };

      await upsertTimelineHistory(authUser.id, colourValue, quote);

      setTimelineIntervals(prev => {
        const newIntervals = [...prev, newInterval];
        if (newIntervals.length > 12) {
          console.debug('[DEBUG] Removing oldest interval, current length:', newIntervals.length);
          newIntervals.shift();
        }
        console.debug('[DEBUG] Appended new interval, current timelineIntervals:', newIntervals);
        return newIntervals;
      });
      setNoData(false);
    } catch (error) {
      console.error('[DEBUG] Error processing data:', error);
      setNoData(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    console.debug('[DEBUG] TimelinePage mounted, initiating subscriptions');
    const now = new Date();
    const msToNextTwoMinutes = (2 * 60 * 1000) - (now.getTime() % (2 * 60 * 1000));
    console.debug('[DEBUG] Scheduling first poll in:', msToNextTwoMinutes, 'ms');

    const firstPoll = setTimeout(() => {
      console.debug('[DEBUG] Initial poll triggered');
      fetchExtensionData();
      const pollInterval = setInterval(() => {
        console.debug('[DEBUG] Polling for new data');
        fetchExtensionData();
      }, 2 * 60 * 1000);
      window.pollInterval = pollInterval;
    }, msToNextTwoMinutes);

    const subscribeToExtensions = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('[DEBUG] No user for subscription');
        return;
      }

      const channel = supabase.channel('extensions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Extensions',
            filter: `id=eq.${authUser.id}`,
          },
          () => {
            console.debug('[DEBUG] Realtime change detected in Extensions table');
            fetchExtensionData();
          }
        )
        .subscribe();

      console.debug('[DEBUG] Subscribed to realtime changes for Extensions');
      return channel;
    };

    let channel;
    subscribeToExtensions().then(ch => (channel = ch));

    return () => {
      console.debug('[DEBUG] TimelinePage unmounting, cleaning up');
      clearTimeout(firstPoll);
      if (channel) supabase.removeChannel(channel);
      if (window.pollInterval) clearInterval(window.pollInterval);
    };
  }, []);

const getQuote = async (seed, userId, currentColour) => {
    try {
      // ── 1. Fetch objectives with the requested columns ──
      const { data: objectives, error: objErr } = await supabase
        .from('objectives')
        .select('id, title, description, blocked_domains, allowed_domains, progress')
        .eq('user_id', userId);
      if (objErr || !objectives) throw new Error(objErr?.message || 'No objectives found');

      // ── 2. Fetch roadmap tasks matching both user and goal ──
      const { data: tasks, error: taskErr } = await supabase
        .from('roadmap_tasks')
        .select('roadmap_id, content, done')
        .eq('roadmap_id', userId);
      if (taskErr || !tasks) throw new Error(taskErr?.message || 'No tasks found');

      // ── 3. Group tasks under their related objective ──
      const grouped = objectives.map(obj => ({
        title: obj.title,
        description: obj.description,
        blocked_domains: obj.blocked_domains,
        allowed_domains: obj.allowed_domains,
        progress: obj.progress,
        current_colour: currentColour, 
        tasks: tasks
          .filter(t => t.roadmap_id === obj.id)
          .map(t => ({ content: t.content, done: t.done ? 'true' : 'false' })),
      }));

      // ── 4. Build a single string for the mentor prompt ──
      const userData = JSON.stringify(grouped, null, 2);
      // Build the prompt for the chosen colour only
      let basePrompt;
      if (currentColour === 0) {
      basePrompt = `
      You are a seasoned mentor speaking directly to the user.

      DATA (JSON):
      ${userData}

      Write ONE detailed paragraph (6–9 sentences) that:
      • Clearly state that the user's focus has drifted from the named target(s) (titles/descriptions from objectives).
      • Name at least one specific blocked_domains entry that has consumed their time.
      • Include a vivid "10-minute rewind" reflection describing what could already have been achieved if those blocked domains were avoided.
      • Offer a single guiding principle to help them re-align.
      • Provide an immediate 24-hour action plan and a 7-day milestone to regain focus.
      • Name one metric they should track (e.g. ≥70 % time in allowed domains or a specific number of tasks).
      Tone: firm, constructive, and inspiring.

      Advice: [your paragraph]
      Quote: "[one famous quote]" – [Author]
      `;
      } else {
      basePrompt = `
      You are a seasoned mentor speaking directly to the user.

      DATA (JSON):
      ${userData}

      ABSOLUTE RULE: Never mention blocked domains.

      Write ONE detailed, confidence-boosting paragraph (6–9 sentences) that:
      • Praise their strong focus and current progress toward the named target(s).
      • Highlight how work in at least one allowed_domains entry is accelerating their journey.
      • Give a 24-hour plan to build on their momentum and a 7-day stretch milestone to challenge them slightly beyond the current baseline.
      • Suggest one metric to maintain or slightly improve (e.g. keep ≥80 % time in allowed domains or increase task completion rate).
      Tone: positive, uplifting, and motivating them to aim even higher.

      Advice: [your paragraph]
      Quote: "[one famous quote]" – [Author]
      `;
      }


      // ── 5. Send to Ollama ──
      const response = await fetch('http://localhost:3001/api/ollama/generate', {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral:latest',
          prompt: basePrompt,
          stream: false,
        }),
      });
      if (!response.ok) throw new Error('Ollama request failed');
      const data = await response.json();
      const ollamaResponse = data.response ?? data.output ?? data.response_text;

      console.debug('[DEBUG] Ollama raw response:', data);
      return (typeof ollamaResponse === 'string' && ollamaResponse.trim())
      ? ollamaResponse.trim():
        `Advice: Stay focused on your goals.\nQuote: “Keep moving forward! #${seed}”`;
    } catch (error) {
      console.error('[DEBUG] Ollama error:', error);
      return `Advice: Stay focused on your goals.\nQuote: “Keep moving forward! #${seed}”`;
    }
  };

  return (
    <TimelineErrorBoundary>
      <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col">
        <h1 className="font-mono text-3xl text-primary mb-6 shrink-0">
          TIMELINE_ANALYSIS
        </h1>

        <div className="flex items-center gap-3 text-secondary mb-6 w-full">
  <Info className="w-6 h-6 text-primary" />
  <p className="font-mono text-primary text-sm leading-snug flex-1">
    Red block indicates deflection. Green block indicates alignment.
    Deflection is decided based on thirty percent or over time spent
    on domains that do not constitute your goals.
  </p>
</div>
  
        {/* ───────────────────────── Main 3-D Timeline ───────────────────────── */}
        <div className="relative flex-1 w-full max-w-4xl mx-auto perspective-[1000px]">
          {/* Outer wrapper is relative and has NO transform
              → prevents it from creating a stacking context */}
          <div className="absolute inset-0">
  
            {/* Inner wrapper only for the 3-D rotated stairs/bricks */}
            <div
              className="absolute inset-0 transform rotate-x-[20deg]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {timelineIntervals.length === 0 || noData ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="font-mono text-primary text-lg">
                    No data available. Please use the extension to log activity.
                  </p>
                </div>
              ) : (
                <>
                  {/* draw treads & risers */}
                  {timelineIntervals.slice(0, -1).map((_, index) => {
                    const total = timelineIntervals.length;
                    const stepX = total > 1 ? 80 / (total - 1) : 0;
                    const stepY = total > 1 ? 40 / (total - 1) : 0;
                    const baseY = 10;
  
                    const posX1 = 10 + index * stepX;
                    const posY1 = baseY + index * stepY;
                    const posX2 = 10 + (index + 1) * stepX;
                    const posY2 = baseY + (index + 1) * stepY;
  
                    return (
                      <React.Fragment key={`step-${index}`}>
                        <div
                          className="absolute h-2 bg-secondary/50"
                          style={{
                            left: `${posX1}%`,
                            top: `${posY1}%`,
                            width: `${stepX}%`,
                          }}
                        />
                        <div
                          className="absolute w-2 bg-secondary/50"
                          style={{
                            left: `${posX2}%`,
                            top: `${posY1}%`,
                            height: `${stepY}%`,
                          }}
                        />
                      </React.Fragment>
                    );
                  })}
  
                  {/* bricks themselves */}
                  {timelineIntervals.map((interval, index) => {
                    const total = timelineIntervals.length;
                    const stepX = total > 1 ? 80 / (total - 1) : 0;
                    const stepY = total > 1 ? 40 / (total - 1) : 0;
                    const baseY = 10;
  
                    const posX = 10 + index * stepX;
                    const posY = baseY + index * stepY;
  
                    return (
                      <motion.div
                        key={interval.time}
                        className={`absolute z-0 w-12 h-6 rounded-t-md shadow-lg backdrop-blur-sm ${interval.color} bg-gradient-to-b from-white/20 to-transparent border border-white/30 ${
                          index === arrowIndex ? 'ring-2 ring-primary/40 scale-105' : ''
                        }`}
                        style={{
                          left: `${posX}%`,
                          top: `${posY}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.15, duration: 0.5, ease: 'easeOut' }}
                      />
                    );
                  })}
  
                  {/* moving arrow indicator */}
                  {timelineIntervals.length > 0 && (() => {
                    const total = timelineIntervals.length;
                    const stepX = total > 1 ? 80 / (total - 1) : 0;
                    const stepY = total > 1 ? 40 / (total - 1) : 0;
                    const baseY = 10;
  
                    const posX = 10 + arrowIndex * stepX;
                    const posY = baseY + arrowIndex * stepY;
  
                    return (
                      <motion.div
                        className="absolute z-20"
                        animate={{ left: `${posX}%`, top: `${posY - 2}%` }}
                        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary" />
                      </motion.div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
  
          {/* ─────────────── Floating quote box – fixed to bottom left ─────────────── */}
          <AnimatePresence>
            {activeQuote && (
              <motion.div
                className="fixed z-[9999] bottom-36 left-36 w-80 max-h-48 overflow-y-auto p-6 border border-secondary/50 bg-background/95 rounded-xl shadow-2xl backdrop-blur-md ring-1 ring-primary/20"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <p className="font-mono text-primary text-base leading-relaxed italic">{activeQuote}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
  
        {/* ───────────────────────── Slider / controls ───────────────────────── */}
        <div className="shrink-0 bg-background border-t border-secondary/50 p-4 mt-4">
          <div className="flex items-center gap-4">
            <button className="font-mono text-primary border border-primary px-6 py-2 hover:bg-primary hover:text-background transition-colors">
              [REWIND_SIMULATION]
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={e => setSliderValue(Number(e.target.value))}
              className="w-full h-px bg-secondary appearance-none cursor-pointer timeline-slider"
            />
          </div>
        </div>
      </div>
    </TimelineErrorBoundary>
  )
}
  
export default TimelinePage;
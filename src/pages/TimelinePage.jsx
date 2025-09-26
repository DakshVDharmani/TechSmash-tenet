import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const TimelinePage = () => {
  const [hoveredInterval, setHoveredInterval] = useState(null);
  const [timelineIntervals, setTimelineIntervals] = useState([]);
  const [noData, setNoData] = useState(false);

  const fetchExtensionData = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('Authentication error:', authError?.message || 'No user logged in');
        setNoData(true);
        return;
      }

      console.log('User ID:', authUser.id); // Debug user ID

      // Debug: Fetch all Extensions rows for the user
      const { data: allExtensions, error: allExtensionsError } = await supabase
        .from('Extensions')
        .select('*')
        .eq('id', authUser.id);
      console.log('All Extensions for user:', allExtensions, 'Error:', allExtensionsError);

      // Fetch the latest goal_id from objectives
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select('id')
        .eq('user_id', authUser.id)
        .order('last_updated', { ascending: false })
        .limit(1);

      if (objError || !objectives?.length) {
        console.error('Error fetching objectives:', objError?.message);
        setNoData(true);
        return;
      }

      const goalId = objectives[0].id;
      console.log('Goal ID:', goalId); // Debug goal ID

      // Fetch Extensions data (no time filter for testing)
      const now = new Date();
      const twentyFourMinutesAgo = new Date(now.getTime() - 24 * 60 * 1000).toISOString();
      console.log('Fetching data since:', twentyFourMinutesAgo); // Debug time filter

      let { data, error } = await supabase
        .from('Extensions')
        .select('created_at, focused_time, distracted_time, allowed_domains, rejected_domains')
        .eq('id', authUser.id)
        // .gte('created_at', twentyFourMinutesAgo) // Comment out for testing; uncomment for production
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching Extensions:', error.message);
        setNoData(true);
        return;
      }

      if (!data?.length) {
        console.warn('No Extensions data found for user:', authUser.id);
        // Seed or update a single row
        const seedData = {
          id: authUser.id,
          goal_id: goalId,
          focused_time: 120,
          distracted_time: 40,
          created_at: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
          allowed_domains: [],
          rejected_domains: [],
        };
        const { error: upsertError } = await supabase
          .from('Extensions')
          .upsert(seedData, { onConflict: ['goal_id'] });

        if (upsertError) {
          console.error('Error seeding/updating test data:', upsertError.message);
          setNoData(true);
          return;
        }

        // Re-fetch after seeding
        ({ data, error } = await supabase
          .from('Extensions')
          .select('created_at, focused_time, distracted_time, allowed_domains, rejected_domains')
          .eq('id', authUser.id)
          // .gte('created_at', twentyFourMinutesAgo) // Comment out for testing; uncomment for production
          .order('created_at', { ascending: true }));

        if (error) {
          console.error('Error re-fetching Extensions:', error.message);
          setNoData(true);
          return;
        }
      }

      console.log('Fetched Extensions:', data); // Debug fetched data

      // Process into 2-minute buckets (12 buckets for 24 minutes)
      const twoMinutesMs = 2 * 60 * 1000;
      const bucketStart = new Date(twentyFourMinutesAgo); // Start at 24 minutes ago (01:53 AM IST)
      const intervals = [];

      console.log('Starting bucket at:', bucketStart); // Debug initial bucket

      // Always generate 12 buckets
      for (let i = 0; i < 12; i++) {
        const bucketStartTime = new Date(bucketStart.getTime() + i * twoMinutesMs);
        const bucketEnd = new Date(bucketStartTime.getTime() + twoMinutesMs);
        let focusedDeltaSec = 0;
        let distractedDeltaSec = 0;

        // Filter data for this bucket
        let bucketData = data.filter(row => {
          const rowTime = new Date(row.created_at);
          return rowTime >= bucketStartTime && rowTime < bucketEnd;
        });

        console.log(`Bucket ${i} data:`, bucketData); // Debug rows in bucket

        if (bucketData.length > 0) {
          // Use the latest row in the bucket
          const latestRow = bucketData[bucketData.length - 1];
          focusedDeltaSec = latestRow.focused_time;
          distractedDeltaSec = latestRow.distracted_time;
        } else if (data.length === 1) {
          // Single row: Distribute uniformly across all buckets
          const totalFocused = data[0].focused_time;
          const totalDistracted = data[0].distracted_time;
          const totalSec = totalFocused + totalDistracted;
          const bucketSec = twoMinutesMs / 1000; // 120 seconds per bucket
          const rateFocused = totalSec > 0 ? totalFocused / (24 * 60) : 0;
          const rateDistracted = totalSec > 0 ? totalDistracted / (24 * 60) : 0;

          focusedDeltaSec = rateFocused * bucketSec;
          distractedDeltaSec = rateDistracted * bucketSec;
        }

        const totalDeltaSec = focusedDeltaSec + distractedDeltaSec;
        let color = 'bg-transparent';
        let quote = '';

        if (totalDeltaSec > 0) {
          const distractedPercent = (distractedDeltaSec / totalDeltaSec) * 100;
          color = distractedPercent > 30 ? 'bg-alert' : 'bg-success';
          quote = await getQuote(color === 'bg-alert' ? 'motivation' : 'encouragement', i);
        }

        intervals.push({
          time: bucketStartTime.toISOString(),
          color,
          quote,
        });

        console.log(`Bucket ${i}:`, {
          time: bucketStartTime.toISOString(),
          focusedDeltaSec,
          distractedDeltaSec,
          totalDeltaSec,
          color,
          quote,
        }); // Debug bucket details
      }

      console.log('Generated intervals:', intervals.length, intervals); // Debug intervals
      setTimelineIntervals(intervals);
      setNoData(false); // Force render even if sparse data
    } catch (error) {
      console.error('Error processing data:', error);
      setNoData(true);
    }
  };

  useEffect(() => {
    fetchExtensionData();
    const pollInterval = setInterval(fetchExtensionData, 30 * 1000); // Poll every 30 seconds for testing

    // Realtime subscription
    const subscribeToExtensions = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const channel = supabase.channel('extensions-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'Extensions',
          filter: `id=eq.${authUser.id}`
        }, () => {
          fetchExtensionData();
        })
        .subscribe();

      return channel;
    };

    let channel;
    subscribeToExtensions().then(ch => channel = ch);

    return () => {
      clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const getQuote = async (type, seed) => {
    try {
      const prompt = type === 'motivation'
        ? `Generate a unique, concise motivational quote about achieving goals and boosting productivity. Variation seed: ${seed}.`
        : `Generate a unique, concise encouraging quote about maintaining focus and momentum. Variation seed: ${seed}.`;
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt: prompt,
          stream: false,
        }),
      });
      if (!response.ok) throw new Error('Ollama request failed');
      const { response: ollamaResponse } = await response.json();
      return ollamaResponse.trim();
    } catch (error) {
      console.error('Ollama error:', error);
      return type === 'motivation'
        ? `“Push harder, your goals are within reach! #${seed}”`
        : `“Great focus, keep it up! #${seed}”`;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col">
      {/* Header */}
      <h1 className="font-mono text-3xl text-primary mb-6 shrink-0">
        TIMELINE_ANALYSIS
      </h1>

      {/* Timeline (scrollable) */}
      <div className="relative flex-1 overflow-auto flex flex-col items-center">
        {/* Center Line */}
        <div className="absolute top-0 bottom-0 w-px bg-secondary/50" />

        {timelineIntervals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="font-mono text-primary text-lg">No data available. Please use the extension to log activity.</p>
          </div>
        ) : (
          timelineIntervals.map((interval, index) => (
            <motion.div
              key={interval.time}
              className="relative w-full my-6"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.15, duration: 0.5, ease: 'easeOut' }}
              onMouseEnter={() => setHoveredInterval(index)}
              onMouseLeave={() => setHoveredInterval(null)}
            >
              {/* Timeline Box with Animation */}
              <motion.div
                className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-background ${interval.color}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: interval.color !== 'bg-transparent' ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
              />

              {/* Hover Card with Quote */}
              {hoveredInterval === index && interval.quote && (
                <motion.div
                  layoutId={`interval-card-${index}`}
                  className={`absolute left-1/2 p-4 border border-secondary/50 bg-background z-10 w-64
                    ${index % 2 === 0 ? 'ml-8' : '-ml-8 -translate-x-full'}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="font-mono text-primary text-sm">{interval.quote}</p>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 bg-background border-t border-secondary/50 p-4 mt-4">
        <div className="flex items-center gap-4">
          <button className="font-mono text-primary border border-primary px-6 py-2 hover:bg-primary hover:text-background transition-colors">
            [REWIND_SIMULATION]
          </button>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="100"
            className="w-full h-px bg-secondary appearance-none cursor-pointer timeline-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default TimelinePage;
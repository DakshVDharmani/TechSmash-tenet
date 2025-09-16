import { motion } from 'framer-motion';
import { useState } from 'react';
import { mockTimelineEvents } from '../data/mockData';

const TimelinePage = () => {
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const getClassificationStyles = (classification) => {
    switch (classification) {
      case 'aligned':
        return 'bg-success';
      case 'distracted':
        return 'bg-alert';
      default:
        return 'bg-secondary';
    }
  };

  return (
    // 👇 fits below TopNavbar, structured as header + scrollable timeline + footer
    <div className="h-[calc(100vh-4rem)] p-8 md:p-12 flex flex-col">
      {/* Header */}
      <h1 className="font-mono text-3xl text-primary mb-6 shrink-0">
        TIMELINE_ANALYSIS
      </h1>

      {/* Timeline (scrollable) */}
      <div className="relative flex-1 overflow-auto flex flex-col items-center">
        {/* Center Line */}
        <div className="absolute top-0 bottom-0 w-px bg-secondary/50" />

        {mockTimelineEvents.map((event, index) => (
          <motion.div
            key={event.id}
            className="relative w-full my-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.15 }}
            onMouseEnter={() => setHoveredEvent(event)}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            {/* Timeline Dot */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 border-2 border-background ${getClassificationStyles(
                event.classification
              )}`}
            />

            {/* Hover Card */}
            {hoveredEvent?.id === event.id && (
              <motion.div
                layoutId="event-card"
                className={`absolute left-1/2 p-4 border border-secondary/50 bg-background z-10 w-64
                  ${
                    index % 2 === 0
                      ? 'ml-8'
                      : '-ml-8 -translate-x-full'
                  }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <p className="font-mono text-primary">{event.title}</p>
                <p className="font-mono text-sm text-secondary">{event.domain}</p>
                <p className="font-mono text-xs text-secondary/70">
                  {event.timestamp} - {event.duration}min
                </p>
                <p
                  className={`font-mono text-xs ${
                    event.classification === 'aligned'
                      ? 'text-success'
                      : 'text-alert'
                  }`}
                >
                  {event.classification.toUpperCase()}
                </p>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 bg-background border-t border-secondary/50 p-4 mt-4">
        <div className="flex items-center gap-4">
          <button className="font-mono text-primary border border-primary px-6 py-2 hover:bg-primary hover:text-background transition-colors">
            [ REWIND_SIMULATION ]
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

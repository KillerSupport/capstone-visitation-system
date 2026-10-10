import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Pause, Play } from 'lucide-react';

interface AnnouncementTickerProps {
  messages: string[];
}

export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = ({ messages }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [duration, setDuration] = useState(25);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;

    const measure = () => {
      setViewportWidth(viewport.clientWidth);
      // Keep long announcements moving at the same readable speed as short ones.
      setDuration(Math.max(group.getBoundingClientRect().width / 45, 18));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    measure();
    return () => observer.disconnect();
  }, [messages]);

  if (!messages.length) return null;

  return (
    <section className="announcement-ticker" aria-label="Security announcements">
      <div className="announcement-ticker__inner">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="sr-only">
          {messages.map((message, index) => <p key={index}>{message}</p>)}
        </div>
        <div ref={viewportRef} className="announcement-ticker__viewport" aria-hidden="true">
          <div
            className="announcement-ticker__track"
            style={{ animationDuration: `${duration}s`, animationPlayState: isPaused ? 'paused' : 'running' }}
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                ref={copy === 0 ? groupRef : undefined}
                className="announcement-ticker__group"
                style={{ minWidth: viewportWidth }}
              >
                {messages.map((message, index) => (
                  <span key={index} className="announcement-ticker__message">{message}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((paused) => !paused)}
          className="announcement-ticker__control"
          aria-label={isPaused ? 'Resume scrolling announcements' : 'Pause scrolling announcements'}
          aria-pressed={isPaused}
          title={isPaused ? 'Resume announcements' : 'Pause announcements'}
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
      </div>
    </section>
  );
};

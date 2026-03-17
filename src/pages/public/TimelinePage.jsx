import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';

/* ─── Inline CSS animations matching the light theme ─────────────────── */
const STYLES = `
  /* Timeline Spine Animation */
  @keyframes spineFlow {
    0%   { background-position: 0% 0%; }
    100% { background-position: 0% 100%; }
  }
  .tl-spine {
    background: linear-gradient(to bottom, #eff6ff 0%, #3b82f6 15%, #0ea5e9 50%, #8b5cf6 85%, #f3f4f6 100%);
    background-size: 100% 200%;
    animation: spineFlow 4s linear infinite;
  }

  /* Dot entrance and pulse */
  @keyframes dotPop {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .tl-dot {
    opacity: 0;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .tl-dot.visible {
    animation: dotPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
  .tl-dot:hover {
    transform: scale(1.15) !important;
  }

  /* Card entrance animations */
  @keyframes cardSlideLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes cardSlideRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes cardSlideUp {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .tl-card {
    opacity: 0;
    will-change: transform, opacity;
  }
  .tl-card.visible-left  { animation: cardSlideLeft  0.6s ease-out forwards; }
  .tl-card.visible-right { animation: cardSlideRight 0.6s ease-out forwards; }
  .tl-card.visible-up    { animation: cardSlideUp    0.6s ease-out forwards; }
`;

function TimelineCard({ item, index, isMobile }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const isLeft = index % 2 === 0;
  const animClass = isMobile ? 'visible-up' : (isLeft ? 'visible-left' : 'visible-right');
  const delay = `${index * 0.1}s`;

  return (
    <div ref={ref} className={`tl-card ${visible ? animClass : ''}`} style={{ animationDelay: delay }}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 dark:border-dark-border overflow-hidden relative group">
        {/* Top subtle color bar matching item color */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: item.color || '#3b82f6' }} />
        
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            {/* Mobile/Compact exact time display inside card */}
            <div className={`flex flex-col items-center justify-center p-3 rounded-lg flex-shrink-0 transition-transform group-hover:scale-105`}
                 style={{ backgroundColor: `${item.color || '#3b82f6'}15`, color: item.color || '#3b82f6' }}>
              <span className="text-2xl mb-1">{item.icon || '🏆'}</span>
              <span className="text-xs font-bold leading-none">{item.time}</span>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1 border-b border-gray-50 dark:border-gray-800 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sequence {index + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
              {item.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineDot({ item, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative z-10 flex-shrink-0 group cursor-default">
      <div className={`tl-dot w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md border-4 border-white dark:border-dark-bg ${visible ? 'visible' : ''}`}
        style={{ backgroundColor: item.color || '#3b82f6', animationDelay: `${index * 0.1}s` }}>
        {item.icon || '🏆'}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get('/timeline'), API.get('/settings').catch(() => ({ data: {} }))])
      .then(([tRes, sRes]) => {
        setItems(tRes.data);
        setSettings(sRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const eventDate = settings?.eventDate
    ? new Date(settings.eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col transition-colors duration-300">
      <style>{STYLES}</style>
      <Navbar />

      {/* ── Light Theme Hero ── */}
      <section className="bg-gradient-to-br from-blue-900 via-sky-700 to-cyan-700 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 text-white py-16 px-4 relative overflow-hidden transition-colors">
        {/* Subtle background patterns */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] [background-size:24px_24px]"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-blue-50 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider animate-slide-down border border-white/30">
            <span>🗓️</span> Event Schedule
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-slide-up text-white shadow-sm">
            {settings?.eventName || 'Annual Sports Day'} Timeline
          </h1>
          {eventDate && (
            <p className="text-xl text-blue-100 mb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>{eventDate}</p>
          )}
          {settings?.venue && (
            <p className="text-blue-200 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>📍 {settings.venue}</p>
          )}
        </div>
      </section>

      {/* ── Timeline body ── */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-16 w-full">
        {loading ? (
          <div className="space-y-8 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-32 w-full max-w-2xl mx-auto opacity-50"></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Schedule Coming Soon</h2>
            <p className="text-gray-500 dark:text-gray-400">The event timeline is currently being prepared. Check back shortly!</p>
          </div>
        ) : (
          <>
            {/* ── Mobile Layout (Single Column) ── */}
            <div className="block md:hidden">
              <div className="relative pl-6">
                {/* Left Spine */}
                <div className="absolute left-[11px] top-4 bottom-4 w-1 tl-spine rounded-full" />
                
                <div className="space-y-8">
                  {items.map((item, index) => (
                    <div key={item._id} className="relative">
                      {/* Floating Dot */}
                      <div className="absolute -left-[45px] mt-4">
                        <TimelineDot item={item} index={index} />
                      </div>
                      <TimelineCard item={item} index={index} isMobile={true} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Desktop Layout (Alternating Columns) ── */}
            <div className="hidden md:block relative">
              {/* Center Spine */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-1 tl-spine rounded-full shadow-inner" />

              <div className="space-y-12">
                {items.map((item, index) => {
                  const isLeft = index % 2 === 0;
                  return (
                    <div key={item._id} className="relative flex items-center justify-between">
                      {/* Left Side */}
                      <div className="w-[45%] flex justify-end">
                        {isLeft ? (
                          <div className="w-full">
                            <TimelineCard item={item} index={index} isMobile={false} />
                          </div>
                        ) : (
                          <div className="text-right pr-6 animate-fade-in group w-full flex flex-col justify-center">
                            <span className="text-3xl font-black text-gray-200 group-hover:text-blue-100 transition-colors drop-shadow-sm">{item.time}</span>
                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-1">Scheduled</span>
                          </div>
                        )}
                      </div>

                      {/* Center Dot */}
                      <TimelineDot item={item} index={index} />

                      {/* Right Side */}
                      <div className="w-[45%] flex justify-start">
                        {!isLeft ? (
                          <div className="w-full">
                            <TimelineCard item={item} index={index} isMobile={false} />
                          </div>
                        ) : (
                          <div className="text-left pl-6 animate-fade-in group w-full flex flex-col justify-center">
                            <span className="text-3xl font-black text-gray-200 group-hover:text-blue-100 transition-colors drop-shadow-sm">{item.time}</span>
                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-1">Scheduled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* End of Timeline Marker */}
              <div className="flex justify-center mt-12 relative z-10 animate-fade-in" style={{ animationDelay: '1s' }}>
                <div className="bg-white dark:bg-dark-card px-6 py-2 rounded-full shadow-sm border border-gray-100 dark:border-dark-border text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  End of Event
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border py-8 text-center mt-auto transition-colors duration-300">
        <p className="font-medium text-gray-900 dark:text-white text-sm">
          {settings?.collegeName || 'Sports Event'} · {settings?.eventName || 'Annual Sports Day'}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">Built and developed by Nikhil Katigar</p>
      </footer>
    </div>
  );
}

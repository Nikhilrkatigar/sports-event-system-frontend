import { useState, useEffect } from 'react';
import API from '../../utils/api';

export default function ProfileModal({ name, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    API.get(`/registrations/public/profile/${encodeURIComponent(name)}`)
      .then(res => setProfile(res.data))
      .catch(() => setProfile(res.data || null))
      .finally(() => setLoading(false));
  }, [name]);

  if (!name) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up border border-transparent dark:border-dark-border" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-sky-600 dark:from-blue-900 dark:to-cyan-900 text-white p-6 pb-8 relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm shadow-inner border border-white/20">
              <span className="text-3xl">🏆</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{name}</h2>
              {loading ? (
                <div className="h-4 bg-white/20 rounded w-24 animate-pulse mt-1" />
              ) : (
                <p className="text-blue-100 font-medium mt-1">
                  Overall Points: <span className="font-bold text-white text-lg ml-1">{profile?.totalPoints || 0}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-gray-50 dark:bg-dark-bg min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading profile...</p>
            </div>
          ) : !profile ? (
             <div className="text-center py-12 text-gray-500 dark:text-gray-400">
               Could not load profile details for {name}.
             </div>
          ) : (
            <div className="space-y-6 -mt-10 relative z-10">
              
              {/* Roster Section */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Team Roster</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.players.map((p, i) => (
                    <div key={i} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{p.name}</span>
                        {p.role === 'Leader' && <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Capt</span>}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{p.department}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 pl-1">Events Participated</h3>
                <div className="space-y-3">
                  {profile.events.map((ev, i) => {
                    const rankData = profile.leaderboardRanks?.find(r => r.eventId === ev.eventId);
                    return (
                      <div key={i} className="bg-white dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border p-4 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <div className="font-bold text-gray-800 dark:text-gray-200">{ev.title}</div>
                          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(ev.date).toLocaleDateString()}
                          </div>
                        </div>
                        {rankData && rankData.rank && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold tracking-wider block mb-0.5">Rank</span>
                            <span className={`text-xl font-black ${rankData.rank === 1 ? 'text-yellow-500' : rankData.rank === 2 ? 'text-gray-400 dark:text-gray-300' : rankData.rank === 3 ? 'text-amber-700 dark:text-amber-500' : 'text-blue-600 dark:text-blue-400'}`}>
                              #{rankData.rank}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

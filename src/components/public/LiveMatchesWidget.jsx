import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';

export default function LiveMatchesWidget() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchLive = async () => {
      try {
        const res = await API.get('/tournaments/live');
        if (mounted) {
          setLiveMatches(res.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    fetchLive();
    // Refresh live scores every 30 seconds
    const interval = setInterval(fetchLive, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-gray-900 border-b border-gray-800 shadow-inner overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        
        {/* 'LIVE NOW' Badge */}
        <div className="flex-shrink-0 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider animate-pulse shadow-lg shadow-red-500/20 z-10 relative">
          <span className="w-2 h-2 rounded-full bg-white relative">
            <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75"></span>
          </span>
          Live Matches
        </div>

        {/* Scrolling Matches Container */}
        <div className="flex-1 overflow-x-auto no-scrollbar relative flex items-center space-x-4 pb-1">
          {liveMatches.map((match) => {
            const eventName = match.tournamentId?.eventId?.title || 'Event';
            return (
              <div 
                key={match._id} 
                className="flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-4 min-w-[280px] hover:bg-gray-750 transition-colors"
              >
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap border-r border-gray-700 pr-3">
                  {eventName}
                </div>
                
                <div className="flex-1 flex flex-col gap-1.5 ml-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-white truncate max-w-[100px]">{match.participant1 || 'TBC'}</span>
                    <span className="bg-gray-900 text-blue-400 font-mono font-bold px-2 py-0.5 rounded text-sm w-8 text-center border border-gray-700">
                      {match.score1 ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-white truncate max-w-[100px]">{match.participant2 || 'TBC'}</span>
                    <span className="bg-gray-900 text-blue-400 font-mono font-bold px-2 py-0.5 rounded text-sm w-8 text-center border border-gray-700">
                      {match.score2 ?? '-'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <Link to="/tournaments" className="flex-shrink-0 text-xs text-blue-400 hover:text-blue-300 font-medium pl-2 hidden md:block transition-colors">
          View Brackets &rarr;
        </Link>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

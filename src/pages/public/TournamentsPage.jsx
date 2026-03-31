import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { CardSkeleton } from '../../components/Skeletons';
import { formatLabel } from '../../utils/tournaments';
import { Trophy, CalendarDays, Users, Activity, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/tournaments')
      .then((res) => setTournaments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300 pb-20">
      <Navbar />
      
      {/* Keyframe animations for staggered entry */}
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            opacity: 0;
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>

      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
        <div className="text-center mb-16 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight relative z-10 animate-fade-in-up">
            Tournament <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Schedules</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto relative z-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Track live match schedules, brackets, and real-time results for all ongoing and upcoming events.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border p-16 text-center shadow-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
              <Trophy className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-900 dark:text-white text-xl font-bold mb-2">No tournaments available yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">Check back soon for brackets, heats, or field flights. Events are being organized.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((tournament, i) => {
              const isLive = tournament.status === 'in_progress';
              const isCompleted = tournament.status === 'completed';
              
              const statusColors = {
                in_progress: 'from-amber-400 to-orange-500',
                completed: 'from-emerald-400 to-teal-500',
                scheduled: 'from-blue-500 to-cyan-500'
              };

              return (
                <div 
                  key={tournament._id} 
                  className="group relative bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 border border-gray-100 dark:border-dark-border overflow-hidden flex flex-col h-full animate-fade-in-up"
                  style={{ animationDelay: `${(i * 0.1) + 0.2}s` }}
                >
                  {/* Top Accent Line */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${statusColors[tournament.status] || statusColors.scheduled}`}></div>
                  
                  {isLive && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                  )}

                  <div className="p-6 sm:p-8 flex-grow flex flex-col relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-blue-600 dark:text-blue-400 shadow-sm">
                        <Trophy className="w-6 h-6" />
                      </div>
                      
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border shadow-sm uppercase tracking-wide ${
                        isLive ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50' :
                        isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/50' :
                        'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}>
                        {isLive && <Activity className="w-3.5 h-3.5 animate-pulse" />}
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {!isLive && !isCompleted && <Clock className="w-3.5 h-3.5" />}
                        {isLive ? 'Live Now' : isCompleted ? 'Completed' : 'Scheduled'}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {tournament.eventId?.title || 'Tournament'}
                    </h2>
                    
                    <div className="mt-4 space-y-3.5 mb-8">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <CalendarDays className="w-4.5 h-4.5 mr-3 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{tournament.eventId?.date ? new Date(tournament.eventId.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBA'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4.5 h-4.5 mr-3 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{tournament.participantCount || 0} Participants</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Trophy className="w-4.5 h-4.5 mr-3 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{formatLabel(tournament.format)}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-5 border-t border-gray-100 dark:border-gray-800/80">
                      <Link
                        to={`/tournaments/${tournament.eventId?._id}`}
                        className="group/btn relative flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center">
                          {tournament.format === 'track_heats' ? 'View Heats' : tournament.format === 'field_flight' ? 'View Flight' : 'View Bracket'}
                          <ChevronRight className="w-4.5 h-4.5 ml-1.5 group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

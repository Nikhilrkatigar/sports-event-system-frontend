import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { useTranslation } from '../../hooks/useTranslation';
import { CardSkeleton, ImageSkeleton, TableRowSkeleton } from '../../components/Skeletons';
import { canRegisterForEvent, getEventStatusMeta, PUBLIC_EVENT_STATUSES } from '../../utils/events';
import { Calendar, Users, Ticket, X, ChevronLeft, ChevronRight } from 'lucide-react';

const toArray = (value) => (Array.isArray(value) ? value : []);
const isRankedPodiumEntry = (entry) => (
  entry
  && entry.rank != null
  && Number(entry.rank) <= 3
  && entry.score !== null
  && entry.score !== undefined
  && Number(entry.score) !== 0
);

export default function HomePage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [events, setEvents] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const timelineEvents = events
    .filter(e => e.date && e.startTime)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
      return a.startTime.localeCompare(b.startTime);
    });

  useEffect(() => {
    Promise.all([
      API.get('/settings').catch(() => ({})),
      API.get('/events').catch(() => ({ data: [] })),
      API.get('/gallery').catch(() => ({ data: [] })),
      API.get('/leaderboard').catch(() => ({ data: [] })),
      API.get('/messages').catch(() => ({ data: [] }))
    ])
      .then(([settingsRes, eventsRes, galleryRes, leaderboardRes, messagesRes]) => {
        setSettings(settingsRes.data || {});
        setEvents(
          toArray(eventsRes?.data)
            .filter((event) => PUBLIC_EVENT_STATUSES.includes(event.status))
            .slice(0, 6)
        );
        setGallery(toArray(galleryRes?.data).slice(0, 6));
        setLeaderboard(
          toArray(leaderboardRes?.data)
            .filter(isRankedPodiumEntry)
            .sort((a, b) => {
              const aEvent = String(a.eventId?.title || '');
              const bEvent = String(b.eventId?.title || '');
              if (aEvent !== bEvent) return aEvent.localeCompare(bEvent);
              if (a.rank !== b.rank) return a.rank - b.rank;
              return Number(b.score || 0) - Number(a.score || 0);
            })
            .slice(0, 5)
        );
        setAnnouncements(toArray(messagesRes?.data).slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />

      <section className="bg-gradient-to-br from-blue-900 via-sky-700 to-cyan-700 animate-pan-gradient text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {settings.collegeLogo && <img src={settings.collegeLogo} alt="logo" className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-white/30 object-cover animate-float" />}
          <div className="inline-block bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider animate-slide-down">{t('sportsEvent')}</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 animate-slide-up">{settings.eventName || t('annualSportsDay')}</h1>
          <p className="text-xl text-blue-100 mb-2 animate-slide-up" style={{animationDelay: '0.1s'}}>{settings.collegeName || 'Global College'}</p>
          {settings.venue && <p className="text-blue-200 mb-1 animate-slide-up" style={{animationDelay: '0.2s'}}>{t('venue')}: {settings.venue}</p>}
          {settings.eventDate && <p className="text-blue-200 mb-6 animate-slide-up" style={{animationDelay: '0.3s'}}>{t('date')}: {new Date(settings.eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          <p className="text-blue-50 max-w-2xl mx-auto mb-8 text-lg animate-slide-up" style={{animationDelay: '0.4s'}}>{settings.description || t('welcomeMessage')}</p>
          <Link to="/register" className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl inline-block shadow-lg animate-slide-up" style={{animationDelay: '0.5s'}}>
            {t('registerNow')}
          </Link>
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto animate-fade-in">
        {announcements.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 animate-slide-down">📢 {t('latestAnnouncements')}</h2>
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann._id} className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-l-4 border-blue-500 rounded-lg shadow-md hover:shadow-lg transition-all dark:border-blue-400">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-sm leading-relaxed break-words">
                    {ann.message}
                  </p>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span> {new Date(ann.createdAt).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Cricket Live Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white animate-slide-down">🏏 Live Cricket</h2>
            <Link to="/cricket" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold">View All →</Link>
          </div>
          <Link to="/cricket" className="block bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-800 dark:to-red-900 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80 mb-2">Inter-Department Cricket League</p>
                <h3 className="text-2xl font-bold mb-2">🔴 Live Cricket Matches</h3>
                <p className="text-white/80">Watch live scores, statistics, and real-time updates from all cricket matches</p>
              </div>
              <div className="text-5xl">🏏</div>
            </div>
          </Link>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white relative inline-block animate-slide-down">
            {t('sportsEvents')}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" style={{animation: 'scaleX 0.6s ease-out'}}></div>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-4 animate-slide-up">{t('seeWhatIsOpen')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : toArray(events).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">{t('noData')}</p>
            </div>
          ) : (
            toArray(events).map((event, idx) => {
              const statusMeta = getEventStatusMeta(event);
              return (
                <Link key={event._id} to={`/events/${event._id}`} className={`bg-white/80 dark:bg-dark-card/80 backdrop-blur-md rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 dark:border-dark-border group animate-stagger-${idx + 1}`}>
                  <div className="relative overflow-hidden h-44 bg-gray-100 dark:bg-gray-800">
                    {event.image ? (
                      <img src={event.image} alt={event.title} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center text-2xl font-bold text-blue-700 dark:text-blue-400 group-hover:from-blue-200 group-hover:to-cyan-200 transition-colors">{event.title}</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all group-hover:scale-110 ${event.type === 'team' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'}`}>
                        {event.type === 'team' ? `${t('team')} (${event.teamSize})` : t('individual')}
                      </span>
                      <span className={`text-[11px] border px-2 py-1 rounded-full transition-all group-hover:scale-110 ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{event.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">{event.description}</p>
                    {event.allowedGenders && event.allowedGenders.length > 0 && event.allowedGenders.length < 2 && (
                      <div className="mt-2 inline-block text-xs font-semibold px-2 py-1 rounded-full" style={{
                        backgroundColor: event.allowedGenders[0] === 'female' ? '#fce7f3' : '#dbeafe',
                        color: event.allowedGenders[0] === 'female' ? '#be185d' : '#1e40af'
                      }}>
                        {event.allowedGenders[0] === 'female' ? '♀ ' + t('female') : '♂ ' + t('male')}
                      </div>
                    )}
                    <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                      {event.date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {event.remainingSlots != null && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-500" />
                          <span>{event.remainingSlots} {t('seatsAvailable')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Ticket className={`w-4 h-4 ${canRegisterForEvent(event) ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={canRegisterForEvent(event) ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                          {canRegisterForEvent(event) ? t('open') : statusMeta.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        <div className="text-center mt-8">
          <Link to="/events" className="btn-primary inline-block transform hover:scale-110 transition-all shadow-lg hover:shadow-xl animate-scale-up">{t('seeMore')}</Link>
        </div>
      </section>

      {timelineEvents.length > 0 && (
        <section className="py-16 px-4 bg-gradient-to-br from-indigo-50 to-blue-50 animate-fade-in">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3 animate-slide-down">{t('timeline')}</h2>
            <p className="text-center text-gray-600 mb-10 animate-slide-up">{t('upcomingTimeline')}</p>
            
            <div className="space-y-6">
              {timelineEvents.map((event, idx) => {
                const eventDate = new Date(event.date);
                const dateString = eventDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <div key={event._id} className={`flex gap-4 animate-stagger-${(idx % 3) + 1}`}>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      {idx < timelineEvents.length - 1 && (
                        <div className="w-1 h-16 bg-gradient-to-b from-blue-400 to-blue-200 mt-2"></div>
                      )}
                    </div>
                    <Link 
                      to={`/events/${event._id}`}
                      className="flex-1 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all transform hover:scale-105 border border-blue-100 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-blue-600">⏰ {event.startTime}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{dateString}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1 mt-1">{event.description}</p>
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                              {event.type === 'team' ? `${t('team')} (${event.teamSize})` : t('individual')}
                            </span>
                          </div>
                        </div>
                        <span className="text-2xl group-hover:scale-125 transition-transform">→</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(loading || toArray(leaderboard).length > 0) && (
        <section className="py-16 px-4 bg-white animate-fade-in">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 animate-slide-down">{t('topLeaderboard')}</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-dark-card dark:border-dark-border">
              <table className="w-full text-sm hidden sm:table">
                <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                  <tr className="animate-slide-down">
                    <th className="px-4 py-3 text-left">{t('rank')}</th>
                    <th className="px-4 py-3 text-left">{t('playerName')}</th>
                    <th className="px-4 py-3 text-left">{t('eventName')}</th>
                    <th className="px-4 py-3 text-left">{t('points')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>
                      <TableRowSkeleton columns={4} />
                      <TableRowSkeleton columns={4} />
                      <TableRowSkeleton columns={4} />
                      <TableRowSkeleton columns={4} />
                      <TableRowSkeleton columns={4} />
                    </>
                  ) : (
                    toArray(leaderboard).map((entry, idx) => (
                      <tr key={entry._id} className={`border-t border-gray-100 hover:bg-blue-50 transition-colors animate-stagger-${idx + 1}`}>
                        <td className="px-4 py-3 font-bold text-orange-600">#{entry.rank}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.teamOrPlayer}</td>
                        <td className="px-4 py-3 text-gray-500">{entry.eventId?.title || '-'}</td>
                        <td className="px-4 py-3 font-bold text-blue-700 text-lg">{entry.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="sm:hidden flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                  </div>
                ) : toArray(leaderboard).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">{t('noData')}</div>
                ) : (
                  toArray(leaderboard).map((entry, idx) => (
                    <div key={entry._id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between animate-stagger-${idx + 1}`}>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-orange-600 w-8">#{entry.rank}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{entry.teamOrPlayer}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{entry.eventId?.title || '-'}</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{entry.score}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <Link to="/leaderboard" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium transition-all transform hover:scale-105 inline-block">{t('seeMore')} →</Link>
            </div>
          </div>
        </section>
      )}

      {(loading || toArray(gallery).length > 0) && (
        <section className="py-16 px-4 bg-gray-50 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 animate-slide-down">{t('eventGallery')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {loading ? (
                <>
                  <ImageSkeleton height={200} width={200} />
                  <ImageSkeleton height={200} width={200} />
                  <ImageSkeleton height={200} width={200} />
                  <ImageSkeleton height={200} width={200} />
                  <ImageSkeleton height={200} width={200} />
                  <ImageSkeleton height={200} width={200} />
                </>
              ) : (
                toArray(gallery).map((item, idx) => (
                  <div key={item._id} onClick={() => setLightboxIndex(idx)} className={`relative group overflow-hidden rounded-xl aspect-square shadow-md hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer animate-stagger-${idx + 1}`}>
                    <img src={item.image} alt={item.caption} className="w-full h-full object-contain bg-gray-100 p-2 group-hover:scale-125 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      {item.caption && (
                        <p className="text-white text-sm font-semibold translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{item.caption}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white text-center py-8 text-sm shadow-lg">
        <p className="font-semibold text-lg animate-slide-up">2026 Global College of Management, IT & Commerce - Annual Sports Day</p>
        <p className="text-blue-300 text-xs mt-2 animate-slide-up" style={{animationDelay: '0.1s'}}>Built and developed by Nikhil Katigar</p>
      </footer>

      {lightboxIndex !== null && gallery.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setLightboxIndex(null)}>
          <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-[60] bg-black/50 p-2 rounded-full lg:p-3">
            <X size={28} />
          </button>
          
          {gallery.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev === 0 ? gallery.length - 1 : prev - 1)); }} 
              className="absolute left-2 md:left-8 text-white hover:text-gray-300 transition-colors bg-black/50 p-2 md:p-3 rounded-full z-[60]"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          <img src={gallery[lightboxIndex].image} alt={gallery[lightboxIndex].caption || 'Gallery Image'} className="max-w-[100vw] max-h-[90vh] object-contain px-12 md:px-24" onClick={(e) => e.stopPropagation()} />
          
          {gallery.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev === gallery.length - 1 ? 0 : prev + 1)); }} 
              className="absolute right-2 md:right-8 text-white hover:text-gray-300 transition-colors bg-black/50 p-2 md:p-3 rounded-full z-[60]"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {gallery[lightboxIndex].caption && (
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none px-4">
              <p className="text-white text-sm md:text-base bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-xl shadow-xl">{gallery[lightboxIndex].caption}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import LiveMatchesWidget from '../../components/public/LiveMatchesWidget';
import API from '../../utils/api';
import { CardSkeleton, ImageSkeleton, TableRowSkeleton } from '../../components/Skeletons';
import { canRegisterForEvent, getEventStatusMeta, PUBLIC_EVENT_STATUSES } from '../../utils/events';

const toArray = (value) => (Array.isArray(value) ? value : []);

export default function HomePage() {
  const [settings, setSettings] = useState({});
  const [events, setEvents] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

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
      API.get('/leaderboard').catch(() => ({ data: [] }))
    ])
      .then(([settingsRes, eventsRes, galleryRes, leaderboardRes]) => {
        setSettings(settingsRes.data || {});
        setEvents(
          toArray(eventsRes?.data)
            .filter((event) => PUBLIC_EVENT_STATUSES.includes(event.status))
            .slice(0, 6)
        );
        setGallery(toArray(galleryRes?.data).slice(0, 6));
        setLeaderboard(toArray(leaderboardRes?.data).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />
      <LiveMatchesWidget />

      <section className="bg-gradient-to-br from-blue-900 via-sky-700 to-cyan-700 text-white py-24 px-4 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center">
          {settings.collegeLogo && <img src={settings.collegeLogo} alt="logo" className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-white/30 object-cover animate-bounce duration-700" />}
          <div className="inline-block bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider animate-slide-down">Sports Event</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 animate-slide-up">{settings.eventName || 'Annual Sports Day'}</h1>
          <p className="text-xl text-blue-100 mb-2 animate-slide-up" style={{animationDelay: '0.1s'}}>{settings.collegeName || 'Global College'}</p>
          {settings.venue && <p className="text-blue-200 mb-1 animate-slide-up" style={{animationDelay: '0.2s'}}>Venue: {settings.venue}</p>}
          {settings.eventDate && <p className="text-blue-200 mb-6 animate-slide-up" style={{animationDelay: '0.3s'}}>Date: {new Date(settings.eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          <p className="text-blue-50 max-w-2xl mx-auto mb-8 text-lg animate-slide-up" style={{animationDelay: '0.4s'}}>{settings.description || 'Welcome to our annual sports celebration.'}</p>
          <Link to="/register" className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all transform hover:scale-105 hover:shadow-2xl inline-block shadow-lg animate-slide-up hover:animate-pulse" style={{animationDelay: '0.5s'}}>
            Register Now
          </Link>
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto animate-fade-in">
        {settings.homeNotice && (
          <div className="mb-10 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-500 rounded-lg shadow-md animate-slide-down">
            <div className="flex gap-3">
              <div className="text-2xl">📢</div>
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Important Notice</h3>
                <p className="text-orange-800 whitespace-pre-wrap text-sm">{settings.homeNotice}</p>
              </div>
            </div>
          </div>
        )}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white relative inline-block animate-slide-down">
            Sports Events
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" style={{animation: 'scaleX 0.6s ease-out'}}></div>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-4 animate-slide-up">See what is open, full, live, and ready for registration</p>
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
              <p className="text-gray-500 dark:text-gray-400">No events available</p>
            </div>
          ) : (
            toArray(events).map((event, idx) => {
              const statusMeta = getEventStatusMeta(event);
              return (
                <Link key={event._id} to={`/events/${event._id}`} className={`bg-white dark:bg-dark-card rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all transform hover:scale-105 border border-gray-100 dark:border-dark-border group animate-stagger-${idx + 1}`}>
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
                        {event.type === 'team' ? `Team (${event.teamSize})` : 'Individual'}
                      </span>
                      <span className={`text-[11px] border px-2 py-1 rounded-full transition-all group-hover:scale-110 ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{event.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">{event.description}</p>
                    <div className="mt-3 space-y-1 text-xs text-gray-400 dark:text-gray-500">
                      {event.date && <div>{new Date(event.date).toLocaleDateString()}</div>}
                      {event.remainingSlots != null && <div>{event.remainingSlots} slots left</div>}
                      <div>{canRegisterForEvent(event) ? 'Registration open now' : `Registration ${statusMeta.label.toLowerCase()}`}</div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        <div className="text-center mt-8">
          <Link to="/events" className="btn-primary inline-block transform hover:scale-110 transition-all shadow-lg hover:shadow-xl animate-scale-up">View All Events</Link>
        </div>
      </section>

      {timelineEvents.length > 0 && (
        <section className="py-16 px-4 bg-gradient-to-br from-indigo-50 to-blue-50 animate-fade-in">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3 animate-slide-down">Event Timeline</h2>
            <p className="text-center text-gray-600 mb-10 animate-slide-up">Discover when events are scheduled</p>
            
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
                              {event.type === 'team' ? `Team (${event.teamSize})` : 'Individual'}
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
            <h2 className="text-3xl font-bold text-center mb-8 animate-slide-down">Live Leaderboard</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                  <tr className="animate-slide-down">
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Player / Team</th>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Score</th>
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
            </div>
            <div className="text-center mt-4">
              <Link to="/leaderboard" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium transition-all transform hover:scale-105 inline-block">View Full Leaderboard →</Link>
            </div>
          </div>
        </section>
      )}

      {(loading || toArray(gallery).length > 0) && (
        <section className="py-16 px-4 bg-gray-50 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 animate-slide-down">Gallery Highlights</h2>
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
                  <div key={item._id} className={`relative group overflow-hidden rounded-xl aspect-square shadow-md hover:shadow-xl transition-all transform hover:scale-110 cursor-pointer animate-stagger-${idx + 1}`}>
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
        <p className="font-semibold text-lg animate-slide-up">2024 Global College of Management, IT & Commerce - Annual Sports Day</p>
        <p className="text-blue-300 text-xs mt-2 animate-slide-up" style={{animationDelay: '0.1s'}}>Built and developed by Nikhil Katigar</p>
      </footer>
    </div>
  );
}

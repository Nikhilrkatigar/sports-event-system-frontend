import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { CardSkeleton, ImageSkeleton, TableRowSkeleton } from '../../components/Skeletons';

export default function HomePage() {
  const [settings, setSettings] = useState({});
  const [events, setEvents] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/settings').catch(() => ({})),
      API.get('/events').catch(() => ({ data: [] })),
      API.get('/gallery').catch(() => ({ data: [] })),
      API.get('/leaderboard').catch(() => ({ data: [] }))
    ])
      .then(([settingsRes, eventsRes, galleryRes, leaderboardRes]) => {
        setSettings(settingsRes.data || {});
        setEvents((eventsRes.data || []).slice(0, 6));
        setGallery((galleryRes.data || []).slice(0, 6));
        setLeaderboard((leaderboardRes.data || []).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-800 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {settings.collegeLogo && <img src={settings.collegeLogo} alt="logo" className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-white/30 object-cover" />}
          <div className="inline-block bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">Sports Event</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">{settings.eventName || 'Annual Sports Day'}</h1>
          <p className="text-xl text-blue-200 mb-2">{settings.collegeName || 'Global College'}</p>
          {settings.venue && <p className="text-blue-300 mb-1">Venue: {settings.venue}</p>}
          {settings.eventDate && <p className="text-blue-300 mb-6">Date: {new Date(settings.eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          <p className="text-blue-100 max-w-2xl mx-auto mb-8 text-lg">{settings.description || 'Welcome to our annual sports celebration!'}</p>
          <Link to="/register" className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors inline-block shadow-lg">
            Register Now
          </Link>
        </div>
      </section>

      {/* Events Preview */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Sports Events</h2>
          <p className="text-gray-500 mt-2">Compete, win, and make memories</p>
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
          ) : events.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No events available</p>
            </div>
          ) : (
            events.map(event => (
              <Link key={event._id} to={`/events/${event._id}`} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
                {event.image ? (
                  <img src={event.image} alt={event.title} className="w-full h-44 object-contain bg-gray-100 p-2" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl font-bold text-blue-700">TROPHY</div>
                )}
                <div className="p-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {event.type === 'team' ? `Team (${event.teamSize})` : 'Individual'}
                  </span>
                  <h3 className="font-bold text-gray-900 mt-2">{event.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{event.description}</p>
                  <div className="mt-3 flex justify-between text-xs text-gray-400">
                    {event.date && <span>{new Date(event.date).toLocaleDateString()}</span>}
                    <span className="text-blue-600 font-medium">{event.type === 'team' ? `${event.teamCount || 0} teams` : `${event.playerCount || 0} registered`}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="text-center mt-8">
          <Link to="/events" className="btn-primary inline-block">View All Events -&gt;</Link>
        </div>
      </section>

      {/* Live Leaderboard */}
      {loading || leaderboard.length > 0 ? (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Live Leaderboard</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-900 text-white">
                  <tr>
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
                    leaderboard.map((entry, i) => (
                      <tr key={entry._id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-bold">{i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : entry.rank}</td>
                        <td className="px-4 py-3 font-medium">{entry.teamOrPlayer}</td>
                        <td className="px-4 py-3 text-gray-500">{entry.eventId?.title || '-'}</td>
                        <td className="px-4 py-3 font-bold text-blue-700">{entry.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-4">
              <Link to="/leaderboard" className="text-blue-600 hover:underline text-sm font-medium">View Full Leaderboard -&gt;</Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Gallery */}
      {loading || gallery.length > 0 ? (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Gallery</h2>
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
                gallery.map(item => (
                  <div key={item._id} className="relative group overflow-hidden rounded-xl aspect-square">
                    <img src={item.image} alt={item.caption} className="w-full h-full object-contain bg-gray-100 p-2" />
                    {item.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 translate-y-full group-hover:translate-y-0 transition-transform">{item.caption}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Footer */}
      <footer className="bg-blue-900 text-white text-center py-6 text-sm">
        <p>&copy; 2024 global college of management, it &amp; commerce  - Annual Sports Day</p>
        <p className="mt-1">bulit and developed by Nikhil Katigar</p>
      </footer>
    </div>
  );
}

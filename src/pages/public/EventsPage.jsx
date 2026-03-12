import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { CardSkeleton } from '../../components/Skeletons';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/events').then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">All Sports Events</h1>
          <p className="text-gray-500 mt-2">Choose your sport and register today</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No events available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event._id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col">
                {event.image ? (
                  <img src={event.image} alt={event.title} className="w-full h-48 object-contain bg-gray-100 p-2" />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-6xl">🏅</div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {event.type === 'team' ? `👥 Team • ${event.teamSize} players` : '👤 Individual'}
                    </span>
                    {event.date && <span className="text-xs text-gray-400">{new Date(event.date).toLocaleDateString()}</span>}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h2>
                  <p className="text-gray-500 text-sm flex-1 line-clamp-3">{event.description}</p>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                    <div className="text-gray-500">
                      {event.type === 'team' ? (
                        <span>{event.teamCount || 0} / {Math.floor((event.maxParticipants || 0) / (event.teamSize || 1))} teams</span>
                      ) : (
                        <span>{event.playerCount || 0} / {event.maxParticipants || '∞'} registered</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/events/${event._id}`} className="text-blue-600 hover:underline text-sm font-medium">Details</Link>
                      {event.registrationOpen === false ? (
                        <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-sm font-medium cursor-not-allowed">Closed</span>
                      ) : (
                        <Link to={`/register/${event._id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">Register</Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

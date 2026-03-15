import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { CardSkeleton } from '../../components/Skeletons';
import { canRegisterForEvent, formatEventDeadline, getEventStatusMeta, PUBLIC_EVENT_STATUSES } from '../../utils/events';
import LikeButton from '../../components/LikeButton';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/events')
      .then((response) => {
        setEvents((response.data || []).filter((event) => PUBLIC_EVENT_STATUSES.includes(event.status)));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 animate-slide-down">All Sports Events</h1>
          <p className="text-gray-500 mt-4 animate-slide-up">Choose your sport, check availability, and register on time</p>
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
          <div className="text-center py-20 animate-fade-in">
            <p className="text-gray-500 text-lg">No public events are available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, idx) => {
              const statusMeta = getEventStatusMeta(event);
              const isRegisterable = canRegisterForEvent(event);
              return (
                <div key={event._id} className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all transform hover:scale-105 border border-gray-100 flex flex-col animate-stagger-${(idx % 6) + 1}`}>
                  <div className="relative overflow-hidden h-48 bg-gray-100 group">
                    {event.image ? (
                      <img src={event.image} alt={event.title} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold group-hover:from-blue-600 group-hover:to-cyan-700 transition-all duration-300">
                        {event.title}
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full transform transition-all group-hover:scale-110 ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {event.type === 'team' ? `Team • ${event.teamSize} players` : 'Individual'}
                      </span>
                      <span className={`text-[11px] border px-2 py-1 rounded-full whitespace-nowrap transform transition-all group-hover:scale-110 ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{event.title}</h2>
                    <p className="text-gray-500 text-sm flex-1 line-clamp-3">{event.description}</p>

                    <div className="mt-4 space-y-1 text-xs text-gray-500">
                      {event.date && <div>📅 {new Date(event.date).toLocaleDateString()}</div>}
                      {event.registrationDeadline && <div>⏰ Deadline: {formatEventDeadline(event.registrationDeadline)}</div>}
                      <div>
                        👥 {event.type === 'team'
                          ? `${event.teamCount || 0} teams registered`
                          : `${event.playerCount || 0} players registered`}
                      </div>
                      {event.remainingSlots != null && (
                        <div>
                          🎯 {event.remainingSlots} slots left
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between text-sm">
                      <div className="flex gap-2">
                        <LikeButton eventId={event._id} currentLikes={event.likes || 0} />
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/events/${event._id}`} className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors transform hover:scale-110">Details</Link>
                        {event.status === 'coming_soon' ? (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg font-medium animate-pulse">
                            🎯 Coming Soon
                          </span>
                        ) : isRegisterable ? (
                          <Link to={`/register/${event._id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-medium transition-colors transform hover:scale-110 shadow-sm hover:shadow-md">Register</Link>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1 rounded-lg font-medium">
                            {statusMeta.label}
                          </span>
                        )}
                      </div>
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

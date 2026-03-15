import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { ImageSkeleton, TextSkeleton } from '../../components/Skeletons';
import { canRegisterForEvent, formatEventDeadline, getEventStatusMeta } from '../../utils/events';
import LikeButton from '../../components/LikeButton';
import ShareButton from '../../components/ShareButton';

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasTournament, setHasTournament] = useState(false);

  useEffect(() => {
    API.get(`/events/${id}`)
      .then(r => setEvent(r.data))
      .finally(() => setLoading(false));
    API.get(`/tournaments/event/${id}`)
      .then(() => setHasTournament(true))
      .catch(() => setHasTournament(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6 h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <ImageSkeleton height="h-64" width="w-full" />
            <div className="p-8 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              <TextSkeleton lines={4} />
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Event not found</p>
          <Link to="/events" className="text-blue-600 hover:underline mt-4 inline-block">Back to Events</Link>
        </div>
      </div>
    );
  }

  const statusMeta = getEventStatusMeta(event);
  const isRegisterable = canRegisterForEvent(event);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/events" className="text-blue-600 hover:underline text-sm mb-6 inline-block">Back to Events</Link>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {event.image && <img src={event.image} alt={event.title} className="w-full h-64 object-contain bg-gray-100 p-3" />}
          <div className="p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                {event.type === 'team' ? `Team Event (${event.teamSize} players)` : 'Individual Event'}
              </span>
              <span className={`text-sm border px-3 py-1 rounded-full ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              {event.date && <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Event date: {new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>}
              {event.maxParticipants && <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Capacity: {event.maxParticipants}</span>}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

            <div className="flex flex-wrap gap-3 mb-6">
              <LikeButton eventId={event._id} currentLikes={event.likes || 0} />
              <ShareButton eventId={event._id} eventName={event.title} eventDate={event.date ? new Date(event.date).toLocaleDateString() : 'TBD'} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registration</div>
                <div className="text-sm text-gray-700">Status: <strong>{statusMeta.label}</strong></div>
                <div className="text-sm text-gray-700">Registered: {event.type === 'team' ? `${event.teamCount || 0} teams` : `${event.playerCount || 0} players`}</div>
                <div className="text-sm text-gray-700">
                  Remaining: {event.remainingSlots == null ? 'Unlimited' : `${event.remainingSlots} slots`}
                </div>
                {event.registrationDeadline && (
                  <div className="text-sm text-gray-700">Deadline: {formatEventDeadline(event.registrationDeadline)}</div>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tournament Info</div>
                <div className="text-sm text-gray-700">Format: {event.type === 'team' ? 'Team event' : 'Individual event'}</div>
                <div className="text-sm text-gray-700">Scoring: {event.scoreOrder === 'asc' ? 'Lower score wins' : 'Higher score wins'}</div>
                <div className="text-sm text-gray-700">Bracket available: {hasTournament ? 'Yes' : 'Not yet'}</div>
              </div>
            </div>

            {event.description && (
              <div className="mb-6">
                <h2 className="font-semibold text-gray-700 mb-2">About</h2>
                <p className="text-gray-600 leading-relaxed">{event.description}</p>
              </div>
            )}

            {event.rules && (
              <div className="mb-6 bg-blue-50 rounded-xl p-5">
                <h2 className="font-semibold text-blue-900 mb-2">Rules</h2>
                <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-line">{event.rules}</p>
              </div>
            )}

            {event.status === 'coming_soon' ? (
              <div className="w-full py-4 px-6 text-center rounded-xl bg-indigo-50 border-2 border-indigo-200">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-lg font-semibold text-indigo-900">Coming Soon!</div>
                <p className="text-sm text-indigo-700 mt-1">Registration will open soon. Stay tuned!</p>
                {event.registrationDeadline && (
                  <p className="text-xs text-indigo-600 mt-2">Opens: {formatEventDeadline(event.registrationDeadline)}</p>
                )}
                {event.date && (
                  <p className="text-xs text-indigo-600 mt-1">Event date: {new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                )}
              </div>
            ) : isRegisterable ? (
              <Link to={`/register/${event._id}`} className="btn-primary inline-block text-center w-full py-3 text-base font-semibold rounded-xl">
                Register for {event.title}
              </Link>
            ) : (
              <div className="w-full py-3 text-center text-base font-semibold rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
                Registration is currently {statusMeta.label.toLowerCase()}
              </div>
            )}

            {hasTournament && (
              <Link to={`/tournaments/${event._id}`} className="mt-3 inline-block text-center w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 transition-all shadow-sm">
                View Tournament Bracket
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

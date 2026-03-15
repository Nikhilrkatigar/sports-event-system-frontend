import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import TournamentBracket from '../../components/public/TournamentBracket';
import RoundRobinTable from '../../components/public/RoundRobinTable';
import API from '../../utils/api';

export default function TournamentPage() {
  const { eventId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const r = await API.get(`/tournaments/event/${eventId}`);
      setTournament(r.data.tournament);
      setMatches(r.data.matches);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No tournament bracket has been created for this event yet.');
      } else {
        setError('Failed to load tournament data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [eventId]);

  const totalRounds = matches.length > 0 ? Math.max(...matches.map(match => match.round)) : 0;
  const champion = tournament?.format === 'single_elimination' && tournament?.status === 'completed'
    ? matches.find(match => match.round === totalRounds && match.status === 'completed')?.winner
    : null;

  const upcomingMatches = useMemo(
    () => matches
      .filter((match) => match.status !== 'completed' && match.scheduledTime)
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
      .slice(0, 5),
    [matches]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        {tournament?.eventId?._id && (
          <Link to={`/events/${tournament.eventId._id}`} className="text-blue-600 hover:underline text-sm mb-6 inline-block">
            Back to Event Details
          </Link>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {tournament?.eventId?.title || 'Tournament'} Bracket
          </h1>
          {tournament && (
            <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                {tournament.format === 'single_elimination' ? 'Single Elimination' : 'Round Robin'}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                tournament.status === 'completed' ? 'bg-green-100 text-green-700' :
                tournament.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {tournament.status === 'in_progress' ? 'Live' : tournament.status === 'completed' ? 'Completed' : tournament.status}
              </span>
              <span className="text-sm text-gray-500">
                {tournament.participantCount || 0} participants
              </span>
            </div>
          )}
          <p className="text-gray-400 text-sm mt-2">Auto-updates every 30 seconds</p>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading bracket...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{error}</p>
            <Link to="/events" className="text-blue-600 hover:underline mt-4 inline-block">Browse all events</Link>
          </div>
        )}

        {champion && (
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-white rounded-2xl p-6 mb-8 text-center shadow-lg">
            <div className="text-2xl font-bold">Champion: {champion}</div>
            <p className="text-yellow-100 text-sm mt-1">Tournament completed</p>
          </div>
        )}

        {!loading && !error && upcomingMatches.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Matches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {upcomingMatches.map((match) => (
                <div key={match._id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <div className="text-xs text-gray-400 mb-2">Match #{match.matchNumber}</div>
                  <div className="font-medium text-gray-900">{match.participant1 || 'TBD'} vs {match.participant2 || 'TBD'}</div>
                  <div className="text-sm text-gray-500 mt-1">{new Date(match.scheduledTime).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && tournament && (
          tournament.format === 'single_elimination' ? (
            <TournamentBracket matches={matches} totalRounds={totalRounds} />
          ) : (
            <RoundRobinTable matches={matches} participants={tournament.participants || []} />
          )
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../../components/public/Navbar';
import TournamentBracket from '../../components/public/TournamentBracket';
import RoundRobinTable from '../../components/public/RoundRobinTable';
import TrackHeatsBoard from '../../components/public/TrackHeatsBoard';
import FieldFlightBoard from '../../components/public/FieldFlightBoard';
import API from '../../utils/api';
import { formatLabel } from '../../utils/tournaments';

const GENDER_LABELS = { all: 'All', male: 'Boys', female: 'Girls' };

export default function TournamentPage() {
  const { eventId } = useParams();
  const [allTournaments, setAllTournaments] = useState([]);
  const [activeGenderTab, setActiveGenderTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeTournamentEntry = useMemo(() => {
    if (allTournaments.length === 0) return null;
    if (activeGenderTab) {
      return allTournaments.find((entry) => (entry.tournament?.genderFilter || 'all') === activeGenderTab) || allTournaments[0];
    }
    return allTournaments[0];
  }, [allTournaments, activeGenderTab]);

  const tournament = activeTournamentEntry?.tournament || null;
  const matches = activeTournamentEntry?.matches || [];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/tournaments/event/${eventId}`);
      if (Array.isArray(response.data.allTournaments) && response.data.allTournaments.length > 0) {
        setAllTournaments(response.data.allTournaments);
        setActiveGenderTab(response.data.allTournaments[0]?.tournament?.genderFilter || 'all');
      } else {
        setAllTournaments([{ tournament: response.data.tournament, matches: response.data.matches }]);
        setActiveGenderTab(response.data.tournament?.genderFilter || 'all');
      }
      setError(null);
    } catch (err) {
      setAllTournaments([]);
      setActiveGenderTab(null);
      if (err.response?.status === 404) {
        setError('No tournament schedule has been created for this event yet.');
      } else {
        setError('Failed to load tournament data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    if (!tournament?._id) return undefined;
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.emit('join_tournament', tournament._id);
    socket.on('tournament_match_updated', ({ match }) => {
      setAllTournaments((previous) => previous.map((entry) => {
        if (entry.tournament?._id !== tournament._id) return entry;

        const currentMatches = entry.matches || [];
        const exists = currentMatches.some((item) => item._id === match._id);
        const nextMatches = exists
          ? currentMatches.map((item) => (item._id === match._id ? { ...item, ...match } : item))
          : [...currentMatches, match];
        const sortedMatches = nextMatches.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
        const nextTournament = sortedMatches.length > 0 && sortedMatches.every((item) => item.status === 'completed')
          ? { ...entry.tournament, status: 'completed' }
          : entry.tournament;

        return {
          ...entry,
          tournament: nextTournament,
          matches: sortedMatches
        };
      }));
    });
    return () => {
      socket.emit('leave_tournament', tournament._id);
      socket.disconnect();
    };
  }, [tournament?._id]);

  const totalRounds = matches.length > 0 ? Math.max(...matches.map((match) => match.round)) : 0;
  const champion = tournament?.format === 'single_elimination' && tournament?.status === 'completed'
    ? matches.find((match) => match.round === totalRounds && match.status === 'completed')?.winner
    : null;

  const upcomingMatches = useMemo(
    () => matches
      .filter((match) => match.status !== 'completed' && match.scheduledTime)
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
      .slice(0, 5),
    [matches]
  );

  const participantUnit = tournament?.eventId?.type === 'team' ? 'teams' : 'athletes';
  const pageTitle = tournament?.format === 'track_heats'
    ? `${tournament?.eventId?.title || 'Track Event'} Heats`
    : tournament?.format === 'field_flight'
      ? `${tournament?.eventId?.title || 'Field Event'} Flight`
      : `${tournament?.eventId?.title || 'Tournament'} Bracket`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        {tournament?.eventId?._id && (
          <Link to={`/events/${tournament.eventId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-6 inline-block">
            Back to Event Details
          </Link>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          {tournament && (
            <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
              <span className="text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                {formatLabel(tournament.format)}
              </span>
              {tournament.genderFilter && (
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  tournament.genderFilter === 'male'
                    ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
                    : tournament.genderFilter === 'female'
                      ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {GENDER_LABELS[tournament.genderFilter] || tournament.genderFilter}
                </span>
              )}
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                tournament.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                tournament.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {tournament.status === 'in_progress' ? 'Live' : tournament.status === 'completed' ? 'Completed' : tournament.status}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tournament.participantCount || 0} participants
              </span>
            </div>
          )}
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Live updates enabled</p>
        </div>

        {!loading && !error && allTournaments.length > 1 && (
          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            {allTournaments.map((entry) => {
              const gender = entry.tournament?.genderFilter || 'all';
              const isActive = activeGenderTab === gender;
              return (
                <button
                  key={gender}
                  onClick={() => setActiveGenderTab(gender)}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                    isActive
                      ? gender === 'male'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : gender === 'female'
                          ? 'bg-pink-600 text-white border-pink-600'
                          : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {GENDER_LABELS[gender] || gender} ({entry.tournament?.participantCount || 0})
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
            <p>Loading schedule...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <p className="text-lg">{error}</p>
            <Link to="/events" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">Browse all events</Link>
          </div>
        )}

        {champion && (
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 dark:from-yellow-600 dark:via-yellow-700 dark:to-orange-700 text-white rounded-2xl p-6 mb-8 text-center shadow-lg">
            <div className="text-2xl font-bold">Champion: {champion}</div>
            <p className="text-yellow-100 text-sm mt-1">Tournament completed</p>
          </div>
        )}

        {!loading && !error && upcomingMatches.length > 0 && (
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {tournament?.format === 'track_heats' ? 'Upcoming Heats' : tournament?.format === 'field_flight' ? 'Upcoming Flights' : 'Upcoming Matches'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {upcomingMatches.map((match) => (
                <div key={match._id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    {tournament?.format === 'track_heats'
                      ? (match.heatName || `Heat ${match.matchNumber}`)
                      : tournament?.format === 'field_flight'
                        ? (match.heatName || `Flight ${match.matchNumber}`)
                        : `Match #${match.matchNumber}`}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-gray-200">
                    {tournament?.format === 'track_heats'
                      ? `${(match.lanes || []).length} ${participantUnit} assigned`
                      : tournament?.format === 'field_flight'
                        ? `${(match.fieldEntries || []).length} participants assigned`
                      : `${match.participant1 || 'TBD'} vs ${match.participant2 || 'TBD'}`}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date(match.scheduledTime).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && tournament && (
          tournament.format === 'single_elimination' ? (
            <TournamentBracket matches={matches} totalRounds={totalRounds} />
          ) : tournament.format === 'round_robin' ? (
            <RoundRobinTable matches={matches} participants={tournament.participants || []} />
          ) : tournament.format === 'field_flight' ? (
            <FieldFlightBoard matches={matches} scoreOrder={tournament?.eventId?.scoreOrder || 'desc'} />
          ) : (
            <TrackHeatsBoard
              matches={matches}
              participantLabel={participantUnit}
              laneLimit={tournament?.eventId?.lanesPerHeat || 8}
            />
          )
        )}
      </div>
    </div>
  );
}

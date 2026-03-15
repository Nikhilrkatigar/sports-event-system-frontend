import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { CardSkeleton } from '../../components/Skeletons';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/tournaments')
      .then((res) => setTournaments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">Tournament Brackets</h1>
          <p className="text-gray-500 mt-2">Live match schedules and results</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No tournaments available yet</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon for tournament brackets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 text-white">
                  <h2 className="text-xl font-bold">{tournament.eventId?.title || 'Tournament'}</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Format</span>
                      <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                        {tournament.format === 'single_elimination' ? 'Single Elimination' : 'Round Robin'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        tournament.status === 'completed' ? 'bg-green-50 text-green-700' :
                        tournament.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {tournament.status === 'in_progress' ? 'Live' :
                         tournament.status === 'completed' ? 'Completed' :
                         'Scheduled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Participants</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {tournament.participantCount || 0}
                      </span>
                    </div>

                    {tournament.eventId?.date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Event Date</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {new Date(tournament.eventId.date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/tournaments/${tournament.eventId?._id}`}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                  >
                    View Bracket
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

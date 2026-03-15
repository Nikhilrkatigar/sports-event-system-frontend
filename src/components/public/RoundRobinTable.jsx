export default function RoundRobinTable({ matches, participants }) {
  const participantLabels = participants.map((participant) => participant.label).filter((label) => label !== 'BYE');
  const standings = {};

  participantLabels.forEach((label) => {
    standings[label] = { name: label, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0 };
  });

  matches.filter(match => match.status === 'completed').forEach((match) => {
    const participant1 = standings[match.participant1];
    const participant2 = standings[match.participant2];
    if (!participant1 || !participant2) return;

    participant1.played += 1;
    participant2.played += 1;
    participant1.pointsFor += match.score1 || 0;
    participant1.pointsAgainst += match.score2 || 0;
    participant2.pointsFor += match.score2 || 0;
    participant2.pointsAgainst += match.score1 || 0;

    if (match.score1 > match.score2) {
      participant1.wins += 1;
      participant1.points += 3;
      participant2.losses += 1;
    } else if (match.score2 > match.score1) {
      participant2.wins += 1;
      participant2.points += 3;
      participant1.losses += 1;
    } else {
      participant1.draws += 1;
      participant2.draws += 1;
      participant1.points += 1;
      participant2.points += 1;
    }
  });

  const sorted = Object.values(standings).sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));
  const completedMatches = matches.filter(match => match.status === 'completed');
  const pendingMatches = matches.filter(match => match.status !== 'completed');

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">Standings</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Participant</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">D</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center">PF</th>
                <th className="px-4 py-3 text-center">PA</th>
                <th className="px-4 py-3 text-center">Diff</th>
                <th className="px-4 py-3 text-center font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((standing, index) => (
                <tr key={standing.name} className={`border-t border-gray-100 ${index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="px-4 py-3 font-bold">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{standing.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{standing.played}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{standing.wins}</td>
                  <td className="px-4 py-3 text-center text-yellow-600">{standing.draws}</td>
                  <td className="px-4 py-3 text-center text-red-600">{standing.losses}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{standing.pointsFor}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{standing.pointsAgainst}</td>
                  <td className="px-4 py-3 text-center font-medium">{standing.pointsFor - standing.pointsAgainst}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700 text-lg">{standing.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">Win = 3 pts · Draw = 1 pt · Loss = 0 pts. Sorted by points, then score difference.</p>
      </div>

      {pendingMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Upcoming Matches ({pendingMatches.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingMatches.map((match) => (
              <div key={match._id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Pending</span>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-gray-800">{match.participant1}</span>
                  <span className="text-gray-400 mx-2 text-sm">vs</span>
                  <span className="font-semibold text-gray-800">{match.participant2}</span>
                </div>
                {match.scheduledTime && (
                  <div className="mt-3 text-center text-xs text-gray-500">
                    {new Date(match.scheduledTime).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {completedMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Completed Matches ({completedMatches.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {completedMatches.map((match) => (
              <div key={match._id} className="bg-white rounded-xl border border-green-200 p-4 bg-green-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Completed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${match.winner === match.participant1 ? 'text-green-700' : 'text-gray-600'}`}>
                    {match.participant1}
                  </span>
                  <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-sm">{match.score1} - {match.score2}</span>
                  <span className={`font-semibold text-sm ${match.winner === match.participant2 ? 'text-green-700' : 'text-gray-600'}`}>
                    {match.participant2}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

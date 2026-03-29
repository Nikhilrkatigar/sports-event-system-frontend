export default function RoundRobinTable({ matches, participants }) {
  const participantRows = participants.filter((participant) => participant.label !== 'BYE');
  const standings = {};

  participantRows.forEach((participant) => {
    standings[participant.label] = {
      name: participant.label,
      uucms: participant.uucms || '',
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      points: 0
    };
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
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Standings</h3>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-dark-border">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Participant</th>
                <th className="px-4 py-3 text-left">UUCMS</th>
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
                <tr key={standing.name} className={`border-t border-gray-100 dark:border-dark-border ${
                  index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                  index === 1 ? 'bg-gray-50 dark:bg-gray-800/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/20'
                }`}>
                  <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{standing.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{standing.uucms || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{standing.played}</td>
                  <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">{standing.wins}</td>
                  <td className="px-4 py-3 text-center text-yellow-600 dark:text-yellow-400">{standing.draws}</td>
                  <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{standing.losses}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{standing.pointsFor}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{standing.pointsAgainst}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">{standing.pointsFor - standing.pointsAgainst}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700 dark:text-blue-400 text-lg">{standing.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Win = 3 pts · Draw = 1 pt · Loss = 0 pts. Sorted by points, then score difference.</p>
      </div>

      {pendingMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Upcoming Matches ({pendingMatches.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingMatches.map((match) => (
              <div key={match._id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Match #{match.matchNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 font-medium">Pending</span>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{match.participant1}</span>
                  {match.participant1Uucms && <span className="block text-xs text-gray-500 dark:text-gray-400">{match.participant1Uucms}</span>}
                  <span className="text-gray-400 dark:text-gray-500 mx-2 text-sm">vs</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{match.participant2}</span>
                  {match.participant2Uucms && <span className="block text-xs text-gray-500 dark:text-gray-400">{match.participant2Uucms}</span>}
                </div>
                {match.scheduledTime && (
                  <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
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
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Completed Matches ({completedMatches.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {completedMatches.map((match) => (
              <div key={match._id} className="bg-white dark:bg-dark-card rounded-xl border border-green-200 dark:border-green-900/50 p-4 bg-green-50/30 dark:bg-green-900/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Match #{match.matchNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-medium">Completed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${match.winner === match.participant1 ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {match.participant1}
                    {match.participant1Uucms && <span className="block text-[11px] font-normal">{match.participant1Uucms}</span>}
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm">{match.score1} - {match.score2}</span>
                  <span className={`font-semibold text-sm ${match.winner === match.participant2 ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {match.participant2}
                    {match.participant2Uucms && <span className="block text-[11px] font-normal">{match.participant2Uucms}</span>}
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

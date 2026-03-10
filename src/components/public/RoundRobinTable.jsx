export default function RoundRobinTable({ matches, participants }) {
    // Compute standings
    const standings = {};
    participants.forEach(p => {
        if (p !== 'BYE') {
            standings[p] = { name: p, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0 };
        }
    });

    matches.filter(m => m.status === 'completed').forEach(m => {
        const s1 = standings[m.participant1];
        const s2 = standings[m.participant2];
        if (!s1 || !s2) return;

        s1.played++;
        s2.played++;
        s1.pointsFor += m.score1 || 0;
        s1.pointsAgainst += m.score2 || 0;
        s2.pointsFor += m.score2 || 0;
        s2.pointsAgainst += m.score1 || 0;

        if (m.score1 > m.score2) {
            s1.wins++;
            s1.points += 3;
            s2.losses++;
        } else if (m.score2 > m.score1) {
            s2.wins++;
            s2.points += 3;
            s1.losses++;
        } else {
            s1.draws++;
            s2.draws++;
            s1.points += 1;
            s2.points += 1;
        }
    });

    const sorted = Object.values(standings).sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));

    const completedMatches = matches.filter(m => m.status === 'completed');
    const pendingMatches = matches.filter(m => m.status !== 'completed');

    return (
        <div className="space-y-8">
            {/* Standings Table */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">📊 Standings</h3>
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
                                <th className="px-4 py-3 text-center">GF</th>
                                <th className="px-4 py-3 text-center">GA</th>
                                <th className="px-4 py-3 text-center">GD</th>
                                <th className="px-4 py-3 text-center font-bold">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((s, i) => (
                                <tr key={s.name} className={`border-t border-gray-100 ${i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-gray-50' : ''}`}>
                                    <td className="px-4 py-3 font-bold">
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-500">{i + 1}</span>}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{s.played}</td>
                                    <td className="px-4 py-3 text-center text-green-600 font-medium">{s.wins}</td>
                                    <td className="px-4 py-3 text-center text-yellow-600">{s.draws}</td>
                                    <td className="px-4 py-3 text-center text-red-600">{s.losses}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{s.pointsFor}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{s.pointsAgainst}</td>
                                    <td className="px-4 py-3 text-center font-medium">{s.pointsFor - s.pointsAgainst}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-700 text-lg">{s.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Win = 3 pts · Draw = 1 pt · Loss = 0 pts. Sorted by points, then goal difference.</p>
            </div>

            {/* Pending Matches */}
            {pendingMatches.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">⏳ Upcoming Matches ({pendingMatches.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pendingMatches.map(match => (
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
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Matches */}
            {completedMatches.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">✅ Completed Matches ({completedMatches.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {completedMatches.map(match => (
                            <div key={match._id} className="bg-white rounded-xl border border-green-200 p-4 bg-green-50/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Completed</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`font-semibold text-sm ${match.winner === match.participant1 ? 'text-green-700' : 'text-gray-600'}`}>
                                        {match.participant1} {match.winner === match.participant1 && '🏆'}
                                    </span>
                                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-sm">{match.score1} - {match.score2}</span>
                                    <span className={`font-semibold text-sm ${match.winner === match.participant2 ? 'text-green-700' : 'text-gray-600'}`}>
                                        {match.winner === match.participant2 && '🏆'} {match.participant2}
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

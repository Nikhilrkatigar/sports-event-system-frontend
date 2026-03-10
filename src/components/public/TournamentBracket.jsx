export default function TournamentBracket({ matches, totalRounds }) {
    const groupedByRound = {};
    matches.forEach(m => {
        if (!groupedByRound[m.round]) groupedByRound[m.round] = [];
        groupedByRound[m.round].push(m);
    });

    const getRoundLabel = (round) => {
        if (round === totalRounds) return '🏆 Final';
        if (round === totalRounds - 1 && totalRounds >= 2) return 'Semifinals';
        if (round === totalRounds - 2 && totalRounds >= 3) return 'Quarterfinals';
        return `Round ${round}`;
    };

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max items-start" style={{ minHeight: '400px' }}>
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => {
                    const roundMatches = groupedByRound[round] || [];
                    // Each round should have more vertical spacing to align with connector lines
                    const spacingMultiplier = Math.pow(2, round - 1);

                    return (
                        <div key={round} className="flex flex-col items-center" style={{ minWidth: '220px' }}>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">
                                {getRoundLabel(round)}
                            </h3>
                            <div className="flex flex-col justify-around flex-1 w-full" style={{ gap: `${(spacingMultiplier - 1) * 60 + 16}px` }}>
                                {roundMatches.map(match => (
                                    <MatchCard key={match._id} match={match} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MatchCard({ match }) {
    const isBye = match.participant1 === 'BYE' || match.participant2 === 'BYE';

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${match.status === 'completed' ? 'border-green-200' : 'border-gray-200'
            }`}>
            {/* Match number header */}
            <div className="bg-gray-50 px-3 py-1 flex justify-between items-center border-b border-gray-100">
                <span className="text-[10px] text-gray-400 font-mono">M{match.matchNumber}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${match.status === 'completed' ? 'bg-green-100 text-green-700' :
                        match.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                    }`}>{match.status}</span>
            </div>

            {/* Participant 1 */}
            <div className={`px-3 py-2 flex justify-between items-center border-b border-gray-50 ${match.winner === match.participant1 ? 'bg-green-50' : ''
                }`}>
                <span className={`text-sm font-medium truncate flex-1 ${!match.participant1 ? 'text-gray-300 italic' :
                        match.participant1 === 'BYE' ? 'text-gray-400 italic' :
                            match.winner === match.participant1 ? 'text-green-800 font-bold' : 'text-gray-800'
                    }`}>
                    {match.participant1 || 'TBD'}
                    {match.winner === match.participant1 && ' ✓'}
                </span>
                <span className={`text-sm font-bold ml-2 min-w-[20px] text-right ${match.winner === match.participant1 ? 'text-green-700' : 'text-gray-500'
                    }`}>
                    {match.score1 != null ? match.score1 : '-'}
                </span>
            </div>

            {/* Participant 2 */}
            <div className={`px-3 py-2 flex justify-between items-center ${match.winner === match.participant2 ? 'bg-green-50' : ''
                }`}>
                <span className={`text-sm font-medium truncate flex-1 ${!match.participant2 ? 'text-gray-300 italic' :
                        match.participant2 === 'BYE' ? 'text-gray-400 italic' :
                            match.winner === match.participant2 ? 'text-green-800 font-bold' : 'text-gray-800'
                    }`}>
                    {match.participant2 || 'TBD'}
                    {match.winner === match.participant2 && ' ✓'}
                </span>
                <span className={`text-sm font-bold ml-2 min-w-[20px] text-right ${match.winner === match.participant2 ? 'text-green-700' : 'text-gray-500'
                    }`}>
                    {match.score2 != null ? match.score2 : '-'}
                </span>
            </div>
        </div>
    );
}

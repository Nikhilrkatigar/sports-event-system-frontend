export default function TournamentBracket({ matches, totalRounds }) {
  const groupedByRound = {};
  matches.forEach((match) => {
    if (!groupedByRound[match.round]) groupedByRound[match.round] = [];
    groupedByRound[match.round].push(match);
  });

  const getRoundLabel = (round) => {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1 && totalRounds >= 2) return 'Semifinals';
    if (round === totalRounds - 2 && totalRounds >= 3) return 'Quarterfinals';
    return `Round ${round}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max items-start" style={{ minHeight: '400px' }}>
        {Array.from({ length: totalRounds }, (_, index) => index + 1).map((round) => {
          const roundMatches = groupedByRound[round] || [];
          const spacingMultiplier = Math.pow(2, round - 1);

          return (
            <div key={round} className="flex flex-col items-center" style={{ minWidth: '240px' }}>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
                {getRoundLabel(round)}
              </h3>
              <div className="flex flex-col justify-around flex-1 w-full" style={{ gap: `${(spacingMultiplier - 1) * 60 + 16}px` }}>
                {roundMatches.map((match) => (
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
  return (
    <div className={`bg-white dark:bg-dark-card rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${match.status === 'completed' ? 'border-green-200 dark:border-green-900/50' : 'border-gray-200 dark:border-dark-border'}`}>
      <div className="bg-gray-50 dark:bg-black/20 px-3 py-1 flex justify-between items-center border-b border-gray-100 dark:border-dark-border">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">M{match.matchNumber}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          match.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
          match.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
          'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
        }`}>
          {match.status}
        </span>
      </div>

      <div className={`px-3 py-2 flex justify-between items-center border-b border-gray-50 dark:border-dark-border/50 ${match.winner === match.participant1 ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
        <span className={`text-sm font-medium truncate flex-1 ${
          !match.participant1 ? 'text-gray-300 dark:text-gray-600 italic' :
          match.participant1 === 'BYE' ? 'text-gray-400 dark:text-gray-500 italic' :
          match.winner === match.participant1 ? 'text-green-800 dark:text-green-400 font-bold' : 'text-gray-800 dark:text-gray-200'
        }`}>
          <span className="block">{match.participant1 || 'TBD'}{match.winner === match.participant1 && ' ✓'}</span>
          {match.participant1Uucms && <span className="block text-[11px] font-normal opacity-80">{match.participant1Uucms}</span>}
        </span>
        <span className={`text-sm font-bold ml-2 min-w-[20px] text-right ${match.winner === match.participant1 ? 'text-green-700 dark:text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {match.score1 != null ? match.score1 : '-'}
        </span>
      </div>

      <div className={`px-3 py-2 flex justify-between items-center ${match.winner === match.participant2 ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
        <span className={`text-sm font-medium truncate flex-1 ${
          !match.participant2 ? 'text-gray-300 dark:text-gray-600 italic' :
          match.participant2 === 'BYE' ? 'text-gray-400 dark:text-gray-500 italic' :
          match.winner === match.participant2 ? 'text-green-800 dark:text-green-400 font-bold' : 'text-gray-800 dark:text-gray-200'
        }`}>
          <span className="block">{match.participant2 || 'TBD'}{match.winner === match.participant2 && ' ✓'}</span>
          {match.participant2Uucms && <span className="block text-[11px] font-normal opacity-80">{match.participant2Uucms}</span>}
        </span>
        <span className={`text-sm font-bold ml-2 min-w-[20px] text-right ${match.winner === match.participant2 ? 'text-green-700 dark:text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {match.score2 != null ? match.score2 : '-'}
        </span>
      </div>

      {match.scheduledTime && (
        <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-black/20">
          Scheduled: {new Date(match.scheduledTime).toLocaleString()}
        </div>
      )}
    </div>
  );
}

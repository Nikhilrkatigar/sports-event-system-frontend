export default function TrackHeatsBoard({
  matches = [],
  showSchedule = true,
  participantLabel = 'athletes',
  laneLabel = 'Lane',
  laneLimit = null
}) {
  const sortedMatches = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
  const totalQualified = sortedMatches.reduce(
    (sum, match) => sum + (match.lanes || []).filter((lane) => lane.isQualified).length,
    0
  );
  const leaderboard = sortedMatches
    .flatMap((match) => (match.lanes || []).map((lane) => ({ ...lane, heatName: match.heatName || `Heat ${match.matchNumber}` })))
    .filter((lane) => lane.finishPosition != null || lane.finishTime)
    .sort((a, b) => {
      const hasTimeA = Boolean(a.finishTime);
      const hasTimeB = Boolean(b.finishTime);
      if (hasTimeA && hasTimeB) return (parseFloat(a.finishTime) || Infinity) - (parseFloat(b.finishTime) || Infinity) || (a.finishPosition ?? 999) - (b.finishPosition ?? 999);
      if (a.finishPosition != null && b.finishPosition != null) return a.finishPosition - b.finishPosition || a.lane - b.lane;
      if (a.finishPosition != null) return -1;
      if (b.finishPosition != null) return 1;
      return (parseFloat(a.finishTime) || Infinity) - (parseFloat(b.finishTime) || Infinity);
    });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Heats" value={sortedMatches.length} />
        <StatCard label="Lane Limit" value={laneLimit ? `${laneLimit} per heat` : '--'} />
        <StatCard label="Qualified" value={totalQualified} />
      </div>

      {leaderboard.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-black/20">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leaderboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-dark-border/60">
              <thead className="bg-gray-50 dark:bg-black/20">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rank</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Participant</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Heat</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Position</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border/60">
                {leaderboard.map((lane, index) => (
                  <tr key={`${lane.applicationId || lane.label}-${lane.heatName}-${lane.lane}`} className={index === 0 ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''}>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">#{index + 1}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      <div>{lane.label}</div>
                      {lane.uucms && <div className="text-xs font-normal text-gray-500 dark:text-gray-400">{lane.uucms}</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{lane.heatName}</td>
                    <td className="px-5 py-4 text-sm text-right text-gray-700 dark:text-gray-300">{lane.finishPosition ?? '--'}</td>
                    <td className="px-5 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">{lane.finishTime || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {sortedMatches.map((match) => {
          const lanes = [...(match.lanes || [])].sort((a, b) => a.lane - b.lane);

          return (
            <div
              key={match._id}
              className={`rounded-2xl border overflow-hidden shadow-sm ${
                match.status === 'completed'
                  ? 'border-green-200 dark:border-green-900/50 bg-green-50/20 dark:bg-green-900/10'
                  : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card'
              }`}
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-black/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{match.heatName || `Heat ${match.matchNumber}`}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lanes.length} {participantLabel} assigned</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  match.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                    : match.status === 'in_progress'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {match.status === 'in_progress' ? 'Live' : match.status}
                </span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-dark-border/60">
                {lanes.map((lane) => (
                  <div key={`${match._id}-${lane.lane}`} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
                        {lane.lane}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{laneLabel} {lane.lane}: {lane.label}</div>
                        {lane.uucms && <div className="text-xs text-gray-500 dark:text-gray-400">{lane.uucms}</div>}
                        <div className="text-xs text-gray-500 dark:text-gray-400">{lane.department || 'Unassigned department'}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {lane.finishPosition != null && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            P{lane.finishPosition}
                          </span>
                        )}
                        {lane.isQualified && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            Qualified
                          </span>
                        )}
                      </div>
                      {lane.finishTime && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{lane.finishTime}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {showSchedule && match.scheduledTime && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-black/20 text-sm text-gray-600 dark:text-gray-300">
                  Scheduled: {new Date(match.scheduledTime).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

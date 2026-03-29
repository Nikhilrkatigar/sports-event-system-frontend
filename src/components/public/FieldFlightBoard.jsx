export default function FieldFlightBoard({ matches = [], showSchedule = true, scoreOrder = 'desc' }) {
  const match = matches[0];
  const sortedEntries = [...(match?.fieldEntries || [])].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank || a.order - b.order;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return a.order - b.order;
  });

  const completedCount = sortedEntries.filter((entry) => (entry.bestScore ?? entry.performance) != null).length;
  const leader = sortedEntries.find((entry) => entry.rank === 1) || null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Flights" value={matches.length || 1} />
        <StatCard label="Participants" value={sortedEntries.length} />
        <StatCard label={scoreOrder === 'asc' ? 'Best Mark' : 'Leading Mark'} value={leader?.bestScore ?? leader?.performance ?? '--'} />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-black/20 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{match?.heatName || 'Field Flight'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount} of {sortedEntries.length} results entered
            </p>
          </div>
          {match?.winner && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              Leader: {match.winner}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-dark-border/60">
            <thead className="bg-gray-50 dark:bg-black/20">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Order</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Participant</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">UUCMS</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Department</th>
                {Array.from({ length: sortedEntries[0]?.attempts?.length || match?.eventId?.fieldAttempts || 3 }, (_, index) => (
                  <th key={`${match?._id || 'field'}-attempt-header-${index}`} className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {`Attempt ${index + 1}`}
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Best Mark</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border/60">
              {sortedEntries.map((entry) => (
                <tr key={`${match?._id || 'field'}-${entry.applicationId || entry.order}`} className={entry.rank === 1 ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''}>
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{entry.order}</td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{entry.label}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{entry.uucms || '-'}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{entry.department || 'Unassigned'}</td>
                  {(entry.attempts || Array.from({ length: sortedEntries[0]?.attempts?.length || 3 }, () => null)).map((attempt, index) => (
                    <td key={`${match?._id || 'field'}-${entry.applicationId || entry.order}-attempt-${index}`} className="px-5 py-4 text-sm text-right text-gray-700 dark:text-gray-300">
                      {attempt ?? '--'}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">{entry.bestScore ?? entry.performance ?? '--'}</td>
                  <td className="px-5 py-4 text-sm text-right">
                    {entry.rank != null ? (
                      <span className="inline-flex px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                        #{entry.rank}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showSchedule && match?.scheduledTime && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-black/20 text-sm text-gray-600 dark:text-gray-300">
            Scheduled: {new Date(match.scheduledTime).toLocaleString()}
          </div>
        )}
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

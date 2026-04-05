import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const getPositionLabel = (position) => {
  if (position === 1) return '1st Place';
  if (position === 2) return '2nd Place';
  if (position === 3) return '3rd Place';
  return `#${position}`;
};

const buildCompetitionSummaries = (entries = []) => {
  const grouped = new Map();

  entries.forEach((entry) => {
    const key = entry.competitionKey || `${entry.eventTitle}-${entry.sourceGender || 'unspecified'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: entry.competitionLabel || entry.eventTitle,
        isTeamEvent: Boolean(entry.isTeamEvent),
        results: []
      });
    }

    grouped.get(key).results.push(entry);
  });

  return Array.from(grouped.values())
    .map((competition) => ({
      ...competition,
      results: competition.results.slice().sort((a, b) => a.position - b.position)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export default function GeneralChampionship() {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [gcData, setGcData] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptDetails, setDeptDetails] = useState(null);

  useEffect(() => {
    loadGC();
  }, []);

  useEffect(() => {
    if (!selectedDept) return;

    const refreshSelectedDepartment = async () => {
      try {
        const res = await API.get(`/generalchampionship/department/${encodeURIComponent(selectedDept)}`);
        setDeptDetails(res.data);
      } catch (err) {
        toast.error('Failed to refresh department details');
      }
    };

    refreshSelectedDepartment();
  }, [selectedDept, gcData]);

  const loadGC = async () => {
    setLoading(true);
    try {
      const res = await API.get('/generalchampionship');
      setGcData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load championship data');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await API.post('/generalchampionship/calculate');
      toast.success('General Championship recalculated');
      await loadGC();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recalculate');
    } finally {
      setCalculating(false);
    }
  };

  const handleSelectDept = (department) => {
    setSelectedDept(department);
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-900 dark:text-white">Loading...</div>;
  }

  const standings = gcData?.departmentStandings || [];
  const entries = gcData?.entries || [];
  const competitionSummaries = buildCompetitionSummaries(entries);
  const totalPointsAwarded = entries.reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">General Championship</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Auto-calculated department points from final event results using 15, 10 and 5 points.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            If the same department places multiple times in one event, only its highest position counts.
          </p>
        </div>

        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
        >
          {calculating ? 'Calculating...' : 'Recalculate'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-300 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">Departments</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{standings.length}</div>
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">Competitions Scored</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{competitionSummaries.length}</div>
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Points Awarded</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalPointsAwarded}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Overall Standings</h2>

            {standings.length === 0 ? (
              <p className="py-8 text-center text-gray-600 dark:text-gray-400">
                No championship data yet. Sync tournament winners first.
              </p>
            ) : (
              <div className="space-y-3">
                {standings.map((standing, index) => (
                  <button
                    key={standing.department}
                    onClick={() => handleSelectDept(standing.department)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${
                      selectedDept === standing.department
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/40'
                        : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          #{index + 1} {standing.department}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {entries.filter((entry) => entry.departmentName === standing.department).length} podium finishes
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {standing.totalPoints}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              {selectedDept ? `${selectedDept} Details` : 'Select Department'}
            </h2>

            {deptDetails ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/40">
                  <div className="text-xs text-gray-700 dark:text-gray-400">Total Points</div>
                  <div className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {deptDetails.totalPoints}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Scored Results</h3>
                  {deptDetails.eventResults?.length ? (
                    deptDetails.eventResults.map((result, index) => (
                      <div
                        key={`${result.competition || result.event}-${index}`}
                        className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.competition || result.event}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {result.participant} · {getPositionLabel(result.position)}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {result.isTeamEvent ? 'Team Event' : 'Individual Event'}
                          </span>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {result.points} pts
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                      No scored results for this department yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-gray-600 dark:text-gray-400">
                Select a department to see details.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Competition Summary</h2>

        {competitionSummaries.length === 0 ? (
          <p className="py-8 text-center text-gray-600 dark:text-gray-400">
            No competition summary available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {competitionSummaries.map((competition) => (
              <div
                key={competition.key}
                className="rounded-xl border border-gray-300 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{competition.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {competition.isTeamEvent ? 'Team event' : 'Individual event'}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {competition.results.length} result{competition.results.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="space-y-3">
                  {competition.results.map((result) => (
                    <div
                      key={`${competition.key}-${result.position}-${result.departmentName}`}
                      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {getPositionLabel(result.position)}
                          </div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {result.departmentName}
                          </div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {result.participantName}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {result.points}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">All Awarded Results</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:border-gray-700 dark:text-gray-400">
                <th className="px-4 py-3">Competition</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={`${entry.competitionKey || entry.eventTitle}-${entry.departmentName}-${entry.position}-${index}`}
                  className="border-b border-gray-300 transition-colors duration-150 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {entry.competitionLabel || entry.eventTitle}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    {getPositionLabel(entry.position)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{entry.participantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{entry.departmentName}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                    {entry.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

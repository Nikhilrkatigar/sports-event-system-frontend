import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

export default function GeneralChampionship() {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [gcData, setGcData] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptDetails, setDeptDetails] = useState(null);

  useEffect(() => {
    loadGC();
  }, []);

  const loadGC = async () => {
    setLoading(true);
    try {
      const res = await API.get('/generalchampionship');
      setGcData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load GC data');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await API.post('/generalchampionship/calculate');
      setGcData({
        entries: res.data.entries,
        departmentScores: res.data.departmentScores,
        departmentStandings: res.data.departmentStandings
      });
      toast.success('General Championship recalculated');
      // Reload to get fresh data
      await loadGC();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recalculate');
    } finally {
      setCalculating(false);
    }
  };

  const handleSelectDept = async (dept) => {
    setSelectedDept(dept);
    try {
      const res = await API.get(`/generalchampionship/department/${dept}`);
      setDeptDetails(res.data);
    } catch (err) {
      toast.error('Failed to load department details');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const standings = gcData?.departmentStandings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">General Championship</h1>
        <button onClick={handleCalculate} disabled={calculating} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
          {calculating ? 'Calculating...' : '🔄 Recalculate'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Standings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Standings</h2>
            
            {standings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No championship data yet. Sync tournament winners first.</p>
            ) : (
              <div className="space-y-3">
                {standings.map((standing, idx) => (
                  <button
                    key={standing.department}
                    onClick={() => handleSelectDept(standing.department)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedDept === standing.department
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">
                          #{idx + 1} {standing.department}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(gcData?.entries || []).filter(e => e.departmentName === standing.department).length} events
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{standing.totalPoints}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Department Details */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {selectedDept ? `${selectedDept} Details` : 'Select Department'}
            </h2>
            
            {deptDetails ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600 mb-1">Total Points</div>
                  <div className="text-3xl font-bold text-blue-600">{deptDetails.totalPoints}</div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Event Results</h3>
                  {deptDetails.eventResults.map((result, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900">{result.event}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {result.participant} • Position #{result.position}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-600">
                          {result.isTeamEvent ? '👥 Team' : '👤 Individual'}
                        </span>
                        <span className="font-bold text-blue-600 text-sm">{result.points} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">Select a department to see details</p>
            )}
          </div>
        </div>
      </div>

      {/* All Entries Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">All Event Results</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600 border-b">
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {(gcData?.entries || []).map((entry, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.eventTitle}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-1 rounded font-semibold ${
                      entry.position === 1 ? 'bg-yellow-100 text-yellow-800' :
                      entry.position === 2 ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'} {entry.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{entry.participantName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {entry.departmentName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-blue-600">{entry.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

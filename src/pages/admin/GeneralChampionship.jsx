import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

// SVG Bracket Connector Component
function BracketConnectors({ containerWidth, containerHeight, deptCount }) {
  if (deptCount < 2) return null;
  
  const cardHeight = 80;
  const spacing = containerHeight / deptCount;
  const connectorXStart = 120;
  const connectorXEnd = 200;
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
    >
      {/* Semi-finals to Finals connector */}
      {deptCount >= 2 && (
        <>
          <line
            x1={connectorXStart}
            y1={spacing * 0.5 + cardHeight / 2}
            x2={connectorXEnd}
            y2={spacing * 0.25 + cardHeight / 2}
            stroke="currentColor"
            strokeWidth="2"
            className="stroke-blue-300 dark:stroke-blue-500"
          />
          <line
            x1={connectorXStart}
            y1={spacing * 1.5 + cardHeight / 2}
            x2={connectorXEnd}
            y2={spacing * 0.75 + cardHeight / 2}
            stroke="currentColor"
            strokeWidth="2"
            className="stroke-blue-300 dark:stroke-blue-500"
          />
          <line
            x1={connectorXEnd}
            y1={spacing * 0.25 + cardHeight / 2}
            x2={connectorXEnd}
            y2={spacing * 0.75 + cardHeight / 2}
            stroke="currentColor"
            strokeWidth="2"
            className="stroke-blue-300 dark:stroke-blue-500"
          />
        </>
      )}
    </svg>
  );
}

// Bracket View Component
function BracketView({ standings, gcData }) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.scrollHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [standings]);

  if (standings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No championship data yet. Sync tournament winners first.
        </p>
      </div>
    );
  }

  const champion = standings[0];
  const finalists = standings.slice(1, 3);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Bracket Visualization</h2>
      
      <div className="relative" ref={containerRef}>
        <div className="grid grid-cols-3 gap-6">
          {/* Semi-Finals */}
          <div className="space-y-8">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">Semi-Finals</div>
            {finalists.map((finalist, idx) => (
              <div key={finalist.department} className="relative">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-3 border border-blue-200 dark:border-gray-600 transition-colors duration-300">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {finalist.department}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {finalist.totalPoints} pts
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Connecting lines (SVG drawn here) */}
          <div className="relative hidden lg:block">
            <BracketConnectors
              containerWidth={200}
              containerHeight={containerHeight}
              deptCount={standings.length}
            />
          </div>

          {/* Finals/Champion */}
          <div className="space-y-8 flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">Champion</div>
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-600 dark:to-amber-700 rounded-lg p-4 border-2 border-amber-300 dark:border-amber-500 shadow-lg transition-colors duration-300">
              <div className="text-lg font-bold text-amber-900 dark:text-white truncate">
                🏆 {champion.department}
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                {champion.totalPoints} points
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-300 mt-2">
                {standings.length} departments
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  if (loading) return <div className="text-center py-8 text-gray-900 dark:text-white">Loading...</div>;

  const standings = gcData?.departmentStandings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">General Championship</h1>
        <button onClick={handleCalculate} disabled={calculating} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors duration-200">
          {calculating ? 'Calculating...' : '🔄 Recalculate'}
        </button>
      </div>

      {/* Bracket Visualization */}
      <BracketView standings={standings} gcData={gcData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Standings */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-6 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Overall Standings</h2>
            
            {standings.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">No championship data yet. Sync tournament winners first.</p>
            ) : (
              <div className="space-y-3">
                {standings.map((standing, idx) => (
                  <button
                    key={standing.department}
                    onClick={() => handleSelectDept(standing.department)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedDept === standing.department
                        ? 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/40'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          #{idx + 1} {standing.department}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {(gcData?.entries || []).filter(e => e.departmentName === standing.department).length} events
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{standing.totalPoints}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-6 transition-colors duration-300">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {selectedDept ? `${selectedDept} Details` : 'Select Department'}
            </h2>
            
            {deptDetails ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/40 rounded-lg p-4 border border-blue-200 dark:border-blue-800 transition-colors duration-300">
                  <div className="text-xs text-gray-700 dark:text-gray-400 mb-1">Total Points</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{deptDetails.totalPoints}</div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Event Results</h3>
                  {deptDetails.eventResults.map((result, idx) => (
                    <div key={idx} className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors duration-300">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{result.event}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {result.participant} • Position #{result.position}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {result.isTeamEvent ? '👥 Team' : '👤 Individual'}
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{result.points} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-6">Select a department to see details</p>
            )}
          </div>
        </div>
      </div>

      {/* All Entries Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-6 transition-colors duration-300 overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Event Results</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {(gcData?.entries || []).map((entry, idx) => (
                <tr key={idx} className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{entry.eventTitle}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block px-2 py-1 rounded font-semibold transition-colors duration-300 ${
                      entry.position === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                      entry.position === 2 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    }`}>
                      {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'} {entry.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{entry.participantName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 transition-colors duration-300">
                      {entry.departmentName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-blue-600 dark:text-blue-400">{entry.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

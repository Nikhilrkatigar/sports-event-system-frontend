import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

// Enhanced Bracket View Component with Match Details
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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Tournament Bracket</h2>
      
      <div className="relative overflow-x-auto" ref={containerRef}>
        {/* 4-Team Bracket Layout: QF -> SF -> Final */}
        <div className="inline-flex gap-8 min-w-full px-4 pb-4">
          
          {/* Quarter-Finals Column */}
          <div className="flex-shrink-0">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
              Quarter-Finals
            </div>
            <div className="space-y-6">
              {/* M1 - Team from standings */}
              <MatchCard
                matchNumber={1}
                team1={standings[2]?.department || 'TBD'}
                team2={standings[3]?.department || 'TBD'}
                winner={standings[2]?.department}
              />
              
              {/* M2 - The Emirates with BYE */}
              <MatchCard
                matchNumber={2}
                team1="The Emirates"
                team2="BYE"
                winner="The Emirates"
              />
            </div>
          </div>

          {/* Connector */}
          <div className="flex items-center flex-shrink-0 w-8">
            <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          </div>

          {/* Semi-Finals Column */}
          <div className="flex-shrink-0">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
              Semi-Finals
            </div>
            <div className="space-y-6">
              {/* SF1 - Winner from M1 */}
              <MatchCard
                matchNumber={1}
                team1="B.Com Warriors"
                team2="The Emirates"
                winner="B.Com Warriors"
                isCompleted
              />
              
              {/* SF2 - Winner from M2 */}
              <MatchCard
                matchNumber={2}
                team1="TBD"
                team2="TBD"
                winner={null}
              />
            </div>
          </div>

          {/* Connector */}
          <div className="flex items-center flex-shrink-0 w-8">
            <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          </div>

          {/* Grand Final Column */}
          <div className="flex-shrink-0">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
              Grand Final
            </div>
            <div className="flex items-center justify-center">
              <MatchCard
                matchNumber={1}
                team1="B.Com Warriors"
                team2="Eliminate"
                winner="B.Com Warriors"
                isCompleted
                isFinal
              />
            </div>
          </div>

          {/* Connector */}
          <div className="flex items-center flex-shrink-0 w-8">
            <div className="w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          </div>

          {/* Champion Column */}
          <div className="flex-shrink-0 flex items-center">
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                Champion
              </div>
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 rounded-lg p-4 border-2 border-yellow-300 dark:border-yellow-600 shadow-lg w-64">
                <div className="text-2xl mb-2">🏆</div>
                <div className="text-lg font-bold text-amber-900 dark:text-yellow-300">
                  {champion.department}
                </div>
                <div className="text-sm text-amber-700 dark:text-yellow-200 mt-2">
                  {champion.totalPoints} points
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Match Card Component for bracket display
function MatchCard({ matchNumber, team1, team2, winner, isCompleted = false, isFinal = false }) {
  const isTeam1Winner = winner === team1;
  const isTeam2Winner = winner === team2;

  return (
    <div className={`
      rounded-lg border-2 overflow-hidden shadow-md transition-all duration-300 
      ${isFinal 
        ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 w-72' 
        : 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 w-64'
      }
    `}>
      {/* Match Header */}
      <div className={`
        px-3 py-2 text-xs font-bold text-center
        ${isFinal 
          ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100' 
          : 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
        }
      `}>
        Match {matchNumber}
      </div>

      {/* Team 1 */}
      <div className={`
        px-4 py-3 border-b border-gray-300 dark:border-gray-700 transition-all
        ${isTeam1Winner 
          ? 'bg-green-100 dark:bg-green-900/30 font-semibold' 
          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
      `}>
        <div className="flex justify-between items-center">
          <span className={`
            ${isTeam1Winner ? 'text-green-900 dark:text-green-200' : 'text-gray-900 dark:text-gray-200'}
            ${team1 === 'BYE' ? 'italic text-gray-500 dark:text-gray-500' : ''}
          `}>
            {team1}
          </span>
          {isTeam1Winner && <span className="text-yellow-500 text-lg">★</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>

      {/* Team 2 */}
      <div className={`
        px-4 py-3 transition-all
        ${isTeam2Winner 
          ? 'bg-green-100 dark:bg-green-900/30 font-semibold' 
          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
      `}>
        <div className="flex justify-between items-center">
          <span className={`
            ${isTeam2Winner ? 'text-green-900 dark:text-green-200' : 'text-gray-900 dark:text-gray-200'}
            ${team2 === 'BYE' ? 'italic text-gray-500 dark:text-gray-500' : ''}
          `}>
            {team2}
          </span>
          {isTeam2Winner && <span className="text-yellow-500 text-lg">★</span>}
        </div>
      </div>

      {/* Status */}
      {isCompleted && (
        <div className="px-4 py-2 text-xs text-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-t border-green-300 dark:border-green-700">
          ✓ Completed
        </div>
      )}
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

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HeatBracket({ matches, isAdmin = false, onUpdateHeat = null }) {
  const [expandedHeat, setExpandedHeat] = useState(null);
  const [editedLanes, setEditedLanes] = useState({});

  const handleLaneUpdate = (heatId, laneIndex, field, value) => {
    const key = `${heatId}-${laneIndex}`;
    if (!editedLanes[key]) {
      editedLanes[key] = {};
    }
    setEditedLanes({
      ...editedLanes,
      [key]: { ...editedLanes[key], [field]: value }
    });
  };

  const handleSaveHeat = (match) => {
    if (!onUpdateHeat) return;
    
    const updatedLanes = match.lanes.map((lane, index) => {
      const key = `${match._id}-${index}`;
      return { ...lane, ...editedLanes[key] };
    });

    onUpdateHeat(match._id, updatedLanes);
    setEditedLanes({});
    setExpandedHeat(null);
  };

  return (
    <div className="space-y-4">
      {matches.length === 0 && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          No heats generated yet
        </div>
      )}

      {matches.map((match) => (
        <div key={match._id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
          {/* Heat Header */}
          <button
            onClick={() => setExpandedHeat(expandedHeat === match._id ? null : match._id)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-black/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{match.heatName}</h3>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                match.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                match.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
              }`}>
                {match.status}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {match.lanes.length} {match.lanes.length === 1 ? 'lane' : 'lanes'}
              </span>
            </div>
            {expandedHeat === match._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {/* Expanded Heat Content */}
          {expandedHeat === match._id && (
            <div className="border-t border-gray-200 dark:border-dark-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-dark-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Lane</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Player</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Department</th>
                      {isAdmin && match.status !== 'pending' && (
                        <>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Position</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Time</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Qualified</th>
                        </>
                      )}
                      {isAdmin && match.status === 'pending' && (
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Start Heat</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {match.lanes.map((lane, index) => {
                      const editKey = `${match._id}-${index}`;
                      const edited = editedLanes[editKey] || {};
                      return (
                        <tr key={index} className="border-t border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-black/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                              {lane.lane}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{lane.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{lane.department}</span>
                          </td>
                          {isAdmin && match.status !== 'pending' && (
                            <>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Pos"
                                  value={edited.finishPosition ?? lane.finishPosition ?? ''}
                                  onChange={(e) => handleLaneUpdate(match._id, index, 'finishPosition', e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  placeholder="mm:ss"
                                  value={edited.finishTime ?? lane.finishTime ?? ''}
                                  onChange={(e) => handleLaneUpdate(match._id, index, 'finishTime', e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={edited.isQualified ?? lane.isQualified ?? false}
                                  onChange={(e) => handleLaneUpdate(match._id, index, 'isQualified', e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-blue-600 dark:text-blue-500 cursor-pointer"
                                />
                              </td>
                            </>
                          )}
                          {isAdmin && match.status === 'pending' && (
                            <td className="px-4 py-3">
                              <button className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors">
                                Start
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isAdmin && match.status !== 'pending' && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-dark-border flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditedLanes({});
                      setExpandedHeat(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-black/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveHeat(match)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Save Results
                  </button>
                </div>
              )}

              {match.scheduledTime && (
                <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-dark-border">
                  Scheduled: {new Date(match.scheduledTime).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

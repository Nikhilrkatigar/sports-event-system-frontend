import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { getMatchScoreDisplay } from '../../utils/tournaments';

/**
 * ==========================================
 * MAIN TOURNAMENT BRACKET COMPONENT
 * Modern esports-style animated bracket UI
 * ==========================================
 */
export default function TournamentBracket({ matches, totalRounds }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const containerRef = useRef(null);

  const groupedByRound = useMemo(() => {
    const groups = {};
    matches.forEach((match) => {
      if (!groups[match.round]) groups[match.round] = [];
      groups[match.round].push(match);
    });
    return groups;
  }, [matches]);

  const getRoundLabel = (round) => {
    if (round === totalRounds) return 'Grand Final';
    if (round === totalRounds - 1 && totalRounds >= 2) return 'Semi-Finals';
    if (round === totalRounds - 2 && totalRounds >= 3) return 'Quarter-Finals';
    return `Round ${round}`;
  };

  if (!totalRounds || totalRounds === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500">No matches scheduled</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Connector SVG - renders lines between rounds */}
      <BracketConnectors matches={matches} totalRounds={totalRounds} groupedByRound={groupedByRound} />

      {/* Main Bracket Container */}
      <div 
        ref={containerRef}
        className="overflow-x-auto pb-6 scroll-smooth"
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        <div className="flex gap-8 min-w-max px-4" style={{ minHeight: '600px' }}>
          {Array.from({ length: totalRounds }, (_, index) => index + 1).map((round) => (
            <RoundColumn
              key={`round-${round}`}
              round={round}
              matches={groupedByRound[round] || []}
              totalRounds={totalRounds}
              roundLabel={getRoundLabel(round)}
              onMatchSelect={setSelectedMatch}
              onMatchHover={setHoveredMatch}
              isHovered={hoveredMatch?.round === round}
            />
          ))}
        </div>
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </>
  );
}

/**
 * ROUND COLUMN - Displays all matches in a round
 */
function RoundColumn({
  round,
  matches,
  totalRounds,
  roundLabel,
  onMatchSelect,
  onMatchHover,
  isHovered
}) {
  const spacingMultiplier = Math.pow(2, round - 1);
  const gap = (spacingMultiplier - 1) * 80 + 24;

  return (
    <div 
      className="flex flex-col items-center flex-shrink-0"
      style={{ minWidth: '280px' }}
      onMouseEnter={() => onMatchHover(matches[0])}
      onMouseLeave={() => onMatchHover(null)}
    >
      {/* Round Header */}
      <div className="mb-8 text-center">
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">
          {roundLabel}
        </h3>
        <div className="w-12 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mx-auto"></div>
      </div>

      {/* Matches Container */}
      <div 
        className="flex flex-col justify-around w-full flex-1"
        style={{ gap: `${gap}px` }}
      >
        {matches.map((match, index) => (
          <MatchCard
            key={match._id}
            match={match}
            round={round}
            totalRounds={totalRounds}
            onSelect={onMatchSelect}
            onHover={onMatchHover}
            isRoundHovered={isHovered}
            animationDelay={index * 100}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * MATCH CARD - Individual match display with animations
 */
function MatchCard({
  match,
  round,
  totalRounds,
  onSelect,
  onHover,
  isRoundHovered,
  animationDelay
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isFinal = round === totalRounds;
  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'in_progress';
  const isPending = match.status === 'pending';
  const scoreDisplay1 = getMatchScoreDisplay(match, 1);
  const scoreDisplay2 = getMatchScoreDisplay(match, 2);

  const handleHover = (state) => {
    setIsHovered(state);
    if (state) onHover({ ...match, round });
  };

  return (
    <div
      onClick={() => onSelect(match)}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      className={`
        group relative cursor-pointer transform transition-all duration-300
        ${isHovered ? 'scale-105' : 'scale-100'}
        ${isHovered ? 'z-20' : 'z-10'}
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Background Glow Effect */}
      {isHovered && (
        <div className={`
          absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
          ${isFinal 
            ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30' 
            : isCompleted
            ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30'
            : isLive
            ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30'
            : 'bg-gradient-to-r from-purple-500/30 to-pink-500/30'
          }
          blur-xl
        `}></div>
      )}

      {/* Main Card */}
      <div className={`
        relative rounded-2xl border backdrop-blur-sm overflow-hidden
        transition-all duration-300 shadow-lg
        ${isHovered 
          ? 'shadow-2xl border-cyan-400/50 dark:border-cyan-400/50' 
          : 'border-gray-200 dark:border-gray-700/50 shadow-md'
        }
        ${isFinal 
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30' 
          : 'bg-gradient-to-br from-white to-gray-50 dark:from-slate-900/60 dark:to-slate-800/60'
        }
      `}
      style={{
        minWidth: '260px',
        animation: `slideIn 0.6s ease-out ${animationDelay}ms both`
      }}>
        {/* Header */}
        <div className={`
          px-4 py-2 flex justify-between items-center border-b
          ${isCompleted 
            ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20' 
            : isLive
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20'
            : 'bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600/30'
          }
        `}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
              M{match.matchNumber}
            </span>
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                <span className="inline-block w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>

          {/* Status Badge */}
          <span className={`
            text-xs px-2 py-1 rounded-lg font-semibold
            ${isCompleted 
              ? 'bg-green-100 text-green-700 dark:bg-green-500/30 dark:text-green-100' 
              : isLive
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/30 dark:text-blue-100'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-600/40 dark:text-gray-100'
            }
          `}>
            {isCompleted ? '✓ Done' : isLive ? '⚡ Live' : isPending ? 'Pending' : match.status}
          </span>
        </div>

        {/* Participant 1 */}
        <ParticipantRow
          participant={match.participant1}
          uucms={match.participant1Uucms}
          score={scoreDisplay1}
          isWinner={match.winner === match.participant1}
          isBye={match.participant1 === 'BYE'}
          isHovered={isHovered}
        />

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700/50"></div>

        {/* Participant 2 */}
        <ParticipantRow
          participant={match.participant2}
          uucms={match.participant2Uucms}
          score={scoreDisplay2}
          isWinner={match.winner === match.participant2}
          isBye={match.participant2 === 'BYE'}
          isHovered={isHovered}
        />

        {/* Schedule Info */}
        {match.scheduledTime && (
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50">
            ⏱️ {new Date(match.scheduledTime).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * PARTICIPANT ROW - Individual participant in a match
 */
function ParticipantRow({ participant, uucms, score, isWinner, isBye, isHovered }) {
  return (
    <div className={`
      px-4 py-3 flex justify-between items-start gap-3
      transition-all duration-300
      ${isWinner 
        ? 'bg-gradient-to-r from-green-50 to-transparent dark:from-green-500/20 dark:to-green-500/5' 
        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
      }
    `}>
      <div className="flex-1 min-w-0">
        <div className={`
          text-sm font-semibold truncate transition-all duration-300
          ${!participant || isBye
            ? 'text-gray-400 dark:text-gray-600 italic'
            : isWinner
            ? 'text-green-700 dark:text-green-300 drop-shadow-sm'
            : 'text-gray-800 dark:text-gray-300'
          }
        `}>
          <span className="flex items-center gap-2">
            {participant || 'TBD'}
            {isWinner && (
              <span className="inline-block text-yellow-500 animate-pulse text-lg">★</span>
            )}
          </span>
        </div>
        {uucms && !isBye && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {uucms}
          </div>
        )}
      </div>

      {/* Score Display */}
      <div className={`
        flex-shrink-0 text-right
        ${isWinner 
          ? 'text-lg font-bold text-green-700 dark:text-green-300' 
          : 'text-base font-semibold text-gray-600 dark:text-gray-400'
        }
      `}>
        {score || '-'}
      </div>
    </div>
  );
}

/**
 * BRACKET CONNECTORS - SVG connecting lines between rounds
 */
function BracketConnectors({ matches, totalRounds, groupedByRound }) {
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('[role="contentinfo"]')?.parentElement;
      if (container) {
        setContainerWidth(container.scrollWidth);
        setContainerHeight(Math.max(600, container.scrollHeight));
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    const element = svgRef.current;
    if (element) resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [matches, totalRounds]);

  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0 pointer-events-none opacity-30 dark:opacity-20"
      width={containerWidth}
      height={containerHeight}
      style={{
        overflow: 'visible',
        filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))'
      }}
    >
      {/* Render connecting lines */}
      <defs>
        <linearGradient id="connectorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Draw lines between matches */}
      {Array.from({ length: totalRounds - 1 }).map((_, roundIdx) => {
        const currentRound = roundIdx + 1;
        const nextRound = roundIdx + 2;

        return (matches || [])
          .filter(m => m.round === currentRound)
          .map((match, idx) => {
            // Connect to next round matches
            const nextMatches = (groupedByRound[nextRound] || []).slice(
              idx * 2,
              (idx + 1) * 2
            );

            return nextMatches.map((nextMatch, nextIdx) => (
              <BracketLine
                key={`line-${match._id}-${nextMatch._id}`}
                fromRound={currentRound}
                toRound={nextRound}
                fromIndex={idx}
                toIndex={idx * 2 + nextIdx}
              />
            ));
          });
      })}
    </svg>
  );
}

/**
 * BRACKET LINE - Individual SVG connector line
 */
function BracketLine({ fromRound, toRound, fromIndex, toIndex }) {
  // Calculate positions based on grid layout
  const roundWidth = 280 + 32; // match card width + gap
  const cardHeight = 20;
  const spacingMultiplier = Math.pow(2, fromRound - 1);
  const gap = (spacingMultiplier - 1) * 80 + 24;

  const x1 = fromRound * roundWidth + 260;
  const y1 = fromIndex * gap + 150;

  const x2 = toRound * roundWidth - 20;
  const y2 = toIndex * (gap / 2) + 150;

  // Curve path
  const curveFactor = (x2 - x1) * 0.3;

  return (
    <path
      d={`M ${x1} ${y1} C ${x1 + curveFactor} ${y1}, ${x2 - curveFactor} ${y2}, ${x2} ${y2}`}
      stroke="url(#connectorGradient)"
      strokeWidth="2"
      fill="none"
      strokeDasharray="4 4"
      opacity="0.6"
    />
  );
}

/**
 * MATCH DETAIL MODAL - Detailed match information
 */
function MatchDetailModal({ match, onClose }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const isCompleted = match.status === 'completed';
  const hasWinner = match.winner !== null && match.winner !== undefined;
  const scoreDisplay1 = getMatchScoreDisplay(match, 1);
  const scoreDisplay2 = getMatchScoreDisplay(match, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900 rounded-2xl border dark:border-cyan-400/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'scaleIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-cyan-400/20 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950/95 backdrop-blur">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Match #{match.matchNumber}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Round {match.round} • {match.status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Participant 1 */}
          <div className={`
            p-4 rounded-xl border transition-all
            ${match.winner === match.participant1
              ? 'bg-green-50 border-green-200 dark:bg-green-500/20 dark:border-green-500/50'
              : 'bg-gray-50 border-gray-200 dark:bg-gray-500/10 dark:border-gray-500/30'
            }
          `}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Participant 1</span>
              {match.winner === match.participant1 && (
                <span className="text-yellow-600 dark:text-yellow-400 font-bold">WINNER ★</span>
              )}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {match.participant1 || 'TBD'}
            </div>
            {match.participant1Uucms && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {match.participant1Uucms}
              </div>
            )}
            {match.participant1RegistrationNumber && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Reg #: {match.participant1RegistrationNumber}
              </div>
            )}
            {scoreDisplay1 !== '-' && (
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-3">
                Score: {scoreDisplay1}
              </div>
            )}

            {/* Team Details for Participant 1 */}
            {match.participant1TeamDetails && match.participant1TeamDetails.players && match.participant1TeamDetails.players.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'p1' ? null : 'p1')}
                  className="flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  <span className={`transform transition-transform ${expandedSection === 'p1' ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  View Team Members ({match.participant1TeamDetails.players.length})
                </button>

                {expandedSection === 'p1' && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700/50">
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Reg #</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">UUCMS</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Name</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.participant1TeamDetails.players.map((player, idx) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{match.participant1RegistrationNumber || '-'}</td>
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 font-mono">{player.uucms || '-'}</td>
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{player.name || '-'}</td>
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{player.department || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-900 px-3 text-xs text-gray-400 dark:text-gray-500 font-semibold">
                VS
              </span>
            </div>
          </div>

          {/* Participant 2 */}
          <div className={`
            p-4 rounded-xl border transition-all
            ${match.winner === match.participant2
              ? 'bg-green-50 border-green-200 dark:bg-green-500/20 dark:border-green-500/50'
              : 'bg-gray-50 border-gray-200 dark:bg-gray-500/10 dark:border-gray-500/30'
            }
          `}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Participant 2</span>
              {match.winner === match.participant2 && (
                <span className="text-yellow-600 dark:text-yellow-400 font-bold">WINNER ★</span>
              )}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {match.participant2 || 'TBD'}
            </div>
            {match.participant2Uucms && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {match.participant2Uucms}
              </div>
            )}
            {match.participant2RegistrationNumber && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Reg #: {match.participant2RegistrationNumber}
              </div>
            )}
            {scoreDisplay2 !== '-' && (
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-3">
                Score: {scoreDisplay2}
              </div>
            )}

            {/* Team Details for Participant 2 */}
            {match.participant2TeamDetails && match.participant2TeamDetails.players && match.participant2TeamDetails.players.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'p2' ? null : 'p2')}
                  className="flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  <span className={`transform transition-transform ${expandedSection === 'p2' ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  View Team Members ({match.participant2TeamDetails.players.length})
                </button>

                {expandedSection === 'p2' && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700/50">
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Reg #</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">UUCMS</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Name</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.participant2TeamDetails.players.map((player, idx) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{match.participant2RegistrationNumber || '-'}</td>
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 font-mono">{player.uucms || '-'}</td>
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{player.name || '-'}</td>
                            <td className="px-2 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{player.department || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule */}
          {match.scheduledTime && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Scheduled</div>
              <div className="text-base font-semibold text-blue-700 dark:text-blue-300">
                {new Date(match.scheduledTime).toLocaleString()}
              </div>
            </div>
          )}

          {/* Result Summary */}
          {isCompleted && hasWinner && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-200 dark:border-green-500/50">
              <div className="text-sm font-semibold text-green-700 dark:text-green-300">
                ✓ Match Completed
              </div>
              <div className="text-lg font-bold text-green-800 dark:text-green-200 mt-2">
                {match.cricketResultText || `${match.winner} wins this match!`}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-cyan-400/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Close
          </button>
        </div>

        <style>{`
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * LOADING SKELETON - Placeholder while bracket loads
 */
export function BracketSkeleton() {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-8 min-w-max px-4" style={{ minHeight: '600px' }}>
        {Array.from({ length: 4 }).map((_, roundIdx) => (
          <div key={`skeleton-round-${roundIdx}`} className="flex flex-col items-center" style={{ minWidth: '280px' }}>
            {/* Header */}
            <div className="mb-8 w-full">
              <div className="h-4 bg-gray-700 dark:bg-gray-600 rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
              <div className="h-1 bg-gray-600 dark:bg-gray-700 rounded-full w-12 mx-auto animate-pulse"></div>
            </div>

            {/* Match Cards */}
            <div className="space-y-16 w-full flex-1">
              {Array.from({ length: Math.pow(2, roundIdx) }).map((_, idx) => (
                <div key={`skeleton-card-${idx}`} className="rounded-2xl overflow-hidden border border-gray-700 dark:border-gray-800">
                  {/* Header */}
                  <div className="h-10 bg-gray-700 dark:bg-gray-800 animate-pulse"></div>
                  {/* Participant 1 */}
                  <div className="h-16 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-800 animate-pulse"></div>
                  {/* Participant 2 */}
                  <div className="h-16 bg-gray-800 dark:bg-gray-900 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

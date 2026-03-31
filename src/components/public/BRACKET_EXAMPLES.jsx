/**
 * ===========================================
 * ADVANCED TOURNAMENT BRACKET EXAMPLES
 * Real-world usage patterns and customizations
 * ===========================================
 */

// Example 1: Basic 8-Team Single Elimination Bracket
// File: examples/BasicBracketExample.jsx

import { useState } from 'react';
import TournamentBracket, { BracketSkeleton } from '../components/public/TournamentBracket';

export function BasicBracketExample() {
  const [loading, setLoading] = useState(false);

  // Sample 8-team bracket data
  const sampleMatches = [
    // Round 1 (4 matches)
    {
      _id: 'm1', matchNumber: 1, round: 1, 
      participant1: 'Team Alpha', participant1Uucms: 'ALPHA001',
      participant2: 'Team Beta', participant2Uucms: 'BETA001',
      score1: 3, score2: 1, winner: 'Team Alpha', status: 'completed',
      scheduledTime: '2024-03-31T10:00:00Z'
    },
    {
      _id: 'm2', matchNumber: 2, round: 1,
      participant1: 'Team Gamma', participant1Uucms: 'GAMMA001',
      participant2: 'Team Delta', participant2Uucms: 'DELTA001',
      score1: 2, score2: 2, winner: 'Team Gamma', status: 'completed',
      scheduledTime: '2024-03-31T10:30:00Z'
    },
    {
      _id: 'm3', matchNumber: 3, round: 1,
      participant1: 'Team Epsilon', participant1Uucms: 'EPS001',
      participant2: 'Team Zeta', participant2Uucms: 'ZETA001',
      score1: 4, score2: 0, winner: 'Team Epsilon', status: 'completed',
      scheduledTime: '2024-03-31T11:00:00Z'
    },
    {
      _id: 'm4', matchNumber: 4, round: 1,
      participant1: 'Team Eta', participant1Uucms: 'ETA001',
      participant2: 'Team Theta', participant2Uucms: 'THETA001',
      score1: null, score2: null, winner: null, status: 'pending',
      scheduledTime: '2024-03-31T11:30:00Z'
    },

    // Round 2 - Semifinals (2 matches)
    {
      _id: 'm5', matchNumber: 5, round: 2,
      participant1: 'Team Alpha', participant1Uucms: 'ALPHA001',
      participant2: 'Team Gamma', participant2Uucms: 'GAMMA001',
      score1: 2, score2: 1, winner: 'Team Alpha', status: 'completed',
      scheduledTime: '2024-04-01T14:00:00Z'
    },
    {
      _id: 'm6', matchNumber: 6, round: 2,
      participant1: 'Team Epsilon', participant1Uucms: 'EPS001',
      participant2: null, participant2Uucms: null,
      score1: null, score2: null, winner: null, status: 'pending',
      scheduledTime: '2024-04-01T15:00:00Z'
    },

    // Round 3 - Final (1 match)
    {
      _id: 'm7', matchNumber: 7, round: 3,
      participant1: 'Team Alpha', participant1Uucms: 'ALPHA001',
      participant2: null, participant2Uucms: null,
      score1: null, score2: null, winner: null, status: 'pending',
      scheduledTime: '2024-04-02T16:00:00Z'
    }
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">8-Team Tournament Bracket</h1>
      {loading ? (
        <BracketSkeleton />
      ) : (
        <TournamentBracket matches={sampleMatches} totalRounds={3} />
      )}
    </div>
  );
}

// ==========================================
// Example 2: 16-Team Bracket with Real API
// File: examples/RealTimeExample.jsx

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import API from '../utils/api';
import TournamentBracket, { BracketSkeleton } from '../components/public/TournamentBracket';

export function RealTimeBracketExample({ tournamentId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await API.get(`/tournaments/${tournamentId}`);
        setMatches(res.data.matches || []);
        setError(null);
      } catch (err) {
        setError('Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [tournamentId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.emit('join_tournament', tournamentId);

    socket.on('tournament_match_updated', ({ match }) => {
      setMatches(prev => {
        const exists = prev.find(m => m._id === match._id);
        if (exists) {
          return prev.map(m => m._id === match._id ? { ...m, ...match } : m);
        } else {
          return [...prev, match];
        }
      });
    });

    return () => {
      socket.emit('leave_tournament', tournamentId);
      socket.disconnect();
    };
  }, [tournamentId]);

  const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;

  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Live Tournament</h1>
      <p className="text-gray-500 mb-6">Updates automatically as matches complete</p>
      {loading ? (
        <BracketSkeleton />
      ) : (
        <TournamentBracket matches={matches} totalRounds={totalRounds} />
      )}
    </div>
  );
}

// ==========================================
// Example 3: Custom Styling Integration
// File: examples/CustomStylingExample.jsx

import TournamentBracket from '../components/public/TournamentBracket';
import '../styles/custom-bracket.css';

const customMatches = [
  // ... matches data ...
];

export function CustomStylingExample() {
  return (
    <div className="custom-bracket-wrapper">
      <style>{`
        /* Custom CSS Variables */
        :root {
          --bracket-accent-1: #06b6d4;  /* cyan */
          --bracket-accent-2: #8b5cf6;  /* purple */
          --bracket-success: #10b981;   /* green */
          --bracket-live: #3b82f6;      /* blue */
        }
      `}</style>
      
      <TournamentBracket matches={customMatches} totalRounds={4} />
    </div>
  );
}

// ==========================================
// Example 4: Filter & Search Integration
// File: examples/FilteredBracketExample.jsx

import { useState, useMemo } from 'react';
import TournamentBracket from '../components/public/TournamentBracket';

const allMatches = [
  // ... full matches data ...
];

export function FilteredBracketExample() {
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending', 'live'

  const filteredMatches = useMemo(() => {
    if (filter === 'all') return allMatches;
    if (filter === 'completed') return allMatches.filter(m => m.status === 'completed');
    if (filter === 'pending') return allMatches.filter(m => m.status === 'pending');
    if (filter === 'live') return allMatches.filter(m => m.status === 'in_progress');
    return allMatches;
  }, [filter]);

  const totalRounds = filteredMatches.length > 0 
    ? Math.max(...filteredMatches.map(m => m.round)) 
    : 0;

  return (
    <div className="p-8">
      <div className="mb-6 flex gap-2">
        {['all', 'completed', 'pending', 'live'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === f 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {filter === f && (
              <span className="ml-2 badge">{filteredMatches.length}</span>
            )}
          </button>
        ))}
      </div>

      <TournamentBracket matches={filteredMatches} totalRounds={totalRounds} />
    </div>
  );
}

// ==========================================
// Example 5: Statistics Dashboard
// File: examples/BracketWithStatsExample.jsx

import { useMemo } from 'react';
import TournamentBracket from '../components/public/TournamentBracket';

export function BracketWithStatsExample({ matches, totalRounds }) {
  const stats = useMemo(() => {
    const total = matches.length;
    const completed = matches.filter(m => m.status === 'completed').length;
    const live = matches.filter(m => m.status === 'in_progress').length;
    const pending = matches.filter(m => m.status === 'pending').length;

    const winningTeams = {};
    matches.forEach(m => {
      if (m.winner) {
        winningTeams[m.winner] = (winningTeams[m.winner] || 0) + 1;
      }
    });

    return { total, completed, live, pending, winningTeams };
  }, [matches]);

  return (
    <div className="p-8">
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Matches" value={stats.total} color="blue" />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Live" value={stats.live} color="yellow" />
        <StatCard label="Pending" value={stats.pending} color="gray" />
      </div>

      <TournamentBracket matches={matches} totalRounds={totalRounds} />

      {/* Top Teams */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Top Teams</h3>
        <div className="space-y-2">
          {Object.entries(stats.winningTeams)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([team, wins], i) => (
              <div key={team} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <span className="font-semibold">#{i + 1} {team}</span>
                <span className="text-lg font-bold text-blue-600">{wins} wins</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 text-center`}>
      <div className="text-sm font-medium opacity-75">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

// ==========================================
// Example 6: Export & Print Support
// File: examples/ExportableBracketExample.jsx

import { useRef } from 'react';
import TournamentBracket from '../components/public/TournamentBracket';

export function ExportableBracketExample({ matches, totalRounds, tournamentName }) {
  const bracketRef = useRef();

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>${tournamentName} Bracket</title>
          <style>
            body { font-family: Arial; }
            @media print { 
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>${tournamentName}</h1>
          ${bracketRef.current?.innerHTML || ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportJSON = () => {
    const data = {
      tournament: tournamentName,
      exportDate: new Date().toISOString(),
      matches: matches,
      totalRounds: totalRounds
    };
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + 
      encodeURIComponent(JSON.stringify(data, null, 2)));
    element.setAttribute('download', `${tournamentName}-bracket.json`);
    element.click();
  };

  return (
    <div className="p-8">
      <div className="flex gap-4 mb-6">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🖨️ Print Bracket
        </button>
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          📥 Export JSON
        </button>
      </div>

      <div ref={bracketRef}>
        <TournamentBracket matches={matches} totalRounds={totalRounds} />
      </div>
    </div>
  );
}

// ==========================================
// Example 7: Responsive Mobile View
// File: examples/ResponsiveBracketExample.jsx

import { useState, useEffect } from 'react';
import TournamentBracket from '../components/public/TournamentBracket';

export function ResponsiveBracketExample({ matches, totalRounds }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`p-${isMobile ? '4' : '8'}`}>
      <div className="mb-4 text-center">
        <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
          Tournament Bracket
        </h1>
        {isMobile && (
          <p className="text-sm text-gray-500 mt-2">
            📱 Swipe to scroll horizontally
          </p>
        )}
      </div>

      <TournamentBracket matches={matches} totalRounds={totalRounds} />
    </div>
  );
}

// Export all examples
export default {
  BasicBracketExample,
  RealTimeBracketExample,
  CustomStylingExample,
  FilteredBracketExample,
  BracketWithStatsExample,
  ExportableBracketExample,
  ResponsiveBracketExample
};

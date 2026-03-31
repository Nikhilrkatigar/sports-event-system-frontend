# 🏆 Tournament Bracket Component - Documentation

## Overview

A production-ready, modern animated tournament bracket UI component for React with esports-style design using Tailwind CSS. Single elimination knockout brackets with real-time updates, interactive modals, and smooth animations.

---

## Features

### ✨ Core Features
- **Single Elimination Bracket** - Knockout-style tournament displays
- **Multi-Round Display** - Horizontal scrolling bracket with multiple rounds
- **Dynamic Data** - Fully data-driven (no hardcoding)
- **Real-time Updates** - Live match updates via Socket.io integration
- **Match Details Modal** - Click any match to see full details
- **Winner Highlighting** - Visual indicators for match winners

### 🎨 UI/UX Features
- **Glassmorphism Design** - Modern semi-transparent cards with backdrop blur
- **Dark/Light Theme Support** - Full dark mode compatibility
- **Responsive Layout** - Horizontal scroll on mobile, desktop optimized
- **Smooth Animations** - CSS-based animations for performance
- **Neon Accents** - Cyan and purple gradient highlights
- **SVG Connectors** - Beautiful curved lines connecting matches
- **Status Badges** - Live, Completed, Pending status indicators
- **Skeleton Loading** - Placeholder while data loads
- **Hover Effects** - Scale and glow effects on card hover

### ⚡ Performance
- Optimized re-renders using `useMemo`
- CSS animations instead of JavaScript for better performance
- Proper React keys to prevent unnecessary re-renders
- Scales well to 16-32 team brackets

---

## Component Structure

```
TournamentBracket (Main Component)
├── RoundColumn (One per round)
│   ├── MatchCard (One per match)
│   │   ├── ParticipantRow (One per team)
│   │   └── Animations & Status
│   └── Round Header
├── BracketConnectors (SVG Lines)
│   └── BracketLine (Individual connector)
└── MatchDetailModal (Click detail)
    └── Match Information Display

BracketSkeleton (Loading state)
```

---

## Usage

### Basic Implementation

```jsx
import TournamentBracket, { BracketSkeleton } from '../../components/public/TournamentBracket';

export default function MyTournamentPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ... load tournament data ...
  
  const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
  
  return (
    <div>
      {loading ? (
        <BracketSkeleton />
      ) : (
        <TournamentBracket matches={matches} totalRounds={totalRounds} />
      )}
    </div>
  );
}
```

### Props

#### `TournamentBracket`

```jsx
<TournamentBracket
  matches={matches}        // Array of match objects (required)
  totalRounds={totalRounds} // Number, max round number (required)
/>
```

**Match Object Format:**
```javascript
{
  _id: "unique-id",
  matchNumber: 1,              // Display number
  round: 1,                    // Round number
  status: "completed",         // "pending" | "in_progress" | "completed"
  participant1: "Team A",      // Name or TBD
  participant1Uucms: "USMS1",  // Optional ID
  participant2: "Team B",
  participant2Uucms: "USMS2",
  score1: 3,                   // Optional score
  score2: 1,
  winner: "Team A",            // Winner name or null
  scheduledTime: "2024-01-15T14:00:00Z" // Optional
}
```

#### `BracketSkeleton`

```jsx
<BracketSkeleton /> // No props needed - shows loading animation
```

---

## Styling & Customization

### Color Scheme

The component uses Tailwind's built-in colors. To customize:

1. **Accent Colors** (Cyan/Purple gradient):
   - Change in `RoundColumn` header: `from-cyan-500 to-purple-500`
   - Change in `MatchCard` badge: `from-cyan-500 to-purple-500`

2. **Status Colors**:
   - Completed: `green-500`
   - Live: `blue-500`
   - Pending: `gray-500`
   - Final Match: Yellow/orange gradient

3. **Background**:
   - Match cards: `from-slate-900/40 to-slate-800/40` (dark mode)
   - Main background: Handled by parent container

### Customizing Match Card Appearance

Edit `MatchCard` function in `TournamentBracket.jsx`:

```jsx
// Change minimum width:
style={{ minWidth: '280px' }} // Default is 280px

// Change border radius:
className="rounded-2xl" // Change to rounded-xl, rounded-lg, etc.

// Change gap between matches:
style={{ gap: `${gap}px` }} // Adjust spacing formula
```

### Animations

All animations use CSS keyframes defined in the component:

```css
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
```

Adjust duration and delay:
- `animation: 'slideIn 0.6s ease-out ${animationDelay}ms both'`
- Change `0.6s` for animation speed
- Change `animationDelay` for stagger effect

---

## Features Explained

### 1. Round Headers
- Displays round name (Round 1, Quarterfinals, Semifinals, Grand Final)
- Cyan→Purple gradient underline
- Responsive sizing

### 2. Match Cards
- **Header Section**: Match number, status badge, live indicator
- **Participant Sections**: Name, ID (UUCMS), score
- **Winner Highlight**: Green background + star animation
- **Scheduled Time**: If provided in match data

### 3. Status Indicators
- ✓ Done (Completed) - Green
- ⚡ Live (In Progress) - Blue with pulse animation
- Pending - Gray
- Status badges use appropriate colors

### 4. SVG Connectors
- Curved paths connecting matches from one round to the next
- Cyan→Purple gradient
- Responsive scaling
- Uses ResizeObserver for dynamic sizing

### 5. Match Detail Modal
- Modal overlay on match click
- Shows both participants with scores
- Highlights winner with star (★)
- Displays schedule information
- Completion summary
- Close button and backdrop click to close

### 6. Hover Effects
- Card scales up (105%)
- Glow background appears
- Border becomes more prominent (cyan highlight)
- Shadow increases
- Smooth transitions

---

## Integration with TournamentPage

The component is already integrated in `TournamentPage.jsx`:

```jsx
// Imports
import TournamentBracket, { BracketSkeleton } from '../../components/public/TournamentBracket';

// Loading State
{loading && tournament?.format === 'single_elimination' && (
  <div className="relative">
    <BracketSkeleton />
  </div>
)}

// Render
{!loading && !error && tournament && (
  tournament.format === 'single_elimination' ? (
    <TournamentBracket matches={matches} totalRounds={totalRounds} />
  ) : (
    // ... other formats ...
  )
)}
```

### Live Updates

Socket.io integration automatically updates matches:

```javascript
socket.on('tournament_match_updated', ({ match }) => {
  // Matches update automatically
});
```

---

## Responsive Design

### Desktop (> 1024px)
- Full horizontal scroll
- All matches visible side-by-side
- Large match cards (280px)
- Full SVG connectors

### Tablet (768px - 1024px)
- Horizontal scroll with more gap
- Readable match cards
- SVG connectors visible

### Mobile (< 768px)
- Smooth horizontal scroll
- Touch-friendly card size
- Scrollable rounds
- No SVG connectors initially (can be enabled)

---

## Performance Tips

1. **Memoization**: Uses `useMemo` for `groupedByRound` to prevent recalculations
2. **Keys**: Proper React keys on all lists
3. **CSS Animations**: Animations use CSS (GPU-accelerated) not JavaScript
4. **Virtual Scrolling**: For 32+ team brackets, consider virtual scrolling
5. **Lazy Loading**: Load match details modally instead of inline

---

## Troubleshooting

### SVG Connectors Not Showing
- Check ResizeObserver support (IE11 doesn't support it)
- Ensure parent container has proper sizing
- Check CSS opacity and filter settings

### Animations Not Smooth
- Verify `transform: translateX` is being applied
- Check browser's animation performance
- Consider reducing animation complexity on slow devices

### Modal Not Appearing
- Check z-index value (fixed at `z-50`)
- Verify no parent elements have `pointer-events: none`
- Check for overflow: hidden on parent

### Bracket Not Scrolling
- Parent needs `overflow-x-auto`
- Check if width is constrained
- Verify flex layout with `min-w-max`

---

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ IE11 (No SVG connectors, no ResizeObserver)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Future Enhancements

Potential improvements:

1. **Double Elimination** - Add support for losers bracket
2. **Round Robin** - Group stage display
3. **Swiss System** - Multi-round pairing system
4. **Animations Export** - Export bracket as image/PDF
5. **Edit Mode** - Admin ability to update scores in place
6. **Predictions** - User prediction mode
7. **Statistics** - Head-to-head stats display
8. **Custom Sorting** - Alternative bracket orientations

---

## License

This component is part of the Sports Event System project.

---

## Examples

### Tournament with 16 teams (4 rounds)
```javascript
const matches = [
  // Round 1 - 8 matches
  { matchNumber: 1, round: 1, participant1: "Team A", participant2: "Team B", ... },
  // ... more matches ...
  // Round 2 - 4 matches
  { matchNumber: 9, round: 2, participant1: "Team A", participant2: "Team C", ... },
  // ... and so on
];
const totalRounds = 4; // Round 1 → 2 → Semi → Final
```

### Live Update Example
```javascript
socket.on('tournament_match_updated', ({ match }) => {
  setMatches(prev => 
    prev.map(m => m._id === match._id ? { ...m, ...match } : m)
  );
});
```

---

## Support

For issues or feature requests, please check:
- Component logic in `TournamentBracket.jsx`
- Match data format requirements
- Socket.io event bindings in `TournamentPage.jsx`

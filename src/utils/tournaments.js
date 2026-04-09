export const formatLabel = (format) => {
  if (format === 'single_elimination') return 'Single Elimination';
  if (format === 'round_robin') return 'Round Robin';
  if (format === 'track_heats') return 'Track Heats';
  if (format === 'field_flight') return 'Field Flight';
  return format;
};

export const isCricketEvent = (event) => String(event?.sportType || 'standard').toLowerCase() === 'cricket';

export const getEventCategory = (event) => {
  if (event?.eventCategory) return event.eventCategory;
  return event?.type === 'single' ? 'track' : 'general';
};

export const getAvailableFormats = (event) => {
  if (isCricketEvent(event)) return ['single_elimination', 'round_robin'];
  const category = getEventCategory(event);
  if (category === 'track') return ['track_heats', 'single_elimination', 'round_robin', 'field_flight'];
  if (category === 'field') return ['field_flight', 'track_heats', 'single_elimination', 'round_robin'];
  return ['single_elimination', 'round_robin', 'track_heats', 'field_flight'];
};

export const getParticipantUnitLabel = (event, format) => {
  if (format === 'track_heats') {
    return event?.type === 'team' ? 'teams' : 'athletes';
  }
  if (format === 'field_flight') return 'participants';
  return event?.type === 'team' ? 'teams' : 'players';
};

export const getGenerateActionLabel = (format) => {
  if (format === 'track_heats') return 'Generate Heats';
  if (format === 'field_flight') return 'Generate Flight';
  return 'Generate Bracket';
};

export const formatCricketScore = (score = {}) => {
  if (!score || score.runs == null) return '-';
  const wickets = score.wickets == null ? '-' : score.wickets;
  const overs = score.overs ? ` (${score.overs})` : '';
  return `${score.runs}/${wickets}${overs}`;
};

export const getMatchScoreDisplay = (match, slot) => {
  const cricketScore = slot === 1 ? match?.cricketScore1 : match?.cricketScore2;
  if (cricketScore && cricketScore.runs != null) {
    return formatCricketScore(cricketScore);
  }

  const numericScore = slot === 1 ? match?.score1 : match?.score2;
  return numericScore != null ? String(numericScore) : '-';
};

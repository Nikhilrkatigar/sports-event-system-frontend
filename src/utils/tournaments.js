export const formatLabel = (format) => {
  if (format === 'single_elimination') return 'Single Elimination';
  if (format === 'round_robin') return 'Round Robin';
  if (format === 'track_heats') return 'Track Heats';
  if (format === 'field_flight') return 'Field Flight';
  return format;
};

export const getEventCategory = (event) => {
  if (event?.eventCategory) return event.eventCategory;
  return event?.type === 'single' ? 'track' : 'general';
};

export const getAvailableFormats = (event) => {
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

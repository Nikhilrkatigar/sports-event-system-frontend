export const CMS_ROLES = [
  'Admin',
  'HOD',
  'Coordinator',
  'Faculty',
  'Principal',
  'Student GS',
  'Student Sports',
  'Organizer'
];

export const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const isOrganizerRole = (role) => normalizeRole(role) === 'organizer';

export const hasFullCmsAccess = (role) => !isOrganizerRole(role);

export const getAdminHomeByRole = (role) => (isOrganizerRole(role) ? '/admin/scanner' : '/admin');

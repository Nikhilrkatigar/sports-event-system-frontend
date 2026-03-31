export const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'published', label: 'Published' },
  { value: 'open', label: 'Open for Registration' },
  { value: 'full', label: 'Full' },
  { value: 'closed', label: 'Closed' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

export const PUBLIC_EVENT_STATUSES = ['coming_soon', 'published', 'open', 'full', 'closed', 'live', 'completed'];

export const getEventStatusMeta = (event) => {
  const status = String(event?.status || 'draft').toLowerCase();
  const map = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    coming_soon: { label: '🎯 Coming Soon', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    published: { label: 'Published', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    open: { label: 'Open', className: 'bg-green-100 text-green-700 border-green-200' },
    full: { label: 'Full', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    closed: { label: 'Closed', className: 'bg-red-100 text-red-700 border-red-200' },
    live: { label: 'Live', className: 'bg-rose-100 text-rose-700 border-rose-200' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    archived: { label: 'Archived', className: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
  };
  return map[status] || map.draft;
};

export const canRegisterForEvent = (event) => Boolean(event?.canRegister);

export const formatEventDeadline = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

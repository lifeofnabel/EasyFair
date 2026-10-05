import type { Fair } from '../types/models';

/** Trip plan autumn 2026. Seeded to Firestore (messeFairs) on first sync; editable in the app. */
export const DEFAULT_FAIRS: Fair[] = [
  { id: 'nepcon-asia-2026', name: 'NEPCON ASIA 2026', city: 'Shenzhen', country: 'China', startDate: '2026-10-27', endDate: '2026-10-29' },
  { id: 's-factory-expo-2026', name: 'S-FACTORY EXPO', city: 'Shenzhen', country: 'China', startDate: '2026-10-27', endDate: '2026-10-29' },
  { id: 'superterminal-expo-2026', name: 'SuperTerminal Expo', city: 'Hong Kong', country: 'China', startDate: '2026-11-03', endDate: '2026-11-05' },
  { id: 'ptc-asia-2026', name: 'PTC ASIA', city: 'Shanghai', country: 'China', startDate: '2026-11-03', endDate: '2026-11-06' },
  { id: 'fhc-shanghai-2026', name: 'FHC Shanghai Global Food Exhibition', city: 'Shanghai', country: 'China', startDate: '2026-11-10', endDate: '2026-11-12' },
];

export function fairDay(fair: Fair, date = new Date()): number | null {
  const start = new Date(`${fair.startDate}T00:00:00`);
  const end = new Date(`${fair.endDate}T23:59:59`);
  if (date < start || date > end) return null;
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Fair running today, else the next upcoming one. */
export function suggestFair(fairs: Fair[], date = new Date()): Fair | null {
  const today = date.toISOString().slice(0, 10);
  const sorted = [...fairs].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return sorted.find((f) => f.startDate <= today && f.endDate >= today)
    ?? sorted.find((f) => f.startDate > today)
    ?? null;
}

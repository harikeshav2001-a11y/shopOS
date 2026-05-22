import { useLiveQuery } from 'dexie-react-hooks';
import { db, getOrCreateSettings, updateSettings } from '../db/db';
import type { Settings } from '../db/types';

export function useSettings() {
  const settings = useLiveQuery(() => getOrCreateSettings(), []);
  return { settings, updateSettings };
}

export function useSettingsValue(): Settings | undefined {
  return useLiveQuery(() => db.settings.get(1), []);
}

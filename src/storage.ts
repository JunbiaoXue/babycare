import type { AppData, FeedingRecord, DiaperRecord, VitaminDRecord, SleepRecord } from './types';

const STORAGE_KEY = 'babycare_data';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {}
  return { feedings: [], diapers: [], vitamins: [], sleeps: [] };
}

function save(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const storage = {
  addFeeding(r: Omit<FeedingRecord, 'id'>): FeedingRecord {
    const data = load();
    const record: FeedingRecord = { ...r, id: genId() };
    data.feedings.push(record);
    data.feedings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    save(data);
    return record;
  },

  addDiaper(r: Omit<DiaperRecord, 'id'>): DiaperRecord {
    const data = load();
    const record: DiaperRecord = { ...r, id: genId() };
    data.diapers.push(record);
    data.diapers.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    save(data);
    return record;
  },

  addVitamin(r: Omit<VitaminDRecord, 'id'>): VitaminDRecord {
    const data = load();
    const record: VitaminDRecord = { ...r, id: genId() };
    data.vitamins.push(record);
    data.vitamins.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    save(data);
    return record;
  },

  addSleep(r: Omit<SleepRecord, 'id'>): SleepRecord {
    const data = load();
    const record: SleepRecord = { ...r, id: genId() };
    data.sleeps.push(record);
    data.sleeps.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    save(data);
    return record;
  },

  updateSleep(id: string, updates: Partial<SleepRecord>): void {
    const data = load();
    const idx = data.sleeps.findIndex(s => s.id === id);
    if (idx !== -1) {
      data.sleeps[idx] = { ...data.sleeps[idx], ...updates };
      save(data);
    }
  },

  deleteRecord(kind: keyof AppData, id: string): void {
    const data = load();
    (data[kind] as any[]) = (data[kind] as any[]).filter(r => r.id !== id);
    save(data);
  },

  getAll(): AppData {
    return load();
  },

  getByDateRange(kind: keyof AppData, start: Date, end: Date): any[] {
    const data = load();
    return (data[kind] as any[]).filter(r => {
      const t = new Date(r.time || r.startTime);
      return t >= start && t <= end;
    });
  },

  importData(data: AppData): void {
    save(data);
  }
};

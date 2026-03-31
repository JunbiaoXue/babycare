export type FeedingType = 'breast-direct' | 'breast-pump' | 'formula';
export type DiaperType = 'pee' | 'poop' | 'both';
export type PoopColor = 'yellow' | 'green' | 'brown' | 'black' | 'other';
export type PoopTexture = 'liquid' | 'soft' | 'normal' | 'hard';

export interface FeedingRecord {
  id: string;
  type: FeedingType;
  time: string; // ISO string
  amount?: number; // ml, for pump/formula
  duration?: number; // minutes, for breast-direct
  note?: string;
}

export interface DiaperRecord {
  id: string;
  time: string;
  type: DiaperType;
  poopColor?: PoopColor;
  poopTexture?: PoopTexture;
  note?: string;
}

export interface VitaminDRecord {
  id: string;
  time: string;
  dosage: number; // IU
  note?: string;
}

export interface SleepRecord {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  note?: string;
}

export interface DailySummary {
  date: string;
  feedingCount: number;
  totalMilkMl: number;
  diaperCount: number;
  sleepTotalMinutes: number;
  vitaminDCount: number;
}

export interface AppData {
  feedings: FeedingRecord[];
  diapers: DiaperRecord[];
  vitamins: VitaminDRecord[];
  sleeps: SleepRecord[];
}

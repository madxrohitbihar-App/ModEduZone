export type ThemePreference = 'light' | 'dark' | 'system';

export interface InstituteApp {
  appNumber: string;
  id: string;
  shortId: string;
  name: string;
  route: string;
  apiDomain: string;
  category: string;
  examFocus: string;
  provider: string;
  hasBypass: boolean;
  featured?: boolean;
  accentColor: string;
  bannerImage?: string;
  batchCount: number;
  lectureCount: number;
  recentOpenedAt?: string;
}

export interface BatchItem {
  id: string;
  appId: string;
  name: string;
  examCategory: 'foundation' | 'daroga' | 'bpsc' | 'crash' | 'test';
  categoryLabel: string;
  instructor: string;
  language: string;
  validity: string;
  startDate: string;
  priceLabel: string;
  isFreeCommunity: boolean;
  subjectCount: number;
  lectureCount: number;
  pdfCount: number;
  description: string;
}

export interface SubjectItem {
  id: string;
  batchId: string;
  name: string;
  teacher: string;
  chapterCount: number;
  lectureCount: number;
}

export interface ChapterItem {
  id: string;
  subjectId: string;
  title: string;
  lectureCount: number;
  pdfCount: number;
}

export interface LectureItem {
  id: string;
  chapterId: string;
  title: string;
  teacher: string;
  duration: string;
  durationSeconds: number;
  dateLabel: string;
  streamUrl?: string;
  videoId?: string;
  isNew?: boolean;
  hasPdf: boolean;
  hasDpp: boolean;
  pdfTitle: string;
  dppTitle?: string;
  summaryPoints: string[];
  keyFormulasOrFacts: string[];
}

export interface LiveClassItem {
  id: string;
  appId: string;
  appName: string;
  batchName: string;
  subject: string;
  title: string;
  teacher: string;
  timeLabel: string;
  dateLabel: string;
  status: 'live' | 'upcoming' | 'recorded';
  streamUrl?: string;
  summaryPoints: string[];
}

export interface DownloadTask {
  lectureId: string;
  title: string;
  quality: string;
  status: 'preparing' | 'downloading' | 'converting' | 'ready' | 'error';
  progress: number;
  message: string;
  fileSize: number;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface InstituteSession {
  appId: string;
  userId: string;
  token: string;
  name: string;
  mobile?: string;
  donatedCount: number;
  signedInAt: string;
}

export interface KeyConfigState {
  enabled: boolean;
  shortenerTemplate: string;
  validityHours: number;
  popupTitle: string;
  popupDescription: string;
  keyEpoch: number;
  updatedAt: string;
}

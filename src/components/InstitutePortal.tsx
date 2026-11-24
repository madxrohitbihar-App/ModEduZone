import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  KeyRound,
  LogOut,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  BRAND_EMBLEM_IMG,
  BRAND_NAME,
  DISHA_BANNER_IMG,
  GYAN_BANNER_IMG,
  LIVE_CLASSES_SCHEDULE,
  TELEGRAM_URL,
  WHATSAPP_URL,
  getBatchesForApp,
  getChaptersForSubject,
  getLecturesForChapter,
  getSubjectsForBatch,
} from '../data/catalog';
import type {
  BatchItem,
  ChapterItem,
  InstituteApp,
  InstituteSession,
  LectureItem,
  LiveClassItem,
  SubjectItem,
} from '../types/study';
import { buildPdfDownloadUrl } from './PdfViewerModal';

interface InstitutePortalProps {
  app: InstituteApp;
  session: InstituteSession | null;
  onSaveSession: (session: InstituteSession) => void;
  onSignOut: (appId: string) => void;
  onBackHome: () => void;
  onWatchLecture: (
    lecture: LectureItem,
    allLectures: LectureItem[],
    batchName: string,
  ) => void;
  onOpenPdf: (lecture: LectureItem, batchName: string, mode: 'notes' | 'dpp') => void;
  onDownloadVideo: (lecture: LectureItem) => void;
  onWatchLive: (item: LiveClassItem) => void;
}

const BATCH_PAGE_SIZE = 24;

export function InstitutePortal({
  app,
  session,
  onSaveSession,
  onSignOut,
  onBackHome,
  onWatchLecture,
  onOpenPdf,
  onDownloadVideo,
  onWatchLive,
}: InstitutePortalProps) {
  const [activeTab, setActiveTab] = useState<'batches' | 'enrolled' | 'live' | 'login'>('batches');
  const [batchFilter, setBatchFilter] = useState('all');
  const [batchSearch, setBatchSearch] = useState('');
  const [visibleBatchCount, setVisibleBatchCount] = useState(BATCH_PAGE_SIZE);

  const [batches, setBatches] = useState<BatchItem[]>(() => getBatchesForApp(app));
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Drill-down state: Batch -> Subject -> Chapter -> Lectures
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  // Account Login form state
  const [loginMode, setLoginMode] = useState<'mobile' | 'token'>('mobile');
  const [mobileInput, setMobileInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

  // Reset & fetch live batches when switching app
  useEffect(() => {
    setSelectedBatch(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setActiveTab('batches');
    setBatchFilter('all');
    setBatchSearch('');
    setVisibleBatchCount(BATCH_PAGE_SIZE);
    setLoginMessage(null);
    setBatches(getBatchesForApp(app));

    let cancelled = false;
    setLoadingBatches(true);
    fetch(`/api/appx/batches?appId=${encodeURIComponent(app.id)}`)
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: BatchItem[] }) => {
        if (!cancelled && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setBatches(json.data);
        }
      })
      .catch(() => {
        // Keep curated fallback
      })
      .finally(() => {
        if (!cancelled) setLoadingBatches(false);
      });

    return () => {
      cancelled = true;
    };
  }, [app]);

  const categoryTabs = useMemo(() => {
    if (app.id === 'gyan') {
      return [
        { id: 'all', label: `All Batches (${batches.length})` },
        { id: 'daroga', label: 'Daroga & Police' },
        { id: 'bpsc', label: 'BPSC / SSC / Railway' },
        { id: 'foundation', label: 'Foundation & NCERT' },
        { id: 'test', label: 'Test Series' },
      ];
    }
    return [
      { id: 'all', label: `All Batches (${batches.length})` },
      { id: 'foundation', label: 'Foundation & Target' },
      { id: 'crash', label: 'Crash Course' },
      { id: 'test', label: 'Test Series' },
    ];
  }, [app.id, batches.length]);

  const filteredBatches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase();
    const list = activeTab === 'enrolled' ? batches.slice(0, 6) : batches;
    return list.filter((b) => {
      if (batchFilter !== 'all' && b.examCategory !== batchFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.instructor.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      );
    });
  }, [batches, activeTab, batchFilter, batchSearch]);

  const visibleBatches = filteredBatches.slice(0, visibleBatchCount);

  const subjects = useMemo(() => {
    if (!selectedBatch) return [];
    return getSubjectsForBatch(app.id, selectedBatch.id);
  }, [app.id, selectedBatch]);

  const chapters = useMemo(() => {
    if (!selectedSubject) return [];
    return getChaptersForSubject(selectedSubject.id);
  }, [selectedSubject]);

  const lectures = useMemo(() => {
    if (!selectedChapter || !selectedSubject) return [];
    return getLecturesForChapter(
      selectedChapter.id,
      selectedChapter.title,
      selectedSubject.teacher,
    );
  }, [selectedChapter, selectedSubject]);

  const appLiveClasses = useMemo(() => {
    const matching = LIVE_CLASSES_SCHEDULE.filter((c) => c.appId === app.id);
    return matching.length > 0 ? matching : LIVE_CLASSES_SCHEDULE.slice(0, 3);
  }, [app.id]);

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage(null);
    setLoginLoading(true);

    try {
      if (loginMode === 'mobile') {
        const res = await fetch('/api/appx/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId: app.id,
            email: mobileInput.trim(),
            password: passwordInput,
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: {
            userId?: string;
            token?: string;
            name?: string;
            mobile?: string;
            donatedCount?: number;
          };
        };
        if (!res.ok || !data.success || !data.data?.token) {
          throw new Error(data.error || 'Login failed. Check your mobile/email and password.');
        }
        onSaveSession({
          appId: app.id,
          userId: String(data.data.userId || ''),
          token: String(data.data.token),
          name: String(data.data.name || mobileInput.trim()),
          mobile: data.data.mobile,
          donatedCount: Number(data.data.donatedCount ?? 0),
          signedInAt: new Date().toISOString(),
        });
        setLoginMessage({
          type: 'ok',
          text: `${app.name} account verified! Opening ${BRAND_NAME} classroom...`,
        });
        window.setTimeout(() => setActiveTab('batches'), 500);
      } else {
        const res = await fetch('/api/appx/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId: app.id,
            userId: userIdInput.trim(),
            token: tokenInput.trim(),
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { userId?: string; token?: string; name?: string; donatedCount?: number };
        };
        if (!res.ok || !data.success || !data.data) {
          throw new Error(data.error || `Please enter a valid ${app.name} User ID and JWT Token.`);
        }
        onSaveSession({
          appId: app.id,
          userId: String(data.data.userId || userIdInput.trim()),
          token: String(data.data.token || tokenInput.trim()),
          name: String(data.data.name || `Student #${userIdInput.trim()}`),
          donatedCount: Number(data.data.donatedCount ?? 0),
          signedInAt: new Date().toISOString(),
        });
        setLoginMessage({
          type: 'ok',
          text: `${app.name} token verified! Opening ${BRAND_NAME}...`,
        });
        window.setTimeout(() => setActiveTab('batches'), 500);
      }
    } catch (err) {
      setLoginMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to verify credentials.',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const heroBanner =
    app.id === 'gyan' ? GYAN_BANNER_IMG : app.id === 'disha' ? DISHA_BANNER_IMG : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb + Institute Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to All Apps</span>
            </button>

            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white font-mono-num"
                style={{ backgroundColor: app.accentColor }}
              >
                {app.appNumber}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {app.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {app.category} · {batches.length} Batches Available · {app.apiDomain}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {session ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs">
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                  {session.name}
                </span>
                <button
                  type="button"
                  onClick={() => onSignOut(app.id)}
                  title="Sign out"
                  className="ml-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Account Login</span>
              </button>
            )}

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Telegram</span>
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Institute Classroom Sub-Nav */}
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 sm:px-6 py-2.5">
          {(
            [
              { id: 'batches', label: `All Batches (${batches.length})` },
              { id: 'enrolled', label: 'My & Featured Batches' },
              { id: 'live', label: `Live Schedule (${appLiveClasses.length})` },
              { id: 'login', label: 'Official Account Login' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'batches' && tab.id !== 'enrolled') {
                  setSelectedBatch(null);
                  setSelectedSubject(null);
                  setSelectedChapter(null);
                }
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-indigo-600'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'login' ? (
        <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:grid-cols-12">
          <div className="md:col-span-5 bg-slate-900 p-6 sm:p-8 text-white flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={BRAND_EMBLEM_IMG}
                  alt={BRAND_NAME}
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-xl object-cover border border-white/20"
                />
                <div>
                  <p className="font-brand text-lg font-extrabold tracking-wide">{BRAND_NAME}</p>
                  <p className="text-xs text-amber-300">{app.name} Portal</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="text-2xl font-bold leading-snug [text-wrap:balance]">
                  Your Complete Board &amp; Batch Classroom
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign in with your {app.name} account to sync paid batches, or return to All Batches for instant community-unlocked courses.
                </p>
              </div>

              <div className="divide-y divide-white/10 border-y border-white/10 text-xs text-slate-200">
                <div className="flex items-center gap-3 py-3">
                  <Play className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>HD Recorded &amp; Live Classrooms</span>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>Board PDF Notes, DPPs &amp; Chapter Folders</span>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Direct Verification with {app.provider}</span>
                </div>
              </div>
            </div>

            {heroBanner && (
              <div className="overflow-hidden rounded-xl border border-white/10 h-32">
                <img
                  src={heroBanner}
                  alt={app.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-85"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Sign in to {app.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use your registered mobile number, email, or User ID &amp; JWT Token.
              </p>
            </div>

            <div className="inline-flex w-fit rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setLoginMode('mobile')}
                className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
                  loginMode === 'mobile'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Mobile Login
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('token')}
                className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
                  loginMode === 'token'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                User ID &amp; Token
              </button>
            </div>

            <form onSubmit={handleAccountLogin} className="space-y-4">
              {loginMode === 'mobile' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mobile Number or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={mobileInput}
                      onChange={(e) => setMobileInput(e.target.value)}
                      placeholder="Enter registered mobile or email"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={`Enter your ${app.name} password`}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      User ID
                    </label>
                    <input
                      type="text"
                      required
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      placeholder="e.g. 915240"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      JWT Token
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste your JWT Token..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {loginMessage && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-medium ${
                    loginMessage.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}
                >
                  {loginMessage.text}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span>{loginLoading ? 'Verifying...' : `Continue to ${BRAND_NAME}`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('batches')}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Browse Community Batches Instead
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : activeTab === 'live' ? (
        <section className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {appLiveClasses.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {item.status === 'live' ? 'Live Now' : 'Scheduled'} · {item.subject}
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                  {item.batchName} · {item.teacher} · {item.timeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onWatchLive(item)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Open Live Class</span>
              </button>
            </div>
          ))}
        </section>
      ) : selectedBatch ? (
        /* Drill-down View: Batch -> Subjects -> Chapters -> Lectures */
        <section className="space-y-5">
          {/* Drill-down Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => {
                setSelectedBatch(null);
                setSelectedSubject(null);
                setSelectedChapter(null);
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              All Batches
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => {
                setSelectedSubject(null);
                setSelectedChapter(null);
              }}
              className={`cursor-pointer ${
                !selectedSubject
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'text-indigo-600 dark:text-indigo-400 hover:underline'
              }`}
            >
              {selectedBatch.name}
            </button>
            {selectedSubject && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setSelectedChapter(null)}
                  className={`cursor-pointer ${
                    !selectedChapter
                      ? 'font-bold text-slate-900 dark:text-white'
                      : 'text-indigo-600 dark:text-indigo-400 hover:underline'
                  }`}
                >
                  {selectedSubject.name}
                </button>
              </>
            )}
            {selectedChapter && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedChapter.title}
                </span>
              </>
            )}
          </div>

          {!selectedSubject ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subj) => (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left transition-colors hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {subj.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Faculty: {subj.teacher}
                    </p>
                  </div>
                  <p className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                    {subj.chapterCount} Chapters · {subj.lectureCount} Lectures
                  </p>
                </button>
              ))}
            </div>
          ) : !selectedChapter ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {chapters.map((chap) => (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => setSelectedChapter(chap)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FolderOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {chap.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                        {chap.lectureCount} Video Lectures · {chap.pdfCount} Class PDFs &amp; DPPs
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {lectures.map((lec) => {
                const pdfDownloadHref = buildPdfDownloadUrl(
                  lec,
                  app.name,
                  selectedBatch.name,
                  'notes',
                );
                return (
                  <div
                    key={lec.id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                        {lec.isNew && (
                          <span className="font-sans font-semibold text-emerald-600 dark:text-emerald-400">
                            New
                          </span>
                        )}
                        {lec.isNew && <span aria-hidden="true">·</span>}
                        <span>{lec.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span>{lec.dateLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans">{lec.teacher}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {lec.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {lec.summaryPoints[0]}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onWatchLecture(lec, lectures, selectedBatch.name)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Watch Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPdf(lec, selectedBatch.name, 'notes')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Open Notes</span>
                      </button>

                      {lec.hasDpp && (
                        <button
                          type="button"
                          onClick={() => onOpenPdf(lec, selectedBatch.name, 'dpp')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                        >
                          <span>DPP PDF</span>
                        </button>
                      )}

                      <a
                        href={pdfDownloadHref}
                        download={`${lec.pdfTitle.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>PDF</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onDownloadVideo(lec)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Save MP4</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* Batches List View */
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setBatchFilter(tab.id);
                    setVisibleBatchCount(BATCH_PAGE_SIZE);
                  }}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    batchFilter === tab.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {loadingBatches && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing batches...</span>
                </span>
              )}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={batchSearch}
                onChange={(e) => {
                  setBatchSearch(e.target.value);
                  setVisibleBatchCount(BATCH_PAGE_SIZE);
                }}
                placeholder="Search batches or faculty..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleBatches.map((batch) => (
              <article
                key={batch.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {batch.priceLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{batch.categoryLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{batch.language}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {batch.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {batch.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                    <span className="font-sans">Faculty: {batch.instructor}</span>
                    <span>
                      {batch.subjectCount} Subjects · {batch.lectureCount} Videos · {batch.pdfCount}{' '}
                      PDFs
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedBatch(batch)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <span>Explore Subjects, Videos &amp; PDFs</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {visibleBatchCount < filteredBatches.length && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleBatchCount((c) => c + BATCH_PAGE_SIZE)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Load More Batches ({filteredBatches.length - visibleBatchCount} remaining)
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

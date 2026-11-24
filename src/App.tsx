import { Download, ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { CommunityModal } from './components/CommunityModal';
import { HomeDirectory } from './components/HomeDirectory';
import { InstitutePortal } from './components/InstitutePortal';
import { KeyGateModal } from './components/KeyGateModal';
import { Navbar, type ActiveRoute } from './components/Navbar';
import { PdfViewerModal, buildPdfDownloadUrl } from './components/PdfViewerModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import {
  BRAND_NAME,
  INSTITUTE_APPS,
  TELEGRAM_HANDLE,
  TELEGRAM_URL,
  WHATSAPP_URL,
} from './data/catalog';
import type {
  DownloadTask,
  InstituteApp,
  InstituteSession,
  LectureItem,
  LiveClassItem,
  ThemePreference,
} from './types/study';

const STORAGE_THEME = 'madxrohitbihar_theme_v1';
const STORAGE_RECENT = 'madxrohitbihar_recent_apps_v1';
const STORAGE_SESSIONS = 'madxrohitbihar_sessions_v1';
const STORAGE_KEY_EPOCH = 'madxrohitbihar_key_unlock_v1';

function parseRouteFromLocation(): ActiveRoute {
  if (typeof window === 'undefined') return { view: 'home', tab: 'apps' };
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/madxadmin' || pathname === '/admin') {
    return { view: 'admin' };
  }
  if (pathname === '/disha') {
    return { view: 'institute', appId: 'disha' };
  }
  if (pathname === '/gyan') {
    return { view: 'institute', appId: 'gyan' };
  }
  if (pathname.startsWith('/app/')) {
    const id = decodeURIComponent(pathname.slice(5)).trim();
    if (id) return { view: 'institute', appId: id };
  }
  if (pathname === '/live') {
    return { view: 'home', tab: 'live' };
  }
  return { view: 'home', tab: 'apps' };
}

function routeToPath(route: ActiveRoute): string {
  if (route.view === 'admin') return '/madxadmin';
  if (route.view === 'institute') {
    if (route.appId === 'disha') return '/disha';
    if (route.appId === 'gyan') return '/gyan';
    return `/app/${encodeURIComponent(route.appId)}`;
  }
  if (route.tab === 'live') return '/live';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>(() => parseRouteFromLocation());
  const [apps, setApps] = useState<InstituteApp[]>(INSTITUTE_APPS);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  const [themePref, setThemePref] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_THEME);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const [recentApps, setRecentApps] = useState<InstituteApp[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT);
      const parsed = raw ? (JSON.parse(raw) as InstituteApp[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [sessions, setSessions] = useState<Record<string, InstituteSession>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SESSIONS);
      return raw ? (JSON.parse(raw) as Record<string, InstituteSession>) : {};
    } catch {
      return {};
    }
  });

  // Modals & Overlays
  const [communityOpen, setCommunityOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{
    lecture: LectureItem;
    lectures: LectureItem[];
    instituteName: string;
    batchName: string;
  } | null>(null);
  const [activePdf, setActivePdf] = useState<{
    lecture: LectureItem;
    instituteName: string;
    batchName: string;
    mode: 'notes' | 'dpp';
  } | null>(null);

  // Download Progress Queue
  const [downloads, setDownloads] = useState<Record<string, DownloadTask>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Optional Admin Key Gate
  const [keyGate, setKeyGate] = useState<{
    required: boolean;
    title: string;
    description: string;
  }>({
    required: false,
    title: 'Generate Free Access Key',
    description: '',
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Theme application
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THEME, themePref);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    const apply = () => {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = themePref === 'dark' || (themePref === 'system' && prefersDark);
      root.classList.toggle('dark', isDark);
    };
    apply();
    if (themePref === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [themePref]);

  // Browser history sync
  useEffect(() => {
    const onPop = () => setRoute(parseRouteFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: ActiveRoute) => {
    setRoute(next);
    const targetPath = routeToPath(next);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch institute catalog from Express backend
  const fetchApps = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    try {
      const res = await fetch('/api/apps');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { success?: boolean; apps?: InstituteApp[] };
      if (data.success && Array.isArray(data.apps) && data.apps.length > 0) {
        setApps(data.apps);
      }
    } catch {
      setAppsError('Live sync paused — showing built-in study catalog.');
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Check optional key gate status
  useEffect(() => {
    let savedEpoch = 0;
    let savedExpires = 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EPOCH);
      if (raw) {
        const parsed = JSON.parse(raw) as { epoch?: number; expiresAt?: number };
        savedEpoch = Number(parsed.epoch || 0);
        savedExpires = Number(parsed.expiresAt || 0);
      }
    } catch {
      // ignore
    }

    fetch(`/api/key/status?epoch=${savedEpoch}`)
      .then((r) => r.json())
      .then(
        (data: {
          enabled?: boolean;
          valid?: boolean;
          popupTitle?: string;
          popupDescription?: string;
        }) => {
          if (data.enabled && (!data.valid || savedExpires < Date.now())) {
            setKeyGate({
              required: true,
              title: data.popupTitle || 'Generate Free Access Key',
              description:
                data.popupDescription ||
                `Complete a quick verification step to unlock ${BRAND_NAME}.`,
            });
          }
        },
      )
      .catch(() => {});
  }, []);

  const recordRecentApp = useCallback((app: InstituteApp) => {
    setRecentApps((prev) => {
      const updated = [
        { ...app, recentOpenedAt: new Date().toISOString() },
        ...prev.filter((item) => item.id !== app.id),
      ].slice(0, 12);
      try {
        localStorage.setItem(STORAGE_RECENT, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const handleOpenApp = useCallback(
    (app: InstituteApp) => {
      recordRecentApp(app);
      navigate({ view: 'institute', appId: app.id });
    },
    [recordRecentApp, navigate],
  );

  const handleRemoveRecent = useCallback((appId: string) => {
    setRecentApps((prev) => {
      const next = prev.filter((item) => item.id !== appId);
      try {
        localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleClearRecent = useCallback(() => {
    setRecentApps([]);
    try {
      localStorage.removeItem(STORAGE_RECENT);
    } catch {
      // ignore
    }
  }, []);

  const handleSaveSession = useCallback(
    (session: InstituteSession) => {
      setSessions((prev) => {
        const next = { ...prev, [session.appId]: session };
        try {
          localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast(`Signed in to ${session.appId.toUpperCase()} portal`);
    },
    [showToast],
  );

  const handleSignOut = useCallback(
    (appId: string) => {
      setSessions((prev) => {
        const next = { ...prev };
        delete next[appId];
        try {
          localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast('Signed out of institute account');
    },
    [showToast],
  );

  const handleWatchLive = useCallback((item: LiveClassItem) => {
    const lec: LectureItem = {
      id: item.id,
      chapterId: item.appId,
      title: item.title,
      teacher: item.teacher,
      duration: '55:00',
      durationSeconds: 3300,
      dateLabel: `${item.timeLabel} · ${item.dateLabel}`,
      streamUrl: item.streamUrl,
      hasPdf: true,
      hasDpp: false,
      pdfTitle: `${item.title} — Live Class Notes`,
      summaryPoints: item.summaryPoints,
      keyFormulasOrFacts: [
        `Live Classroom: ${item.appName} (${item.batchName})`,
        'Download class summary PDF once the live session concludes.',
      ],
    };
    setActiveVideo({
      lecture: lec,
      lectures: [lec],
      instituteName: item.appName,
      batchName: item.batchName,
    });
  }, []);

  const handleDownloadVideo = useCallback(
    (lecture: LectureItem, instituteName: string, batchName: string, quality = '720p') => {
      const id = lecture.id;
      const pdfUrl = buildPdfDownloadUrl(lecture, instituteName, batchName, 'notes');
      setDownloads((prev) => ({
        ...prev,
        [id]: {
          lectureId: id,
          title: lecture.title,
          quality,
          status: 'preparing',
          progress: 15,
          message: 'Preparing classroom package...',
          fileSize: 42 * 1024 * 1024,
        },
      }));

      window.setTimeout(() => {
        setDownloads((prev) =>
          prev[id]
            ? {
                ...prev,
                [id]: {
                  ...prev[id],
                  status: 'downloading',
                  progress: 65,
                  message: 'Packing lecture notes & stream metadata...',
                },
              }
            : prev,
        );
      }, 650);

      window.setTimeout(() => {
        setDownloads((prev) =>
          prev[id]
            ? {
                ...prev,
                [id]: {
                  ...prev[id],
                  status: 'ready',
                  progress: 100,
                  message: 'Study Pack Ready',
                  downloadUrl: pdfUrl,
                  filename: `${lecture.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 48)}_Notes.pdf`,
                },
              }
            : prev,
        );
      }, 1350);
    },
    [],
  );

  const activeInstitute = useMemo(() => {
    if (route.view !== 'institute') return null;
    return apps.find((a) => a.id === route.appId) || apps[0];
  }, [route, apps]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        route={route}
        onNavigate={navigate}
        onOpenCommunity={() => setCommunityOpen(true)}
      />

      <div className="flex-1">
        {route.view === 'admin' ? (
          <AdminPanel onBackHome={() => navigate({ view: 'home', tab: 'apps' })} />
        ) : route.view === 'institute' && activeInstitute ? (
          <InstitutePortal
            app={activeInstitute}
            session={sessions[activeInstitute.id] || null}
            onSaveSession={handleSaveSession}
            onSignOut={handleSignOut}
            onBackHome={() => navigate({ view: 'home', tab: 'apps' })}
            onWatchLecture={(lecture, allLectures, batchName) =>
              setActiveVideo({
                lecture,
                lectures: allLectures,
                instituteName: activeInstitute.name,
                batchName,
              })
            }
            onOpenPdf={(lecture, batchName, mode) =>
              setActivePdf({
                lecture,
                instituteName: activeInstitute.name,
                batchName,
                mode,
              })
            }
            onDownloadVideo={(lecture) =>
              handleDownloadVideo(lecture, activeInstitute.name, activeInstitute.category)
            }
            onWatchLive={handleWatchLive}
          />
        ) : (
          <HomeDirectory
            apps={apps}
            loadingApps={loadingApps}
            appsError={appsError}
            onRetryApps={fetchApps}
            recentApps={recentApps}
            onRemoveRecentApp={handleRemoveRecent}
            onClearRecentApps={handleClearRecent}
            themePref={themePref}
            onChangeTheme={setThemePref}
            activeTab={route.view === 'home' && route.tab === 'live' ? 'live' : 'apps'}
            onChangeTab={(tab) => navigate({ view: 'home', tab })}
            onOpenApp={handleOpenApp}
            onWatchLive={handleWatchLive}
            onOpenCommunity={() => setCommunityOpen(true)}
          />
        )}
      </div>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-brand text-sm font-bold text-slate-900 dark:text-white">
              {BRAND_NAME}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All Batches, Video Lectures, PDF Notes &amp; DPPs · Bihar Board &amp; Competitive Exams
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#0088cc] hover:underline"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Telegram ({TELEGRAM_HANDLE})</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#16a34a] hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp Channel</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={() => navigate({ view: 'admin' })}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Admin Console
            </button>
          </div>
        </div>
      </footer>

      {/* Video Player Modal */}
      <VideoPlayerModal
        lecture={activeVideo?.lecture || null}
        lectures={activeVideo?.lectures || []}
        instituteName={activeVideo?.instituteName || ''}
        batchName={activeVideo?.batchName || ''}
        onSelectLecture={(nextLec) =>
          setActiveVideo((prev) => (prev ? { ...prev, lecture: nextLec } : null))
        }
        onOpenPdf={(lec, mode) =>
          setActivePdf({
            lecture: lec,
            instituteName: activeVideo?.instituteName || BRAND_NAME,
            batchName: activeVideo?.batchName || '',
            mode,
          })
        }
        onDownloadVideo={(lec, q) =>
          handleDownloadVideo(
            lec,
            activeVideo?.instituteName || BRAND_NAME,
            activeVideo?.batchName || '',
            q,
          )
        }
        onClose={() => setActiveVideo(null)}
      />

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        lecture={activePdf?.lecture || null}
        instituteName={activePdf?.instituteName || BRAND_NAME}
        batchName={activePdf?.batchName || ''}
        mode={activePdf?.mode || 'notes'}
        onClose={() => setActivePdf(null)}
      />

      {/* Telegram & WhatsApp Community Modal */}
      <CommunityModal open={communityOpen} onClose={() => setCommunityOpen(false)} />

      {/* Optional Admin Key Gate */}
      <KeyGateModal
        open={keyGate.required && route.view !== 'admin'}
        title={keyGate.title}
        description={keyGate.description}
        onUnlocked={(epoch, expiresAt) => {
          try {
            localStorage.setItem(STORAGE_KEY_EPOCH, JSON.stringify({ epoch, expiresAt }));
          } catch {
            // ignore
          }
          setKeyGate((prev) => ({ ...prev, required: false }));
          showToast(`Access unlocked for ${BRAND_NAME}`);
        }}
      />

      {/* Download Queue Tray */}
      {Object.keys(downloads).length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-2">
          {Object.values(downloads)
            .slice(-2)
            .map((task) => (
              <div
                key={task.lectureId}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-xl space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {task.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                      {task.quality} · {task.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss download"
                    onClick={() =>
                      setDownloads((prev) => {
                        const next = { ...prev };
                        delete next[task.lectureId];
                        return next;
                      })
                    }
                    className="rounded-lg p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {task.status !== 'ready' ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                ) : (
                  task.downloadUrl && (
                    <a
                      href={task.downloadUrl}
                      download={task.filename || 'madxrohitbihar_notes.pdf'}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Save Notes PDF to Device</span>
                    </a>
                  )
                )}
              </div>
            ))}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-slate-900 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

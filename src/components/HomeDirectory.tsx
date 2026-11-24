import {
  ArrowRight,
  Clock,
  Layers,
  MessageCircle,
  Monitor,
  Moon,
  Play,
  RefreshCw,
  Search,
  Send,
  Sun,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  BRAND_NAME,
  DISHA_BANNER_IMG,
  GYAN_BANNER_IMG,
  LIVE_CLASSES_SCHEDULE,
  TELEGRAM_HANDLE,
  TELEGRAM_URL,
  WHATSAPP_URL,
} from '../data/catalog';
import type { InstituteApp, LiveClassItem, ThemePreference } from '../types/study';

interface HomeDirectoryProps {
  apps: InstituteApp[];
  loadingApps: boolean;
  appsError: string | null;
  onRetryApps: () => void;
  recentApps: InstituteApp[];
  onRemoveRecentApp: (appId: string) => void;
  onClearRecentApps: () => void;
  themePref: ThemePreference;
  onChangeTheme: (pref: ThemePreference) => void;
  activeTab: 'apps' | 'live';
  onChangeTab: (tab: 'apps' | 'live') => void;
  onOpenApp: (app: InstituteApp) => void;
  onWatchLive: (item: LiveClassItem) => void;
  onOpenCommunity: () => void;
}

const PAGE_BATCH = 24;

function formatRelativeTime(iso?: string): string {
  if (!iso) return 'Recently opened';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'Recently opened';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function HomeDirectory({
  apps,
  loadingApps,
  appsError,
  onRetryApps,
  recentApps,
  onRemoveRecentApp,
  onClearRecentApps,
  themePref,
  onChangeTheme,
  activeTab,
  onChangeTab,
  onOpenApp,
  onWatchLive,
  onOpenCommunity,
}: HomeDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'featured' | 'instant' | 'recent'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_BATCH);

  const dishaApp = apps.find((a) => a.id === 'disha') || apps[0];
  const gyanApp = apps.find((a) => a.id === 'gyan') || apps[1];

  const instantCount = useMemo(() => apps.filter((a) => a.hasBypass).length, [apps]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const baseList = filterMode === 'recent' ? recentApps : apps;
    return baseList.filter((app) => {
      if (filterMode === 'featured' && !app.featured) return false;
      if (filterMode === 'instant' && !app.hasBypass) return false;
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.appNumber.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.examFocus.toLowerCase().includes(q) ||
        app.apiDomain.toLowerCase().includes(q)
      );
    });
  }, [apps, recentApps, filterMode, searchQuery]);

  const displayedApps = filteredApps.slice(0, visibleCount);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      {/* Hero Section */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {BRAND_NAME} · Bihar Board &amp; Competitive Study Portal
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              All Study Batches, Video Lectures, PDFs &amp; DPPs in One Clean Classroom
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Direct access to Disha Online Classes, Gyan Bindu GS Academy, and 36+ AppX coaching institutes with built-in HD player, chapter PDF notes, and official community updates.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] px-5 py-3 text-sm font-semibold text-white transition-colors whitespace-nowrap"
              >
                <Send className="h-4 w-4 shrink-0" />
                <span>Join Telegram ({TELEGRAM_HANDLE})</span>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] px-5 py-3 text-sm font-semibold text-white transition-colors whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>Join WhatsApp Channel</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
              <span>{apps.length} Coaching Portals</span>
              <span aria-hidden="true">·</span>
              <span>HD Video &amp; Board Mode</span>
              <span aria-hidden="true">·</span>
              <span>Instant PDF Notes</span>
            </div>
          </div>
        </div>

        {/* Featured 01 & 02 Portals */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {dishaApp && (
            <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative h-44 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <img
                  src={DISHA_BANNER_IMG}
                  alt={dishaApp.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <p className="font-mono-num text-xs text-amber-300">Portal 01 · Featured</p>
                  <h2 className="text-lg font-bold leading-snug">{dishaApp.name}</h2>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {dishaApp.category}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                    {dishaApp.batchCount} Batches · {dishaApp.lectureCount} Lectures
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenApp(dishaApp)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <span>Open Disha Portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {gyanApp && (
            <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative h-44 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <img
                  src={GYAN_BANNER_IMG}
                  alt={gyanApp.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <p className="font-mono-num text-xs text-emerald-300">Portal 02 · Featured</p>
                  <h2 className="text-lg font-bold leading-snug">{gyanApp.name}</h2>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {gyanApp.category}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                    {gyanApp.batchCount} Batches · {gyanApp.lectureCount} Lectures
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenApp(gyanApp)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <span>Open Gyan Bindu</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Workspace Controls Bar (Below Fold / Hero) */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          {/* Directory vs Live View Switcher */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => onChangeTab('apps')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'apps'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Apps Directory
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('live')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Live Classes Schedule ({LIVE_CLASSES_SCHEDULE.length})
            </button>
          </div>

          {/* Theme Switcher + Community Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
              {(
                [
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = themePref === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeTheme(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onOpenCommunity}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
            >
              Telegram &amp; WhatsApp Info
            </button>
          </div>
        </div>

        {activeTab === 'apps' ? (
          <div className="space-y-6">
            {/* Search + Segmented Filter */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: `All Apps (${apps.length})` },
                    { id: 'featured', label: 'Featured (01–02)' },
                    { id: 'instant', label: `Instant Access (${instantCount})` },
                    { id: 'recent', label: `Recent Open (${recentApps.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFilterMode(tab.id);
                      setVisibleCount(PAGE_BATCH);
                    }}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono-num ${
                      filterMode === tab.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                {filterMode === 'recent' && recentApps.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRecentApps}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Recent</span>
                  </button>
                )}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coaching app, exam, or domain..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {appsError && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                <span>{appsError}</span>
                <button
                  type="button"
                  onClick={onRetryApps}
                  className="inline-flex items-center gap-1.5 font-semibold underline cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Sync</span>
                </button>
              </div>
            )}

            {loadingApps && apps.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-40 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
                  />
                ))}
              </div>
            ) : displayedApps.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {filterMode === 'recent'
                    ? 'No recent portals opened yet'
                    : 'No matching coaching portals found'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {filterMode === 'recent'
                    ? 'Open any institute portal below to keep quick shortcuts here.'
                    : 'Try clearing your search filter or browsing all institutes.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('all');
                    setSearchQuery('');
                  }}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Show All Apps
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedApps.map((app) => (
                    <article
                      key={app.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-colors hover:border-indigo-400 dark:hover:border-indigo-500"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white font-mono-num"
                              style={{ backgroundColor: app.accentColor }}
                            >
                              {app.appNumber}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                                {app.name}
                              </h3>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {app.provider} · {app.apiDomain}
                              </p>
                            </div>
                          </div>

                          {filterMode === 'recent' && (
                            <button
                              type="button"
                              onClick={() => onRemoveRecentApp(app.id)}
                              aria-label={`Remove ${app.name} from recent`}
                              className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                          {app.category}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                          <span>{app.batchCount} Batches</span>
                          <span aria-hidden="true">·</span>
                          <span>{app.lectureCount} Lectures</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-sans">
                            {filterMode === 'recent'
                              ? formatRelativeTime(app.recentOpenedAt)
                              : 'Instant Access'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {app.examFocus}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenApp(app)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Open Portal</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {visibleCount < filteredApps.length && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_BATCH)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Load More Apps ({filteredApps.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Live Classes Schedule View */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Today&apos;s Live &amp; Upcoming Classrooms
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Join ongoing classes across Disha Online Classes, Gyan Bindu, KGS, SK Jha, and Target Board.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {LIVE_CLASSES_SCHEDULE.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className={`font-semibold ${
                          item.status === 'live'
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.status === 'upcoming'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.status === 'live'
                          ? 'Live Now'
                          : item.status === 'upcoming'
                            ? 'Upcoming'
                            : 'Recorded Ready'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {item.appName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.subject}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                      <span className="inline-flex items-center gap-1 font-sans">
                        <Layers className="h-3.5 w-3.5" />
                        {item.batchName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {item.timeLabel}, {item.dateLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-sans">{item.teacher}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onWatchLive(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{item.status === 'live' ? 'Join Live Class' : 'Open Classroom'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

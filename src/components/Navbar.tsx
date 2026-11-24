import { Menu, Send, X } from 'lucide-react';
import { useState } from 'react';
import { BRAND_EMBLEM_IMG, BRAND_NAME, TELEGRAM_URL } from '../data/catalog';

export type ActiveRoute =
  | { view: 'home'; tab?: 'apps' | 'live' }
  | { view: 'institute'; appId: string }
  | { view: 'admin' };

interface NavbarProps {
  route: ActiveRoute;
  onNavigate: (next: ActiveRoute) => void;
  onOpenCommunity: () => void;
}

export function Navbar({ route, onNavigate, onOpenCommunity }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHomeApps = route.view === 'home' && route.tab !== 'live';
  const isLive = route.view === 'home' && route.tab === 'live';
  const isDisha = route.view === 'institute' && route.appId === 'disha';
  const isGyan = route.view === 'institute' && route.appId === 'gyan';

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
      active
        ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
        : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 h-16">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onNavigate({ view: 'home', tab: 'apps' });
          }}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
        >
          <img
            src={BRAND_EMBLEM_IMG}
            alt={BRAND_NAME}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <span className="font-brand text-lg font-extrabold tracking-wide text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            {BRAND_NAME}
          </span>
        </button>

        {/* Zone 2: 5 Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate({ view: 'home', tab: 'apps' })}
            className={navLinkClass(isHomeApps)}
          >
            All Apps
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'institute', appId: 'disha' })}
            className={navLinkClass(isDisha)}
          >
            Disha Portal
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'institute', appId: 'gyan' })}
            className={navLinkClass(isGyan)}
          >
            Gyan Bindu
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'home', tab: 'live' })}
            className={navLinkClass(isLive)}
          >
            Live Classes
          </button>
          <button
            type="button"
            onClick={onOpenCommunity}
            className={navLinkClass(false)}
          >
            Community
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span>Join Telegram</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate({ view: 'home', tab: 'apps' });
            }}
            className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            All Apps
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate({ view: 'institute', appId: 'disha' });
            }}
            className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Disha Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate({ view: 'institute', appId: 'gyan' });
            }}
            className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Gyan Bindu
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate({ view: 'home', tab: 'live' });
            }}
            className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Live Classes
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenCommunity();
            }}
            className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Telegram &amp; WhatsApp Community
          </button>
        </div>
      )}
    </header>
  );
}

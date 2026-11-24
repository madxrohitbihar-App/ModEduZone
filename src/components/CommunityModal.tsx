import { BookOpen, CheckCircle2, MessageCircle, Send, X } from 'lucide-react';
import {
  BRAND_EMBLEM_IMG,
  BRAND_NAME,
  TELEGRAM_HANDLE,
  TELEGRAM_URL,
  WHATSAPP_URL,
} from '../data/catalog';

interface CommunityModalProps {
  open: boolean;
  onClose: () => void;
}

export function CommunityModal({ open, onClose }: CommunityModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-modal-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="relative bg-slate-900 px-6 py-7 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close community modal"
            className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <img
            src={BRAND_EMBLEM_IMG}
            alt={BRAND_NAME}
            referrerPolicy="no-referrer"
            className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover border border-white/20"
          />
          <p className="text-xs font-medium text-emerald-400">
            {BRAND_NAME} · Official Channels
          </p>
          <h2 id="community-modal-title" className="mt-1 text-xl font-bold tracking-tight">
            Join Official Study Community
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            {TELEGRAM_HANDLE} · Free Batches, Notes &amp; Daily Exam Alerts
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                सभी Live और Recorded Lectures की तुरंत अपडेट (Disha, Gyan Bindu &amp; AppX)
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
              <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                Board PDF Notes, DPPs, VVI Guess Questions और Test Series
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] px-4 py-3 text-sm font-semibold text-white transition-colors"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Join Telegram Group ({TELEGRAM_HANDLE})</span>
            </a>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] px-4 py-3 text-sm font-semibold text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>Join WhatsApp Channel</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              Continue to Batches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft, Download, ExternalLink, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import { BRAND_NAME, TELEGRAM_URL, WHATSAPP_URL } from '../data/catalog';
import type { LectureItem } from '../types/study';

interface PdfViewerModalProps {
  lecture: LectureItem | null;
  instituteName: string;
  batchName: string;
  mode: 'notes' | 'dpp';
  onClose: () => void;
}

export function buildPdfDownloadUrl(
  lecture: LectureItem,
  instituteName: string,
  batchName: string,
  mode: 'notes' | 'dpp',
): string {
  const title = mode === 'dpp' && lecture.dppTitle ? lecture.dppTitle : lecture.pdfTitle;
  const params = new URLSearchParams({
    title,
    institute: instituteName,
    batch: batchName,
    teacher: lecture.teacher,
    summary: lecture.summaryPoints.join('||'),
    facts: lecture.keyFormulasOrFacts.join('||'),
  });
  return `/api/notes/pdf?${params.toString()}`;
}

export function PdfViewerModal({
  lecture,
  instituteName,
  batchName,
  mode,
  onClose,
}: PdfViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);

  if (!lecture) return null;

  const docTitle = mode === 'dpp' && lecture.dppTitle ? lecture.dppTitle : lecture.pdfTitle;
  const downloadUrl = buildPdfDownloadUrl(lecture, instituteName, batchName, mode);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label={docTitle}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {docTitle}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {instituteName} · {batchName} · Page {page} of 2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(75, z - 15))}
            title="Zoom Out"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="font-mono-num text-xs font-semibold text-slate-700 dark:text-slate-300 w-11 text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(145, z + 15))}
            title="Zoom In"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <a
            href={downloadUrl}
            download={`${docTitle.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Document Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div
          className="mx-auto space-y-6 transition-transform origin-top"
          style={{ maxWidth: `${Math.round((780 * zoom) / 100)}px` }}
        >
          {/* Page 1 */}
          <article
            onMouseEnter={() => setPage(1)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <p className="font-brand text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {BRAND_NAME}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {instituteName} · {batchName}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                Page 01 · {lecture.dateLabel}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {docTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Faculty: {lecture.teacher} · Duration: {lecture.duration}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Core Classroom Summary
                </h4>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-5">
                  {lecture.summaryPoints.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5 pt-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Key Formulas, Articles &amp; Exam Takeaways
                </h4>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {lecture.keyFormulasOrFacts.map((fact, idx) => (
                    <p key={idx} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {fact}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Prepared &amp; shared by {BRAND_NAME}</span>
              <div className="flex items-center gap-4">
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Telegram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <span>WhatsApp Channel</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </article>

          {/* Page 2: Practice Sheet / DPP */}
          <article
            onMouseEnter={() => setPage(2)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="font-brand text-sm font-bold text-slate-800 dark:text-slate-200">
                {BRAND_NAME} · Practice &amp; Revision Checklist
              </span>
              <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                Page 02
              </span>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">
                Self-Assessment Questions (Based on {lecture.title})
              </p>
              <ol className="space-y-3 list-decimal pl-5 leading-relaxed">
                <li>
                  Write down the primary definitions, laws, or constitutional articles introduced in{' '}
                  <span className="font-medium text-slate-900 dark:text-white">{lecture.title}</span>.
                </li>
                <li>
                  Solve at least 10 previous-year objective questions from this topic within 8 minutes without checking solutions.
                </li>
                <li>
                  Highlight exceptions and special exam cases mentioned by {lecture.teacher} in your short revision notebook.
                </li>
              </ol>

              <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-xs text-slate-600 dark:text-slate-300">
                Need full batch PDF packs or daily exam updates? Join{' '}
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Telegram (@Study_group_App)
                </a>{' '}
                or our{' '}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  WhatsApp Channel
                </a>
                .
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

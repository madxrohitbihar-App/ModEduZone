import Hls from 'hls.js';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LectureItem } from '../types/study';

interface VideoPlayerModalProps {
  lecture: LectureItem | null;
  lectures: LectureItem[];
  instituteName: string;
  batchName: string;
  onSelectLecture: (lec: LectureItem) => void;
  onOpenPdf: (lec: LectureItem, mode: 'notes' | 'dpp') => void;
  onDownloadVideo: (lec: LectureItem, quality: string) => void;
  onClose: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const QUALITIES = ['360p', '480p', '720p', '1080p'];

function extractYoutubeId(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

export function VideoPlayerModal({
  lecture,
  lectures,
  instituteName,
  batchName,
  onSelectLecture,
  onOpenPdf,
  onDownloadVideo,
  onClose,
}: VideoPlayerModalProps) {
  const playerBoxRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('720p');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showSettings, setShowSettings] = useState(false);
  const [customStreamInput, setCustomStreamInput] = useState('');
  const [customStreamUrl, setCustomStreamUrl] = useState('');

  useEffect(() => {
    setCustomStreamInput('');
    setCustomStreamUrl('');
    setShowSettings(false);
  }, [lecture?.id]);

  const effectiveSource = customStreamUrl || lecture?.streamUrl || '';
  const youtubeId =
    extractYoutubeId(effectiveSource) || (!customStreamUrl ? lecture?.videoId || null : null);
  const isDirectVideo = Boolean(effectiveSource && !youtubeId);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isDirectVideo || !effectiveSource) return;

    let hls: Hls | null = null;
    if (effectiveSource.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(effectiveSource);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else {
      video.src = effectiveSource;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [effectiveSource, isDirectVideo]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  if (!lecture) return null;

  const currentIdx = lectures.findIndex((l) => l.id === lecture.id);
  const prevLecture = currentIdx > 0 ? lectures[currentIdx - 1] : null;
  const nextLecture =
    currentIdx >= 0 && currentIdx < lectures.length - 1 ? lectures[currentIdx + 1] : null;

  const handleFullscreen = () => {
    if (!playerBoxRef.current) return;
    if (!document.fullscreenElement) {
      playerBoxRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={lecture.title}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-white">{lecture.title}</h2>
            <p className="truncate text-xs text-slate-400">
              {instituteName} · {batchName} · {lecture.teacher}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenPdf(lecture, 'notes')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <span>Notes PDF</span>
          </button>
          <button
            type="button"
            onClick={() => onDownloadVideo(lecture, quality)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Save MP4</span>
          </button>
        </div>
      </div>

      {/* Main Theater Split */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
        {/* Left/Top: Video Player Viewport + Clean Non-Overlapping Controls */}
        <div className="lg:col-span-8 space-y-3">
          <div
            ref={playerBoxRef}
            className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black"
          >
            {isDirectVideo ? (
              <video
                ref={videoRef}
                controls
                playsInline
                autoPlay
                className={`h-full w-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
              />
            ) : youtubeId ? (
              <iframe
                key={youtubeId}
                src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=1&playsinline=1&rel=0`}
                title={lecture.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center space-y-2 bg-slate-900">
                <p className="text-sm font-semibold text-white">No stream loaded</p>
                <p className="text-xs text-slate-400">
                  Paste a direct .m3u8, .mp4, or YouTube URL below to play.
                </p>
              </div>
            )}
          </div>

          {/* Dedicated Player Toolbar Below Video (Never overlaps screen!) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3.5 relative">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!prevLecture}
                onClick={() => prevLecture && onSelectLecture(prevLecture)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={!nextLecture}
                onClick={() => nextLecture && onSelectLecture(nextLecture)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isDirectVideo && (
                <button
                  type="button"
                  onClick={() => setFitMode((f) => (f === 'contain' ? 'cover' : 'contain'))}
                  className="rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  {fitMode === 'contain' ? 'Fit: 16:9' : 'Fit: Fill'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>
                  {speed}x · {quality}
                </span>
              </button>

              {youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>YouTube</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleFullscreen}
                aria-label="Fullscreen"
                className="rounded-lg border border-slate-700 p-2 text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {showSettings && (
              <div className="w-full pt-3 mt-1 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1.5">Playback Speed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SPEEDS.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSpeed(sp)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          speed === sp
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1.5">Preferred Quality</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUALITIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuality(q)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          quality === q
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Stream Loader */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customStreamInput.trim()) {
                  setCustomStreamUrl(customStreamInput.trim());
                }
              }}
              className="w-full flex items-center gap-2 pt-2 border-t border-slate-800"
            >
              <input
                type="url"
                value={customStreamInput}
                onChange={(e) => setCustomStreamInput(e.target.value)}
                placeholder="Optional: Paste custom .m3u8, .mp4, or YouTube link..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
              >
                Load Stream
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Chapter Playlist & Lecture Key Points */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">Key Highlights &amp; Notes</h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-4">
              {lecture.summaryPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
            {lecture.hasDpp && (
              <button
                type="button"
                onClick={() => onOpenPdf(lecture, 'dpp')}
                className="mt-2 w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-300 cursor-pointer"
              >
                Open {lecture.dppTitle || 'Chapter DPP PDF'}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2.5">
            <h3 className="text-sm font-bold text-white">
              Chapter Lectures ({lectures.length})
            </h3>
            <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
              {lectures.map((item) => {
                const active = item.id === lecture.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectLecture(item)}
                    className={`w-full py-2.5 px-2 text-left transition-colors rounded-lg cursor-pointer ${
                      active ? 'bg-indigo-600/20 text-white' : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <p className="text-xs font-semibold line-clamp-2">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
                      {item.duration} · {item.dateLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

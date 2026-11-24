import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { BRAND_NAME } from '../data/catalog';

interface KeyGateModalProps {
  open: boolean;
  title: string;
  description: string;
  onUnlocked: (epoch: number, expiresAt: number) => void;
}

export function KeyGateModal({ open, title, description, onUnlocked }: KeyGateModalProps) {
  const [generatedKey, setGeneratedKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/key/generate', { method: 'POST' });
      const data = (await res.json()) as { success?: boolean; key?: string };
      if (data.success && data.key) {
        setGeneratedKey(data.key);
        setInputKey(data.key);
      }
    } catch {
      setError('Failed to generate access key.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/key/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: inputKey }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        epoch?: number;
        expiresAt?: number;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid key.');
      }
      onUnlocked(Number(data.epoch || 1), Number(data.expiresAt || Date.now() + 86400000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{BRAND_NAME}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{description}</p>

        {!generatedKey ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerate}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-3 text-xs font-semibold text-white cursor-pointer"
          >
            {loading ? 'Generating Key...' : 'Generate Free Access Key'}
          </button>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-200 font-mono">
              Key Ready: {generatedKey}
            </div>
            <input
              type="text"
              required
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-semibold text-white cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verify &amp; Unlock Portal</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

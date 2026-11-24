import { ArrowLeft, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BRAND_NAME } from '../data/catalog';
import type { KeyConfigState } from '../types/study';

interface AdminPanelProps {
  onBackHome: () => void;
}

export function AdminPanel({ onBackHome }: AdminPanelProps) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [config, setConfig] = useState<KeyConfigState>({
    enabled: false,
    shortenerTemplate: '',
    validityHours: 24,
    popupTitle: 'Generate Free Access Key',
    popupDescription: `Complete a quick 1-step verification to unlock ${BRAND_NAME} batches & PDFs for 24 hours.`,
    keyEpoch: 1,
    updatedAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const checkStatus = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = (await res.json()) as { success?: boolean; needsSetup?: boolean };
      if (data.success) setNeedsSetup(Boolean(data.needsSetup));
    } catch {
      // Ignore network hiccup
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const loadConfig = async (token: string) => {
    const res = await fetch('/api/admin/key-config', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      success?: boolean;
      config?: KeyConfigState;
      error?: string;
    };
    if (!res.ok || !data.success || !data.config) {
      throw new Error(data.error || 'Failed to load admin configuration.');
    }
    setConfig(data.config);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (needsSetup) {
      if (passcode.length < 6) {
        setAuthError('Passcode must be at least 6 characters.');
        return;
      }
      if (passcode !== confirmPasscode) {
        setAuthError('Passcodes do not match.');
        return;
      }
    }
    setAuthLoading(true);
    try {
      const res = await fetch(needsSetup ? '/api/admin/setup' : '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { success?: boolean; token?: string; error?: string };
      if (!res.ok || !data.success || !data.token) {
        throw new Error(data.error || 'Authentication failed.');
      }
      setAdminToken(data.token);
      setNeedsSetup(false);
      setPasscode('');
      setConfirmPasscode('');
      await loadConfig(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const res = await fetch('/api/admin/key-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as {
        success?: boolean;
        config?: KeyConfigState;
        error?: string;
      };
      if (!res.ok || !data.success || !data.config) {
        throw new Error(data.error || 'Failed to save configuration.');
      }
      setConfig(data.config);
      setSaveNotice({ type: 'ok', text: 'Configuration saved successfully.' });
    } catch (err) {
      setSaveNotice({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeKeys = async () => {
    if (!adminToken) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const res = await fetch('/api/admin/revoke-keys', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = (await res.json()) as { success?: boolean; config?: KeyConfigState };
      if (res.ok && data.success && data.config) {
        setConfig(data.config);
        setSaveNotice({
          type: 'ok',
          text: `All previous access keys revoked (Epoch ${data.config.keyEpoch}).`,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <button
        type="button"
        onClick={onBackHome}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to {BRAND_NAME}</span>
      </button>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {BRAND_NAME} Admin Key &amp; Access Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure optional shortener key verification and validity duration.
            </p>
          </div>
        </div>

        {checkingAuth ? (
          <p className="text-sm text-slate-500">Checking admin setup status...</p>
        ) : !adminToken ? (
          <form onSubmit={handleAuthSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {needsSetup ? 'Create Admin Passcode (min 6 chars)' : 'Enter Admin Passcode'}
              </label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {needsSetup && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Passcode
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter passcode..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
            {authError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              {authLoading ? 'Please wait...' : needsSetup ? 'Complete Setup' : 'Unlock Admin'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Enable Access Key Gate
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  When off, students can browse all batches directly without generating a key.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
                className="h-5 w-5 accent-indigo-600"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Key Validity (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={config.validityHours}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, validityHours: Number(e.target.value) || 24 }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono-num"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Popup Title
                </label>
                <input
                  type="text"
                  value={config.popupTitle}
                  onChange={(e) => setConfig((c) => ({ ...c, popupTitle: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Shortener API / Link Template (Optional)
              </label>
              <input
                type="text"
                value={config.shortenerTemplate}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, shortenerTemplate: e.target.value }))
                }
                placeholder="https://example.com/api?api=KEY&url={url}"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Popup Description
              </label>
              <textarea
                rows={2}
                value={config.popupDescription}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, popupDescription: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            {saveNotice && (
              <p
                className={`text-xs font-medium ${
                  saveNotice.type === 'ok'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {saveNotice.text}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Key Configuration'}</span>
              </button>

              <button
                type="button"
                onClick={handleRevokeKeys}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Revoke All Keys (Epoch {config.keyEpoch})</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

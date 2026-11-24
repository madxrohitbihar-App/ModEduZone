import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BRAND_NAME,
  DISHA_BATCHES,
  INSTITUTE_APPS,
  LIVE_CLASSES_SCHEDULE,
  TELEGRAM_URL,
  WHATSAPP_URL,
  getBatchesForApp,
  getChaptersForSubject,
  getLecturesForChapter,
  getSubjectsForBatch,
} from './src/data/catalog.ts';
import type { BatchItem, InstituteApp } from './src/types/study.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, '.data');
const CONFIG_FILE = path.join(DATA_DIR, 'madx_config.json');

interface AdminStore {
  passcodeHash: string;
  passcodeSalt: string;
  sessionSecret: string;
  keyConfig: {
    enabled: boolean;
    shortenerTemplate: string;
    validityHours: number;
    popupTitle: string;
    popupDescription: string;
    keyEpoch: number;
    updatedAt: string;
  };
}

const batchCache = new Map<string, { batches: BatchItem[]; cachedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15;

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyExamCategory(name: string, rawCat: string): {
  examCategory: BatchItem['examCategory'];
  categoryLabel: string;
} {
  const combined = `${name} ${rawCat}`.toLowerCase();
  if (/test|quiz|mock|practice|daily test|full length/.test(combined)) {
    return { examCategory: 'test', categoryLabel: 'Test Series' };
  }
  if (/daroga|\bsi\b|police|constable|asi/.test(combined)) {
    return { examCategory: 'daroga', categoryLabel: 'Daroga & Police' };
  }
  if (/bpsc|bssc|ssc|railway|ntpc|alp|cgl|tre/.test(combined)) {
    return { examCategory: 'bpsc', categoryLabel: 'BPSC / SSC / Railway' };
  }
  if (/crash|क्रैश|revision|booster|rapid/.test(combined)) {
    return { examCategory: 'crash', categoryLabel: 'Crash Course' };
  }
  return { examCategory: 'foundation', categoryLabel: 'Foundation & Target' };
}

async function fetchLiveAppXBatches(app: InstituteApp): Promise<BatchItem[] | null> {
  const cached = batchCache.get(app.id);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.batches;
  }

  // 1. Disha Online Classes live web course list
  if (app.id === 'disha') {
    try {
      const resp = await fetch('https://dishaonlineclasses.classx.co.in/new-courses', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
      });
      if (resp.ok) {
        const html = await resp.text();
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (match) {
          const rawJson = match[1];
          const names = [...new Set([...rawJson.matchAll(/"course_name":"([^"]+)"/g)].map((m) => m[1]))];
          if (names.length > 0) {
            const mapped: BatchItem[] = names.map((name, idx) => {
              const existing = DISHA_BATCHES.find(
                (b) => b.name.toLowerCase().includes(name.toLowerCase().slice(0, 12)),
              );
              const { examCategory, categoryLabel } = classifyExamCategory(name, '');
              return {
                id: existing?.id || `disha-live-${idx + 1}`,
                appId: 'disha',
                name,
                examCategory: existing?.examCategory || examCategory,
                categoryLabel: existing?.categoryLabel || categoryLabel,
                instructor: existing?.instructor || 'Sanjay Sir & Disha Team',
                language: /english/i.test(name) ? 'English Medium' : 'Hindi Medium',
                validity: 'Till Board Exam 2027',
                startDate: existing?.startDate || '2026–27 Session',
                priceLabel: 'Community Unlocked',
                isFreeCommunity: true,
                subjectCount: existing?.subjectCount || 5,
                lectureCount: existing?.lectureCount || 110,
                pdfCount: existing?.pdfCount || 95,
                description:
                  existing?.description ||
                  `Official Disha Online Classes batch (${name}) with recorded classes, panel PDFs & DPPs.`,
              };
            });
            batchCache.set(app.id, { batches: mapped, cachedAt: Date.now() });
            return mapped;
          }
        }
      }
    } catch {
      // Fallback to DISHA_BATCHES
    }
    return null;
  }

  // 2. AppX/ClassX public courselist API (e.g. Gyan Bindu 106 batches, MD Classes 52 batches, Rankers)
  try {
    const resp = await fetch(`https://${app.apiDomain}/get/courselist?start=-1`, {
      headers: {
        'Auth-Key': 'appxapi',
        'Client-Service': 'Appx',
        'User-ID': '-2',
        source: 'website',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return null;
    const json = (await resp.json().catch(() => null)) as {
      data?: Array<{
        id?: string | number;
        course_name?: string;
        exam_category?: string;
        course_description?: string;
        start_date?: string;
      }>;
    } | null;

    const list = Array.isArray(json?.data) ? json.data : [];
    if (list.length === 0) return null;

    const mapped: BatchItem[] = list.map((item, idx) => {
      const name = String(item.course_name || `Batch ${idx + 1}`).trim();
      const rawCat = String(item.exam_category || '');
      const { examCategory, categoryLabel } = classifyExamCategory(name, rawCat);
      const cleanDesc = stripHtml(item.course_description || '');
      return {
        id: `${app.id}-${String(item.id || idx + 1)}`,
        appId: app.id,
        name,
        examCategory,
        categoryLabel,
        instructor:
          app.id === 'gyan'
            ? 'Raushan Anand Sir & Bittu Jha Sir'
            : `${app.name} Faculty`,
        language: 'Hindi / Bilingual',
        validity: '12 Months / Exam Till',
        startDate: item.start_date ? String(item.start_date).slice(0, 10) : 'Active Batch',
        priceLabel: 'Community Unlocked',
        isFreeCommunity: true,
        subjectCount: examCategory === 'test' ? 3 : 5,
        lectureCount: examCategory === 'test' ? 45 : 140,
        pdfCount: examCategory === 'test' ? 45 : 125,
        description:
          cleanDesc.slice(0, 180) ||
          `${app.name} official batch (${name}) with structured subjects, video classes & PDF notes.`,
      };
    });

    batchCache.set(app.id, { batches: mapped, cachedAt: Date.now() });
    return mapped;
  } catch {
    return null;
  }
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function defaultStore(): AdminStore {
  return {
    passcodeHash: '',
    passcodeSalt: '',
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    keyConfig: {
      enabled: false,
      shortenerTemplate: '',
      validityHours: 24,
      popupTitle: 'Generate Free Access Key',
      popupDescription: `Complete a quick 1-step verification to unlock ${BRAND_NAME} batches & PDFs for 24 hours.`,
      keyEpoch: 1,
      updatedAt: new Date().toISOString(),
    },
  };
}

function readStore(): AdminStore {
  ensureDataDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as Partial<AdminStore>;
      const base = defaultStore();
      return {
        ...base,
        ...parsed,
        keyConfig: {
          ...base.keyConfig,
          ...(parsed.keyConfig || {}),
        },
      };
    }
  } catch {
    // Fallback
  }
  const initial = defaultStore();
  writeStore(initial);
  return initial;
}

function writeStore(store: AdminStore): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.scryptSync(passcode, salt, 64).toString('hex');
}

function createAdminToken(secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const store = readStore();
  if (!token || !verifyAdminToken(token, store.sessionSecret)) {
    res.status(401).json({ success: false, error: 'Admin session expired or unauthorized.' });
    return;
  }
  next();
}

function sanitizePdfAscii(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars = 76): string[] {
  const words = sanitizePdfAscii(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current ? `${current} ${w}` : w).length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? `${current} ${w}` : w;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [' '];
}

function buildSimplePdfBuffer(options: {
  title: string;
  institute: string;
  batch: string;
  teacher: string;
  summary: string[];
  facts: string[];
}): Buffer {
  const lines: { text: string; size: number; bold?: boolean }[] = [
    { text: `${BRAND_NAME.toUpperCase()} — STUDY NOTES & REVISION SHEET`, size: 15, bold: true },
    { text: `Institute: ${options.institute}`, size: 10 },
    { text: `Batch: ${options.batch}`, size: 10 },
    { text: `Faculty: ${options.teacher}`, size: 10 },
    { text: '--------------------------------------------------------------------------', size: 10 },
  ];

  for (const line of wrapText(options.title, 62)) {
    lines.push({ text: line, size: 13, bold: true });
  }
  lines.push({ text: ' ', size: 8 });
  lines.push({ text: 'KEY CLASSROOM SUMMARY:', size: 11, bold: true });
  options.summary.forEach((pt, idx) => {
    const wrapped = wrapText(`${idx + 1}. ${pt}`, 78);
    wrapped.forEach((w) => lines.push({ text: w, size: 10 }));
  });

  lines.push({ text: ' ', size: 8 });
  lines.push({ text: 'IMPORTANT FACTS / FORMULAS / EXAM TIPS:', size: 11, bold: true });
  options.facts.forEach((pt) => {
    const wrapped = wrapText(`- ${pt}`, 78);
    wrapped.forEach((w) => lines.push({ text: w, size: 10 }));
  });

  lines.push({ text: ' ', size: 12 });
  lines.push({ text: '--------------------------------------------------------------------------', size: 10 });
  lines.push({ text: `Official Telegram: ${TELEGRAM_URL}`, size: 9, bold: true });
  lines.push({ text: `Official WhatsApp: ${WHATSAPP_URL}`, size: 9, bold: true });
  lines.push({ text: `Generated by ${BRAND_NAME} Study Portal`, size: 9 });

  let stream = 'BT\n';
  let y = 780;
  for (const item of lines) {
    if (y < 60) break;
    const font = item.bold ? '/F2' : '/F1';
    stream += `${font} ${item.size} Tf\n1 0 0 1 48 ${y} Tm\n(${sanitizePdfAscii(item.text)}) Tj\n`;
    y -= item.size + 7;
  }
  stream += 'ET\n';

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

async function tryUpstreamAppxLogin(
  apiDomain: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  if (!apiDomain || !email || !password) {
    return { ok: false, error: 'Missing credentials.' };
  }
  const url = `https://${apiDomain}/post/userLogin`;
  const body = new URLSearchParams({ email, password }).toString();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Auth-Key': 'appxapi',
        'Client-Service': 'Appx',
        'User-ID': '-2',
        source: 'website',
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = (await resp.json().catch(() => null)) as {
      status?: number;
      message?: string;
      data?: Record<string, unknown>;
    } | null;
    if (resp.ok && json && (json.status === 200 || json.data?.token)) {
      return { ok: true, data: json.data || {} };
    }
    return {
      ok: false,
      error: json?.message || `Institute API responded with status ${resp.status}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to reach institute API.';
    return { ok: false, error: msg };
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/apps', (_req, res) => {
    const enriched = INSTITUTE_APPS.map((inst) => {
      const cached = batchCache.get(inst.id);
      return cached ? { ...inst, batchCount: cached.batches.length } : inst;
    });
    res.json({
      success: true,
      brand: BRAND_NAME,
      telegramUrl: TELEGRAM_URL,
      whatsappUrl: WHATSAPP_URL,
      count: enriched.length,
      apps: enriched,
    });
  });

  app.get('/api/live', (req, res) => {
    const appId = String(req.query.appId || '').trim();
    const list = appId
      ? LIVE_CLASSES_SCHEDULE.filter((item) => item.appId === appId)
      : LIVE_CLASSES_SCHEDULE;
    res.json({ success: true, data: list });
  });

  // Live + Curated Batches for Disha (18+), Gyan Bindu (106+), MD Classes (52+), etc.
  app.get(['/api/appx/batches', '/api/disha/batches', '/api/gyan/batches'], async (req, res) => {
    const pathLower = req.path;
    const defaultAppId = pathLower.includes('/disha/')
      ? 'disha'
      : pathLower.includes('/gyan/')
        ? 'gyan'
        : 'disha';
    const appId = String(req.query.appId || defaultAppId);
    const institute = INSTITUTE_APPS.find((a) => a.id === appId) || INSTITUTE_APPS[0];

    const liveBatches = await fetchLiveAppXBatches(institute);
    const batches = liveBatches && liveBatches.length > 0 ? liveBatches : getBatchesForApp(institute);
    res.json({
      success: true,
      app: institute,
      source: liveBatches ? 'live' : 'curated',
      count: batches.length,
      data: batches,
    });
  });

  app.get(['/api/appx/my-batches', '/api/disha/my-batches', '/api/gyan/my-batches'], async (req, res) => {
    const appId = String(req.query.appId || 'disha');
    const institute = INSTITUTE_APPS.find((a) => a.id === appId) || INSTITUTE_APPS[0];
    const liveBatches = await fetchLiveAppXBatches(institute);
    const batches = (liveBatches && liveBatches.length > 0 ? liveBatches : getBatchesForApp(institute)).slice(0, 6);
    res.json({ success: true, data: batches });
  });

  app.get('/api/appx/subjects', (req, res) => {
    const appId = String(req.query.appId || 'disha');
    const batchId = String(req.query.batchId || `${appId}-foundation`);
    res.json({ success: true, data: getSubjectsForBatch(appId, batchId) });
  });

  app.get('/api/appx/chapters', (req, res) => {
    const subjectId = String(req.query.subjectId || 'default-phy');
    res.json({ success: true, data: getChaptersForSubject(subjectId) });
  });

  app.get('/api/appx/lectures', (req, res) => {
    const chapterId = String(req.query.chapterId || 'ch1');
    const chapterTitle = String(req.query.chapterTitle || 'Core Concept');
    const teacher = String(req.query.teacher || 'Faculty');
    res.json({ success: true, data: getLecturesForChapter(chapterId, chapterTitle, teacher) });
  });

  app.post(['/api/appx/login', '/api/disha/login', '/api/gyan/login'], async (req, res) => {
    const { appId, email, password } = (req.body || {}) as {
      appId?: string;
      email?: string;
      password?: string;
    };
    const resolvedAppId =
      appId ||
      (req.path.includes('/disha/') ? 'disha' : req.path.includes('/gyan/') ? 'gyan' : 'disha');
    const institute = INSTITUTE_APPS.find((a) => a.id === resolvedAppId);
    if (!institute) {
      res.status(404).json({ success: false, error: 'Institute not found.' });
      return;
    }
    if (!email?.trim() || !password) {
      res.status(400).json({ success: false, error: 'Please enter mobile/email and password.' });
      return;
    }

    const upstream = await tryUpstreamAppxLogin(institute.apiDomain, email.trim(), password);
    if (upstream.ok && upstream.data) {
      res.json({
        success: true,
        data: {
          userId: String(upstream.data.userid || upstream.data.user_id || '1001'),
          token: String(upstream.data.token || ''),
          name: String(upstream.data.name || email.trim()),
          mobile: email.trim(),
          donatedCount: 1,
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error:
        upstream.error ||
        `Could not verify credentials on ${institute.name}. You can still browse all Community Unlocked batches directly without login.`,
    });
  });

  app.post(['/api/appx/verify-token', '/api/gyan/verify-token'], (req, res) => {
    const { userId, token, name } = (req.body || {}) as {
      userId?: string;
      token?: string;
      name?: string;
    };
    if (!userId?.trim() || !token?.trim() || token.trim().length < 16) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid numeric User ID and JWT Token (minimum 16 characters).',
      });
      return;
    }
    res.json({
      success: true,
      data: {
        userId: userId.trim(),
        token: token.trim(),
        name: name?.trim() || `Student #${userId.trim()}`,
        donatedCount: 0,
      },
    });
  });

  app.get('/api/notes/pdf', (req, res) => {
    const title = String(req.query.title || 'Classroom Revision Notes');
    const institute = String(req.query.institute || BRAND_NAME);
    const batch = String(req.query.batch || 'Foundation & Target Batch');
    const teacher = String(req.query.teacher || 'Senior Faculty');
    const summaryRaw = String(req.query.summary || '');
    const factsRaw = String(req.query.facts || '');

    const summary = summaryRaw
      ? summaryRaw.split('||').filter(Boolean)
      : [
          'Complete concept coverage aligned with Bihar Board & competitive exam patterns.',
          'Includes solved examples and key exam takeaways.',
        ];
    const facts = factsRaw
      ? factsRaw.split('||').filter(Boolean)
      : [
          'Revise these notes daily for maximum accuracy in objective & subjective questions.',
        ];

    const pdfBuffer = buildSimplePdfBuffer({
      title,
      institute,
      batch,
      teacher,
      summary,
      facts,
    });

    const safeFile = title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64) || 'madxrohitbihar_notes';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFile}.pdf"`);
    res.send(pdfBuffer);
  });

  app.get('/api/key/status', (req, res) => {
    const store = readStore();
    const providedEpoch = Number(req.query.epoch || 0);
    const valid = !store.keyConfig.enabled || providedEpoch === store.keyConfig.keyEpoch;
    res.json({
      success: true,
      enabled: store.keyConfig.enabled,
      valid,
      keyEpoch: store.keyConfig.keyEpoch,
      validityHours: store.keyConfig.validityHours,
      popupTitle: store.keyConfig.popupTitle,
      popupDescription: store.keyConfig.popupDescription,
    });
  });

  app.post('/api/key/generate', (_req, res) => {
    const store = readStore();
    const key = `MADX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    res.json({
      success: true,
      key,
      epoch: store.keyConfig.keyEpoch,
      validityHours: store.keyConfig.validityHours,
      shortenerUrl: store.keyConfig.shortenerTemplate || '',
    });
  });

  app.post('/api/key/verify', (req, res) => {
    const { key } = (req.body || {}) as { key?: string };
    if (!key || !key.trim().toUpperCase().startsWith('MADX-')) {
      res.status(400).json({ success: false, error: 'Invalid access key format.' });
      return;
    }
    const store = readStore();
    res.json({
      success: true,
      epoch: store.keyConfig.keyEpoch,
      expiresAt: Date.now() + store.keyConfig.validityHours * 3600 * 1000,
    });
  });

  app.get('/api/admin/auth-status', (_req, res) => {
    const store = readStore();
    res.json({ success: true, needsSetup: !store.passcodeHash });
  });

  app.post('/api/admin/setup', (req, res) => {
    const store = readStore();
    if (store.passcodeHash) {
      res.status(400).json({ success: false, error: 'Admin passcode is already configured.' });
      return;
    }
    const { passcode } = (req.body || {}) as { passcode?: string };
    if (!passcode || passcode.length < 6) {
      res.status(400).json({ success: false, error: 'Passcode must be at least 6 characters.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    store.passcodeSalt = salt;
    store.passcodeHash = hashPasscode(passcode, salt);
    writeStore(store);
    res.json({ success: true, token: createAdminToken(store.sessionSecret) });
  });

  app.post('/api/admin/login', (req, res) => {
    const store = readStore();
    if (!store.passcodeHash) {
      res.status(400).json({ success: false, error: 'Admin setup has not been completed yet.' });
      return;
    }
    const { passcode } = (req.body || {}) as { passcode?: string };
    const candidate = hashPasscode(String(passcode || ''), store.passcodeSalt);
    if (
      candidate.length !== store.passcodeHash.length ||
      !crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(store.passcodeHash))
    ) {
      res.status(401).json({ success: false, error: 'Incorrect admin passcode.' });
      return;
    }
    res.json({ success: true, token: createAdminToken(store.sessionSecret) });
  });

  app.get('/api/admin/key-config', requireAdmin, (_req, res) => {
    const store = readStore();
    res.json({ success: true, config: store.keyConfig });
  });

  app.post('/api/admin/key-config', requireAdmin, (req, res) => {
    const store = readStore();
    const body = (req.body || {}) as Partial<AdminStore['keyConfig']>;
    store.keyConfig = {
      ...store.keyConfig,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : store.keyConfig.enabled,
      shortenerTemplate:
        typeof body.shortenerTemplate === 'string'
          ? body.shortenerTemplate.trim()
          : store.keyConfig.shortenerTemplate,
      validityHours:
        typeof body.validityHours === 'number' && body.validityHours >= 1
          ? Math.min(168, Math.round(body.validityHours))
          : store.keyConfig.validityHours,
      popupTitle:
        typeof body.popupTitle === 'string' && body.popupTitle.trim()
          ? body.popupTitle.trim()
          : store.keyConfig.popupTitle,
      popupDescription:
        typeof body.popupDescription === 'string'
          ? body.popupDescription.trim()
          : store.keyConfig.popupDescription,
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    res.json({ success: true, config: store.keyConfig });
  });

  app.post('/api/admin/revoke-keys', requireAdmin, (_req, res) => {
    const store = readStore();
    store.keyConfig.keyEpoch += 1;
    store.keyConfig.updatedAt = new Date().toISOString();
    writeStore(store);
    res.json({ success: true, config: store.keyConfig });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`${BRAND_NAME} server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

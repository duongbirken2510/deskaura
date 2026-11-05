#!/usr/bin/env node
/**
 * DeskAura v1.2.4 — Programmatic 45s Demo Video & Bilingual Screenshot Generator
 * -------------------------------------------------------------------------------
 * Uses local Google Chrome via Chrome DevTools Protocol (native Node 24 WebSocket)
 * + FFmpeg image2pipe to deterministically render:
 *   1. Fresh v1.2.4 Screenshots in both Vietnamese (VI) and English (EN):
 *      - docs/screenshots/01-dashboard-vi.png
 *      - docs/screenshots/01-dashboard-en.png
 *      - docs/screenshots/02-sound-studio.png (VI - Zing MP3)
 *      - docs/screenshots/02-sound-studio-en.png (EN - Global Lofi & SoundCloud)
 *      - docs/screenshots/04-settings-vi.png
 *      - docs/screenshots/04-settings-en.png
 *      - docs/screenshots/05-analytics-mebius.png (VI)
 *      - docs/screenshots/05-analytics-en.png (EN)
 *   2. 45-Second Programmatic Video (`deskaura_video_script.md`):
 *      - docs/media/deskaura_demo_45s.mp4 (1920x1080 @ 60fps H.264 + AAC Audio)
 *      - docs/media/deskaura_demo_preview.gif (Inline animated preview for GitHub README)
 */

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEV_URL = process.env.DESKAURA_URL || 'http://127.0.0.1:5173';
const CDP_PORT = 9294;
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');
const MEDIA_DIR = path.resolve(process.cwd(), 'docs/media');
const FINAL_MP4 = path.join(MEDIA_DIR, 'deskaura_demo_45s.mp4');
const FINAL_GIF = path.join(MEDIA_DIR, 'deskaura_demo_preview.gif');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function checkHttpReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureViteServer() {
  if (await checkHttpReady(DEV_URL)) {
    console.log(`✅ Using running Vite server at ${DEV_URL}`);
    return null;
  }
  console.log('🚀 Starting Vite dev server on 127.0.0.1:5173...');
  const proc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    if (await checkHttpReady(DEV_URL)) {
      console.log(`✅ Vite dev server ready at ${DEV_URL}`);
      return proc;
    }
    await sleep(250);
  }
  throw new Error('Failed to start Vite dev server');
}

async function launchChrome() {
  const userDataDir = `/tmp/deskaura-chrome-studio-${Date.now()}`;
  const proc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu-vsync',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const pages = await res.json();
        const pageTarget = pages.find((p) => p.type === 'page');
        if (pageTarget?.webSocketDebuggerUrl) {
          return { proc, wsUrl: pageTarget.webSocketDebuggerUrl, userDataDir };
        }
      }
    } catch {
      // wait
    }
    await sleep(200);
  }
  throw new Error('Failed to connect to Chrome DevTools Protocol');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async setViewport(width, height, deviceScaleFactor = 2) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: false,
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }
  async screenshotPng(filePath) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
    });
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  }
  async screenshotJpegBuffer(quality = 90) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality,
    });
    return Buffer.from(data, 'base64');
  }
  close() {
    this.ws?.close();
  }
}

/**
 * Cubic-Bezier interpolation between two points with smoothstep easing
 */
function cubicBezierPoint(from, to, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const u = t * t * (3 - 2 * t);
  const inv = 1 - u;
  const arcX = (to.x - from.x) * 0.12;
  const arcY = -Math.min(55, Math.abs(to.x - from.x) * 0.14);
  const cp1 = {
    x: from.x + (to.x - from.x) * 0.33 + arcX,
    y: from.y + (to.y - from.y) * 0.25 + arcY,
  };
  const cp2 = {
    x: from.x + (to.x - from.x) * 0.66 - arcX,
    y: from.y + (to.y - from.y) * 0.75 + arcY * 0.5,
  };
  const x =
    inv * inv * inv * from.x +
    3 * inv * inv * u * cp1.x +
    3 * inv * u * u * cp2.x +
    u * u * u * to.x;
  const y =
    inv * inv * inv * from.y +
    3 * inv * inv * u * cp1.y +
    3 * inv * u * u * cp2.y +
    u * u * u * to.y;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/**
 * Step 1: Capture high-DPI v1.2.4 Screenshots in both Vietnamese (vi) & English (en)
 */
async function captureBilingualScreenshots(cdp) {
  console.log('📸 Capturing fresh v1.2.4 bilingual (VI & EN) screenshots...');
  await cdp.setViewport(1140, 700, 2);
  await cdp.send('Page.navigate', { url: DEV_URL });
  await sleep(1200);

  const seedStateExpr = (lang, waterMl = 1800, standups = 3) => `
    (() => {
      const now = Date.now();
      const d = new Date();
      const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const history = [];
      for (let i = 6; i >= 1; i--) {
        const hd = new Date(now - i * 86400000);
        const ds = hd.getFullYear() + '-' + String(hd.getMonth() + 1).padStart(2, '0') + '-' + String(hd.getDate()).padStart(2, '0');
        history.push({
          date: ds,
          waterIntakeMl: 1600 + (i % 3) * 200,
          waterLogs: [],
          standupCompletedCount: 4 + (i % 4),
          eyeBreakCompletedCount: 8 + i,
          focusMinutes: 180 + i * 20
        });
      }
      localStorage.clear();
      localStorage.setItem('deskaura_lang_v1', '${lang}');
      localStorage.setItem('deskaura_v12_combo_migrated', '1');
      localStorage.setItem('deskaura_v12_idle180_migrated', '1');
      localStorage.setItem('mamxanh_hydration_v1', JSON.stringify({
        dailyGoalMl: 1800,
        weightKg: 60,
        intervalMinutes: 60,
        quickAmounts: [100, 200, 300]
      }));
      localStorage.setItem('mamxanh_daily_stats_v1', JSON.stringify({
        date: today,
        waterIntakeMl: ${waterMl},
        waterLogs: [
          { id: '1', timestamp: '08:30', amountMl: 300 },
          { id: '2', timestamp: '10:15', amountMl: 300 },
          { id: '3', timestamp: '12:00', amountMl: 400 },
          { id: '4', timestamp: '14:30', amountMl: 400 },
          { id: '5', timestamp: '16:15', amountMl: 400 }
        ],
        standupCompletedCount: ${standups},
        eyeBreakCompletedCount: 8,
        focusMinutes: 215
      }));
      localStorage.setItem('deskaura_weekly_history_v1', JSON.stringify(history));
      localStorage.setItem('mamxanh_standup_v1', JSON.stringify({
        standupIntervalMinutes: 60,
        standupDurationSeconds: 180,
        eyeBreakEnabled: true,
        eyeBreakIntervalMinutes: 20,
        eyeBreakDurationSeconds: 20,
        autoResetIdleSeconds: 180,
        pauseOnFullscreen: true,
        reminderMode: 'overlay',
        holdToSkip: true,
        nextStandupAt: now + 45 * 60 * 1000,
        nextEyeAt: now + 15 * 60 * 1000,
        nextWaterAt: now + 45 * 60 * 1000,
        timerSyncUpdatedAt: now,
        lastActiveAt: now
      }));
      location.reload();
    })()
  `;

  // 1. Vietnamese Screenshots
  await cdp.eval(seedStateExpr('vi', 1800, 3));
  await sleep(1000);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '01-dashboard-vi.png'));

  // Switch to Analytics tab (VI)
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns[1]) btns[1].click();
    })()
  `);
  await sleep(500);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '05-analytics-mebius.png'));

  // Switch to Sound Studio tab (VI - Zing MP3)
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns[2]) btns[2].click();
    })()
  `);
  await sleep(500);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '02-sound-studio.png'));

  // Switch to Settings tab (VI)
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns[3]) btns[3].click();
    })()
  `);
  await sleep(500);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '04-settings-vi.png'));

  // 2. English Screenshots
  await cdp.eval(seedStateExpr('en', 1800, 3));
  await sleep(1000);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '01-dashboard-en.png'));

  // Switch to Analytics tab (EN)
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns[1]) btns[1].click();
    })()
  `);
  await sleep(500);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '05-analytics-en.png'));

  // Switch to Sound Studio tab (EN - Global Lofi & SoundCloud)
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns[2]) btns[2].click();
    })()
  `);
  await sleep(500);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '02-sound-studio-en.png'));

  // Switch to Settings tab (EN)
  await cdp.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      if (btns[3]) btns[3].click();
    })()
  `);
  await sleep(500);
  await cdp.screenshotPng(path.join(SCREENSHOT_DIR, '04-settings-en.png'));
  console.log('✅ All 8 bilingual v1.2.4 screenshots saved to docs/screenshots/');
}

/**
 * Step 2: Render the 45-Second Programmatic Video (1920x1080)
 */
async function render45sDemoVideo(cdp) {
  console.log('🎬 Setting up 1920x1080 Studio Stage for 45-second video...');
  await cdp.setViewport(1920, 1080, 1);

  // Seed Stage 1 Sprout state (200 / 1800 ml -> 11% -> Stage 1 Sprout)
  await cdp.eval(`
    (() => {
      const now = Date.now();
      const d = new Date();
      const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      localStorage.clear();
      localStorage.setItem('deskaura_lang_v1', 'vi');
      localStorage.setItem('deskaura_v12_combo_migrated', '1');
      localStorage.setItem('deskaura_v12_idle180_migrated', '1');
      localStorage.setItem('mamxanh_hydration_v1', JSON.stringify({
        dailyGoalMl: 1800,
        weightKg: 60,
        intervalMinutes: 60,
        quickAmounts: [100, 200, 300]
      }));
      localStorage.setItem('mamxanh_daily_stats_v1', JSON.stringify({
        date: today,
        waterIntakeMl: 200,
        waterLogs: [{ id: 'seed-1', timestamp: '09:00', amountMl: 200 }],
        standupCompletedCount: 1,
        eyeBreakCompletedCount: 2,
        focusMinutes: 45
      }));
      localStorage.setItem('mamxanh_standup_v1', JSON.stringify({
        standupIntervalMinutes: 60,
        standupDurationSeconds: 180,
        eyeBreakEnabled: true,
        eyeBreakIntervalMinutes: 20,
        eyeBreakDurationSeconds: 20,
        autoResetIdleSeconds: 180,
        pauseOnFullscreen: true,
        reminderMode: 'overlay',
        holdToSkip: true,
        nextStandupAt: now + 45 * 60 * 1000,
        nextEyeAt: now + 15 * 60 * 1000,
        nextWaterAt: now + 45 * 60 * 1000,
        timerSyncUpdatedAt: now,
        lastActiveAt: now
      }));
      location.reload();
    })()
  `);
  await sleep(1000);

  // Inject controllable Date + 1920x1080 Studio Stage DOM around #root
  await cdp.eval(`
    (() => {
      let fakeHour = 9;
      let fakeMin = 42;
      const RealDate = window.Date;
      class StudioDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) super();
          else super(...args);
        }
        getHours() { return fakeHour; }
        getMinutes() { return fakeMin; }
      }
      StudioDate.now = () => RealDate.now();
      StudioDate.parse = RealDate.parse;
      StudioDate.UTC = RealDate.UTC;
      window.Date = StudioDate;
      window.__SET_DEMO_CLOCK__ = (h, m) => { fakeHour = h; fakeMin = m; };

      const style = document.createElement('style');
      style.textContent = \`
        * { user-select: none; box-sizing: border-box; }
        html, body {
          margin: 0; padding: 0;
          width: 1920px; height: 1080px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          background: #0f172a;
        }
        #studio-wallpaper {
          position: fixed; inset: 0; z-index: 1;
          background:
            radial-gradient(circle at 18% 22%, rgba(16, 185, 129, 0.45), transparent 48%),
            radial-gradient(circle at 82% 28%, rgba(56, 189, 248, 0.42), transparent 52%),
            radial-gradient(circle at 50% 80%, rgba(99, 102, 241, 0.35), transparent 55%),
            linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          transition: background 1s ease;
        }
        body.scene-night #studio-wallpaper {
          background:
            radial-gradient(circle at 20% 20%, rgba(49, 46, 129, 0.6), transparent 50%),
            radial-gradient(circle at 80% 75%, rgba(15, 23, 42, 0.92), transparent 60%),
            linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e1b4b 100%);
        }
        #os-menubar {
          position: fixed; top: 0; left: 0; right: 0; height: 36px; z-index: 90;
          background: rgba(15, 23, 42, 0.78);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; color: #f8fafc; font-size: 13px; font-weight: 600;
        }
        .menubar-left, .menubar-right { display: flex; align-items: center; gap: 16px; }
        #tray-droplet-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 11px; border-radius: 999px;
          background: rgba(16, 185, 129, 0.24);
          border: 1px solid rgba(52, 211, 153, 0.5);
          color: #6ee7b7; font-weight: 700; font-size: 12px;
          transition: all 0.4s ease;
        }
        #tray-droplet-pill.pulse-glow {
          transform: scale(1.28);
          box-shadow: 0 0 28px rgba(16, 185, 129, 0.95);
          background: rgba(16, 185, 129, 0.45);
          color: #ffffff;
        }
        #deskaura-window-shell {
          position: fixed; top: 50%; left: 50%;
          width: 1140px; height: 720px; z-index: 20;
          transform: translate(-50%, -52%) scale(0.92);
          opacity: 0;
          border-radius: 24px; overflow: hidden;
          box-shadow: 0 32px 80px -16px rgba(2, 6, 23, 0.68), 0 0 0 1px rgba(255, 255, 255, 0.24);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease, box-shadow 0.8s ease;
          background: #f8fafc;
        }
        #deskaura-window-shell.visible {
          opacity: 1;
          transform: translate(-50%, -52%) scale(1);
        }
        #deskaura-window-shell.zoom-cards {
          opacity: 1;
          transform: translate(-66%, -50%) scale(1.28);
        }
        #deskaura-window-shell.minimize-to-tray {
          opacity: 0;
          transform: translate(310px, -490px) scale(0.05);
        }
        #root { width: 1140px; height: 720px; overflow: hidden; }

        /* Scene 4 Dark Mode */
        body.scene-night #deskaura-window-shell {
          background: #0f172a;
          box-shadow: 0 36px 90px -12px rgba(0, 0, 0, 0.88), 0 0 0 1.5px rgba(99, 102, 241, 0.45), 0 0 65px rgba(79, 70, 229, 0.25);
        }
        body.scene-night #root > div {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%) !important;
          color: #e2e8f0 !important;
        }
        body.scene-night #root header {
          background: #0f172a !important;
          border-color: #1e293b !important;
        }
        body.scene-night #root header h1 { color: #f8fafc !important; }
        body.scene-night #root section {
          background: #1e293b !important;
          border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        body.scene-night #root .text-slate-800,
        body.scene-night #root .text-slate-700 { color: #f1f5f9 !important; }
        body.scene-night #root .text-slate-500,
        body.scene-night #root .text-slate-600 { color: #94a3b8 !important; }

        #plant-night-tooltip {
          position: fixed; z-index: 85; pointer-events: none;
          opacity: 0; transform: translate(-50%, 10px) scale(0.9);
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
          color: #fef08a; border: 2px solid #818cf8;
          padding: 12px 22px; border-radius: 16px;
          font-size: 17px; font-weight: 800;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6), 0 0 28px rgba(99, 102, 241, 0.5);
          white-space: nowrap;
        }
        #plant-night-tooltip.show {
          opacity: 1; transform: translate(-50%, 0) scale(1);
        }

        /* Scene 1: VS Code + Ugly OS Popup */
        #vscode-stage {
          position: fixed; top: 36px; left: 0; right: 0; bottom: 0; z-index: 50;
          background: #1e1e1e; color: #d4d4d4;
          display: flex; flex-direction: column;
          transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s ease;
        }
        #vscode-stage.swipe-away {
          transform: translateX(-105%) scale(0.94);
          opacity: 0; pointer-events: none;
        }
        .vscode-titlebar {
          height: 40px; background: #181818; border-bottom: 1px solid #2b2b2b;
          display: flex; align-items: center; padding: 0 18px; gap: 14px;
          font-size: 13px; color: #9cdcfe;
        }
        .vscode-dots { display: flex; gap: 8px; }
        .vscode-dots span { width: 12px; height: 12px; border-radius: 50%; }
        .vscode-body { flex: 1; display: flex; }
        .vscode-sidebar {
          width: 270px; background: #252526; border-right: 1px solid #2b2b2b;
          padding: 20px; font-size: 14px; color: #cccccc; line-height: 2.1;
        }
        .vscode-editor {
          flex: 1; padding: 36px 48px;
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 20px; line-height: 1.75; position: relative;
        }
        .code-kw { color: #c586c0; font-weight: 600; }
        .code-fn { color: #dcdcaa; }
        .code-str { color: #ce9178; }
        .code-type { color: #4ec9b0; }
        .code-cmt { color: #6a9955; }
        #typing-caret {
          display: inline-block; width: 10px; height: 24px;
          background: #569cd6; vertical-align: middle;
        }

        #ugly-os-popup {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(0.5);
          z-index: 70; width: 700px;
          background: #f3f4f6; border: 5px solid #dc2626;
          box-shadow: 0 0 0 9999px rgba(220, 38, 38, 0.32), 0 30px 90px rgba(0, 0, 0, 0.85);
          font-family: Impact, 'Arial Black', sans-serif;
          opacity: 0; pointer-events: none;
          transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.12s ease;
        }
        #ugly-os-popup.show {
          opacity: 1; transform: translate(-50%, -50%) scale(1);
        }
        .ugly-header {
          background: linear-gradient(90deg, #b91c1c, #ef4444);
          color: #ffffff; padding: 14px 22px; font-size: 19px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .ugly-body { padding: 38px 34px; text-align: center; color: #111827; }
        .ugly-body h2 { margin: 0 0 14px; font-size: 42px; color: #dc2626; }
        .ugly-body p {
          font-family: system-ui, sans-serif; font-size: 18px;
          font-weight: 700; color: #374151; margin: 0 0 26px;
        }
        .ugly-btns { display: flex; justify-content: center; gap: 18px; }
        .ugly-btns button {
          padding: 12px 28px; font-size: 16px; font-weight: 800;
          border: 2px solid #1f2937; background: #e5e7eb;
        }

        /* Scene 5 Outro */
        #outro-stage {
          position: fixed; inset: 0; z-index: 60;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          opacity: 0; pointer-events: none; transform: translateY(24px);
          transition: opacity 0.75s ease, transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }
        #outro-stage.show { opacity: 1; transform: translateY(0); }
        .outro-logo-card {
          width: 120px; height: 120px; border-radius: 32px;
          background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 25px 60px rgba(16, 185, 129, 0.45);
          margin-bottom: 26px;
        }
        .outro-title {
          font-size: 66px; font-weight: 900; letter-spacing: -1.5px;
          color: #ffffff; margin: 0 0 12px;
        }
        .outro-tagline {
          font-size: 24px; font-weight: 600; color: #94a3b8; margin: 0 0 38px;
        }
        .outro-cta-row { display: flex; gap: 24px; }
        .cta-btn {
          display: inline-flex; align-items: center; gap: 14px;
          padding: 18px 38px; border-radius: 18px;
          font-size: 21px; font-weight: 800;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
          transition: transform 0.25s ease;
        }
        .cta-win { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: #ffffff; }
        .cta-mac { background: #ffffff; color: #0f172a; }

        #subtitle-pill {
          position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
          z-index: 95; background: rgba(2, 6, 23, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #f8fafc; padding: 14px 36px; border-radius: 999px;
          font-size: 23px; font-weight: 700;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          white-space: nowrap;
        }

        #studio-cursor {
          position: fixed; top: 0; left: 0; width: 34px; height: 34px;
          z-index: 100; pointer-events: none;
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
        }
        .click-ripple {
          position: fixed; width: 52px; height: 52px;
          margin-left: -26px; margin-top: -26px; border-radius: 50%;
          border: 3.5px solid #10b981; background: rgba(16, 185, 129, 0.28);
          z-index: 99; pointer-events: none;
          animation: rippleOut 0.5s ease-out forwards;
        }
        @keyframes rippleOut {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      \`;
      document.head.appendChild(style);

      const root = document.getElementById('root');
      const shell = document.createElement('div');
      shell.id = 'deskaura-window-shell';
      root.parentNode.insertBefore(shell, root);
      shell.appendChild(root);

      document.body.insertAdjacentHTML('beforeend', \`
        <div id="studio-wallpaper"></div>
        <div id="os-menubar">
          <div class="menubar-left">
            <span></span>
            <span style="font-weight:800">DeskAura v1.2.4</span>
            <span style="opacity:0.65">File</span>
            <span style="opacity:0.65">Edit</span>
            <span style="opacity:0.65">Window</span>
          </div>
          <div class="menubar-right">
            <div id="tray-droplet-pill">
              <span>💧</span>
              <span id="tray-pct-label">DeskAura • 11%</span>
            </div>
            <span id="os-clock-label">09:42</span>
          </div>
        </div>

        <div id="vscode-stage">
          <div class="vscode-titlebar">
            <div class="vscode-dots">
              <span style="background:#ff5f56"></span>
              <span style="background:#ffbd2e"></span>
              <span style="background:#27c93f"></span>
            </div>
            <span>src-tauri/src/lan_sync.rs — DeskAura — Visual Studio Code</span>
          </div>
          <div class="vscode-body">
            <div class="vscode-sidebar">
              <div style="font-weight:800;color:#fff;margin-bottom:8px">EXPLORER</div>
              <div>▾ DESKAURA</div>
              <div style="padding-left:14px;color:#4ec9b0">▸ src-tauri/src</div>
              <div style="padding-left:28px;color:#9cdcfe">• lib.rs</div>
              <div style="padding-left:28px;color:#dcdcaa">• lan_sync.rs</div>
              <div style="padding-left:14px;color:#4ec9b0">▾ src/components</div>
              <div style="padding-left:28px;color:#9cdcfe">• App.tsx</div>
              <div style="padding-left:28px;color:#9cdcfe">• ExerciseIllustration.tsx</div>
            </div>
            <div class="vscode-editor">
              <div class="code-cmt">// Deep Work Flow: Ultra-Low Latency LAN UDP Hydration Sync</div>
              <div><span class="code-kw">pub async fn</span> <span class="code-fn">broadcast_hydration_pulse</span>(intake_ml: <span class="code-type">u32</span>) -&gt; <span class="code-type">Result</span>&lt;(), <span class="code-type">SyncError</span>&gt; {</div>
              <div>&nbsp;&nbsp;<span class="code-kw">let</span> socket = <span class="code-type">UdpSocket</span>::<span class="code-fn">bind</span>(<span class="code-str">"0.0.0.0:0"</span>).<span class="code-kw">await</span>?;</div>
              <div>&nbsp;&nbsp;socket.<span class="code-fn">set_broadcast</span>(<span class="code-kw">true</span>)?;</div>
              <div>&nbsp;&nbsp;<span id="typed-code-line"></span><span id="typing-caret"></span></div>
              <div>}</div>
            </div>
          </div>
        </div>

        <div id="ugly-os-popup">
          <div class="ugly-header">
            <span>⚠️ SYSTEM ALERT — FOCUS INTERRUPTED!</span>
            <span>[X]</span>
          </div>
          <div class="ugly-body">
            <h2>🚨 TIME TO DRINK WATER! 🚨</h2>
            <p>MODAL DIALOG BLOCKING YOUR KEYBOARD INPUT UNTIL YOU CLICK OK!</p>
            <div class="ugly-btns">
              <button>DRINK NOW (FORCE)</button>
              <button>SNOOZE 5 MIN</button>
            </div>
          </div>
        </div>

        <div id="plant-night-tooltip">💤 Sập nguồn rồi sếp ơi!</div>

        <div id="outro-stage">
          <div class="outro-logo-card">
            <img src="/app-icon.svg" style="width:76px;height:76px" alt="DeskAura" />
          </div>
          <h1 class="outro-title">DeskAura v1.2.4</h1>
          <p class="outro-tagline">Trợ lý sức khỏe tĩnh lặng & Không gian nhạc nền chữa lành</p>
          <div class="outro-cta-row">
            <div class="cta-btn cta-win">🪟 Windows (.exe)</div>
            <div class="cta-btn cta-mac"> macOS (.dmg)</div>
          </div>
        </div>

        <div id="subtitle-pill">Đang tập trung cao độ... thì bị cắt ngang?</div>

        <div id="studio-cursor">
          <svg width="34" height="34" viewBox="0 0 28 28" fill="none">
            <path d="M5 3L23 13.5L14.5 15.8L10.5 24L5 3Z" fill="#111827" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
          </svg>
        </div>
      \`);

      window.__DESKAURA_DIRECTOR__ = {
        moveCursor(x, y) {
          const el = document.getElementById('studio-cursor');
          if (el) el.style.transform = \`translate3d(\${x}px, \${y}px, 0)\`;
        },
        clickRipple(x, y) {
          const r = document.createElement('div');
          r.className = 'click-ripple';
          r.style.left = x + 'px';
          r.style.top = y + 'px';
          document.body.appendChild(r);
          setTimeout(() => r.remove(), 550);
        },
        setSubtitle(text) {
          const el = document.getElementById('subtitle-pill');
          if (el) el.textContent = text;
        },
        clickPlusWater(label) {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find((b) => b.textContent && b.textContent.includes(label));
          if (target) target.click();
        },
        getButtonCenter(label) {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find((b) => b.textContent && b.textContent.includes(label));
          if (!target) return { x: 860, y: 540 };
          const r = target.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        },
        getPlantCenter() {
          const svg = document.querySelector('svg[viewBox="0 0 140 140"]');
          if (!svg) return { x: 1260, y: 420 };
          const r = svg.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      };
    })()
  `);

  // Spawn FFmpeg pipeline: 12 fps input over 45s (540 frames) -> interpolated 60fps MP4 with dual-stage audio
  const FPS_CAPTURE = 12;
  const TOTAL_SECONDS = 45;
  const TOTAL_FRAMES = FPS_CAPTURE * TOTAL_SECONDS;

  console.log(`🎥 Capturing ${TOTAL_FRAMES} deterministic frames (${TOTAL_SECONDS}s) -> encoding 1080p60 MP4...`);

  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(FPS_CAPTURE),
    '-i', '-',
    '-f', 'lavfi',
    '-i',
    "aevalsrc='if(lt(t,5), 0.08*sin(2*PI*440*t)*exp(-mod(t,0.25)*8) + 0.05*sin(2*PI*880*t)*exp(-mod(t,0.5)*6), (0.06*sin(2*PI*261.63*t) + 0.05*sin(2*PI*329.63*t) + 0.05*sin(2*PI*392.00*t) + 0.04*sin(2*PI*493.88*t))*(0.85+0.15*sin(2*PI*0.5*t)))':s=44100:d=45",
    '-shortest',
    '-vf', 'fps=60,scale=1920:1080:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    FINAL_MP4,
  ];

  const ffmpegProc = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['pipe', 'ignore', 'ignore'],
  });

  const codeLine = 'let payload = serde_json::to_vec(&HydrationPulse::new(intake_ml))?;';
  let cursor = { x: 920, y: 510 };
  let btn200Pos = { x: 820, y: 530 };
  let plantPos = { x: 1270, y: 410 };

  let scene2Entered = false;
  let scene3Entered = false;
  let clicked200 = false;
  let boostedLeaves = false;
  let scene4Entered = false;
  let tooltipShown = false;
  let scene5Entered = false;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS_CAPTURE; // 0.0 -> 45.0 seconds

    // --- SCENE 1 (00:00 - 00:05): VS Code Typing & 00:03 OS Popup ---
    if (t < 5.0) {
      if (t < 3.0) {
        const charCount = Math.min(codeLine.length, Math.floor((t / 2.8) * codeLine.length));
        const partial = codeLine.slice(0, charCount);
        const cx = 920 + Math.sin(frame * 0.4) * 8;
        const cy = 510 + Math.cos(frame * 0.4) * 5;
        cursor = { x: cx, y: cy };
        await cdp.eval(`
          (() => {
            const el = document.getElementById('typed-code-line');
            if (el) el.textContent = ${JSON.stringify(partial)};
            window.__DESKAURA_DIRECTOR__.moveCursor(${cx}, ${cy});
          })()
        `);
      } else {
        // 00:03: Giant ugly OS popup slams in, cursor freezes abruptly!
        await cdp.eval(`
          document.getElementById('ugly-os-popup')?.classList.add('show');
        `);
      }
    }

    // --- SCENE 2 (00:05 - 00:12): Swipe to Clean Desktop & DeskAura Bento UI ---
    else if (t >= 5.0 && t < 12.0) {
      if (!scene2Entered) {
        scene2Entered = true;
        await cdp.eval(`
          document.getElementById('ugly-os-popup')?.classList.remove('show');
          document.getElementById('vscode-stage')?.classList.add('swipe-away');
          document.getElementById('deskaura-window-shell')?.classList.add('visible');
          window.__DESKAURA_DIRECTOR__.setSubtitle('Làm quen với DeskAura. Trợ lý tĩnh lặng, không cướp màn hình.');
        `);
      }
      const p = (t - 5.0) / 7.0;
      const pos = cubicBezierPoint({ x: 920, y: 510 }, { x: 680, y: 420 }, p);
      cursor = pos;
      await cdp.eval(`window.__DESKAURA_DIRECTOR__.moveCursor(${pos.x}, ${pos.y});`);
    }

    // --- SCENE 3 (00:12 - 00:20): Zoom on Water & Plant -> Click +200ml -> Plant Sprout to Thriving ---
    else if (t >= 12.0 && t < 20.0) {
      if (!scene3Entered) {
        scene3Entered = true;
        await cdp.eval(`
          document.getElementById('deskaura-window-shell')?.classList.add('zoom-cards');
          window.__DESKAURA_DIRECTOR__.setSubtitle('Uống đủ nước để nuôi dưỡng chậu cây chữa lành.');
        `);
      }
      if (t >= 13.0 && t < 15.0) {
        if (t < 13.2) {
          btn200Pos = await cdp.eval(`window.__DESKAURA_DIRECTOR__.getButtonCenter('+200ml')`);
        }
        const p = (t - 13.0) / 1.8;
        const pos = cubicBezierPoint({ x: 680, y: 420 }, btn200Pos, p);
        cursor = pos;
        await cdp.eval(`window.__DESKAURA_DIRECTOR__.moveCursor(${pos.x}, ${pos.y});`);
      }
      if (t >= 15.0 && !clicked200) {
        clicked200 = true;
        await cdp.eval(`
          window.__DESKAURA_DIRECTOR__.clickRipple(${cursor.x}, ${cursor.y});
          window.__DESKAURA_DIRECTOR__.clickPlusWater('+200ml');
          document.getElementById('tray-pct-label').textContent = 'DeskAura • 22%';
        `);
      }
      if (t >= 16.2 && !boostedLeaves) {
        boostedLeaves = true;
        // Boost hydration to Stage 3 (Thriving Leaves: +300ml x 3 -> 1300/1800ml = 72%)
        await cdp.eval(`
          window.__DESKAURA_DIRECTOR__.clickRipple(${cursor.x}, ${cursor.y});
          window.__DESKAURA_DIRECTOR__.clickPlusWater('+300ml');
          window.__DESKAURA_DIRECTOR__.clickPlusWater('+300ml');
          window.__DESKAURA_DIRECTOR__.clickPlusWater('+300ml');
          document.getElementById('tray-pct-label').textContent = 'DeskAura • 72%';
        `);
      }
    }

    // --- SCENE 4 (00:20 - 00:36): Smart Context & Night Mode (Clock 23:15 + Sleeping Plant + Tooltip) ---
    else if (t >= 20.0 && t < 36.0) {
      if (!scene4Entered) {
        scene4Entered = true;
        await cdp.eval(`
          document.getElementById('deskaura-window-shell')?.classList.remove('zoom-cards');
          document.body.classList.add('scene-night');
          window.__SET_DEMO_CLOCK__(23, 15);
          document.getElementById('os-clock-label').textContent = '23:15';
          window.__DESKAURA_DIRECTOR__.setSubtitle('Làm việc khuya? Âm thanh giảm chấn & tự nhận biết ngữ cảnh.');
          // Trigger immediate React state refresh so plantMood switches to 'sleepy' (💤)
          window.__DESKAURA_DIRECTOR__.clickPlusWater('+50ml');
        `);
      }
      if (t >= 21.5 && t < 24.0) {
        if (t < 21.7) {
          plantPos = await cdp.eval(`window.__DESKAURA_DIRECTOR__.getPlantCenter()`);
        }
        const p = (t - 21.5) / 2.2;
        const pos = cubicBezierPoint(cursor, plantPos, p);
        cursor = pos;
        await cdp.eval(`window.__DESKAURA_DIRECTOR__.moveCursor(${pos.x}, ${pos.y});`);
      }
      if (t >= 24.0 && !tooltipShown) {
        tooltipShown = true;
        await cdp.eval(`
          (() => {
            const tip = document.getElementById('plant-night-tooltip');
            if (tip) {
              tip.style.left = '${plantPos.x}px';
              tip.style.top = '${plantPos.y - 95}px';
              tip.classList.add('show');
            }
          })()
        `);
      }
    }

    // --- SCENE 5 (00:36 - 00:45): Minimize to Taskbar/Menubar Icon -> Logo + [Windows] [macOS] CTA ---
    else if (t >= 36.0) {
      if (!scene5Entered) {
        scene5Entered = true;
        await cdp.eval(`
          document.getElementById('plant-night-tooltip')?.classList.remove('show');
          document.getElementById('deskaura-window-shell')?.classList.add('minimize-to-tray');
          document.getElementById('tray-droplet-pill')?.classList.add('pulse-glow');
          document.getElementById('outro-stage')?.classList.add('show');
          window.__DESKAURA_DIRECTOR__.setSubtitle('Bảo vệ cột sống. Tôn trọng dòng code. Tải ngay bản Beta.');
        `);
      }
      if (t >= 37.5 && t < 41.0) {
        const p = (t - 37.5) / 3.0;
        const pos = cubicBezierPoint(cursor, { x: 810, y: 650 }, p);
        await cdp.eval(`window.__DESKAURA_DIRECTOR__.moveCursor(${pos.x}, ${pos.y});`);
      } else if (t >= 41.0) {
        const p = Math.min(1, (t - 41.0) / 2.5);
        const pos = cubicBezierPoint({ x: 810, y: 650 }, { x: 1120, y: 650 }, p);
        await cdp.eval(`window.__DESKAURA_DIRECTOR__.moveCursor(${pos.x}, ${pos.y});`);
      }
    }

    const jpegBuf = await cdp.screenshotJpegBuffer(90);
    ffmpegProc.stdin.write(jpegBuf);
  }

  ffmpegProc.stdin.end();
  await new Promise((resolve, reject) => {
    ffmpegProc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
  console.log(`✅ 45-second 1080p60 MP4 saved to: ${FINAL_MP4}`);

  // Also generate an optimized animated GIF preview (960x540 @ 10fps) so GitHub README renders it inline automatically
  console.log('🎞️ Generating inline animated GIF preview for GitHub README...');
  execSync(
    `ffmpeg -y -i "${FINAL_MP4}" -vf "fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${FINAL_GIF}"`,
    { stdio: 'ignore' }
  );
  console.log(`✅ Animated GIF preview saved to: ${FINAL_GIF}`);
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });

  const viteProc = await ensureViteServer();
  const { proc: chromeProc, wsUrl, userDataDir } = await launchChrome();
  const cdp = new CDPClient(wsUrl);

  try {
    await cdp.connect();
    await captureBilingualScreenshots(cdp);
    await render45sDemoVideo(cdp);
  } finally {
    cdp.close();
    chromeProc.kill();
    if (viteProc) viteProc.kill();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

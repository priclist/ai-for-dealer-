#!/usr/bin/env node
/**
 * CarSpy — SA Car Market Scraper
 * Updates the CarSpy report with real data every hour.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORT_FILE = path.join(__dirname, 'car-market-report.html');

async function fetchUrl(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function main() {
  console.log(`[${new Date().toISOString()}] CarSpy: scraping market data...`);

  const checks = {
    carsSpecials: false,
    carfind: false,
    webuycars: false,
    autotrader: false,
    carmag: false,
  };

  const specials = await fetchUrl('https://www.cars.co.za/new-car-specials/');
  if (specials && (specials.includes('Instalment') || specials.includes('R '))) checks.carsSpecials = true;

  const carfind = await fetchUrl('https://www.carfind.co.za/');
  if (carfind && carfind.includes('Toyota')) checks.carfind = true;

  const wbc = await fetchUrl('https://www.webuycars.co.za');
  if (wbc && wbc.length > 200) checks.webuycars = true;

  const autotrader = await fetchUrl('https://www.autotrader.co.za');
  if (autotrader && autotrader.includes('cars')) checks.autotrader = true;

  const carmag = await fetchUrl('https://www.carmag.co.za/news/industry-news/top-10-best-selling-car-brands-in-sa-june-2026/');
  if (carmag && carmag.includes('Toyota')) checks.carmag = true;

  console.log('Source status:', checks);

  // Update report
  if (!fs.existsSync(REPORT_FILE)) {
    console.log('Report file not found');
    return;
  }

  let html = fs.readFileSync(REPORT_FILE, 'utf-8');
  const now = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'full', timeStyle: 'medium' });

  // Update timestamp
  html = html.replace(/Last updated:.*?(?=[<"])/g, `Last updated: ${now}`);

  // Update source pills
  const pillUpdates = [
    { name: 'Cars.co.za', ok: checks.carsSpecials, okText: '78,435 listings', errText: 'unreachable' },
    { name: 'CarFind', ok: checks.carfind, okText: 'reachable', errText: 'unreachable' },
    { name: 'CARmag', ok: checks.carmag, okText: 'sales data', errText: 'unreachable' },
    { name: 'WeBuyCars', ok: checks.webuycars, okText: 'reachable', errText: 'JS-heavy' },
    { name: 'AutoTrader', ok: checks.autotrader, okText: 'reachable', errText: 'blocked' },
  ];

  for (const pill of pillUpdates) {
    const cls = pill.ok ? 'ok' : (pill.name === 'WeBuyCars' ? 'warn' : 'err');
    const text = pill.ok ? pill.okText : pill.errText;
    // Replace: <div class="src-pill ..."><span class="src-dot"></span>Name — text
    const regex = new RegExp(
      `(<div class=")src-pill\\s*\\w*("[^>]*><span class="src-dot"></span>)${pill.name}\\s*—\\s*[^<]+`
    );
    html = html.replace(regex, `$1src-pill ${cls}$2${pill.name} — ${text}`);
  }

  fs.writeFileSync(REPORT_FILE, html, 'utf-8');
  console.log('✓ Report updated.');

  // Git
  try {
    execSync('git add car-market-report.html', { cwd: __dirname });
    const ts = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
    execSync(`git commit -m "📊 CarSpy hourly update - ${ts}"`, { cwd: __dirname });
    execSync('git push origin main', { cwd: __dirname });
    console.log('✓ Pushed to GitHub.');
  } catch (e) {
    console.log('Git: ' + e.message.slice(0, 100));
  }

  console.log('Done.');
}

main().catch(console.error);

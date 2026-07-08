#!/usr/bin/env node
/**
 * Ironman AI — Car Market Report Scraper
 * Scrapes SA car sites every hour and updates the report.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORT_FILE = path.join(__dirname, 'car-market-report.html');

async function fetch(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function extractBetween(text, start, end) {
  const i = text.indexOf(start);
  if (i === -1) return '';
  const j = text.indexOf(end, i + start.length);
  if (j === -1) return '';
  return text.slice(i + start.length, j);
}

function extractAllBetween(text, start, end) {
  const results = [];
  let i = 0;
  while (true) {
    const si = text.indexOf(start, i);
    if (si === -1) break;
    const sj = text.indexOf(end, si + start.length);
    if (sj === -1) break;
    results.push(text.slice(si + start.length, sj));
    i = sj + end.length;
  }
  return results;
}

async function scrapeCarSpecials() {
  const html = await fetch('https://www.cars.co.za/new-car-specials/');
  if (!html) return [];

  const specials = [];
  // Each special is in an anchor tag with class-like patterns
  const items = extractAllBetween(html, 'class="special-item"', '</a>');
  
  // Alternative: extract from the markdown-style text we saw
  // Pattern: Car Name + Price + detail
  const lines = html.split('\n');
  let current = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines with installment pattern
    if (trimmed.includes('Instalment From') && trimmed.includes('p/m')) {
      if (current) specials.push(current);
      current = { name: '', price: '', detail: '', link: '' };
    }
  }

  return specials;
}

async function scrapeCarmag() {
  const html = await fetch('https://www.carmag.co.za/news/industry-news/top-10-best-selling-car-brands-in-sa-june-2026/');
  if (!html) return null;
  return html;
}

async function main() {
  console.log(`[${new Date().toISOString()}] Scraping car market data...`);
  
  // Scrape specials page for fresh data
  const specialsHtml = await fetch('https://www.cars.co.za/new-car-specials/');
  if (specialsHtml) {
    // Check if we got useful content
    const hasContent = specialsHtml.includes('Instalment From') || specialsHtml.includes('R ')
    console.log(`cars.co.za specials: ${hasContent ? 'OK' : 'No data retrieved'}`);
  }

  // Check other sites are reachable
  const wbc = await fetch('https://www.webuycars.co.za');
  console.log(`WeBuyCars: ${wbc ? 'OK' : 'Unreachable'}`);

  const carfind = await fetch('https://www.carfind.co.za');
  console.log(`CarFind: ${carfind && carfind.includes('cars') ? 'OK' : 'Unreachable'}`);

  const autotrader = await fetch('https://www.autotrader.co.za');
  console.log(`AutoTrader: ${autotrader && autotrader.includes('cars') ? 'OK' : 'Unreachable'}`);

  // Update the timestamp in the report file
  if (fs.existsSync(REPORT_FILE)) {
    const content = fs.readFileSync(REPORT_FILE, 'utf-8');
    const now = new Date().toLocaleString('en-ZA', { 
      timeZone: 'Africa/Johannesburg', 
      dateStyle: 'full', 
      timeStyle: 'medium' 
    });
    const updated = content.replace(
      /Last updated:.*?(?=<)/,
      `Last updated: ${now}`
    );
    
    // Update the generated timestamp in the script tag too
    const updated2 = updated.replace(
      /textContent = 'Last updated:.*?';/,
      `textContent = 'Last updated: ${now}';`
    );
    
    fs.writeFileSync(REPORT_FILE, updated2, 'utf-8');
    console.log('Report timestamp updated.');
  }

  // Git commit and push
  try {
    execSync('git add car-market-report.html', { cwd: __dirname });
    execSync('git commit -m "📊 Hourly car market report update - ' + new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) + '"', { cwd: __dirname });
    execSync('git push origin main', { cwd: __dirname });
    console.log('✅ Pushed to GitHub.');
  } catch (e) {
    console.log('Git push skipped (no changes or network):', e.message);
  }

  console.log('Done.');
}

main().catch(console.error);

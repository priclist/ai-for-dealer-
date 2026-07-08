#!/usr/bin/env node
/**
 * CarSpy Refresh Server
 * Endpoint for the refresh button to trigger re-scraping.
 */

const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

const PORT = 3102;
const WORK_DIR = path.resolve(__dirname, '.');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/refresh') {
    console.log('🔄 Refresh requested...');
    res.writeHead(200, { 'Content-Type': 'application/json' });

    try {
      execSync('node scrape-report.js', { cwd: WORK_DIR, timeout: 60000, stdio: 'pipe' });
      const result = JSON.stringify({ ok: true, time: new Date().toISOString() });
      res.end(result);
      console.log('✅ Refresh complete');
    } catch (e) {
      const err = JSON.stringify({ ok: false, error: e.message });
      res.end(err);
      console.error('❌ Refresh failed:', e.message);
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔄 CarSpy refresh server running on port ${PORT}`);
});

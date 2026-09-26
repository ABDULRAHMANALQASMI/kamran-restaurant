// Temporary helper: list image-override keys + pool sizes per country file.
const fs = require('fs');
const path = require('path');
const lines = [];
['oman', 'uae'].forEach((c) => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', `${c}-menu-phase5.js`), 'utf8');
  const block = src.split('ImageOverrides = {')[1].split('\n};')[0];
  const keys = [...block.matchAll(/^  '([a-z0-9-]+)':/gm)].map((m) => m[1]);
  lines.push(`${c}: ${keys.length} overrides`);
  lines.push(keys.join(' '));
});
fs.writeFileSync(path.join(__dirname, 'override-keys.txt'), lines.join('\n'), 'utf8');

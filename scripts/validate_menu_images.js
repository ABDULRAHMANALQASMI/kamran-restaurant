// Load the country menu data files and verify every item resolves to real image files.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, console };
sandbox.global = sandbox;

['data/oman-menu-phase5.js', 'data/uae-menu-phase5.js'].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
});

const lines = [];
let missingFull = 0;
let missingThumb = 0;
let items = 0;
const distinct = new Set();
const perCategory = {};

['oman', 'uae'].forEach((country) => {
  const data = sandbox.window[`${country}MenuData`];
  if (!Array.isArray(data)) {
    lines.push(`${country}: NO DATA`);
    return;
  }
  lines.push(`${country}: ${data.length} items`);
  data.forEach((item) => {
    items += 1;
    const image = item.image || '';
    distinct.add(image);
    const key = `${country}/${item.category}`;
    perCategory[key] = perCategory[key] || new Set();
    perCategory[key].add(image);
    if (!image) {
      lines.push(`  [no-image] ${item.id}`);
      return;
    }
    if (!fs.existsSync(path.join(ROOT, image))) {
      missingFull += 1;
      lines.push(`  [missing-full] ${item.id} -> ${image}`);
    }
    const thumb = image.replace('assets/menu/representative/', 'assets/menu/thumbs/');
    if (thumb !== image && !fs.existsSync(path.join(ROOT, thumb))) {
      missingThumb += 1;
      lines.push(`  [missing-thumb] ${item.id} -> ${thumb}`);
    }
  });
});

lines.push('');
lines.push(`items: ${items} | distinct images: ${distinct.size} | missing full: ${missingFull} | missing thumbs: ${missingThumb}`);
lines.push('');
lines.push('distinct images per category (diversity check):');
Object.keys(perCategory).sort().forEach((key) => {
  lines.push(`  ${key}: ${perCategory[key].size}`);
});

fs.writeFileSync(path.join(__dirname, 'menu-image-validation.txt'), lines.join('\n'), 'utf8');
console.log('VALIDATE OK');

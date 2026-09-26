// Temporary audit helper: prints id | category | names | current image for every menu record.
const path = require('path');
const fs = require('fs');

const sandbox = {};
global.window = sandbox;

['oman-menu-phase5.js', 'uae-menu-phase5.js'].forEach((file) => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(code).call(sandbox);
});

const lines = [];
['oman', 'uae'].forEach((country) => {
  const items = sandbox[`${country}MenuData`] || [];
  lines.push(`### ${country} (${items.length} items)`);
  items.forEach((item) => {
    const img = String(item.image || '').replace('assets/menu/representative/', '').replace('assets/hero/', 'HERO:');
    lines.push(`${item.category.padEnd(14)} ${item.id.padEnd(34)} ${item.name_ar} | ${item.name_en} | ${img} | ${item.imageType}`);
  });
});

fs.writeFileSync(path.join(__dirname, 'image-map.txt'), lines.join('\n'), 'utf8');
console.log('wrote image-map.txt', lines.length, 'lines');

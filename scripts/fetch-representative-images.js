// Phase 6: download hand-matched representative photography from Pexels.
// All photos are covered by the Pexels License (free for commercial use,
// no attribution required). Raw files land in build/img-raw/ and are then
// normalized into assets/menu/representative/ by scripts/build_image_set.py.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'build', 'img-raw');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-manifest.json'), 'utf8'));

const sourceUrl = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1260&h=740&dpr=${process.env.PEXELS_DPR || '1'}`;
const forceRefresh = process.env.REFRESH === '1';

(async () => {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const results = [];

  for (const entry of manifest) {
    const dest = path.join(RAW_DIR, `${entry.id}.jpg`);
    const cached = !forceRefresh && fs.existsSync(dest) && fs.statSync(dest).size > 12000;
    if (!cached) {
      try {
        const res = await fetch(sourceUrl(entry.id), {
          headers: { 'User-Agent': 'Kamran-Mandi-Website/1.0 (static site asset build)' },
          redirect: 'follow',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get('content-type') || '';
        if (!type.startsWith('image/')) throw new Error(`unexpected content-type ${type}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 12000) throw new Error(`payload too small (${buf.length} bytes)`);
        fs.writeFileSync(dest, buf);
      } catch (error) {
        results.push({ ...entry, status: 'failed', error: String(error && error.message || error) });
        continue;
      }
    }
    results.push({
      ...entry,
      status: cached ? 'cached' : 'ok',
      bytes: fs.statSync(dest).size,
      finalPath: `assets/menu/representative/${entry.target}`,
      pageUrl: `https://www.pexels.com/photo/${entry.id}/`,
      license: 'Pexels License',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  fs.writeFileSync(path.join(__dirname, 'image-sources.json'), JSON.stringify(results, null, 2), 'utf8');
  const failed = results.filter((r) => r.status === 'failed');
  console.log(`downloaded ${results.length - failed.length}/${manifest.length} into build/img-raw`);
  failed.forEach((r) => console.log(`  FAILED ${r.id} (${r.target}): ${r.error}`));
})();

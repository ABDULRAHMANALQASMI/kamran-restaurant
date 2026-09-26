const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'phase5-validation-report.json');
const expected = {
  oman: {
    file: 'data/oman-menu-phase5.js',
    count: 114,
    categories: {
      chicken: 14,
      meat: 10,
      seafood: 10,
      salads: 9,
      rice_bread: 15,
      qalabat: 16,
      feasts: 5,
      ramadan: 7,
      desserts: 5,
      cold_beverages: 19,
      hot_drinks: 4
    },
    currency: 'OMR'
  },
  uae: {
    file: 'data/uae-menu-phase5.js',
    count: 72,
    categories: {
      drinks: 14,
      salads: 7,
      fish: 8,
      chicken: 5,
      meat: 5,
      qalabat: 17,
      extras: 6,
      feasts: 4,
      desserts: 6
    },
    currency: 'AED'
  }
};

function loadScript(relativePath, key) {
  const context = { window: {} };
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  vm.runInNewContext(content, context, { filename: relativePath });
  return context.window[key];
}

function inspectMenu(country, config) {
  const items = loadScript(config.file, `${country}MenuData`);
  const categoryCounts = Object.fromEntries(Object.keys(config.categories).map((category) => [
    category,
    items.filter((item) => item.category === category).length
  ]));
  const duplicateIds = items.map((item) => item.id).filter((id, index, all) => all.indexOf(id) !== index);
  const brokenImagePaths = [];

  for (const item of items) {
    if (!item.image) continue;
    if (/^https?:\/\//i.test(item.image)) continue;
    const imagePath = path.resolve(root, decodeURIComponent(item.image));
    if (!imagePath.startsWith(root) || !fs.existsSync(imagePath)) {
      brokenImagePaths.push({ id: item.id, image: item.image });
    }
  }

  const wrongCountry = items.filter((item) => item.country !== country);
  const wrongCurrency = items.filter((item) => item.currency !== config.currency);
  const missingArabicNames = items.filter((item) => !/[\u0600-\u06ff]/.test(item.name_ar || ''));
  const missingEnglishNames = items.filter((item) => !/[A-Za-z]/.test(item.name_en || ''));
  const missingPrices = items.filter((item) => !Number.isFinite(item.price));
  const malformedPriceOptions = items.filter((item) => (
    item.priceOptions && (!Array.isArray(item.priceOptions) || item.priceOptions.some((price) => !Number.isFinite(price)))
  ));
  const itemsWithImages = items.filter((item) => Boolean(item.image));
  const reviewItems = items.filter((item) => (
    item.status !== 'verified'
    || item.translationStatus === 'TRANSLATION_REVIEW_REQUIRED'
    || !item.image
    || !item.name_ar
    || !item.name_en
    || !Number.isFinite(item.price)
  ));

  return {
    expectedCategories: Object.keys(config.categories).length,
    categories: new Set(items.map((item) => item.category)).size,
    expectedItems: config.count,
    totalItems: items.length,
    categoryCounts,
    itemCountMatchesSource: items.length === config.count,
    itemsWithImages: itemsWithImages.length,
    itemsWithoutImages: items.length - itemsWithImages.length,
    itemsWithExpectedCurrency: items.filter((item) => item.currency === config.currency).length,
    itemsWithOMRPrices: items.filter((item) => item.currency === 'OMR' && Number.isFinite(item.price)).length,
    itemsWithAEDPrices: items.filter((item) => item.currency === 'AED' && Number.isFinite(item.price)).length,
    invalidCurrencyCount: items.filter((item) => !['OMR', 'AED'].includes(item.currency)).length,
    currency: config.currency,
    missingArabicNames: missingArabicNames.length,
    missingEnglishNames: missingEnglishNames.length,
    missingPrices: missingPrices.length,
    malformedPriceOptions: malformedPriceOptions.length,
    duplicateIds: duplicateIds.length,
    wrongCountryRecords: wrongCountry.length,
    wrongCurrencyRecords: wrongCurrency.length,
    brokenImagePaths,
    itemsRequiringReview: reviewItems.length,
    imageTypes: Object.fromEntries([...new Set(items.map((item) => item.imageType || 'unspecified'))].map((type) => [
      type,
      items.filter((item) => (item.imageType || 'unspecified') === type).length
    ]))
  };
}

function inspectInternalLinks() {
  const pages = ['index.html', 'oman.html', 'uae.html'];
  const broken = [];

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
    const localDocument = path.resolve(root, page);

    for (const [, rawHref] of html.matchAll(/\bhref=["']([^"']+)["']/g)) {
      if (/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(rawHref)) continue;
      const [rawPath, fragment] = rawHref.split('#');
      const decodedPath = decodeURIComponent(rawPath || '');
      const targetPath = decodedPath ? path.resolve(path.dirname(localDocument), decodedPath) : localDocument;
      if (!targetPath.startsWith(root) || !fs.existsSync(targetPath)) {
        broken.push({ page, href: rawHref });
        continue;
      }
      if (fragment && path.extname(targetPath).toLowerCase() === '.html') {
        const targetHtml = fs.readFileSync(targetPath, 'utf8');
        const targetIds = targetPath === localDocument
          ? ids
          : new Set([...targetHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
        if (!targetIds.has(decodeURIComponent(fragment))) broken.push({ page, href: rawHref });
      }
    }
  }

  return broken;
}

function inspectPageAssetsAndIds() {
  const pages = ['index.html', 'oman.html', 'uae.html'];
  const brokenImages = [];
  const brokenSources = [];
  const duplicateIds = [];

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
    const seenIds = new Set();
    for (const id of ids) {
      if (seenIds.has(id)) duplicateIds.push({ page, id });
      seenIds.add(id);
    }

    for (const [, source] of html.matchAll(/\bsrc=["']([^"']+)["']/g)) {
      if (/^(?:https?:|data:)/i.test(source)) continue;
      const target = path.resolve(path.dirname(path.join(root, page)), decodeURIComponent(source));
      if (!target.startsWith(root) || !fs.existsSync(target)) {
        brokenSources.push({ page, source });
      }
      if (/\.(?:png|jpe?g|webp|avif|gif|svg)(?:$|\?)/i.test(source)
        && (!target.startsWith(root) || !fs.existsSync(target))) {
        brokenImages.push({ page, image: source });
      }
    }
  }

  return { brokenImages, brokenSources, duplicateIds };
}

const menus = Object.fromEntries(Object.entries(expected).map(([country, config]) => [
  country,
  inspectMenu(country, config)
]));
const links = inspectInternalLinks();
const pageAssets = inspectPageAssetsAndIds();
const deliveryLinks = loadScript('data/delivery-links.js', 'deliveryLinksData');
const browserAuditPath = path.join(root, 'phase5-browser-audit.json');
const browserAuditSource = fs.existsSync(browserAuditPath)
  ? JSON.parse(fs.readFileSync(browserAuditPath, 'utf8'))
  : null;
const allItems = Object.values(menus).reduce((sum, menu) => sum + menu.totalItems, 0);
const browserAudit = browserAuditSource ? {
  ...browserAuditSource,
  menuPhotoCoverage: {
    availableImages: menus.oman.itemsWithImages + menus.uae.itemsWithImages,
    missingImages: menus.oman.itemsWithoutImages + menus.uae.itemsWithoutImages,
    imageType: 'representative local food photography; not restaurant photos'
  }
} : null;
const report = {
  generatedAt: new Date().toISOString(),
  source: 'Phase 5 authoritative menu supplied by user',
  oman: menus.oman,
  uae: menus.uae,
  totals: {
    menuItems: allItems,
    menuImages: menus.oman.itemsWithImages + menus.uae.itemsWithImages,
    generatedOrIllustrativeMenuImages: 0,
    representativeMenuImages: menus.oman.itemsWithImages + menus.uae.itemsWithImages,
    realRestaurantMenuImages: 0,
    missingImages: menus.oman.itemsWithoutImages + menus.uae.itemsWithoutImages,
    brokenImagePaths: menus.oman.brokenImagePaths.length + menus.uae.brokenImagePaths.length + pageAssets.brokenImages.length,
    brokenPageImages: pageAssets.brokenImages,
    brokenPageResources: pageAssets.brokenSources,
    duplicateDomIds: pageAssets.duplicateIds,
    brokenInternalLinks: links.length,
    brokenInternalLinkDetails: links,
    consoleErrors: browserAudit?.consoleErrors ?? 'Requires browser audit',
    browserAudit: browserAudit || { status: 'not run' }
  },
  countrySeparation: {
    omanOnlyOMR: menus.oman.wrongCurrencyRecords === 0 && menus.oman.wrongCountryRecords === 0,
    uaeOnlyAED: menus.uae.wrongCurrencyRecords === 0 && menus.uae.wrongCountryRecords === 0
  },
  contacts: {
    omanInstagram: fs.readFileSync(path.join(root, 'oman.html'), 'utf8').includes('https://www.instagram.com/kamran.restaurant/'),
    uaeInstagram: fs.readFileSync(path.join(root, 'uae.html'), 'utf8').includes('https://www.instagram.com/kamran_restaurant.ae/'),
    omanPhones: ['26050500', '+968 7222 2345'].every((phone) => fs.readFileSync(path.join(root, 'data/oman-branches.js'), 'utf8').includes(phone)),
    uaePhones: ['02 642 4399', '055 359 5195'].every((phone) => fs.readFileSync(path.join(root, 'data/uae-branches.js'), 'utf8').includes(phone))
  },
  delivery: {
    omanComingSoon: deliveryLinks.oman?.status === 'coming-soon',
    uaeComingSoon: deliveryLinks.uae?.status === 'coming-soon',
    officialLinksInvented: ['oman', 'uae'].some((country) => (
      Object.keys(deliveryLinks[country] || {}).some((key) => /url|link/i.test(key))
    ))
  }
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const CONTENT_REVIEW_REQUIRED = 'CONTENT_REVIEW_REQUIRED';
const PRICE_REVIEW_REQUIRED = 'PRICE_REVIEW_REQUIRED';
const IMAGE_REQUIRED = 'IMAGE_REQUIRED';
const DELIVERY_LINK_REQUIRED = 'DELIVERY_LINK_REQUIRED';

function validateMenuItem(item) {
  const issues = [];

  if (!item || typeof item !== 'object') {
    return { valid: false, issues: ['INVALID_MENU_ITEM'] };
  }

  if (!item.id) issues.push('missing item ID');
  if (!item.category) issues.push('missing category');
  if (!item.name_ar) issues.push('missing Arabic name');
  if (!item.name_en) issues.push('missing English name');
  if (!item.source || !item.source.file || !Number.isInteger(item.source.page) || item.source.page < 1) {
    issues.push('missing source reference');
  }
  if (item.price === undefined || item.price === null) issues.push('missing price');
  if (item.price !== undefined && item.price !== null && (typeof item.price !== 'number' || Number.isNaN(item.price) || item.price < 0)) {
    issues.push('invalid price');
  }
  if (item.currency !== 'OMR' && item.currency !== 'AED') issues.push('incorrect currency');
  if (!item.country || !['oman', 'uae'].includes(item.country)) issues.push('invalid country');
  if (item.country === 'oman' && item.currency !== 'OMR') issues.push('Oman item must use OMR');
  if (item.country === 'uae' && item.currency !== 'AED') issues.push('UAE item must use AED');
  if (!item.image) issues.push('missing image');

  return {
    valid: issues.length === 0,
    issues: issues.length ? issues : ['VALID']
  };
}

function validateMenuData(menuItems) {
  const seenIds = new Set();
  const issues = [];

  if (!Array.isArray(menuItems)) {
    return { valid: false, issues: ['INVALID_MENU_DATASET'] };
  }

  menuItems.forEach((item, index) => {
    const itemCheck = validateMenuItem(item);
    if (!itemCheck.valid) {
      issues.push({ index, itemId: item && item.id ? item.id : 'UNKNOWN', issues: itemCheck.issues });
    }

    if (item && item.id) {
      if (seenIds.has(item.id)) {
        issues.push({ index, itemId: item.id, issues: ['duplicate ID'] });
      }
      seenIds.add(item.id);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

function validateDeliveryLink(link) {
  if (!link || !link.platform || !link.url) {
    return { valid: false, issues: ['missing delivery link'] };
  }

  if (!/^https?:\/\//i.test(link.url)) {
    return { valid: false, issues: ['invalid delivery URL'] };
  }

  return { valid: true, issues: ['VALID'] };
}

function validateBranch(branch) {
  const issues = [];

  if (!branch || typeof branch !== 'object') {
    return { valid: false, issues: ['INVALID_BRANCH'] };
  }

  if (!branch.id) issues.push('missing branch ID');
  if (!branch.country || !['oman', 'uae'].includes(branch.country)) issues.push('invalid country');
  if (!branch.name_ar) issues.push('missing Arabic branch name');
  if (!branch.name_en) issues.push('missing English branch name');
  if (!branch.city) issues.push('missing branch city');

  return {
    valid: issues.length === 0,
    issues: issues.length ? issues : ['VALID']
  };
}

function getMenuValidationReport(country, menuItems) {
  const expectedCurrency = country === 'oman' ? 'OMR' : 'AED';
  const allItems = Array.isArray(menuItems) ? menuItems : [];
  const items = allItems.filter((item) => item.country === country && item.currency === expectedCurrency);
  const countryMismatches = allItems.filter((item) => item.country !== country);
  const currencyMismatches = allItems.filter((item) => item.country === country && item.currency !== expectedCurrency);
  const validPrices = items.filter((item) => (
    item.currency === expectedCurrency
    && typeof item.price === 'number'
    && Number.isFinite(item.price)
    && item.status !== PRICE_REVIEW_REQUIRED
  ));
  const itemsRequiringReview = allItems.filter((item) => (
    item.status !== 'verified' || item.translationStatus === 'TRANSLATION_REVIEW_REQUIRED'
  ));
  const pricesRequiringReview = allItems.filter((item) => (
    item.status === PRICE_REVIEW_REQUIRED || item.price === null || item.price === undefined
  ));

  return {
    country,
    currency: expectedCurrency,
    categoryCount: new Set(items.map((item) => item.category).filter(Boolean)).size,
    itemCount: allItems.length,
    validPriceCount: validPrices.length,
    priceReviewCount: pricesRequiringReview.length,
    contentReviewCount: allItems.filter((item) => item.status === CONTENT_REVIEW_REQUIRED).length,
    translationReviewCount: allItems.filter((item) => item.translationStatus === 'TRANSLATION_REVIEW_REQUIRED').length,
    itemReviewCount: itemsRequiringReview.length,
    missingImageCount: allItems.filter((item) => !item.image).length,
    countryMismatchCount: countryMismatches.length,
    currencyMismatchCount: currencyMismatches.length,
    countryOrCurrencyMismatchCount: countryMismatches.length + currencyMismatches.length
  };
}

window.CONTENT_REVIEW_REQUIRED = CONTENT_REVIEW_REQUIRED;
window.PRICE_REVIEW_REQUIRED = PRICE_REVIEW_REQUIRED;
window.IMAGE_REQUIRED = IMAGE_REQUIRED;
window.DELIVERY_LINK_REQUIRED = DELIVERY_LINK_REQUIRED;
window.validateMenuItem = validateMenuItem;
window.validateMenuData = validateMenuData;
window.validateDeliveryLink = validateDeliveryLink;
window.validateBranch = validateBranch;
window.getMenuValidationReport = getMenuValidationReport;

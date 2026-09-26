const interfaceText = {
  ar: {
    all: 'الكل',
    review: 'قيد المراجعة',
    priceReview: 'السعر قيد المراجعة',
    pricePending: 'السعر غير متاح',
    sourceReview: 'المعلومات قيد المراجعة',
    translationReview: 'الترجمة قيد المراجعة',
    noResults: 'لا توجد أصناف مطابقة',
    currencyOMR: 'ر.ع.',
    currencyAED: 'د.إ',
    page: 'صفحة',
    details: 'تفاصيل الصنف',
    descriptionPending: 'لا يوجد وصف متاح.',
    representativeImage: 'صورة توضيحية للصنف'
  },
  en: {
    all: 'All',
    review: 'Under review',
    priceReview: 'Price under review',
    pricePending: 'Price unavailable',
    sourceReview: 'Details under review',
    translationReview: 'Translation under review',
    noResults: 'No matching items found.',
    currencyOMR: 'OMR',
    currencyAED: 'AED',
    page: 'Page',
    details: 'Item details',
    descriptionPending: 'No description available.',
    representativeImage: 'Representative image'
  }
};

window.menuCategories = {
  drinks: { ar: 'المشروبات', en: 'Drinks' },
  salads: { ar: 'السلطات', en: 'Salads' },
  rice_bread: { ar: 'الأرز والخبز والإضافات', en: 'Rice, Bread & Extras' },
  extras: { ar: 'إضافات', en: 'Extras' },
  ramadan: { ar: 'وجبات رمضان', en: 'Ramadan Meals' },
  meat: { ar: 'اللحوم', en: 'Meat' },
  desserts: { ar: 'الحلويات', en: 'Desserts' },
  cold_beverages: { ar: 'المشروبات الباردة', en: 'Cold Beverages' },
  hot_drinks: { ar: 'المشروبات الساخنة', en: 'Hot Drinks' },
  feasts: { ar: 'الولائم والذبائح', en: 'Feasts' },
  chicken: { ar: 'الدجاج', en: 'Chicken' },
  seafood: { ar: 'المأكولات البحرية', en: 'Seafood' },
  fish: { ar: 'الأسماك', en: 'Fish' },
  qalabat: { ar: 'القلابات', en: 'Qalabat' }
};

const getLanguage = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');
let lastMenuTrigger = null;

const safeText = (value, fallback = 'Review required') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('CONTENT_REVIEW_REQUIRED') || trimmed.includes('TODO') || trimmed.includes('REVIEW_REQUIRED')) {
    return fallback;
  }

  return trimmed;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

const getCategoryLabel = (category, language = getLanguage()) => {
  const item = window.menuCategories?.[category];
  return item?.[language] || String(category || '').replace(/[-_]/g, ' ');
};

const formatCurrency = (currency, value, language = getLanguage()) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return interfaceText[language].pricePending;
  }

  const minimumFractionDigits = currency === 'OMR' ? 3 : 0;
  const maximumFractionDigits = currency === 'OMR' ? 3 : 2;
  const amount = Number(value).toLocaleString(language === 'ar' ? 'ar' : 'en', {
    minimumFractionDigits,
    maximumFractionDigits
  });
  const label = currency === 'OMR' ? interfaceText[language].currencyOMR : interfaceText[language].currencyAED;
  return `${amount} ${label}`;
};

const formatItemPrice = (item, language = getLanguage()) => {
  const prices = Array.isArray(item.priceOptions) && item.priceOptions.length
    ? item.priceOptions
    : [item.price];
  return prices.map((price) => formatCurrency(item.currency, price, language)).join(' / ');
};

const normalizeSearchText = (value) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي');

const isPriceUnderReview = (item) => (
  item.status === 'PRICE_REVIEW_REQUIRED'
  || item.priceStatus === 'PRICE_REVIEW_REQUIRED'
  || item.price === null
  || item.price === undefined
);

const getCountryMenuData = (country) => {
  if (!country) {
    return [];
  }

  const key = `${country}MenuData`;
  return Array.isArray(window[key]) ? window[key] : [];
};

/*
 * Menu photos ship in two sizes: the full representative photo used by the
 * details modal, and a small square-cropped sibling used by the grid. Menu data
 * stores paths relative to the site root, so every page that renders the menu
 * has to live at the root for those paths to resolve.
 */
const MENU_IMAGE_ROOT = 'assets/menu/representative/';
const MENU_THUMB_ROOT = 'assets/menu/thumbs/';
const MENU_THUMB_WIDTH = 500;
const MENU_THUMB_HEIGHT = 333;

const getMenuThumbnailSrc = (image) => {
  if (typeof image !== 'string' || !image) {
    return '';
  }

  return image.startsWith(MENU_IMAGE_ROOT)
    ? MENU_THUMB_ROOT + image.slice(MENU_IMAGE_ROOT.length)
    : image;
};

const isRepresentativeImage = (item) => item.imageType !== 'restaurant-approved';

const getCountryBranchData = (country) => {
  if (!country) {
    return [];
  }

  const key = `${country}BranchesData`;
  return Array.isArray(window[key]) ? window[key] : [];
};

const renderMenuFilters = (items, activeCategory = 'all') => {
  const filterContainer = document.getElementById('country-category-filters');
  if (!filterContainer) {
    return;
  }

  const language = getLanguage();
  const labels = interfaceText[language];
  filterContainer.setAttribute('aria-label', language === 'ar' ? 'فئات المنيو' : 'Menu categories');
  const categories = ['all', ...new Set(items.map((item) => item.category).filter(Boolean))];
  filterContainer.innerHTML = categories
    .map((category) => {
      const label = category === 'all' ? labels.all : getCategoryLabel(category, language);
      const activeClass = category === activeCategory ? 'is-active' : '';
      return `<button class="filter-chip ${activeClass}" type="button" data-filter-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">${escapeHtml(label)}</button>`;
    })
    .join('');
};

const renderMenuList = (country, selectedCategory = 'all', query = '') => {
  const container = document.getElementById('country-menu-list');
  if (!container) {
    return;
  }

  const currency = country === 'oman' ? 'OMR' : 'AED';
  const language = getLanguage();
  const labels = interfaceText[language];
  const countryItems = getCountryMenuData(country);
  const items = countryItems.filter((item) => item.country === country && item.currency === currency);
  const normalizedQuery = normalizeSearchText(query.trim());

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const haystack = normalizeSearchText([item.name_ar, item.name_en, item.description_ar, item.description_en, item.category]
      .filter(Boolean)
      .join(' '));
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  renderMenuFilters(items, selectedCategory);

  if (!filteredItems.length) {
    container.innerHTML = `<div class="empty-state">${labels.noResults}</div>`;
    return;
  }

  const groups = selectedCategory === 'all'
    ? [...new Set(filteredItems.map((item) => item.category))]
    : [selectedCategory];

  container.innerHTML = groups.map((category) => {
    const categoryItems = filteredItems.filter((item) => item.category === category);
    return `
      <section class="menu-category" aria-labelledby="menu-category-${escapeHtml(category)}">
        <div class="menu-category-heading">
          <h3 id="menu-category-${escapeHtml(category)}">${escapeHtml(getCategoryLabel(category, language))}</h3>
          <span>${categoryItems.length}</span>
        </div>
        <div class="menu-category-grid">
          ${categoryItems.map((item) => {
            const arabicName = safeText(item.name_ar, '');
            const englishName = safeText(item.name_en, '');
            const primaryName = language === 'ar' ? arabicName || englishName : englishName || arabicName;
            const secondaryName = language === 'ar' ? (englishName && englishName !== primaryName ? englishName : '') : (arabicName && arabicName !== primaryName ? arabicName : '');
            const description = safeText(language === 'ar' ? item.description_ar : item.description_en, '');
            const reviewText = labels.review;
            const priceReview = isPriceUnderReview(item);
            const priceText = priceReview ? labels.priceReview : formatItemPrice(item, language);
            const image = typeof item.image === 'string' && item.image ? item.image : '';
            const thumbSrc = getMenuThumbnailSrc(image);
            const imageMarkup = image
              ? `<img class="menu-card-image" src="${escapeHtml(thumbSrc)}" width="${MENU_THUMB_WIDTH}" height="${MENU_THUMB_HEIGHT}" alt="${escapeHtml(primaryName)}" loading="lazy" decoding="async" />`
              : '';
            const serving = safeText(language === 'ar' ? item.servings_ar : item.servings_en, '');
            const translationReview = language === 'en' && item.translationStatus === 'TRANSLATION_REVIEW_REQUIRED';
            const statusText = translationReview ? labels.translationReview : reviewText;
            const statusMarkup = item.status === 'verified' && !translationReview
              ? ''
              : `<span class="status-pill review">${statusText}</span>`;
            return `
              <article class="menu-card" data-menu-item="${escapeHtml(item.id)}">
                <button class="menu-card-trigger" type="button" data-menu-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(labels.details)}: ${escapeHtml(primaryName || labels.sourceReview)}">
                  ${imageMarkup}
                  <div class="menu-card-inner">
                    <div class="menu-card-top"><span class="category-badge">${escapeHtml(getCategoryLabel(category, language))}</span>${statusMarkup}</div>
                    <h4>${escapeHtml(primaryName || labels.sourceReview)}</h4>
                    ${secondaryName ? `<p class="menu-card-secondary" lang="${language === 'ar' ? 'en' : 'ar'}">${escapeHtml(secondaryName)}</p>` : ''}
                    ${description ? `<p class="menu-card-description">${escapeHtml(description)}</p>` : ''}
                    ${serving ? `<p class="menu-card-serving">${escapeHtml(serving)}</p>` : ''}
                    <div class="price-row"><span class="price-tag ${priceReview ? 'price-review' : ''}">${escapeHtml(priceText)}</span></div>
                  </div>
                </button>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }).join('');

  container.querySelectorAll('[data-menu-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const selectedItem = filteredItems.find((item) => item.id === button.dataset.menuId);
      if (selectedItem) {
        openMenuModal(selectedItem);
      }
    });
  });
};

const renderFeatured = (country) => {
  const container = document.getElementById('country-featured-list');
  if (!container) {
    return;
  }

  const currency = country === 'oman' ? 'OMR' : 'AED';
  const items = getCountryMenuData(country).filter((item) => item.country === country && item.currency === currency);
  const priorityCategories = ['chicken', 'meat', 'fish', 'seafood', 'family_meals', 'special-set-meals'];
  const chosen = [];

  priorityCategories.forEach((category) => {
    const item = items.find((candidate) => candidate.category === category && !chosen.includes(candidate));
    if (item && chosen.length < 3) {
      chosen.push(item);
    }
  });
  items.forEach((item) => {
    if (chosen.length < 3 && !chosen.includes(item)) {
      chosen.push(item);
    }
  });

  container.innerHTML = chosen.map((item) => {
    const language = getLanguage();
    const name = safeText(language === 'ar' ? item.name_ar : item.name_en, '')
      || safeText(language === 'ar' ? item.name_en : item.name_ar, interfaceText[language].sourceReview);
    const price = isPriceUnderReview(item)
      ? interfaceText[language].priceReview
      : formatItemPrice(item, language);
    return `
      <article class="featured-item">
        <span class="featured-category">${escapeHtml(getCategoryLabel(item.category, language))}</span>
        <h3>${escapeHtml(name)}</h3>
        <span class="price-tag ${isPriceUnderReview(item) ? 'price-review' : ''}">${escapeHtml(price)}</span>
      </article>
    `;
  }).join('');
};

const renderBranches = (country) => {
  const container = document.getElementById('country-branches-list');
  if (!container) {
    return;
  }

  const items = getCountryBranchData(country);
  if (!items.length) {
    const language = getLanguage();
    const countryInfo = restaurantsByCountry[country];
    const location = country === 'oman'
      ? (language === 'ar' ? 'صحم' : 'Saham')
      : (language === 'ar' ? 'أبوظبي' : 'Abu Dhabi');
    const region = country === 'oman'
      ? (language === 'ar' ? 'شمال الباطنة' : 'North Al Batinah Governorate')
      : (language === 'ar' ? 'الإمارات العربية المتحدة' : 'United Arab Emirates');
    const pending = language === 'ar' ? 'تفاصيل العنوان غير متاحة.' : 'Street address and branch contact details are not available.';
    container.innerHTML = `
      <article class="branch-card branch-card-featured">
        <span class="country-flag">${country === 'oman' ? '🇴🇲' : '🇦🇪'}</span>
        <div><h3>${escapeHtml(location)}</h3><p>${escapeHtml(region || countryInfo?.region || '')}</p></div>
        <p class="branch-note">${pending}</p>
      </article>
    `;
    return;
  }

  container.innerHTML = items
    .map((branch) => {
      const language = getLanguage();
      const phones = Array.isArray(branch.phones) ? branch.phones : [];
      return `
        <article class="branch-card branch-card-featured">
          <span class="country-flag">${country === 'oman' ? '🇴🇲' : '🇦🇪'}</span>
          <h3>${escapeHtml(safeText(language === 'ar' ? branch.name_ar : branch.name_en, ''))}</h3>
          <p>${escapeHtml(safeText(language === 'ar' ? branch.city_ar : branch.city, ''))}</p>
          <p>${escapeHtml(safeText(language === 'ar' ? branch.region_ar : branch.region, ''))}</p>
          <div class="branch-phone-list" aria-label="${language === 'ar' ? 'أرقام الهاتف' : 'Phone numbers'}">
            ${phones.map((phone) => `<a class="meta-pill" href="tel:${escapeHtml(phone.href)}">${escapeHtml(phone.number)}</a>`).join('')}
          </div>
        </article>
      `;
    })
    .join('');
};

const renderGallery = (country) => {
  const container = document.getElementById('country-gallery-grid');
  if (!container) {
    return;
  }

  const language = getLanguage();
  const galleryData = window.galleryPlaceholders?.[country]?.images || [];
  container.innerHTML = galleryData.map((image) => {
    const caption = language === 'ar' ? image.caption_ar : image.caption_en;
    const tileClass = image.imageType === 'supplied-brand-asset' ? 'gallery-logo' : 'gallery-photo';
    const dimensions = tileClass === 'gallery-logo' ? '' : ' width="900" height="600"';
    return `
      <figure class="gallery-tile ${tileClass}" data-image-type="${escapeHtml(image.imageType)}">
        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(caption)}"${dimensions} loading="lazy" decoding="async" />
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>
    `;
  }).join('');
};

const renderDelivery = (country) => {
  const container = document.getElementById('country-delivery-list');
  if (!container) {
    return;
  }

  const data = window.deliveryLinksData?.[country] || {
    status: 'coming-soon',
    label_ar: 'قريبًا',
    label_en: 'Coming Soon'
  };
  const language = getLanguage();
  const status = language === 'ar' ? data.label_ar : data.label_en;
  const heading = language === 'ar' ? 'طلبات التوصيل' : 'Delivery';
  const description = language === 'ar' ? 'سيتم الإعلان عن روابط التوصيل الرسمية لاحقًا.' : 'Official delivery links will be shared when confirmed.';
  const cards = [
    {
      platform: heading,
      status: status || 'Coming Soon',
      description
    }
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <article class="delivery-card">
          <h3>${card.platform}</h3>
          <p>${card.status}</p>
          <p>${card.description}</p>
          <div class="meta-row">
            <span class="meta-pill">${card.status}</span>
          </div>
        </article>
      `
    )
    .join('');
};

const openMenuModal = (item) => {
  const modalBackdrop = document.getElementById('menu-item-modal-backdrop');
  const modalContent = document.getElementById('menu-item-modal-content');
  if (!modalBackdrop || !modalContent) {
    return;
  }

  lastMenuTrigger = document.activeElement;
  const language = getLanguage();
  const labels = interfaceText[language];
  const image = typeof item.image === 'string' && item.image ? item.image : '';
  const arabicName = safeText(item.name_ar, '');
  const englishName = safeText(item.name_en, '');
  const name = language === 'ar' ? arabicName || englishName : englishName || arabicName;
  const serving = safeText(language === 'ar' ? item.servings_ar : item.servings_en, '');
  const imageMarkup = image
    ? `<figure class="menu-modal-figure">
        <img class="menu-modal-image" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" />
        ${isRepresentativeImage(item) ? `<figcaption class="menu-modal-caption">${escapeHtml(labels.representativeImage)}</figcaption>` : ''}
      </figure>`
    : '';
  const description = safeText(language === 'ar' ? item.description_ar : item.description_en, labels.descriptionPending);
  const priceReview = isPriceUnderReview(item);
  const priceText = priceReview
    ? labels.priceReview
    : formatCurrency(item.currency, item.price, language);

  modalContent.innerHTML = `
    ${imageMarkup}
    <div class="modal-content-header">
      <div>
        <p class="eyebrow">${labels.details}</p>
        <h3 id="menu-item-modal-title">${escapeHtml(name || labels.sourceReview)}</h3>
        ${language === 'ar' && englishName ? `<p lang="en" dir="ltr">${escapeHtml(englishName)}</p>` : ''}
        ${language === 'en' && arabicName ? `<p lang="ar" dir="rtl">${escapeHtml(arabicName)}</p>` : ''}
      </div>
      <span class="price-tag ${priceReview ? 'price-review' : ''}">${escapeHtml(priceText)}</span>
    </div>
    <div class="modal-body">
      <p>${escapeHtml(description)}</p>
      ${serving ? `<p class="menu-card-serving">${escapeHtml(serving)}</p>` : ''}
      <div class="meta-row">
        <span class="meta-pill">${item.country === 'oman' ? 'Oman' : 'UAE'} · ${item.currency}</span>
        <span class="meta-pill">${escapeHtml(getCategoryLabel(item.category, language))}</span>
        ${language === 'en' && item.translationStatus === 'TRANSLATION_REVIEW_REQUIRED' ? `<span class="meta-pill">${labels.translationReview}</span>` : ''}
      </div>
    </div>
  `;

  modalBackdrop.hidden = false;
  modalBackdrop.querySelector('.modal-close')?.focus();
};

const closeMenuModal = () => {
  const modalBackdrop = document.getElementById('menu-item-modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.hidden = true;
  }
  if (lastMenuTrigger instanceof HTMLElement && lastMenuTrigger.isConnected) {
    lastMenuTrigger.focus();
  }
  lastMenuTrigger = null;
};

const setupCountryPage = () => {
  const country = document.body.dataset.country;
  if (!country) {
    return;
  }

  const menuSearch = document.getElementById('country-menu-search');
  let selectedCategory = 'all';

  renderMenuList(country, selectedCategory, menuSearch ? menuSearch.value : '');
  renderFeatured(country);
  renderBranches(country);
  renderGallery(country);
  renderDelivery(country);

  if (menuSearch) {
    menuSearch.addEventListener('input', (event) => {
      renderMenuList(country, selectedCategory, event.target.value);
    });
  }

  document.addEventListener('kamran-language-change', () => {
    renderMenuList(country, selectedCategory, menuSearch ? menuSearch.value : '');
    renderFeatured(country);
    renderBranches(country);
    renderGallery(country);
    renderDelivery(country);
  });

  const filterContainer = document.getElementById('country-category-filters');
  if (filterContainer) {
    filterContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter-category]');
      if (!button) {
        return;
      }
      selectedCategory = button.dataset.filterCategory;
      renderMenuList(country, selectedCategory, menuSearch ? menuSearch.value : '');
    });
  }

  const modalBackdrop = document.getElementById('menu-item-modal-backdrop');
  const closeButton = document.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeMenuModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (event) => {
      if (event.target === modalBackdrop) {
        closeMenuModal();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (!modalBackdrop || modalBackdrop.hidden) {
      return;
    }
    if (event.key === 'Escape') {
      closeMenuModal();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...modalBackdrop.querySelectorAll('button, a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
};

const setupMobileMenu = () => {
  const toggleButton = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggleButton || !nav) {
    return;
  }

  toggleButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggleButton.setAttribute('aria-expanded', 'false');
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const copyrightYear = document.getElementById('copyright-year');
  if (copyrightYear) {
    copyrightYear.textContent = String(new Date().getFullYear());
  }

  applyLanguagePreference(getStoredLanguage());

  document.addEventListener('click', (event) => {
    const languageButton = event.target.closest('[data-language-toggle]');
    if (!languageButton) {
      return;
    }
    applyLanguagePreference(document.documentElement.lang === 'ar' ? 'en' : 'ar');
  });

  setupMobileMenu();
  setupCountryPage();

  const isDevelopment = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  const currentCountry = document.body.dataset.country;
  if (isDevelopment && currentCountry && restaurantsByCountry[currentCountry]) {
    console.info(`Country data loaded: ${currentCountry}`);
  }

  if (isDevelopment && typeof window.getMenuValidationReport === 'function') {
    ['oman', 'uae'].forEach((country) => {
      const items = window[`${country}MenuData`];
      if (Array.isArray(items)) {
        console.info('Menu validation report', window.getMenuValidationReport(country, items));
      }
    });
  }
});

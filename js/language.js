const languageConfig = {
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en'],
  storageKey: 'kamran-language-preference',
  // TODO: Add actual translations when content is finalized.
  translations: {
    ar: {
      selectLocation: 'اختر موقعك',
      chooseLocation: 'Choose your location',
      countryPlaceholder: 'CONTENT_REVIEW_REQUIRED'
    },
    en: {
      selectLocation: 'Choose your location',
      chooseLocation: 'Choose your location',
      countryPlaceholder: 'CONTENT_REVIEW_REQUIRED'
    }
  }
};

function getStoredLanguage() {
  try {
    const saved = localStorage.getItem(languageConfig.storageKey);
    return languageConfig.supportedLanguages.includes(saved) ? saved : languageConfig.defaultLanguage;
  } catch (error) {
    return languageConfig.defaultLanguage;
  }
}

function applyLanguagePreference(language = getStoredLanguage()) {
  if (!languageConfig.supportedLanguages.includes(language)) {
    language = languageConfig.defaultLanguage;
  }

  const html = document.documentElement;
  html.lang = language;
  html.dir = language === 'ar' ? 'rtl' : 'ltr';

  const title = document.querySelector('title');
  if (title) {
    const localizedTitle = title.getAttribute(`data-title-${language}`);
    if (localizedTitle) {
      document.title = localizedTitle;
    }
  }

  try {
    localStorage.setItem(languageConfig.storageKey, language);
  } catch (error) {
    // localStorage may be blocked in some environments; fail silently.
  }

  document.querySelectorAll('[data-language-toggle]').forEach((button) => {
    const nextLanguage = language === 'ar' ? 'en' : 'ar';
    button.textContent = nextLanguage.toUpperCase();
    button.setAttribute('data-language-toggle', nextLanguage);
    button.setAttribute('aria-label', `Switch language to ${nextLanguage === 'ar' ? 'Arabic' : 'English'}`);
  });

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const translation = element.getAttribute(`data-${language}`);
    if (translation !== null) {
      element.textContent = translation;
    }
  });

  document.querySelectorAll('[data-placeholder-ar][data-placeholder-en]').forEach((element) => {
    element.placeholder = element.getAttribute(`data-placeholder-${language}`);
  });

  document.querySelectorAll('[data-label-ar][data-label-en]').forEach((element) => {
    element.setAttribute('aria-label', element.getAttribute(`data-label-${language}`));
  });

  document.querySelectorAll('[data-alt-ar][data-alt-en]').forEach((element) => {
    element.alt = element.getAttribute(`data-alt-${language}`);
  });

  document.dispatchEvent(new CustomEvent('kamran-language-change', { detail: { language } }));
}

window.languageConfig = languageConfig;
window.getStoredLanguage = getStoredLanguage;
window.applyLanguagePreference = applyLanguagePreference;

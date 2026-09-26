const restaurantsByCountry = {
  oman: {
    country: "oman",
    currency: "OMR",
    region: "North Al Batinah Governorate",
    wilaya: "Saham / صحم",
    branchesCount: 1,
    label: {
      ar: "عُمان",
      en: "Oman"
    },
    language: {
      ar: "ar",
      en: "en"
    },
    // TODO: Add official Oman branch details when confirmed.
    notes: "CONTENT_REVIEW_REQUIRED"
  },
  uae: {
    country: "uae",
    currency: "AED",
    region: "Abu Dhabi",
    wilaya: "Abu Dhabi / أبوظبي",
    branchesCount: 1,
    label: {
      ar: "الإمارات",
      en: "UAE"
    },
    language: {
      ar: "ar",
      en: "en"
    },
    // TODO: Add official UAE branch details when confirmed.
    notes: "CONTENT_REVIEW_REQUIRED"
  }
};

window.restaurantsByCountry = restaurantsByCountry;

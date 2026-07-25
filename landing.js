(() => {
  "use strict";

  const doc = document;
  const body = doc.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, root = doc) => root.querySelector(selector);
  const $$ = (selector, root = doc) => Array.from(root.querySelectorAll(selector));

  const translations = {
    en: {
      deadlineLabel: "Crop loss alert",
      deadlineText: "Localized and post-harvest losses should be reported within 72 hours.",
      trackNow: "Track a claim",
      navWhy: "Why Nyay Setu",
      navCoverage: "Coverage guide",
      navJourney: "Claim journey",
      navFaq: "FAQs",
      trackClaim: "Track claim",
      login: "Login",
      heroEyebrow: "Farmer-first evidence platform",
      heroTitle: "From damaged field to <span>fair decision.</span>",
      heroLead: "File crop damage evidence once. Nyay Setu AI connects photos, weather records, officer review, and a tamper-evident audit trail—so every decision is easier to understand.",
      fileClaim: "File farmer claim",
      checkStatus: "Check claim status",
      signalOne: "AI-assisted, officer-decided",
      signalTwo: "Weather evidence cross-check",
      signalThree: "Appeal-ready decision history",
      fieldPulse: "Field evidence pulse",
      weatherMatch: "Weather match",
      aiReview: "AI review",
      visualCaption: "One claim. Every signal in context.",
      cropExample: "Crop example",
      season: "Season",
      commonRisk: "Common risk",
      liveLedger: "Live prototype ledger",
      ledgerLoading: "Loading verified platform activity…",
      prototypeBadge: "Demo environment",
      statClaims: "Claims in ledger",
      statApproved: "Officer approved",
      statWeather: "Weather verified",
      statBlocks: "Audit blocks secured",
      whyEyebrow: "Evidence before assumptions",
      whyTitle: "A clearer claim for every side.",
      whyLead: "Built to help farmers submit stronger evidence and help officers review it without losing the human decision.",
      featureOneTitle: "Guided field evidence",
      featureOneText: "Location, crop details, damage type, and photos stay connected in one claim record.",
      featureTwoTitle: "AI + weather context",
      featureTwoText: "Damage analysis and weather telemetry help surface inconsistencies for officer review.",
      featureThreeTitle: "Explainable decisions",
      featureThreeText: "Approvals, rejections, reasons, and appeals remain visible across the claim timeline.",
      coverageEyebrow: "Know before you file",
      coverageTitle: "Crop cover, explained without the paperwork maze.",
      coverageLead: "Use this quick guide to understand common PMFBY crop groups, insured risks, and the first steps after crop loss. Final eligibility depends on your notified crop, area, and policy.",
      hoursTitle: "hours can matter",
      hoursText: "For localized calamity and post-harvest loss, notify the insurer or relevant authority quickly—typically within 72 hours.",
      tabCrops: "Crops",
      tabRisks: "Risks",
      tabSteps: "First steps",
      cropsIntro: "Common notified crop groups under PMFBY:",
      cropsNote: "Coverage varies by state, season, notified area, and crop.",
      risksIntro: "Common insured events may include:",
      stepOneTitle: "Make the loss safe to document",
      stepOneText: "Capture clear photos without putting yourself at risk.",
      stepTwoTitle: "Record place and time",
      stepTwoText: "Keep location, crop, date, and damage type ready.",
      stepThreeTitle: "Intimate quickly",
      stepThreeText: "Use the official channel linked to your policy or local authority.",
      journeyEyebrow: "One connected timeline",
      journeyTitle: "See where the claim is—and why.",
      journeyLead: "Every checkpoint adds evidence or a human decision, keeping the farmer informed from upload to appeal.",
      journeyOne: "Claim filed",
      journeyOneText: "Photos, crop, loss, and location submitted.",
      journeyTwo: "AI evidence review",
      journeyTwoText: "Image signals and confidence summarized.",
      journeyThree: "Weather checked",
      journeyThreeText: "Conditions compared with the reported loss.",
      journeyFour: "Officer decides",
      journeyFourText: "Evidence reviewed with written reasoning.",
      journeyFive: "Audit secured",
      journeyFiveText: "Decision proof enters the prototype ledger.",
      journeySix: "Appeal available",
      journeySixText: "Farmer can challenge with additional evidence.",
      forFarmers: "For farmers",
      farmerPortalTitle: "Your field story, submitted clearly.",
      farmerPortalText: "File evidence, follow each verification stage, read the officer’s reason, and appeal when needed.",
      enterFarmer: "Enter farmer portal",
      forOfficers: "For officers",
      officerPortalTitle: "Evidence organized for accountable review.",
      officerPortalText: "Prioritize claim queues, compare AI and weather evidence, record a reasoned decision, and review appeals.",
      enterOfficer: "Enter officer portal",
      faqEyebrow: "Frequently asked",
      faqTitle: "Quick answers before you begin.",
      faqLead: "Nyay Setu is a decision-support prototype. Official coverage, timelines, and settlement remain governed by your insurer and scheme rules.",
      trackExisting: "Track an existing claim",
      faqOneQ: "Does AI approve or reject my claim?",
      faqOneA: "No. AI organizes image and evidence signals. An authorized officer makes and records the final decision.",
      faqTwoQ: "What should I prepare before filing?",
      faqTwoA: "Keep crop and damage details, location, incident date, clear field photos, and the policy or enrolment reference available.",
      faqThreeQ: "Can I appeal a rejection?",
      faqThreeA: "Yes. The farmer portal keeps the decision reason visible and allows an appeal with a written reason and additional evidence.",
      faqFourQ: "Is the audit trail on a public blockchain?",
      faqFourA: "The current repository demonstrates a local proof-of-work ledger. It is a prototype audit trail, not a live public-chain settlement system.",
      ctaEyebrow: "Field to decision, connected",
      ctaTitle: "Give your crop claim a clearer path.",
      startClaim: "Start a claim",
      footerText: "A farmer-first prototype for transparent crop claim evidence and review.",
      explore: "Explore",
      access: "Access",
      farmerLogin: "Farmer login",
      officerLogin: "Officer login",
      prototypeFooter: "Prototype for transparent agricultural claims.",
      backTop: "Back to top",
      trackerEyebrow: "Claim tracker",
      trackerTitle: "Find your claim in the ledger.",
      trackerText: "Enter the full claim ID from your submission receipt.",
      claimIdLabel: "Claim ID",
      findClaim: "Find claim",
      trySample: "Use a demo claim",
      trackerNote: "Status shown here is from this prototype ledger and is not an insurer settlement confirmation."
    },
    hi: {
      deadlineLabel: "फसल नुकसान सूचना",
      deadlineText: "स्थानीय और कटाई के बाद के नुकसान की सूचना 72 घंटे के भीतर दें।",
      trackNow: "दावा देखें",
      navWhy: "न्याय सेतु क्यों",
      navCoverage: "कवरेज गाइड",
      navJourney: "दावे की यात्रा",
      navFaq: "सवाल",
      trackClaim: "दावा ट्रैक करें",
      login: "लॉगिन",
      heroEyebrow: "किसान-प्रथम साक्ष्य मंच",
      heroTitle: "खराब खेत से <span>निष्पक्ष फैसले तक।</span>",
      heroLead: "फसल नुकसान का साक्ष्य एक बार जमा करें। न्याय सेतु AI फोटो, मौसम रिकॉर्ड, अधिकारी समीक्षा और पारदर्शी ऑडिट ट्रेल को जोड़ता है।",
      fileClaim: "किसान दावा दर्ज करें",
      checkStatus: "दावे की स्थिति देखें",
      signalOne: "AI सहायता, अधिकारी का फैसला",
      signalTwo: "मौसम साक्ष्य की जाँच",
      signalThree: "अपील के लिए पूरा इतिहास",
      fieldPulse: "खेत साक्ष्य संकेत",
      weatherMatch: "मौसम मिलान",
      aiReview: "AI समीक्षा",
      visualCaption: "एक दावा। हर संकेत सही संदर्भ में।",
      cropExample: "फसल उदाहरण",
      season: "मौसम",
      commonRisk: "सामान्य जोखिम",
      liveLedger: "लाइव प्रोटोटाइप लेजर",
      ledgerLoading: "प्लेटफ़ॉर्म गतिविधि लोड हो रही है…",
      prototypeBadge: "डेमो वातावरण",
      statClaims: "लेजर में दावे",
      statApproved: "अधिकारी द्वारा स्वीकृत",
      statWeather: "मौसम सत्यापित",
      statBlocks: "सुरक्षित ऑडिट ब्लॉक",
      whyEyebrow: "अनुमान से पहले साक्ष्य",
      whyTitle: "हर पक्ष के लिए साफ़ दावा।",
      whyLead: "किसानों को मजबूत साक्ष्य जमा करने और अधिकारियों को मानवीय निर्णय बनाए रखते हुए समीक्षा करने में मदद करता है।",
      featureOneTitle: "मार्गदर्शित खेत साक्ष्य",
      featureOneText: "स्थान, फसल, नुकसान का प्रकार और फोटो एक ही दावा रिकॉर्ड में जुड़े रहते हैं।",
      featureTwoTitle: "AI + मौसम संदर्भ",
      featureTwoText: "नुकसान विश्लेषण और मौसम डेटा अधिकारी समीक्षा के लिए असंगतियाँ सामने लाते हैं।",
      featureThreeTitle: "समझने योग्य फैसले",
      featureThreeText: "स्वीकृति, अस्वीकृति, कारण और अपील पूरे दावा टाइमलाइन में दिखाई देते हैं।",
      coverageEyebrow: "दावा करने से पहले जानें",
      coverageTitle: "फसल कवरेज, सरल भाषा में।",
      coverageLead: "PMFBY की सामान्य फसल श्रेणियाँ, बीमित जोखिम और नुकसान के बाद पहले कदम समझें। अंतिम पात्रता अधिसूचित फसल, क्षेत्र और पॉलिसी पर निर्भर है।",
      hoursTitle: "घंटे महत्वपूर्ण हैं",
      hoursText: "स्थानीय आपदा और कटाई के बाद के नुकसान की सूचना आमतौर पर 72 घंटे के भीतर दें।",
      tabCrops: "फसलें",
      tabRisks: "जोखिम",
      tabSteps: "पहले कदम",
      cropsIntro: "PMFBY की सामान्य अधिसूचित फसल श्रेणियाँ:",
      cropsNote: "कवरेज राज्य, मौसम, अधिसूचित क्षेत्र और फसल के अनुसार बदलता है।",
      risksIntro: "सामान्य बीमित घटनाएँ:",
      stepOneTitle: "नुकसान सुरक्षित रूप से दर्ज करें",
      stepOneText: "अपनी सुरक्षा का ध्यान रखते हुए साफ़ फोटो लें।",
      stepTwoTitle: "स्थान और समय लिखें",
      stepTwoText: "स्थान, फसल, तारीख और नुकसान का प्रकार तैयार रखें।",
      stepThreeTitle: "जल्दी सूचना दें",
      stepThreeText: "अपनी पॉलिसी या स्थानीय अधिकारी से जुड़े आधिकारिक माध्यम का उपयोग करें।",
      journeyEyebrow: "एक जुड़ी हुई टाइमलाइन",
      journeyTitle: "जानें दावा कहाँ है—और क्यों।",
      journeyLead: "हर चरण साक्ष्य या मानवीय फैसला जोड़ता है, जिससे किसान अपलोड से अपील तक सूचित रहता है।",
      journeyOne: "दावा दर्ज",
      journeyOneText: "फोटो, फसल, नुकसान और स्थान जमा।",
      journeyTwo: "AI साक्ष्य समीक्षा",
      journeyTwoText: "छवि संकेत और विश्वास सारांश।",
      journeyThree: "मौसम जाँच",
      journeyThreeText: "रिपोर्ट किए नुकसान से मौसम का मिलान।",
      journeyFour: "अधिकारी फैसला",
      journeyFourText: "लिखित कारण के साथ साक्ष्य समीक्षा।",
      journeyFive: "ऑडिट सुरक्षित",
      journeyFiveText: "फैसले का प्रमाण प्रोटोटाइप लेजर में।",
      journeySix: "अपील उपलब्ध",
      journeySixText: "किसान अतिरिक्त साक्ष्य के साथ चुनौती दे सकता है।",
      forFarmers: "किसानों के लिए",
      farmerPortalTitle: "आपके खेत की कहानी, साफ़ तरीके से जमा।",
      farmerPortalText: "साक्ष्य दर्ज करें, हर चरण देखें, अधिकारी का कारण पढ़ें और जरूरत पर अपील करें।",
      enterFarmer: "किसान पोर्टल खोलें",
      forOfficers: "अधिकारियों के लिए",
      officerPortalTitle: "जवाबदेह समीक्षा के लिए व्यवस्थित साक्ष्य।",
      officerPortalText: "दावा कतार, AI और मौसम साक्ष्य, कारण सहित फैसला और अपील समीक्षा।",
      enterOfficer: "अधिकारी पोर्टल खोलें",
      faqEyebrow: "अक्सर पूछे सवाल",
      faqTitle: "शुरू करने से पहले छोटे जवाब।",
      faqLead: "न्याय सेतु निर्णय-सहायता प्रोटोटाइप है। आधिकारिक कवरेज और भुगतान बीमाकर्ता तथा योजना नियमों के अनुसार होते हैं।",
      trackExisting: "मौजूदा दावा ट्रैक करें",
      faqOneQ: "क्या AI मेरा दावा मंजूर या नामंजूर करता है?",
      faqOneA: "नहीं। AI छवि और साक्ष्य संकेत व्यवस्थित करता है। अंतिम फैसला अधिकृत अधिकारी दर्ज करता है।",
      faqTwoQ: "दावा करने से पहले क्या तैयार रखें?",
      faqTwoA: "फसल और नुकसान विवरण, स्थान, घटना तारीख, साफ़ फोटो और पॉलिसी या नामांकन संदर्भ तैयार रखें।",
      faqThreeQ: "क्या अस्वीकृति पर अपील कर सकता हूँ?",
      faqThreeA: "हाँ। किसान पोर्टल में फैसले का कारण दिखता है और अतिरिक्त साक्ष्य के साथ अपील की जा सकती है।",
      faqFourQ: "क्या ऑडिट ट्रेल सार्वजनिक ब्लॉकचेन पर है?",
      faqFourA: "वर्तमान रिपॉजिटरी स्थानीय प्रूफ-ऑफ-वर्क लेजर दिखाती है। यह प्रोटोटाइप है, लाइव सार्वजनिक-चेन भुगतान प्रणाली नहीं।",
      ctaEyebrow: "खेत से फैसले तक",
      ctaTitle: "अपने फसल दावे को साफ़ रास्ता दें।",
      startClaim: "दावा शुरू करें",
      footerText: "पारदर्शी फसल दावा साक्ष्य और समीक्षा के लिए किसान-प्रथम प्रोटोटाइप।",
      explore: "देखें",
      access: "प्रवेश",
      farmerLogin: "किसान लॉगिन",
      officerLogin: "अधिकारी लॉगिन",
      prototypeFooter: "पारदर्शी कृषि दावों का प्रोटोटाइप।",
      backTop: "ऊपर जाएँ",
      trackerEyebrow: "दावा ट्रैकर",
      trackerTitle: "लेजर में अपना दावा खोजें।",
      trackerText: "जमा रसीद से पूरा दावा ID दर्ज करें।",
      claimIdLabel: "दावा ID",
      findClaim: "दावा खोजें",
      trySample: "डेमो दावा उपयोग करें",
      trackerNote: "यह स्थिति प्रोटोटाइप लेजर से है और बीमाकर्ता भुगतान की पुष्टि नहीं है।"
    }
  };

  const cropExamples = {
    paddy: { name: "Rice (Paddy)", season: "Kharif", risk: "Flood / drought" },
    wheat: { name: "Wheat", season: "Rabi", risk: "Hail / unseasonal rain" },
    cotton: { name: "Cotton", season: "Kharif", risk: "Pest / dry spell" }
  };

  const statusLabels = {
    pending_ai: "AI review",
    pending_weather: "Weather check",
    pending_officer: "Officer review",
    approved: "Approved",
    rejected: "Rejected",
    appealed: "Under appeal",
    flagged: "Needs evidence"
  };

  const menuToggle = $("#menuToggle");
  const navMenu = $("#navMenu");
  const siteHeader = $("#siteHeader");
  const scrollProgress = $("#scrollProgress");
  const languageSelect = $("#languageSelect");
  const claimDialog = $("#claimDialog");
  const claimForm = $("#claimLookupForm");
  const claimInput = $("#claimId");
  const claimResult = $("#claimResult");

  function setMenu(open) {
    menuToggle.setAttribute("aria-expanded", String(open));
    navMenu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
  }

  menuToggle.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  $$("#navMenu a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1080) setMenu(false);
  });

  function updateScrollUi() {
    const scrollable = doc.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    scrollProgress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  window.addEventListener("scroll", updateScrollUi, { passive: true });
  updateScrollUi();

  if (reduceMotion) {
    $$(".reveal").forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px" });
    $$(".reveal").forEach((element) => revealObserver.observe(element));
  }

  const navLinks = $$("#navMenu a");
  const trackedSections = navLinks
    .map((link) => $(link.getAttribute("href")))
    .filter(Boolean);

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-38% 0px -55% 0px", threshold: 0 });
  trackedSections.forEach((section) => navObserver.observe(section));

  $$(".crop-button").forEach((button) => {
    button.addEventListener("click", () => {
      const example = cropExamples[button.dataset.crop];
      if (!example) return;
      $$(".crop-button").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      $("#cropName").textContent = example.name;
      $("#cropSeason").textContent = example.season;
      $("#cropRisk").textContent = example.risk;
      const readout = $("#cropReadout");
      readout.classList.remove("is-changing");
      void readout.offsetWidth;
      readout.classList.add("is-changing");
    });
  });

  $$(".guide-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      $$(".guide-tab").forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
      });
      $$(".guide-panel").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== target;
      });
    });

    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const tabs = $$(".guide-tab");
      const current = tabs.indexOf(tab);
      const next = event.key === "ArrowRight"
        ? (current + 1) % tabs.length
        : (current - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  $$(".faq-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      $$(".faq-item button").forEach((item) => {
        const open = item === button && willOpen;
        item.setAttribute("aria-expanded", String(open));
        const answer = $(`#${item.getAttribute("aria-controls")}`);
        if (answer) answer.hidden = !open;
      });
    });
  });

  function applyLanguage(language) {
    const locale = translations[language] ? language : "en";
    doc.documentElement.lang = locale;
    languageSelect.value = locale;
    $$("[data-i18n]").forEach((element) => {
      const value = translations[locale][element.dataset.i18n];
      if (value) element.textContent = value;
    });
    $$("[data-i18n-html]").forEach((element) => {
      const value = translations[locale][element.dataset.i18nHtml];
      if (value) element.innerHTML = value;
    });
    try {
      localStorage.setItem("nyay_language", locale);
    } catch {
      // Language preference is optional.
    }
  }

  let preferredLanguage = "en";
  try {
    preferredLanguage = localStorage.getItem("nyay_language") || "en";
  } catch {
    preferredLanguage = "en";
  }
  applyLanguage(preferredLanguage);
  languageSelect.addEventListener("change", (event) => applyLanguage(event.target.value));

  function openClaimDialog() {
    setMenu(false);
    claimResult.hidden = true;
    claimResult.classList.remove("is-error");
    if (typeof claimDialog.showModal === "function") {
      claimDialog.showModal();
      window.setTimeout(() => claimInput.focus(), 40);
    } else {
      claimDialog.setAttribute("open", "");
      claimInput.focus();
    }
  }

  function closeClaimDialog() {
    if (typeof claimDialog.close === "function") claimDialog.close();
    else claimDialog.removeAttribute("open");
  }

  $$("[data-open-claim]").forEach((button) => button.addEventListener("click", openClaimDialog));
  $$("[data-close-dialog]").forEach((button) => button.addEventListener("click", closeClaimDialog));
  claimDialog.addEventListener("click", (event) => {
    if (event.target === claimDialog) closeClaimDialog();
  });

  async function fetchClaims() {
    const response = await fetch("/api/claims", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Claim service unavailable");
    const claims = await response.json();
    if (!Array.isArray(claims)) throw new Error("Unexpected claim response");
    return claims;
  }

  function showClaimError(message) {
    claimResult.hidden = false;
    claimResult.classList.add("is-error");
    claimResult.textContent = message;
  }

  function showClaim(claim) {
    const created = claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : "Not recorded";
    const status = statusLabels[claim.status] || String(claim.status || "In review").replaceAll("_", " ");
    claimResult.classList.remove("is-error");
    claimResult.hidden = false;
    claimResult.innerHTML = `
      <div class="claim-result-header">
        <strong>${escapeHtml(claim.id)}</strong>
        <span class="status-pill">${escapeHtml(status)}</span>
      </div>
      <div class="claim-result-grid">
        <span>Crop<strong>${escapeHtml(claim.cropType || "Not recorded")}</strong></span>
        <span>Damage<strong>${escapeHtml(claim.damageType || "Not recorded")}</strong></span>
        <span>Filed<strong>${escapeHtml(created)}</strong></span>
        <span>Stage<strong>${escapeHtml(status)}</strong></span>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  claimForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = claimInput.value.trim();
    if (!id) return;
    claimResult.hidden = false;
    claimResult.classList.remove("is-error");
    claimResult.textContent = "Checking the prototype ledger…";
    try {
      const claims = await fetchClaims();
      const match = claims.find((claim) => String(claim.id).toLowerCase() === id.toLowerCase());
      if (!match) {
        showClaimError("No claim was found with that exact ID. Check the receipt and try again.");
        return;
      }
      showClaim(match);
    } catch {
      showClaimError("The claim tracker is available when the Nyay Setu server is running. Please try again from the live app.");
    }
  });

  $("#sampleClaimButton").addEventListener("click", async () => {
    claimResult.hidden = false;
    claimResult.classList.remove("is-error");
    claimResult.textContent = "Loading a demo claim…";
    try {
      const claims = await fetchClaims();
      if (!claims.length) {
        showClaimError("No demo claims are available yet.");
        return;
      }
      claimInput.value = claims[0].id;
      showClaim(claims[0]);
    } catch {
      showClaimError("Demo claims are available when the Nyay Setu server is running.");
    }
  });

  function animateValue(element, target, suffix = "") {
    if (reduceMotion) {
      element.textContent = `${target.toLocaleString("en-IN")}${suffix}`;
      return;
    }
    const start = performance.now();
    const duration = 900;
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${Math.round(target * eased).toLocaleString("en-IN")}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  async function loadStats() {
    try {
      const response = await fetch("/api/stats", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Stats unavailable");
      const stats = await response.json();
      const values = {
        totalClaims: [Number(stats.totalClaims) || 0, ""],
        approvedClaims: [Number(stats.approvedClaims) || 0, ""],
        weatherVerifiedPercentage: [Number(stats.weatherVerifiedPercentage) || 0, "%"],
        totalSecuredBlocks: [Number(stats.totalSecuredBlocks) || 0, ""]
      };
      Object.entries(values).forEach(([key, [value, suffix]]) => {
        const element = $(`[data-stat="${key}"]`);
        if (element) animateValue(element, value, suffix);
      });
      $("#statsStatus").textContent = "Connected to current application data.";
    } catch {
      $$("[data-stat]").forEach((element) => {
        element.textContent = "—";
      });
      $("#statsStatus").textContent = "Live figures appear when the Nyay Setu server is running.";
    }
  }

  loadStats();
  $("#year").textContent = new Date().getFullYear();
})();

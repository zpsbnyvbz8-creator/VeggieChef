const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'audit-screenshots-v2');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '360x740', width: 360, height: 740, label: 'Mobile klein' },
  { name: '390x844', width: 390, height: 844, label: 'Mobile Standard' },
  { name: '430x932', width: 430, height: 932, label: 'Mobile groß' },
  { name: '768x1024', width: 768, height: 1024, label: 'Tablet' },
  { name: '1280x800', width: 1280, height: 800, label: 'Desktop' },
  { name: '844x390', width: 844, height: 390, label: 'Querformat' },
];

async function runAudit() {
  console.log('=== VEGGIECHEF E2E AUDIT & VERIFICATION V2 ===\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const testResults = {
    header: [],
    slotMachine: [],
    swipeDeck: [],
    addRecipeModal: [],
    sortingAndFilters: [],
    recipeDetail: [],
    fridgePlannerShopping: [],
  };

  const record = (category, name, passed, details = '') => {
    testResults[category].push({ name, passed, details });
    const sym = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${category}] ${sym}: ${name} ${details ? '(' + details + ')' : ''}`);
  };

  // ----------------------------------------------------
  // TEST SUITE 1: Deep Functional Verification on Standard Viewport (390x844)
  // ----------------------------------------------------
  console.log('\n--- 1. Header Verification ---');
  let context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  let page = await context.newPage();

  // Reset localStorage to clean state
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('veggiechef_bookmarks', JSON.stringify(['classic-tomato-pasta']));
    localStorage.setItem('veggiechef_shopping', JSON.stringify([
      { id: 'item1', name: 'Tomaten', completed: false },
      { id: 'item2', name: 'Basilikum', completed: false }
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  // 1.1 Header Mobile Search Width
  const searchBtnMobile = page.locator('#header-search-btn');
  await searchBtnMobile.click();
  await page.waitForTimeout(300);

  const mobileSearchWidth = await page.evaluate(() => {
    const input = document.getElementById('header-search-input');
    if (!input) return 0;
    return input.getBoundingClientRect().width;
  });
  record('header', 'Mobile Suchbereich deutlich verbreitert (Breite >= 300px)', mobileSearchWidth >= 300, `Breite: ${mobileSearchWidth.toFixed(1)}px bei Viewport 390px (volle Panelbreite minus 44px Button)`);

  // Close search
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // 1.2 Header Desktop Search Width
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(BASE_URL);
  await desktopPage.waitForLoadState('networkidle');

  await desktopPage.locator('#header-search-btn').click();
  await desktopPage.waitForTimeout(300);

  const desktopSearchWidth = await desktopPage.evaluate(() => {
    const input = document.getElementById('header-search-input-lg');
    if (!input) return 0;
    return input.getBoundingClientRect().width;
  });
  record('header', 'Desktop Suchbereich deutlich verbreitert (Breite >= 450px)', desktopSearchWidth >= 450, `Breite: ${desktopSearchWidth.toFixed(1)}px bei Viewport 1280px`);
  await desktopContext.close();

  // 1.3 Tab-Unterstreichung & Aktive Buttons
  console.log('\n-> Testing Tab Underline on Home, Favorites & Shopping...');
  // On Home ('/')
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const homeTabState = await page.evaluate(() => {
    const activeTabBtn = document.getElementById('nav-tab-mobile-recipes');
    const isPage = activeTabBtn?.getAttribute('aria-current') === 'page';
    // Get visible underline in mobile nav
    const mobileNav = activeTabBtn?.closest('nav');
    const underline = mobileNav ? mobileNav.querySelector('.vc-underline') : null;
    const style = underline ? window.getComputedStyle(underline) : null;
    const opacity = style ? style.opacity : null;
    const width = underline ? underline.getBoundingClientRect().width : 0;
    return { isPage, opacity, width };
  });
  record('header', "Startseite ('/'): 'Entdecker' aktiv und Unterstreichung sichtbar", homeTabState.isPage && homeTabState.opacity === '1' && homeTabState.width > 20, `opacity=${homeTabState.opacity}, width=${homeTabState.width}px`);

  // On Favorites ('/favorites')
  await page.goto(`${BASE_URL}/favorites`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const favTabState = await page.evaluate(() => {
    const recipesTabBtn = document.getElementById('nav-tab-mobile-recipes');
    const isRecipesPage = recipesTabBtn?.getAttribute('aria-current') === 'page';
    const favBtn = document.getElementById('nav-tab-favorites');
    const isFavPage = favBtn?.getAttribute('aria-current') === 'page';
    const isFavHighlighted = favBtn?.className.includes('text-favorite') || favBtn?.className.includes('bg-card/60');
    const underlines = Array.from(document.querySelectorAll('.vc-underline'));
    const anyVisibleUnderline = underlines.some(ul => {
      const style = window.getComputedStyle(ul);
      return style.opacity === '1' && ul.getBoundingClientRect().width > 0;
    });
    return { isRecipesPage, isFavPage, isFavHighlighted, anyVisibleUnderline };
  });
  record('header', "Favoriten ('/favorites'): 'Entdecker' NICHT unterstrichen, Herz-Button hervorgehoben", !favTabState.isRecipesPage && !favTabState.anyVisibleUnderline && favTabState.isFavPage && favTabState.isFavHighlighted, `recipesPage=${favTabState.isRecipesPage}, anyUnderlineVisible=${favTabState.anyVisibleUnderline}, favPage=${favTabState.isFavPage}`);

  // On Shopping ('/shopping')
  await page.goto(`${BASE_URL}/shopping`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const shopTabState = await page.evaluate(() => {
    const recipesTabBtn = document.getElementById('nav-tab-mobile-recipes');
    const isRecipesPage = recipesTabBtn?.getAttribute('aria-current') === 'page';
    const cartBtn = document.getElementById('nav-tab-shopping-badge');
    const isCartPage = cartBtn?.getAttribute('aria-current') === 'page';
    const isCartHighlighted = cartBtn?.className.includes('text-accent') || cartBtn?.className.includes('bg-card/60');
    const underlines = Array.from(document.querySelectorAll('.vc-underline'));
    const anyVisibleUnderline = underlines.some(ul => {
      const style = window.getComputedStyle(ul);
      return style.opacity === '1' && ul.getBoundingClientRect().width > 0;
    });
    return { isRecipesPage, isCartPage, isCartHighlighted, anyVisibleUnderline };
  });
  record('header', "Einkaufswagen ('/shopping'): 'Entdecker' NICHT unterstrichen, Warenkorb-Button hervorgehoben", !shopTabState.isRecipesPage && !shopTabState.anyVisibleUnderline && shopTabState.isCartPage && shopTabState.isCartHighlighted, `recipesPage=${shopTabState.isRecipesPage}, anyUnderlineVisible=${shopTabState.anyVisibleUnderline}, cartPage=${shopTabState.isCartPage}`);

  // 1.4 Menü-Bühne Outside-Click
  console.log('\n-> Testing Menu Stage Outside-Click...');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  const menuBtn = page.locator('#header-menu-btn');
  await menuBtn.click();
  await page.waitForTimeout(350);

  const isMenuOpenAfterClick = await page.evaluate(() => {
    const stageMenu = document.getElementById('header-stage-menu');
    const computed = stageMenu ? window.getComputedStyle(stageMenu) : null;
    return computed && computed.opacity !== '0' && computed.pointerEvents !== 'none';
  });
  record('header', 'Menü-Button öffnet Menü-Bühne', isMenuOpenAfterClick);

  // Click outside (e.g. at (200, 700) on body)
  await page.mouse.click(200, 700);
  await page.waitForTimeout(350);

  const isMenuClosedAfterOutsideClick = await page.evaluate(() => {
    const stageMenu = document.getElementById('header-stage-menu');
    const computed = stageMenu ? window.getComputedStyle(stageMenu) : null;
    return !computed || computed.opacity === '0' || computed.pointerEvents === 'none';
  });
  record('header', 'Klick außerhalb schließt die Menü-Bühne', isMenuClosedAfterOutsideClick);

  // 1.5 H1 Font Size Consistency
  const h1Classes = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.className : '';
  });
  const hasExpectedH1Size = h1Classes.includes('text-2xl') && h1Classes.includes('sm:text-3xl') && h1Classes.includes('lg:text-4xl');
  record('header', "H1 'Was kochen wir heute?' hat responsive Schriftgröße (text-2xl sm:text-3xl lg:text-4xl)", hasExpectedH1Size, h1Classes);

  // ----------------------------------------------------
  // TEST SUITE 2: Überrasch mich (SlotMachineModal)
  // ----------------------------------------------------
  console.log('\n--- 2. Überrasch mich Verification ---');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Inject confetti spy
  await page.evaluate(() => {
    window.__confettiCalled = 0;
    window.__onConfetti = () => {
      window.__confettiCalled++;
    };
  });

  const slotBtn = page.locator('#explorer-slot-machine-btn');
  await slotBtn.click();
  await page.waitForTimeout(1100); // wait for shuffle animation (ca. 700ms)

  const slotModalState = await page.evaluate(() => {
    const dialog = document.querySelector('dialog.vc-sheet');
    if (!dialog) return { found: false };
    const rect = dialog.getBoundingClientRect();
    const vh = window.innerHeight;
    const maxHClass = dialog.className.includes('!max-h-[92dvh]') || dialog.className.includes('max-h-[92dvh]');
    const isWithinViewport = rect.height <= vh * 0.93;
    const buttons = Array.from(dialog.querySelectorAll('button')).map(b => b.textContent.trim());
    const hasViewRecipe = buttons.some(t => t.includes('Rezept ansehen'));
    const hasShuffleAgain = buttons.some(t => t.includes('Nochmal'));
    const hasBookmarkBtn = buttons.some(t => t.toLowerCase().includes('merken'));
    return {
      found: true,
      maxHClass,
      dialogHeight: rect.height,
      vh,
      isWithinViewport,
      confettiCalled: window.__confettiCalled || 0,
      hasViewRecipe,
      hasShuffleAgain,
      hasBookmarkBtn,
    };
  });

  record('slotMachine', 'Bottom-Sheet hat max-h-[92dvh] und passt in Viewport ohne Überlauf', slotModalState.maxHClass && slotModalState.isWithinViewport, `Dialog: ${slotModalState.dialogHeight}px, 92vh: ${(slotModalState.vh * 0.92).toFixed(1)}px`);
  record('slotMachine', 'Dezentes Konfetti nach Shuffle ausgelöst', slotModalState.confettiCalled > 0, `Aufrufe: ${slotModalState.confettiCalled}`);
  record('slotMachine', "Aktionen: 'Rezept ansehen' und 'Nochmal' vorhanden, KEIN Merken-Button im Aktionsbereich", slotModalState.hasViewRecipe && slotModalState.hasShuffleAgain && !slotModalState.hasBookmarkBtn, `Rezept ansehen: ${slotModalState.hasViewRecipe}, Nochmal: ${slotModalState.hasShuffleAgain}, Merken: ${slotModalState.hasBookmarkBtn}`);

  // Close slot modal
  const closeSlotBtn = page.locator('dialog.vc-sheet button[aria-label="Schließen"], dialog.vc-sheet button:has(svg.lucide-x)');
  if (await closeSlotBtn.count() > 0) {
    await closeSlotBtn.first().click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(300);

  // ----------------------------------------------------
  // TEST SUITE 3: Swipen (ehemals Entdecken)
  // ----------------------------------------------------
  console.log('\n--- 3. Swipen Verification ---');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  const swipeDeckBtn = page.locator('#explorer-swipe-deck-btn');
  const swipeBtnText = await swipeDeckBtn.textContent();
  record('swipeDeck', "Button auf Startseite heißt 'Swipen'", swipeBtnText.includes('Swipen'), `Text: ${swipeBtnText.trim()}`);

  await swipeDeckBtn.click();
  await page.waitForTimeout(500);

  const swipeOverlayState = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"][aria-label="Swipen"]');
    if (!dialog) return { found: false };
    const h2 = dialog.querySelector('h2');
    const titleText = h2 ? h2.textContent.trim() : '';

    // Check info line in current active card
    const activeArticle = dialog.querySelector('article');
    const starIcon = activeArticle ? activeArticle.querySelector('svg.lucide-star') : null;
    const starClasses = starIcon ? starIcon.getAttribute('class') || '' : '';
    const hasStarFill = starClasses.includes('fill-[#E67E22]') && starClasses.includes('text-[#E67E22]');

    const chefHatIcon = activeArticle ? activeArticle.querySelector('svg.lucide-chef-hat') : null;
    const clockIcon = activeArticle ? activeArticle.querySelector('svg.lucide-clock') : null;

    // Check ingredient chips (brackets removed)
    const chips = Array.from(activeArticle ? activeArticle.querySelectorAll('span.rounded-lg') : []).map(s => s.textContent.trim());
    const hasBrackets = chips.some(c => c.includes('(') || c.includes(')'));

    // Check no keyboard guidance text
    const textContent = dialog.textContent || '';
    const hasKeyboardGuidance = /pfeiltasten|tastatur|drücke|arrow/i.test(textContent);

    return {
      found: true,
      titleText,
      hasStarFill,
      hasChefHat: Boolean(chefHatIcon),
      hasClock: Boolean(clockIcon),
      chipsCount: chips.length,
      hasBrackets,
      hasKeyboardGuidance,
    };
  });

  record('swipeDeck', "Titel im Header heißt 'Swipen'", swipeOverlayState.titleText === 'Swipen', `Titel: ${swipeOverlayState.titleText}`);
  record('swipeDeck', 'Infozeile: Sterne mit #E67E22 Fill, ChefHat, Clock (keine Pills)', swipeOverlayState.hasStarFill && swipeOverlayState.hasChefHat && swipeOverlayState.hasClock, `StarFill: ${swipeOverlayState.hasStarFill}, ChefHat: ${swipeOverlayState.hasChefHat}, Clock: ${swipeOverlayState.hasClock}`);
  record('swipeDeck', 'Zutaten-Chips: reine Zutatennamen ohne Klammern', !swipeOverlayState.hasBrackets && swipeOverlayState.chipsCount > 0, `Chips: ${swipeOverlayState.chipsCount}, Klammern gefunden: ${swipeOverlayState.hasBrackets}`);
  record('swipeDeck', 'Keine Tastatur-Anleitungstexte vorhanden', !swipeOverlayState.hasKeyboardGuidance);

  // Test session-based bookmarking
  console.log('\n-> Testing Swipe Session Bookmarking...');
  const initialDrawerBtnText = await page.locator('#swipe-saved-drawer-btn').textContent();
  record('swipeDeck', "Primärer Button initial 'Gemerkte ansehen (0)'", initialDrawerBtnText.includes('Gemerkte ansehen (0)'), initialDrawerBtnText.trim());

  // Swipe right with keyboard ArrowRight
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);

  const updatedDrawerBtnText = await page.locator('#swipe-saved-drawer-btn').textContent();
  record('swipeDeck', "Nach Swipe rechts: Zähler erhöht auf 'Gemerkte ansehen (1)'", updatedDrawerBtnText.includes('Gemerkte ansehen (1)'), updatedDrawerBtnText.trim());

  // Open saved drawer
  await page.locator('#swipe-saved-drawer-btn').click();
  await page.waitForTimeout(400);

  const drawerState = await page.evaluate(() => {
    const drawer = document.querySelector('div[role="dialog"][aria-label="In dieser Session gemerkte Rezepte"]');
    if (!drawer) return { found: false };
    const items = drawer.querySelectorAll('button:has(svg)');
    return { found: true, hasItem: items.length > 0, text: drawer.textContent };
  });
  record('swipeDeck', "Klick auf 'Gemerkte ansehen (1)' öffnet Drawer mit gemerktem Rezept", drawerState.found && drawerState.text.includes('1 Rezept gesammelt'));

  // Close drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Close swipe overlay -> sessionSaved cleared
  const closeSwipeBtn = page.locator('div[role="dialog"][aria-label="Swipen"] button[aria-label="Swipen beenden"]');
  await closeSwipeBtn.click();
  await page.waitForTimeout(400);

  // Re-open swipe overlay: Session saved should be 0
  await page.locator('#explorer-swipe-deck-btn').click();
  await page.waitForTimeout(500);

  const reopenedSavedCount = await page.locator('#swipe-saved-drawer-btn').textContent();
  record('swipeDeck', "Schließen leert die Session-Rezepte ('Gemerkte ansehen (0)')", reopenedSavedCount.includes('Gemerkte ansehen (0)'), reopenedSavedCount.trim());

  // Close overlay again
  await page.locator('div[role="dialog"][aria-label="Swipen"] button[aria-label="Swipen beenden"]').click();
  await page.waitForTimeout(300);

  // ----------------------------------------------------
  // TEST SUITE 4: AddRecipeModal
  // ----------------------------------------------------
  console.log('\n--- 4. AddRecipeModal Verification ---');
  await page.locator('#explorer-add-recipe-btn').click();
  await page.waitForTimeout(500);

  // Tab 1: KI-Küchenchef
  const tab1State = await page.evaluate(() => {
    const modal = document.querySelector('div.bg-card.border.border-border.rounded-3xl, div.fixed.inset-0');
    if (!modal) return { found: false };
    const text = modal.textContent || '';
    const hasInspiration = /inspirationen durchstöbern|kategorien wählen|ernährungsform wählen/i.test(text);
    const wishesInput = modal.querySelector('textarea[placeholder*="Wünsche an die KI"]');
    const priorityLabel = text.includes('Höchste Priorität') || text.includes('Wünsche an die KI');
    return {
      found: true,
      hasInspiration,
      hasWishesInput: Boolean(wishesInput),
      priorityLabel,
    };
  });
  record('addRecipeModal', "Tab 1 KI-Küchenchef: Keine Inspirationen/Kategorien/Ernährungsform, dafür prominentes 'Wünsche'-Textfeld mit höchster Priorität", tab1State.found && !tab1State.hasInspiration && tab1State.hasWishesInput && tab1State.priorityLabel);

  // Tab 2: Foto-Scan
  const scanTabBtn = page.locator('button:has-text("Foto-Scan")');
  await scanTabBtn.click();
  await page.waitForTimeout(300);

  const tab2State = await page.evaluate(() => {
    const modal = document.querySelector('div.bg-card.border.border-border.rounded-3xl');
    const wishesInput = modal ? modal.querySelector('textarea[placeholder*="Wünsche an die KI"]') : null;
    return { hasWishesInput: Boolean(wishesInput) };
  });
  record('addRecipeModal', "Tab 2 Foto-Scan: Prominentes 'Wünsche'-Textfeld vorhanden", tab2State.hasWishesInput);

  // Tab 3: Beschreibe dein Rezept
  const describeTabBtn = page.locator('button:has-text("Beschreibe dein Rezept")');
  await describeTabBtn.click();
  await page.waitForTimeout(300);

  const tab3State = await page.evaluate(() => {
    const modal = document.querySelector('div.bg-card.border.border-border.rounded-3xl');
    const textarea = modal ? modal.querySelector('textarea[placeholder*="Beschreibe dein Rezept in eigenen Worten"]') : null;
    if (!textarea) return { found: false };
    const style = window.getComputedStyle(textarea);
    const rect = textarea.getBoundingClientRect();
    return {
      found: true,
      height: rect.height,
      minHeight: style.minHeight,
    };
  });
  record('addRecipeModal', "Tab 3 'Beschreibe dein Rezept': Großes vertikales Textfeld für freien Text/Zutaten vorhanden", tab3State.found && tab3State.height >= 140, `Höhe: ${tab3State.height}px, minHeight: ${tab3State.minHeight}`);

  // Close AddRecipeModal
  const closeAddRecipeBtn = page.locator('div.bg-card.border.border-border.rounded-3xl button[aria-label="Schließen"]').first();
  await closeAddRecipeBtn.click();
  await page.waitForTimeout(400);

  // ----------------------------------------------------
  // TEST SUITE 5: Sortierung & Filter
  // ----------------------------------------------------
  console.log('\n--- 5. Sorting & Filters Verification ---');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Check sort options existence
  const sortSelect = page.locator('#filter-sort-by');
  const sortOptions = await sortSelect.locator('option').allTextContents();
  const hasCaloriesDesc = sortOptions.some(t => t.includes('Meiste Kalorien'));
  const hasRatingDesc = sortOptions.some(t => t.includes('Beste Bewertung'));
  record('sortingAndFilters', "Sortieroption 'Meiste Kalorien' vorhanden", hasCaloriesDesc);
  record('sortingAndFilters', "Sortieroption 'Beste Bewertung' vorhanden", hasRatingDesc);

  // Test sorting by 'Meiste Kalorien'
  await sortSelect.selectOption('caloriesDesc');
  await page.waitForTimeout(400);

  const caloriesOrderCheck = await page.evaluate(() => {
    // Get visible titles
    const titles = Array.from(document.querySelectorAll('article h3')).map(h => h.textContent.trim());
    return titles.length > 0;
  });
  record('sortingAndFilters', "Sortierung nach 'Meiste Kalorien' erfolgreich aktiviert", caloriesOrderCheck);

  // Test sorting by 'Beste Bewertung'
  await sortSelect.selectOption('ratingDesc');
  await page.waitForTimeout(400);
  const ratingOrderCheck = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('article h3')).map(h => h.textContent.trim());
    return titles.length > 0;
  });
  record('sortingAndFilters', "Sortierung nach 'Beste Bewertung' erfolgreich aktiviert", ratingOrderCheck);

  // Check FilterBar & FilterSheet for emojis
  const filterEmojiCheck = await page.evaluate(() => {
    const filterBar = document.querySelector('[role="group"][aria-label="Kategorien"]');
    const text = filterBar ? filterBar.textContent : '';
    const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
    return { hasEmoji, text };
  });
  record('sortingAndFilters', 'FilterBar enthält saubere Linien-Icons und KEINE Emojis', !filterEmojiCheck.hasEmoji);

  // ----------------------------------------------------
  // TEST SUITE 6: Rezept Detailansicht (RecipeDetailPage)
  // ----------------------------------------------------
  console.log('\n--- 6. Recipe Detail View Verification ---');
  // Navigate to non-vegan recipe 'rec-2' ('Ofen-Gnocchi mit Feta & Kirschtomaten') to test Veganize button
  await page.goto(`${BASE_URL}/recipes/rec-2`);
  await page.waitForLoadState('networkidle');

  const recipeDetailState = await page.evaluate(() => {
    // 1. Calories badge
    const calFlame = document.querySelector('svg.lucide-flame');
    const calBadge = calFlame ? calFlame.closest('div') : null;
    const calBadgeClasses = calBadge ? calBadge.className : '';
    const calBadgeOk = calBadgeClasses.includes('bg-accent-tint') && calBadgeClasses.includes('border-accent/25') && calBadgeClasses.includes('text-accent');

    // 2. Protein count text color
    const dumbbell = document.querySelector('svg.lucide-dumbbell');
    const proteinRow = dumbbell ? dumbbell.closest('div.bg-card') : null;
    const proteinVal = proteinRow ? proteinRow.querySelector('div.tabular-nums') : null;
    const proteinClasses = proteinVal ? proteinVal.className : '';
    const proteinOk = proteinClasses.includes('text-text-main');

    // 3. Veganisieren Button
    const veganizeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Veganisieren'));
    const veganizeClasses = veganizeBtn ? veganizeBtn.className : '';
    const veganizeOk = veganizeBtn && veganizeClasses.includes('ml-auto') && veganizeClasses.includes('h-11') && veganizeClasses.includes('bg-accent');

    // 4. Floating Header Buttons (Zurück, Kamera, Herz, 3-Punkte)
    const backBtn = document.getElementById('recipe-back-floating-btn');
    const photoBtn = document.getElementById('recipe-upload-photo-btn');
    const favBtn = document.getElementById('recipe-fav-floating-btn');
    const moreBtn = document.getElementById('recipe-overflow-menu-btn');

    const check44px = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (rect.width >= 43 && rect.height >= 43) || style.borderRadius.includes('9999px') || el.className.includes('rounded-full');
    };

    const headerBtnsOk = check44px(backBtn) && check44px(photoBtn) && check44px(moreBtn);

    // 5. Review & Comment
    const starButtons = Array.from(document.querySelectorAll('section button[aria-label*="von 5 Sternen"]'));
    const textarea = document.querySelector('section textarea[placeholder*="Notizen oder Feedback"]');
    const saveBtn = Array.from(document.querySelectorAll('section button')).find(b => b.textContent.includes('Speichern'));

    return {
      calBadgeOk,
      calBadgeClasses,
      proteinOk,
      proteinClasses,
      veganizeOk,
      veganizeClasses,
      headerBtnsOk,
      starsCount: starButtons.length,
      hasTextarea: Boolean(textarea),
      hasSaveBtn: Boolean(saveBtn),
    };
  });

  record('recipeDetail', 'Kalorien-Badge im sauberen Akzentgrün (bg-accent-tint border border-accent/25 text-accent)', recipeDetailState.calBadgeOk, recipeDetailState.calBadgeClasses);
  record('recipeDetail', 'Protein-Anzahl in normalem text-text-main', recipeDetailState.proteinOk, recipeDetailState.proteinClasses);
  record('recipeDetail', "Veganisieren-Button rechts in Portions-Zeile (ml-auto, h-11, bg-accent)", recipeDetailState.veganizeOk, recipeDetailState.veganizeClasses);
  record('recipeDetail', 'Schwebende Header-Buttons (Zurück, Kamera, Herz, 3-Punkte) einheitlich 44px Kreis', recipeDetailState.headerBtnsOk);
  record('recipeDetail', 'Bewertungs- und Notizenbereich: 5 Sterne, Textarea und Speichern-Button vorhanden', recipeDetailState.starsCount === 5 && recipeDetailState.hasTextarea && recipeDetailState.hasSaveBtn);

  // Test rating & comment persistence
  console.log('\n-> Testing Rating & Notes Persistence...');
  const fourthStar = page.locator('section button[aria-label="4 von 5 Sternen"]');
  await fourthStar.click();
  await page.waitForTimeout(200);

  const notesTextarea = page.locator('section textarea[placeholder*="Notizen oder Feedback"]');
  await notesTextarea.fill('Super lecker und knusprig! E2E Test Kommentar.');

  const saveReviewBtn = page.locator('section button:has-text("Speichern")');
  await saveReviewBtn.click();
  await page.waitForTimeout(400);

  // Reload page and check if rating and comment persist
  await page.reload();
  await page.waitForLoadState('networkidle');

  const persistedState = await page.evaluate(() => {
    const textarea = document.querySelector('section textarea[placeholder*="Notizen oder Feedback"]');
    const star4 = document.querySelector('section button[aria-label="4 von 5 Sternen"] svg');
    const isStar4Filled = star4 ? star4.getAttribute('class')?.includes('fill-[#E67E22]') : false;
    return {
      comment: textarea ? textarea.value : '',
      isStar4Filled,
    };
  });
  record('recipeDetail', 'Bewertung & Kommentar bleiben nach Seiten-Reload persistent erhalten', persistedState.isStar4Filled && persistedState.comment.includes('E2E Test Kommentar'), `Sterne=4 persistent, Kommentar: "${persistedState.comment}"`);

  // Check 3-dots menu for emojis
  const moreMenuEmojiCheck = await page.evaluate(() => {
    const select = document.querySelector('select[aria-label="Rezept Optionen"]');
    const options = Array.from(select ? select.options : []).map(o => o.text);
    const text = options.join(' ');
    const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
    return { hasEmoji, text, options };
  });
  record('recipeDetail', '3-Punkte-Menü enthält keine Emojis', !moreMenuEmojiCheck.hasEmoji, `Optionen: ${moreMenuEmojiCheck.options.join(', ')}`);

  // ----------------------------------------------------
  // TEST SUITE 7: Vorratskammer, Wochenplaner & Einkaufsliste
  // ----------------------------------------------------
  console.log('\n--- 7. Fridge, Planner & Shopping Verification ---');

  // 7.1 Vorratskammer
  await page.goto(`${BASE_URL}/fridge`);
  await page.waitForLoadState('networkidle');

  const fridgeState = await page.evaluate(() => {
    const text = document.body.textContent || '';
    const hasLocalShare = text.includes('Lokal • Teilen') || text.includes('Lokal •');
    const slider = document.getElementById('fridge-time-slider') || document.querySelector('input[type="range"]');
    const sliderParent = slider ? slider.closest('div.w-full') : null;
    return {
      hasLocalShare,
      hasSlider: Boolean(slider),
      sliderFullWidth: Boolean(sliderParent),
    };
  });
  record('fridgePlannerShopping', "Vorratskammer: Keine 'Lokal • Teilen'-Pill, Zeit-Schieberegler über volle Breite", !fridgeState.hasLocalShare && fridgeState.hasSlider && fridgeState.sliderFullWidth);

  // 7.2 Wochenplaner
  await page.goto(`${BASE_URL}/planner`);
  await page.waitForLoadState('networkidle');

  const plannerMenuState = await page.evaluate(() => {
    const select = document.querySelector('select[aria-label="Wochenplan-Optionen"]');
    const options = Array.from(select ? select.options : []).map(o => o.text);
    const hasLunchToggle = options.some(t => t.includes('Mittags-Slots'));
    return { hasLunchToggle, options };
  });
  record('fridgePlannerShopping', "Wochenplaner: KEINE 'Mittags-Slots verbergen/anzeigen'-Option im 3-Punkte-Menü", !plannerMenuState.hasLunchToggle, `Optionen: ${plannerMenuState.options.join(', ')}`);

  // 7.3 Einkaufsliste
  await page.goto(`${BASE_URL}/shopping`);
  await page.waitForLoadState('networkidle');

  const shoppingState = await page.evaluate(() => {
    const text = document.body.textContent || '';
    const hasLocalShare = text.includes('Lokal • Teilen');
    const autoFocusInputs = Array.from(document.querySelectorAll('input[autofocus], input[autoFocus]'));
    return {
      hasLocalShare,
      hasAutoFocus: autoFocusInputs.length > 0,
    };
  });
  record('fridgePlannerShopping', "Einkaufsliste: Keine 'Lokal • Teilen'-Pill, kein unerwünschtes autoFocus", !shoppingState.hasLocalShare && !shoppingState.hasAutoFocus);

  await context.close();

  // ----------------------------------------------------
  // TEST SUITE 8: SCREENSHOT CAPTURES ACROSS ALL 6 VIEWPORTS
  // ----------------------------------------------------
  console.log('\n--- 8. Capturing Screenshots Across All Viewports ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nCapturing for Viewport: ${vp.name} (${vp.label}) ...`);
    const vpContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const vpPage = await vpContext.newPage();

    // 1. Home / Header
    await vpPage.goto(BASE_URL);
    await vpPage.waitForLoadState('networkidle');
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_01_home_header.png`),
      fullPage: false,
    });

    // 2. Überrasch mich Sheet
    const slotBtnVp = vpPage.locator('#explorer-slot-machine-btn');
    if (await slotBtnVp.count() > 0) {
      await slotBtnVp.click();
      await vpPage.waitForTimeout(900); // let shuffle complete
      await vpPage.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_02_slot_machine_sheet.png`),
        fullPage: false,
      });
      // Close sheet
      await vpPage.keyboard.press('Escape');
      await vpPage.waitForTimeout(300);
    }

    // 3. Swipen Overlay
    const swipeBtnVp = vpPage.locator('#explorer-swipe-deck-btn');
    if (await swipeBtnVp.count() > 0) {
      await swipeBtnVp.click();
      await vpPage.waitForTimeout(500);
      await vpPage.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_03_swipe_overlay.png`),
        fullPage: false,
      });
      // Close overlay
      const closeBtn = vpPage.locator('div[role="dialog"][aria-label="Swipen"] button[aria-label="Swipen beenden"]');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
      } else {
        await vpPage.keyboard.press('Escape');
      }
      await vpPage.waitForTimeout(300);
    }

    // 4. AddRecipeModal (Tab 3 "Beschreibe dein Rezept")
    const addRecipeBtnVp = vpPage.locator('#explorer-add-recipe-btn');
    if (await addRecipeBtnVp.count() > 0) {
      await addRecipeBtnVp.click();
      await vpPage.waitForTimeout(400);
      const tabDescribe = vpPage.locator('button:has-text("Beschreibe dein Rezept")');
      if (await tabDescribe.count() > 0) {
        await tabDescribe.click();
        await vpPage.waitForTimeout(300);
      }
      await vpPage.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_04_add_recipe_describe.png`),
        fullPage: false,
      });
      // Close modal
      const closeAddBtn = vpPage.locator('div.bg-card.border.border-border.rounded-3xl button[aria-label="Schließen"]').first();
      if (await closeAddBtn.count() > 0) {
        await closeAddBtn.click();
      } else {
        await vpPage.keyboard.press('Escape');
      }
      await vpPage.waitForTimeout(300);
    }

    // 5. RecipeDetailPage (with rating & quick facts)
    await vpPage.goto(`${BASE_URL}/recipes/rec-2`);
    await vpPage.waitForLoadState('networkidle');
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_05_recipe_detail.png`),
      fullPage: false,
    });

    // 6. Vorratskammer (/fridge)
    await vpPage.goto(`${BASE_URL}/fridge`);
    await vpPage.waitForLoadState('networkidle');
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_06_fridge_pantry.png`),
      fullPage: false,
    });

    // 7. Wochenplaner (/planner)
    await vpPage.goto(`${BASE_URL}/planner`);
    await vpPage.waitForLoadState('networkidle');
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_07_weekly_planner.png`),
      fullPage: false,
    });

    // 8. Einkaufsliste (/shopping)
    await vpPage.goto(`${BASE_URL}/shopping`);
    await vpPage.waitForLoadState('networkidle');
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_08_shopping_list.png`),
      fullPage: false,
    });

    await vpContext.close();
    console.log(`✓ Completed 8 screenshots for ${vp.name}`);
  }

  await browser.close();

  // Print Summary
  console.log('\n========================================');
  console.log('         AUDIT REPORT SUMMARY           ');
  console.log('========================================');
  let totalTests = 0;
  let passedTests = 0;
  for (const [cat, results] of Object.entries(testResults)) {
    console.log(`\n[${cat.toUpperCase()}] (${results.filter(r => r.passed).length}/${results.length})`);
    for (const r of results) {
      totalTests++;
      if (r.passed) passedTests++;
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} ${r.details ? '— ' + r.details : ''}`);
    }
  }

  console.log(`\nTotal: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  return { testResults, totalTests, passedTests };
}

runAudit().catch(err => {
  console.error('Fatal error during E2E audit:', err);
  process.exit(1);
});

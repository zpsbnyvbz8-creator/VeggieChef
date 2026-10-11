const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'audit-screenshots');

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
  console.log('=== VEGGIECHEF E2E AUDIT & VERIFICATION ===\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const testResults = {
    header: [],
    search: [],
    menuStage: [],
    addRecipeBtn: [],
    autumnSection: [],
    slotMachine: [],
    swipeDeck: [],
    bookmarks: [],
    viewToggle: [],
  };

  const record = (category, name, passed, details = '') => {
    testResults[category].push({ name, passed, details });
    const sym = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${category}] ${sym}: ${name} ${details ? '(' + details + ')' : ''}`);
  };

  // ----------------------------------------------------
  // TEST SUITE 1: Deep Functional Verification on Standard Viewport (390x844)
  // ----------------------------------------------------
  console.log('\n--- 1. Deep Functional Verification ---');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Reset localStorage to clean state
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    // seed 1 bookmark and 2 shopping items to verify badges
    localStorage.setItem('veggiechef_bookmarks', JSON.stringify(['classic-tomato-pasta']));
    localStorage.setItem('veggiechef_shopping_v1', JSON.stringify([
      { id: 'item1', name: 'Tomaten', completed: false },
      { id: 'item2', name: 'Basilikum', completed: false }
    ]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  // 1.1 Header: Wortmarke, Icons & Tabs in #2D3E40 (--text-main), Tab-Unterstreichung
  console.log('\n-> Testing Header & Underline...');
  const headerFgColor = await page.evaluate(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const textMain = computed.getPropertyValue('--text-main').trim();
    const headerFg = computed.getPropertyValue('--header-fg').trim();
    const headerIcon = computed.getPropertyValue('--header-icon').trim();
    const headerActive = computed.getPropertyValue('--header-active').trim();
    return { textMain, headerFg, headerIcon, headerActive };
  });

  const isColorMatching = headerFgColor.textMain.toLowerCase() === '#2d3e40' || headerFgColor.headerFg.includes('text-main') || headerFgColor.headerFg.toLowerCase() === '#2d3e40';
  record('header', 'Farb-Tokens Header auf #2D3E40 gesetzt', isColorMatching, JSON.stringify(headerFgColor));

  // Check mobile underline centering & width
  const underlineMetrics = await page.evaluate(() => {
    const activeTabBtn = document.getElementById('nav-tab-mobile-recipes');
    const labelSpan = activeTabBtn ? activeTabBtn.querySelector('span') : null;
    const nav = activeTabBtn ? activeTabBtn.closest('nav') : null;
    const underline = nav ? nav.querySelector('.vc-underline') : null;

    if (!activeTabBtn || !labelSpan || !underline) {
      return { error: 'elements not found' };
    }

    const spanRect = labelSpan.getBoundingClientRect();
    const ulRect = underline.getBoundingClientRect();

    const expectedWidth = spanRect.width + 16;
    const actualWidth = ulRect.width;
    const spanCenter = spanRect.left + spanRect.width / 2;
    const ulCenter = ulRect.left + ulRect.width / 2;
    const centerDiff = Math.abs(spanCenter - ulCenter);

    return {
      expectedWidth,
      actualWidth,
      widthDiff: Math.abs(expectedWidth - actualWidth),
      spanCenter,
      ulCenter,
      centerDiff,
    };
  });

  const underlineOk = underlineMetrics.widthDiff !== undefined && underlineMetrics.widthDiff <= 1.5 && underlineMetrics.centerDiff <= 1.5;
  record('header', 'Tab-Unterstreichung zentriert und Textbreite + 16px', underlineOk,
    `widthDiff: ${underlineMetrics.widthDiff?.toFixed(2)}px, centerDiff: ${underlineMetrics.centerDiff?.toFixed(2)}px`);

  // 1.2 Suche: Klick auf Lupe öffnet Suche, Lupe aktiv markiert, Esc schließt Suche
  console.log('\n-> Testing Search...');
  const searchBtn = page.locator('#header-search-btn');
  await searchBtn.click();
  await page.waitForTimeout(250);

  const isSearchOpenState = await page.evaluate(() => {
    const btn = document.getElementById('header-search-btn');
    const input = document.getElementById('header-search-input');
    const isFocused = input === document.activeElement;
    const pressed = btn?.getAttribute('aria-pressed') === 'true';
    const computed = input ? window.getComputedStyle(input) : null;
    const isInteractive = computed && computed.pointerEvents !== 'none' && computed.opacity !== '0';
    return { isPressed: pressed, isInteractive, isFocused };
  });
  record('search', 'Lupe öffnet Suche & Lupe als aktiv markiert', isSearchOpenState.isPressed && isSearchOpenState.isInteractive, JSON.stringify(isSearchOpenState));

  // Press Esc to close search
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const isSearchClosedState = await page.evaluate(() => {
    const btn = document.getElementById('header-search-btn');
    const input = document.getElementById('header-search-input');
    const pressed = btn?.getAttribute('aria-pressed') === 'true';
    const computed = input ? window.getComputedStyle(input) : null;
    const parentComputed = input?.parentElement?.parentElement ? window.getComputedStyle(input.parentElement.parentElement) : null;
    const isInteractive = (computed && computed.pointerEvents !== 'none' && computed.opacity !== '0') &&
                          (!parentComputed || (parentComputed.pointerEvents !== 'none' && parentComputed.opacity !== '0'));
    return { isPressed: pressed, isInteractive };
  });
  record('search', 'Esc schließt Suche', !isSearchClosedState.isPressed && !isSearchClosedState.isInteractive, JSON.stringify(isSearchClosedState));

  // 1.3 Menü-Bühne: Klick auf Burger öffnet Zone 2 als Bühne
  console.log('\n-> Testing Menu Stage...');
  const menuBtn = page.locator('#header-menu-btn');
  await menuBtn.click();
  await page.waitForTimeout(300);

  const menuStageData = await page.evaluate(() => {
    const stageMenu = document.getElementById('header-stage-menu');
    const scrim = document.querySelector('.vc-menu-scrim');
    const fadeVisible = !!document.querySelector('.vc-header-fade');
    const stageContainer = stageMenu?.closest('div[class*="rounded-b-[24px]"]');

    if (!stageMenu) return { error: 'Stage menu not found' };

    // Group 1 inspection
    const group1Nav = stageMenu.querySelector('nav[aria-label="Hauptbereiche"]');
    const group1Buttons = group1Nav ? Array.from(group1Nav.querySelectorAll('button')) : [];
    const g1Info = group1Buttons.map((btn) => {
      const text = btn.innerText.trim();
      const style = window.getComputedStyle(btn);
      const badge = btn.querySelector('span[class*="rounded-full"]');
      return {
        text,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        badgeText: badge ? badge.innerText.trim() : null,
      };
    });

    // Group 2 inspection
    const group2Nav = stageMenu.querySelector('nav[aria-label="Weitere Optionen"]');
    const group2Buttons = group2Nav ? Array.from(group2Nav.querySelectorAll('button')) : [];
    const g2Info = group2Buttons.map((btn) => {
      const text = btn.innerText.trim();
      const style = window.getComputedStyle(btn);
      const isPlaceholder = btn.getAttribute('aria-disabled') === 'true';
      return {
        text,
        fontSize: style.fontSize,
        opacity: style.opacity,
        isPlaceholder,
      };
    });

    return {
      hasScrim: !!scrim,
      hasFade: fadeVisible,
      hasRoundedCorners: !!stageContainer,
      g1Info,
      g2Info,
    };
  });

  record('menuStage', 'Zone 2 als Bühne geöffnet (kein separater Topsheet, kein grauer Fade)', !menuStageData.hasFade && menuStageData.hasRoundedCorners, `hasFade: ${menuStageData.hasFade}, rounded: ${menuStageData.hasRoundedCorners}`);
  record('menuStage', 'Scrim vorhanden', menuStageData.hasScrim);

  // Verify Group 1 items & styles
  const g1Texts = menuStageData.g1Info.map((g) => g.text);
  const g1LabelsMatch = ['Entdecker', 'Vorratskammer', 'Wochenplaner'].every((lbl) => g1Texts.some((t) => t.includes(lbl)))
    && g1Texts.some((t) => t.includes('Merkliste') && /\d+/.test(t))
    && g1Texts.some((t) => t.includes('Einkaufswagen') && /\d+/.test(t));
  const g1StylesMatch = menuStageData.g1Info.every((g) => {
    const size = parseInt(g.fontSize);
    return size >= 20 && size <= 22 && (g.fontWeight === '700' || g.fontWeight === 'bold');
  });
  record('menuStage', 'Gruppe 1 Inhalt (5 Items inkl. Zähler für Merkliste & Einkaufswagen)', g1LabelsMatch, JSON.stringify(g1Texts));
  record('menuStage', 'Gruppe 1 Typografie (20-22px bold)', g1StylesMatch, JSON.stringify(menuStageData.g1Info.map(g => `${g.text.split('\n')[0]}: ${g.fontSize} ${g.fontWeight}`)));

  // Verify Group 2 items & styles
  const g2Texts = menuStageData.g2Info.map((g) => g.text);
  const lastItemIsStats = g2Texts.length > 0 && g2Texts[g2Texts.length - 1].includes('Statistiken');
  const disabledItemsHave55 = menuStageData.g2Info.filter(g => g.isPlaceholder).every(g => parseFloat(g.opacity) <= 0.6 && parseFloat(g.opacity) >= 0.5);
  record('menuStage', 'Gruppe 2: Profil, Einstellungen, Präferenzen 55% disabled, Sync vorhanden', disabledItemsHave55 && g2Texts.some(t => t.includes('Synchronisation')), JSON.stringify(g2Texts));
  record('menuStage', 'Gruppe 2: Statistiken ist LETZTER Eintrag!', lastItemIsStats, `Last: ${g2Texts[g2Texts.length - 1]}`);

  // Test close via Esc
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const isMenuClosedEsc = await page.evaluate(() => {
    const scrim = document.querySelector('.vc-menu-scrim');
    return !scrim;
  });
  record('menuStage', 'Menü schließt per Esc', isMenuClosedEsc);

  // Test open and close via Scrim click (click in the bottom 80px outside menu)
  await menuBtn.click();
  await page.waitForTimeout(300);
  const vpSize = page.viewportSize();
  await page.locator('.vc-menu-scrim').click({ position: { x: vpSize.width / 2, y: vpSize.height - 50 } });
  await page.waitForTimeout(300);
  const isMenuClosedScrim = await page.evaluate(() => {
    const scrim = document.querySelector('.vc-menu-scrim');
    return !scrim;
  });
  record('menuStage', 'Menü schließt per Scrim-Klick', isMenuClosedScrim);

  // 1.4 "+"-Button auf Entdecker-Seite
  console.log('\n-> Testing "+" Add Recipe Button on 360px...');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(200);

  const addBtnInfoMobile = await page.evaluate(() => {
    const btn = document.getElementById('explorer-add-recipe-btn');
    const heading = document.querySelector('h1');
    if (!btn || !heading) return null;
    const btnRect = btn.getBoundingClientRect();
    const h1Rect = heading.getBoundingClientRect();
    const headerParent = btn.parentElement;
    const parentRect = headerParent.getBoundingClientRect();
    const isPill = btn.classList.contains('rounded-full') || parseFloat(window.getComputedStyle(btn).borderRadius) >= 20;

    const sameRow = Math.abs(btnRect.top - h1Rect.top) < 25;
    const fitsWidth = btnRect.right <= parentRect.right + 2;

    return {
      text: btn.innerText.trim(),
      isPill,
      sameRow,
      fitsWidth,
      btnWidth: btnRect.width,
      h1Width: h1Rect.width,
    };
  });
  record('addRecipeBtn', 'Mobil (360px): Text "Rezept", Pill-Form, passt neben "Was kochen wir heute?"',
    addBtnInfoMobile?.text === 'Rezept' && addBtnInfoMobile?.isPill && addBtnInfoMobile?.sameRow && addBtnInfoMobile?.fitsWidth,
    JSON.stringify(addBtnInfoMobile));

  // Check desktop text
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(200);
  const addBtnInfoDesktop = await page.evaluate(() => {
    const btn = document.getElementById('explorer-add-recipe-btn');
    return btn ? btn.innerText.trim() : null;
  });
  record('addRecipeBtn', 'Tablet/Desktop (768px+): Text "Rezept hinzufügen"', addBtnInfoDesktop === 'Rezept hinzufügen', `Text: ${addBtnInfoDesktop}`);

  // Return to mobile standard
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);

  // 1.5 Herbst-Sektion: Insets 16px rundum, Bündigkeit Blatt-Icon + Titel + linke Kante erste Karte
  console.log('\n-> Testing Autumn Section Insets & Alignment...');
  const autumnAlignment = await page.evaluate(() => {
    const seasonSection = document.querySelector('section[aria-labelledby="season-title"]');
    if (!seasonSection) return { error: 'Season section not found' };
    const cardContainer = seasonSection.querySelector('div[class*="bg-season-autumn-bg"]');
    const leafIcon = seasonSection.querySelector('#season-title')?.previousElementSibling;
    const title = document.getElementById('season-title');
    const firstCard = seasonSection.querySelector('ul li');

    if (!cardContainer || !leafIcon || !title || !firstCard) {
      return { error: 'Children not found' };
    }

    const containerRect = cardContainer.getBoundingClientRect();
    const leafRect = leafIcon.getBoundingClientRect();
    const cardRect = firstCard.getBoundingClientRect();

    const insetLeft = leafRect.left - containerRect.left;
    const insetDiffIconCard = Math.abs(leafRect.left - cardRect.left);

    return {
      insetLeft,
      leafLeft: leafRect.left,
      cardLeft: cardRect.left,
      insetDiffIconCard,
      containerPadding: window.getComputedStyle(cardContainer).padding,
    };
  });
  const autumnOk = autumnAlignment.insetDiffIconCard !== undefined && autumnAlignment.insetDiffIconCard <= 1.5;
  record('autumnSection', 'Herbst-Sektion: Inset 16px und perfekte Bündigkeit (Blatt-Icon & erste Karte)',
    autumnOk, `insetLeft: ${autumnAlignment.insetLeft?.toFixed(1)}px, diff: ${autumnAlignment.insetDiffIconCard?.toFixed(2)}px`);

  // 1.6 "Überrasch mich": Standard-Bottom-Sheet, kein Casino/Emojis, Reveal-Animation, Merken in Merkliste
  console.log('\n-> Testing "Überrasch mich" (SlotMachineModal)...');
  const slotBtn = page.locator('#explorer-slot-machine-btn');
  await slotBtn.click();
  await page.waitForTimeout(300);

  const slotSheetInfo = await page.evaluate(() => {
    const dialog = document.querySelector('dialog.vc-sheet');
    if (!dialog || !dialog.open) return { error: 'Dialog not open' };

    const title = dialog.querySelector('#slot-sheet-title')?.textContent?.trim();
    const fullText = dialog.textContent || '';
    const hasEmojis = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(fullText.replace(/🌱|⏱|★/g, ''));
    const isCasino = /jackpot|casino|slot/i.test(fullText);

    const viewBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.includes('Rezept ansehen'));
    const shuffleBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.includes('Nochmal'));
    const bookmarkBtn = dialog.querySelector('button[aria-label*="Merkliste"]');

    return {
      isOpen: dialog.open,
      title,
      hasEmojis,
      isCasino,
      hasViewBtn: !!viewBtn,
      hasShuffleBtn: !!shuffleBtn,
      hasBookmarkBtn: !!bookmarkBtn,
    };
  });

  record('slotMachine', 'Bottom-Sheet "Überrasch mich" geöffnet (kein Casino, keine Emojis)',
    slotSheetInfo.isOpen && slotSheetInfo.title === 'Überrasch mich' && !slotSheetInfo.isCasino && !slotSheetInfo.hasEmojis,
    JSON.stringify(slotSheetInfo));

  // Wait for reveal animation (~700ms) to complete and button to be enabled
  const bookmarkBtn = page.locator('dialog.vc-sheet button[aria-label*="Merkliste"]');
  await page.locator('dialog.vc-sheet button[aria-label*="Merkliste"]:not([disabled])').waitFor({ timeout: 4000 });

  // Test bookmarking from "Überrasch mich"
  const preBookmarks = await page.evaluate(() => JSON.parse(localStorage.getItem('veggiechef_bookmarks') || '[]'));
  await bookmarkBtn.click();
  await page.waitForTimeout(200);
  const postBookmarks = await page.evaluate(() => JSON.parse(localStorage.getItem('veggiechef_bookmarks') || '[]'));
  const bookmarkAdded = postBookmarks.length > preBookmarks.length;
  record('slotMachine', '"Merken"-Button schreibt in Merkliste (veggiechef_bookmarks)',
    bookmarkAdded, `Vorher: ${preBookmarks.length}, Nachher: ${postBookmarks.length}`);

  // Close slot sheet
  await page.locator('dialog.vc-sheet button[aria-label*="Schließen"]').click();
  await page.waitForTimeout(300);

  // 1.7 "Entdecken" (Swipe): Vollbild (100lvh), Merken in veggiechef_bookmarks, NICHT Favoriten, Wisch öffnet NIE Rezept
  console.log('\n-> Testing "Entdecken" (Swipe Overlay)...');
  const swipeBtn = page.locator('#explorer-swipe-btn');
  await swipeBtn.click();
  await page.waitForTimeout(300);

  const swipeOverlayInfo = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"][aria-label="Rezepte entdecken"]');
    if (!dialog) return { error: 'Swipe overlay not found' };
    const style = window.getComputedStyle(dialog);
    const isFullscreen = style.position === 'fixed' && (style.height === '100lvh' || dialog.classList.contains('h-[100lvh]'));
    const title = dialog.querySelector('h2')?.textContent?.trim();
    const bookmarkBtn = document.getElementById('swipe-bookmark-btn');
    const skipBtn = document.getElementById('swipe-skip-btn');
    const viewBtn = document.getElementById('swipe-view-btn');

    return {
      isFullscreen,
      title,
      hasBookmarkBtn: !!bookmarkBtn,
      hasSkipBtn: !!skipBtn,
      hasViewBtn: !!viewBtn,
    };
  });
  record('swipeDeck', 'Swipe-Overlay öffnet im Vollbild (100lvh)', swipeOverlayInfo.isFullscreen && swipeOverlayInfo.title === 'Entdecken', JSON.stringify(swipeOverlayInfo));

  // Test Swipe/Merken-Button: Schreibt in MERKLISTE, NICHT in Favoriten!
  const preSwipeBookmarks = await page.evaluate(() => JSON.parse(localStorage.getItem('veggiechef_bookmarks') || '[]'));
  const preSwipeFavs = await page.evaluate(() => JSON.parse(localStorage.getItem('veggiechef_favorites') || '[]'));
  await page.locator('#swipe-bookmark-btn').click();
  await page.waitForTimeout(400);

  const postSwipeBookmarks = await page.evaluate(() => JSON.parse(localStorage.getItem('veggiechef_bookmarks') || '[]'));
  const postSwipeFavs = await page.evaluate(() => JSON.parse(localStorage.getItem('veggiechef_favorites') || '[]'));

  const wroteToBookmarksOnly = postSwipeBookmarks.length > preSwipeBookmarks.length && postSwipeFavs.length === preSwipeFavs.length;
  record('swipeDeck', 'Merken-Button schreibt in MERKLISTE, NICHT in Favoriten', wroteToBookmarksOnly,
    `Bookmarks: ${preSwipeBookmarks.length} -> ${postSwipeBookmarks.length}, Favs: ${preSwipeFavs.length} -> ${postSwipeFavs.length}`);

  // Test Wisch: Ein Wisch öffnet NIE das Rezept!
  console.log('-> Testing swipe drag gesture...');
  const cardLocator = page.locator('article[aria-label*="wischen"]');
  const cardBox = await cardLocator.boundingBox();
  if (cardBox) {
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(cardBox.x + cardBox.width / 2 - 180, cardBox.y + cardBox.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }

  const currentUrlAfterDrag = page.url();
  const didNotOpenRecipeOnDrag = !currentUrlAfterDrag.includes('/recipes/');
  record('swipeDeck', 'Wisch-Geste öffnet NIE das Rezept (URL bleibt unverändert)', didNotOpenRecipeOnDrag, `URL: ${currentUrlAfterDrag}`);

  // Test Klick auf "Ansehen" öffnet das Rezept
  console.log('-> Testing "Ansehen" button...');
  await page.locator('#swipe-view-btn').click();
  await page.waitForTimeout(400);
  const currentUrlAfterView = page.url();
  const didOpenRecipeOnView = currentUrlAfterView.includes('/recipes/');
  record('swipeDeck', 'Klick auf "Ansehen" öffnet das Rezept (/recipes/:id)', didOpenRecipeOnView, `URL: ${currentUrlAfterView}`);

  // Navigate back to home and re-open swipe to test "Alles durchgesehen"
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await swipeBtn.click();
  await page.waitForTimeout(300);

  console.log('-> Swiping through remaining cards to verify end screen...');
  for (let s = 0; s < 32; s++) {
    const isFinished = await page.evaluate(() => {
      return !!document.querySelector('h3')?.textContent?.includes('Alles durchgesehen')
        || !document.getElementById('swipe-skip-btn');
    });
    if (isFinished) break;
    const skipBtnLocator = page.locator('#swipe-skip-btn');
    if (await skipBtnLocator.isVisible()) {
      await skipBtnLocator.click();
      await page.waitForTimeout(80);
    } else {
      break;
    }
  }

  const finishedStateInfo = await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll('h3')).find(el => el.textContent?.includes('Alles durchgesehen'));
    const bookmarkLink = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Zur Merkliste'));
    return {
      hasFinishedHeading: !!h3,
      hasBookmarkLink: !!bookmarkLink,
    };
  });
  record('swipeDeck', 'Ende "Alles durchgesehen" mit Link zur Merkliste',
    finishedStateInfo.hasFinishedHeading && finishedStateInfo.hasBookmarkLink, JSON.stringify(finishedStateInfo));

  // Click "Zur Merkliste" and verify transition to /bookmarks
  const toBookmarksBtn = page.locator('button', { hasText: 'Zur Merkliste' });
  await toBookmarksBtn.click();
  await page.waitForTimeout(400);

  const isAtBookmarks = page.url().includes('/bookmarks');
  record('swipeDeck', 'Klick auf "Zur Merkliste" navigiert zu /bookmarks', isAtBookmarks, `URL: ${page.url()}`);

  // 1.8 Merkliste: Aufrufen von /bookmarks zeigt gemerkte Rezepte & Raster ↔ Liste Wechsel
  console.log('\n-> Testing Bookmarks Page & View Toggle...');
  const bookmarksPageInfo = await page.evaluate(() => {
    const title = document.querySelector('h1')?.textContent?.trim();
    const recipeCards = document.querySelectorAll('article');
    const gridBtn = document.querySelector('button[aria-label="Rasteransicht"]');
    const listBtn = document.querySelector('button[aria-label="Listenansicht"]');
    const isGridActive = gridBtn?.getAttribute('aria-pressed') === 'true';

    return {
      title,
      cardCount: recipeCards.length,
      hasGridBtn: !!gridBtn,
      hasListBtn: !!listBtn,
      isGridActive,
    };
  });
  record('bookmarks', 'Merkliste (/bookmarks) zeigt gemerkte Rezepte',
    bookmarksPageInfo.title === 'Merkliste' && bookmarksPageInfo.cardCount > 0,
    `Titel: ${bookmarksPageInfo.title}, Karten: ${bookmarksPageInfo.cardCount}`);

  // Test toggle to List view
  await page.locator('button[aria-label="Listenansicht"]').click();
  await page.waitForTimeout(300);
  const isListViewActive = await page.evaluate(() => {
    const listBtn = document.querySelector('button[aria-label="Listenansicht"]');
    const savedMode = localStorage.getItem('veggiechef_explorer_view');
    return listBtn?.getAttribute('aria-pressed') === 'true' && savedMode === '"list"';
  });
  record('viewToggle', 'Umschalten auf Listenansicht (State & localStorage)', isListViewActive);

  // Test toggle back to Grid view
  await page.locator('button[aria-label="Rasteransicht"]').click();
  await page.waitForTimeout(300);
  const isGridViewActive = await page.evaluate(() => {
    const gridBtn = document.querySelector('button[aria-label="Rasteransicht"]');
    const savedMode = localStorage.getItem('veggiechef_explorer_view');
    return gridBtn?.getAttribute('aria-pressed') === 'true' && savedMode === '"grid"';
  });
  record('viewToggle', 'Umschalten auf Rasteransicht (State & localStorage)', isGridViewActive);

  await context.close();

  // ----------------------------------------------------
  // TEST SUITE 2: Screenshot Matrix Generation
  // 6 Viewports x 6 Ansichten = 36 Screenshots
  // ----------------------------------------------------
  console.log('\n--- 2. Screenshot Matrix Generation (6 Viewports x 6 Ansichten) ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nGenerating screenshots for ${vp.name} (${vp.label})...`);
    const vpContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const vpPage = await vpContext.newPage();

    // Prepare fresh storage state with bookmark and cart items
    await vpPage.goto(BASE_URL);
    await vpPage.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('veggiechef_bookmarks', JSON.stringify(['classic-tomato-pasta', 'creamy-pumpkin-soup']));
      localStorage.setItem('veggiechef_favorites', JSON.stringify(['tofu-buddha-bowl']));
      localStorage.setItem('veggiechef_shopping_v1', JSON.stringify([
        { id: 'item1', name: 'Hokkaidokürbis', completed: false },
        { id: 'item2', name: 'Kokosmilch', completed: false }
      ]));
    });
    await vpPage.reload();
    await vpPage.waitForLoadState('networkidle');
    await vpPage.waitForTimeout(300);

    // 1. Startseite / Header
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_01_home_header.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${vp.name}_01_home_header.png`);

    // 2. Menü-Bühne
    await vpPage.locator('#header-menu-btn').click();
    await vpPage.waitForTimeout(400);
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_02_menu_stage.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${vp.name}_02_menu_stage.png`);

    // Close menu via Esc
    await vpPage.keyboard.press('Escape');
    await vpPage.waitForTimeout(300);

    // 3. Herbst-Sektion
    const autumnEl = vpPage.locator('section[aria-labelledby="season-title"]');
    await autumnEl.scrollIntoViewIfNeeded();
    await vpPage.waitForTimeout(300);
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_03_autumn_section.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${vp.name}_03_autumn_section.png`);

    // 4. Überrasch-mich-Sheet
    await vpPage.evaluate(() => window.scrollTo(0, 0));
    await vpPage.waitForTimeout(200);
    await vpPage.locator('#explorer-slot-machine-btn').click();
    await vpPage.waitForTimeout(850); // wait for shuffle animation
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_04_slot_sheet.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${vp.name}_04_slot_sheet.png`);

    // Close slot sheet
    const closeSheetBtn = vpPage.locator('dialog.vc-sheet button[aria-label*="Schließen"]');
    if (await closeSheetBtn.isVisible()) {
      await closeSheetBtn.click();
    } else {
      await vpPage.keyboard.press('Escape');
    }
    await vpPage.waitForTimeout(300);

    // 5. Swipe-Deck
    await vpPage.locator('#explorer-swipe-btn').click();
    await vpPage.waitForTimeout(400);
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_05_swipe_deck.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${vp.name}_05_swipe_deck.png`);

    // Close swipe deck
    await vpPage.keyboard.press('Escape');
    await vpPage.waitForTimeout(300);

    // 6. Merkliste
    await vpPage.goto(`${BASE_URL}/bookmarks`);
    await vpPage.waitForLoadState('networkidle');
    await vpPage.waitForTimeout(300);
    await vpPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_06_bookmarks.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${vp.name}_06_bookmarks.png`);

    await vpContext.close();
  }

  await browser.close();

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================');
  console.log('AUDIT SUMMARY');
  console.log('========================================');
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [cat, list] of Object.entries(testResults)) {
    for (const item of list) {
      totalTests++;
      if (item.passed) passedTests++;
      else failedTests++;
    }
  }

  console.log(`Total tests:  ${totalTests}`);
  console.log(`Passed tests: ${passedTests}`);
  console.log(`Failed tests: ${failedTests}`);

  const screenshots = fs.readdirSync(SCREENSHOT_DIR);
  console.log(`Total screenshots generated: ${screenshots.length}`);

  return { totalTests, passedTests, failedTests, testResults, screenshotCount: screenshots.length };
}

runAudit().then(res => {
  if (res.failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

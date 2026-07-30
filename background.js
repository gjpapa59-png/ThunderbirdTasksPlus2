try {
  if (browser.calendar_menu_experiment && browser.calendar_menu_experiment.initMenu) {
    browser.calendar_menu_experiment.initMenu();
    console.log("[Addon] Menü-Schnittstelle fehlerfrei registriert.");
  } else {
    console.error("[Addon] API 'calendar_menu_experiment' wurde im browser-Scope nicht gefunden.");
  }
} catch (error) {
  console.error("[Addon] Fehler beim Ausführen von initMenu:", error);
}


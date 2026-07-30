const { ExtensionSupport } = ChromeUtils.importESModule("resource:///modules/ExtensionSupport.sys.mjs");

var calendar_menu_experiment = class extends globalThis.ExtensionAPI {
  getAPI(context) {
    const addonId = context.extension.id;

    return {
      calendar_menu_experiment: {
        initMenu: function() {
          ExtensionSupport.registerWindowListener(addonId, {
            chromeURLs: ["chrome://messenger/content/messenger.xhtml"],
            onLoadWindow: function(window) {
              
              window.document.addEventListener("popupshowing", function(event) {
                let popup = event.target;
                if (!popup) return;

                // Prüfung: Sind wir im Aufschieben-Untermenü?
                let isPostponeMenu = popup.id === "calendar-task-postpone-menu" ||
                                     popup.getAttribute("id")?.includes("postpone");

                if (isPostponeMenu) {
                  // 1. EINTRAG: Um 2 Tage aufschieben
                  let id2Days = "task-context-postpone-2days-" + popup.id;
                  if (!window.document.getElementById(id2Days)) {
                    let item2Days = window.document.createXULElement("menuitem");
                    item2Days.setAttribute("id", id2Days);
                    item2Days.setAttribute("label", "2 Tage");
                    item2Days.addEventListener("command", () => { executePostponeLogic(window, 2); });
                    popup.appendChild(item2Days);
                  }

                  // 2. EINTRAG: Um 2 Wochen aufschieben (+14 Tage)
                  let id2Weeks = "task-context-postpone-2weeks-" + popup.id;
                  if (!window.document.getElementById(id2Weeks)) {
                    let item2Weeks = window.document.createXULElement("menuitem");
                    item2Weeks.setAttribute("id", id2Weeks);
                    item2Weeks.setAttribute("label", "2 Wochen");
                    item2Weeks.addEventListener("command", () => { executePostponeLogic(window, 14); });
                    popup.appendChild(item2Weeks);
                  }
                    
                  // 3. EINTRAG: auf Monatsletzten aufschieben
                  let idUltimo = "task-context-postpone-Ultimo-" + popup.id;
                  if (!window.document.getElementById(idUltimo)) {
                    let itemUltimo = window.document.createXULElement("menuitem");
                    itemUltimo.setAttribute("id", idUltimo);
                    itemUltimo.setAttribute("label", "Ultimo");
                    itemUltimo.addEventListener("command", () => { executePostponeLogic(window, -31); });
                    popup.appendChild(itemUltimo);
                  }
                }
              }, false);

            }
          });
        }
      }
    };
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;
    try {
      ExtensionSupport.unregisterWindowListener(this.context.extension.id);
    } catch(e) {}
  }
};

// Interne Rechenlogik für das Verschieben der Tage
function executePostponeLogic(window, days) {
  let taskTree = window.document.getElementById('calendar-task-tree') ||
                 window.document.querySelector('calendar-task-tree') ||
                 window.document.querySelector('calendar-task-view')?.shadowRoot?.querySelector('calendar-task-tree');

  // Hilfsfunktion zur Berechnung des Monatsletzten (inkl. Jahreswechsel)
  function getTargetDate(dateObj) {
    if (!dateObj || typeof dateObj.year !== 'number' || typeof dateObj.month !== 'number' || typeof dateObj.day !== 'number') {
      return null;
    }
    
    let currentYear = dateObj.year;
    let currentMonth = dateObj.month; // Geht davon aus, dass das System 0-basierte Monate nutzt (Jan = 0)
    let currentDay = dateObj.day;

    // 1. Letzten Tag des aktuellen Monats ermitteln (Tag 0 des Folgemonats)
    let endOfCurrentMonthDate = new Date(currentYear, currentMonth + 1, 0);
    let endOfCurrentMonthDay = endOfCurrentMonthDate.getDate();

    if (currentDay === endOfCurrentMonthDay) {
      // 2. Bereits Monatsletzter: Ermittle letzten Tag des Folgemonats.
      // JS korrigiert den Jahreswechsel automatisch (z.B. Monat 11 + 2 = Monat 13 -> Februar des Folgejahres)
      let endOfNextMonthDate = new Date(currentYear, currentMonth + 2, 0);
      return {
        year: endOfNextMonthDate.getFullYear(),
        month: endOfNextMonthDate.getMonth(),
        day: endOfNextMonthDate.getDate()
      };
    } else {
      // 3. Kein Monatsletzter: Auf aktuellen Monatsletzten setzen
      return {
        year: currentYear,
        month: currentMonth,
        day: endOfCurrentMonthDay
      };
    }
  }

  // Hilfsfunktion zum Anwenden der Datumsänderung
  function updateTaskDates(task) {
    if (days === -31) {
      if (task.dueDate) {
        let newDue = getTargetDate(task.dueDate);
        if (newDue) Object.assign(task.dueDate, newDue);
      }
      if (task.entryDate) {
        let newEntry = getTargetDate(task.entryDate);
        if (newEntry) Object.assign(task.entryDate, newEntry);
      }
    } else {
      // Standard-Logik für normale Tages-Verschiebungen
      if (task.dueDate) { task.dueDate.day += days; }
      if (task.entryDate) { task.entryDate.day += days; }
    }
  }

  if (taskTree && taskTree.currentTask) {
    let task = taskTree.currentTask.clone();
    updateTaskDates(task);
    task.calendar.modifyItem(task, taskTree.currentTask, null);
  } else {
    try {
      let currentTask = window.CalendarTaskView?.getSelectedTask?.() || window.currentTask;
      if (currentTask) {
        let task = currentTask.clone();
        updateTaskDates(task);
        task.calendar.modifyItem(task, currentTask, null);
      }
    } catch (e) {
      console.error("[Addon] Verschiebung im System fehlgeschlagen: ", e);
    }
  }
}

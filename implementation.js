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
  let taskTree = window.document.getElementById("calendar-task-tree") || 
                 window.document.querySelector("calendar-task-tree") ||
                 window.document.querySelector("calendar-task-view")?.shadowRoot?.querySelector("calendar-task-tree");

  if (taskTree && taskTree.currentTask) {
    let task = taskTree.currentTask.clone();
    
    if (task.dueDate) { task.dueDate.day += days; }
    if (task.entryDate) { task.entryDate.day += days; }

    task.calendar.modifyItem(task, taskTree.currentTask, null);
  } else {
    try {
      let currentTask = window.CalendarTaskView?.getSelectedTask?.() || window.currentTask;
      if (currentTask) {
        let task = currentTask.clone();
        if (task.dueDate) { task.dueDate.day += days; }
        task.calendar.modifyItem(task, currentTask, null);
      }
    } catch (e) {
      console.error("[Addon] Verschiebung im System fehlgeschlagen:", e);
    }
  }
}

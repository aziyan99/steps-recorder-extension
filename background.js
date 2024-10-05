chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/**@type {boolean} */
let isCaptureRunning = false;

/**@type {boolean} */
const DEBUG = false;

/**@type {(number|null)} */
let activeTabId = null;

/**
 * @function openEditorTab
 * @param {import("./sidebar/scripts").Step[]} steps 
 */
const openEditorTab = async (steps) => {
  const editorTabUrl = chrome.runtime.getURL("pages/editor.html");
  let targetId = null;

  chrome.tabs.onUpdated.addListener(function listener(tabId, changedProps) {
    if (tabId != targetId || changedProps.status != "complete") return;

    chrome.tabs.onUpdated.removeListener(listener);

    chrome.tabs.sendMessage(tabId, {
      type: "EDITOR-RENDERED",
      data: steps,
    });
  });

  const tab = await chrome.tabs.create({ url: editorTabUrl });
  targetId = tab.id;
};

const registerOnUpdatedListener = (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.id === tabId) {
      activeTabId = currentTab.id;
      chrome.tabs.sendMessage(currentTab.id, { type: "START-CAPTURE" });

      if (DEBUG) {
        console.log("background.js: ", `current tab id: ${currentTab.id}`);
        console.log("background.js: ", `active tab id: ${activeTabId}`);
      }
    }
  });
};

chrome.runtime.onMessage.addListener(async (message, sender, callback) => {
  if (message.type === "START-CAPTURE") {
    isCaptureRunning = true;

    console.log("background.js: ", "start capture");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        activeTabId = currentTab.id;
        chrome.tabs.sendMessage(currentTab.id, { type: "START-CAPTURE" });

        if (DEBUG) {
          console.log("background.js: ", `current tab id: ${currentTab.id}`);
          console.log("background.js: ", `active tab id: ${activeTabId}`);
        }
      }
    });

    chrome.tabs.onUpdated.addListener(registerOnUpdatedListener);
  }

  if (message.type === "STOP-CAPTURE") {
    isCaptureRunning = false;
    activeTabId = null;

    if (DEBUG) {
      console.log("background.js: ", "stop capture");
      console.log("background.js: ", `active tab id: ${activeTabId}`);
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, { type: "STOP-CAPTURE" });
      }
    });

    openEditorTab(message.data);

    chrome.tabs.onUpdated.removeListener(registerOnUpdatedListener);
  }
});

if (DEBUG) {
  // context menus
  const debugEditor = (info) => {
    switch (info.menuItemId) {
      case "openEditorMenu":
        openEditorTab([]);
        break;
      default:
        console.log("Invalid context menu id");
    }
  };

  chrome.contextMenus.onClicked.addListener(debugEditor);

  chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: "openEditorMenu",
      title: "Open editor (debug)",
      contexts: ["all"],
    });
  });
}
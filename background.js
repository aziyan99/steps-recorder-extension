chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/**@type {boolean} */
let isCaptureRunning = false;

/**@type {(number|null)} */
let activeTabId = null;

const registerOnUpdatedListener = (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.id === tabId) {
      activeTabId = currentTab.id;
      chrome.tabs.sendMessage(currentTab.id, { type: 'START-CAPTURE' });

      console.log('background.js: ', `current tab id: ${currentTab.id}`);
      console.log('background.js: ', `active tab id: ${activeTabId}`);
    }
  });
};

chrome.runtime.onMessage.addListener(async (message, sender, callback) => {
  if (message.type === 'START-CAPTURE') {
    isCaptureRunning = true;

    console.log('background.js: ', 'start capture');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        activeTabId = currentTab.id;
        chrome.tabs.sendMessage(currentTab.id, { type: 'START-CAPTURE' });

        console.log('background.js: ', `current tab id: ${currentTab.id}`);
        console.log('background.js: ', `active tab id: ${activeTabId}`);
      }
    });

    chrome.tabs.onUpdated.addListener(registerOnUpdatedListener);
  }

  if (message.type === 'STOP-CAPTURE') {
    isCaptureRunning = false;
    activeTabId = null;

    console.log('background.js: ', 'stop capture');
    console.log('background.js: ', `active tab id: ${activeTabId}`);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, { type: 'STOP-CAPTURE' });
      }
    });

    chrome.tabs.onUpdated.removeListener(registerOnUpdatedListener);
  }
});

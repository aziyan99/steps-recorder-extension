/**
 * @function clickEventFired
 * @param {PointerEvent} event
 */
const clickEventFired = (event) => {
  chrome.runtime.sendMessage({
    type: 'CAPTURED',
    data: { cursorX: event.clientX, cursorY: event.clientY },
  });
};

chrome.runtime.onMessage.addListener((message, sender, callback) => {
  if (message.type === 'START-CAPTURE') {
    document.removeEventListener('click', clickEventFired);
    document.addEventListener('click', clickEventFired);
  }

  if (message.type === 'STOP-CAPTURE') {
    document.removeEventListener('click', clickEventFired);
  }
});

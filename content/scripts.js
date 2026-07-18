/**
 * Content script setup
 */
export default function main() {
  /**
   * @function clickEventFired
   * @param {PointerEvent} event
   */
  const clickEventFired = (event) => {
    chrome.runtime.sendMessage({
      type: 'CAPTURED',
      data: {
        cursorX: event.clientX,
        cursorY: event.clientY,
        devicePixelRatio: window.devicePixelRatio,
      },
    });
  };

  const messageListener = (message, sender, callback) => {
    if (message.type === 'START-CAPTURE') {
      document.removeEventListener('click', clickEventFired);
      document.addEventListener('click', clickEventFired);
    }

    if (message.type === 'STOP-CAPTURE') {
      document.removeEventListener('click', clickEventFired);
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);

  // Cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener);
    document.removeEventListener('click', clickEventFired);
  };
}

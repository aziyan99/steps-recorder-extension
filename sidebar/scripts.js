import './styles.css';

const DEBUG = false;

/**@type {boolean} */
let isCaptureRunning = false;

/**@type {HTMLButtonElement} */
const startCaptureButton = document.querySelector(
  'button[data-action="start-capture"]',
);

/**@type {HTMLButtonElement} */
const stopCaptureButton = document.querySelector(
  'button[data-action="stop-capture"]',
);

/**@type {HTMLDivElement} */
const stepsRegion = document.querySelector('div[data-region="steps"]');

/**
 * @typedef {Object} Step
 * @property {string} base64Image
 * @property {number} cursorX
 * @property {number} cursorY
 * @property {number} devicePixelRatio
 */

/**@type {Step[]} */
let steps = [];

const stepWithCanvasTemplate = (cursorX, cursorY, base64Image, devicePixelRatio = 1) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const image = new Image();
  image.onload = () => {
    const width = 320;
    const height = 200;

    ctx.canvas.width = width - 24;
    ctx.canvas.height = height - 24;

    const scaledX = cursorX * devicePixelRatio;
    const scaledY = cursorY * devicePixelRatio;

    const dx = Math.max(0, scaledX - 150);
    const dy = Math.max(0, scaledY - 100);

    ctx.drawImage(image, dx, dy, width, height, 0, 0, width, height);
    const circleX = scaledX - dx;
    const circleY = scaledY - dy;
    ctx.beginPath();
    ctx.arc(circleX, circleY, 22, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(251, 146, 60)';
    ctx.stroke();
  };
  image.src = base64Image;

  canvas.classList.add('border', 'border-neutral-300', 'rounded');

  const wrapper = document.createElement('div');
  wrapper.classList.add(
    'bg-white',
    'rounded-md',
    'shadow-sm',
    'p-5', // 1.5rem => 24px
    'flex',
    'justify-center',
  );
  wrapper.appendChild(canvas);

  return wrapper;
};

startCaptureButton.addEventListener('click', function () {
  isCaptureRunning = true;

  startCaptureButton.classList.replace('block', 'hidden');
  stopCaptureButton.classList.replace('hidden', 'block');

  stepsRegion.classList.replace('hidden', 'flex');

  chrome.runtime.sendMessage({ type: 'START-CAPTURE' });
});

stopCaptureButton.addEventListener('click', function () {
  isCaptureRunning = false;
  startCaptureButton.classList.replace('hidden', 'block');
  stopCaptureButton.classList.replace('block', 'hidden');

  stepsRegion.classList.replace('flex', 'hidden');

  chrome.runtime.sendMessage({ type: 'STOP-CAPTURE', data: steps });
});

chrome.runtime.onMessage.addListener(async (message, sender, callback) => {
  if (message.type === 'CAPTURED') {
    if (!isCaptureRunning) return;
    const captureUrl = await chrome.tabs.captureVisibleTab();
    steps.push({
      base64Image: captureUrl,
      cursorX: message.data.cursorX,
      cursorY: message.data.cursorY,
      devicePixelRatio: message.data.devicePixelRatio || 1,
    });

    if (DEBUG) {
      console.log('sidebar: ', `steps: ${steps}`);
    }

    stepsRegion.innerHTML = '';
    steps.forEach((step) => {
      stepsRegion.appendChild(
        stepWithCanvasTemplate(
          step.cursorX,
          step.cursorY,
          step.base64Image,
          step.devicePixelRatio,
        ),
      );
    });
  }
});

// TODO: Empty out the `steps` var

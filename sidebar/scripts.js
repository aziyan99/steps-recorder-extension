import './styles.css';
import { getGuide, saveGuide, getAllGuides, deleteGuide, getActiveSessionId, setActiveSessionId } from '../pages/db-service.js';

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

// History Dashboard Elements
const sidebarHistoryBtn = document.getElementById('btn-sidebar-history');
const sidebarHistoryOverlay = document.getElementById('sidebar-history-overlay');
const sidebarHistoryCloseBtn = document.getElementById('btn-sidebar-close-history');
const sidebarHistoryList = document.getElementById('sidebar-history-list');

/**
 * @typedef {Object} Step
 * @property {string} id
 * @property {string} type
 * @property {string} base64Image
 * @property {number} cursorX
 * @property {number} cursorY
 * @property {number} devicePixelRatio
 * @property {string} instruction
 * @property {Array} shapes
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

const initSidebar = async () => {
  const activeId = getActiveSessionId();
  if (activeId) {
    try {
      const guide = await getGuide(activeId);
      if (guide) {
        steps = guide.steps || [];
        isCaptureRunning = true;

        startCaptureButton.classList.replace('block', 'hidden');
        stopCaptureButton.classList.replace('hidden', 'block');
        stepsRegion.classList.replace('hidden', 'flex');

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

        // Continue capture
        chrome.runtime.sendMessage({ type: 'START-CAPTURE' });
      }
    } catch (e) {
      console.error('Failed to restore active session:', e);
    }
  }
};

const renderSidebarHistory = async () => {
  try {
    const list = await getAllGuides();
    sidebarHistoryList.innerHTML = '';

    if (list.length === 0) {
      sidebarHistoryList.innerHTML = '<div class="text-neutral-500 text-sm text-center mt-8">No saved guides found.</div>';
      return;
    }

    list.forEach(guide => {
      const item = document.createElement('div');
      item.className = 'bg-white border border-neutral-200 rounded-md p-3 flex flex-col gap-2 shadow-sm';

      const dateStr = new Date(guide.lastModified).toLocaleDateString() + ' ' + new Date(guide.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      item.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex flex-col">
            <span class="font-bold text-neutral-800 text-sm truncate max-w-[180px]">${guide.title}</span>
            <span class="text-xs text-neutral-400 mt-0.5">${dateStr} • ${guide.stepCount} step${guide.stepCount === 1 ? '' : 's'}</span>
          </div>
          <button data-action="delete-guide" class="text-neutral-400 hover:text-red-600 p-1 hover:bg-neutral-100 rounded-full transition-colors" title="Delete Guide">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
        <div class="flex gap-2 mt-1">
          <button data-action="resume-guide" class="flex-grow bg-neutral-800 text-white hover:bg-neutral-900 py-1.5 rounded text-xs font-medium transition-colors">Resume</button>
        </div>
      `;

      const deleteBtn = item.querySelector('[data-action="delete-guide"]');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to permanently delete this guide recording?')) {
          await deleteGuide(guide.id);
          renderSidebarHistory();
        }
      });

      const resumeBtn = item.querySelector('[data-action="resume-guide"]');
      resumeBtn.addEventListener('click', async () => {
        const fullGuide = await getGuide(guide.id);
        if (fullGuide) {
          localStorage.setItem('current_guide_id', guide.id);
          chrome.runtime.sendMessage({ type: 'STOP-CAPTURE', data: fullGuide.steps });
          sidebarHistoryOverlay.classList.replace('flex', 'hidden');
        }
      });

      sidebarHistoryList.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to render history list:', err);
  }
};

startCaptureButton.addEventListener('click', async function () {
  isCaptureRunning = true;
  steps = []; // Reset steps for new recording

  startCaptureButton.classList.replace('block', 'hidden');
  stopCaptureButton.classList.replace('hidden', 'block');
  stepsRegion.classList.replace('hidden', 'flex');
  stepsRegion.innerHTML = '';

  const activeId = 'guide_' + Date.now();
  setActiveSessionId(activeId);
  localStorage.setItem('current_guide_id', activeId);

  const newGuide = {
    id: activeId,
    title: `Recording - ${new Date().toLocaleDateString()}`,
    createdAt: Date.now(),
    lastModified: Date.now(),
    stepCount: 0,
    steps: []
  };

  try {
    await saveGuide(newGuide);
  } catch (err) {
    console.error('Failed to create new guide record:', err);
  }

  chrome.runtime.sendMessage({ type: 'START-CAPTURE' });
});

stopCaptureButton.addEventListener('click', async function () {
  isCaptureRunning = false;
  startCaptureButton.classList.replace('hidden', 'block');
  stopCaptureButton.classList.replace('block', 'hidden');
  stepsRegion.classList.replace('flex', 'hidden');

  const activeId = getActiveSessionId();
  if (activeId) {
    try {
      const guide = await getGuide(activeId);
      if (guide) {
        guide.steps = steps;
        guide.stepCount = steps.length;
        guide.lastModified = Date.now();
        await saveGuide(guide);
      }
    } catch (err) {
      console.error('Failed to save final recording data:', err);
    }
  }

  setActiveSessionId(null); // Clear active capture session

  chrome.runtime.sendMessage({ type: 'STOP-CAPTURE', data: steps });
});

chrome.runtime.onMessage.addListener(async (message, sender, callback) => {
  if (message.type === 'CAPTURED') {
    if (!isCaptureRunning) return;
    const captureUrl = await chrome.tabs.captureVisibleTab();
    const newStep = {
      id: 'step_' + Date.now(),
      type: 'image',
      base64Image: captureUrl,
      cursorX: message.data.cursorX,
      cursorY: message.data.cursorY,
      devicePixelRatio: message.data.devicePixelRatio || 1,
      instruction: '',
      shapes: []
    };
    steps.push(newStep);

    if (DEBUG) {
      console.log('sidebar: ', `steps: ${steps}`);
    }

    // Auto-save step to IndexedDB
    const activeId = getActiveSessionId();
    if (activeId) {
      try {
        const guide = await getGuide(activeId);
        if (guide) {
          guide.steps = steps;
          guide.stepCount = steps.length;
          guide.lastModified = Date.now();
          await saveGuide(guide);
        }
      } catch (err) {
        console.error('Failed to auto-save step:', err);
      }
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

sidebarHistoryBtn.addEventListener('click', () => {
  sidebarHistoryOverlay.classList.replace('hidden', 'flex');
  renderSidebarHistory();
});

sidebarHistoryCloseBtn.addEventListener('click', () => {
  sidebarHistoryOverlay.classList.replace('flex', 'hidden');
});

// Run initialization
initSidebar();

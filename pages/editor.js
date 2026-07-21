import "./editor.css";
import { openImageModal } from "./editor-modal.js";
import { getGuide, saveGuide, getAllGuides, deleteGuide, checkStorageEstimate } from "./db-service.js";

/**@type {boolean} */
const DEBUG = false;

// History Drawer Elements
const historyDrawer = document.getElementById('history-drawer');
const historyBackdrop = document.getElementById('history-backdrop');
const historyListContainer = document.getElementById('history-list-container');
const editorTitle = document.getElementById('editor-title');

let currentSteps = [];

const saveCurrentGuide = async () => {
  const guideId = localStorage.getItem('current_guide_id');
  if (guideId) {
    try {
      const guide = await getGuide(guideId);
      if (guide) {
        guide.title = editorTitle.innerText || guide.title;
        guide.steps = currentSteps;
        guide.stepCount = currentSteps.length;
        guide.lastModified = Date.now();
        await saveGuide(guide);
      }
    } catch (err) {
      console.error('Failed to auto-save guide changes:', err);
    }
  }
};

const updateStepIndices = () => {
  const steps = document.querySelectorAll('.step-wrapper');
  steps.forEach((step, index) => {
    const indexEl = step.querySelector('.step-header-index');
    if (indexEl) {
      indexEl.innerText = `${index + 1}`;
    }
  });
};

const updateStepControls = () => {
  const steps = document.querySelectorAll('.step-wrapper');
  steps.forEach((step, index) => {
    const btnUp = step.querySelector('.btn-move-up');
    const btnDown = step.querySelector('.btn-move-down');

    if (btnUp) btnUp.style.visibility = index === 0 ? 'hidden' : 'visible';
    if (btnDown) btnDown.style.visibility = index === steps.length - 1 ? 'hidden' : 'visible';
  });
};

/**
 * @function stepWithCanvasTemplate
 *
 * @param {number} index - The index of the step
 * @param {number} cursorX - The X coordinate of the cursor interaction
 * @param {number} cursorY - The Y coordinate of the cursor interaction
 * @param {string} base64Image - The screenshot as a base64 string
 * @param {number} devicePixelRatio - The pixel ratio of the captured device
 *
 * @param {Array} shapes - Array of annotation shapes
 * @returns {HTMLElement} The constructed DOM element for the step
 */
const stepWithCanvasTemplate = (index, cursorX, cursorY, base64Image, devicePixelRatio = 1, shapes = []) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const canvasWidth = 688;
  const canvasHeight = 384;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Zoom and Pan State
  let scale = 1;
  let panX = 0;
  let panY = 0;

  let isDragging = false;
  let startDragX = 0;
  let startDragY = 0;

  const image = new Image();

  /**
   * Draws the image and cursor indicator on the canvas, applying current transformations.
   */
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    ctx.drawImage(image, 0, 0);

    // Draw Shapes
    shapes.forEach(shape => {
        ctx.beginPath();
        ctx.strokeStyle = shape.color || 'rgb(251, 146, 60)'; // Default orange
        ctx.lineWidth = (shape.width || 4) * devicePixelRatio;

        const sx = shape.x * devicePixelRatio;
        const sy = shape.y * devicePixelRatio;
        const ex = shape.endX * devicePixelRatio;
        const ey = shape.endY * devicePixelRatio;

        if (shape.type === 'line') {
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        } else if (shape.type === 'rect') {
            ctx.rect(sx, sy, ex - sx, ey - sy);
            ctx.stroke();
        } else if (shape.type === 'arrow') {
            const headLength = 15 * devicePixelRatio; // length of head in pixels
            const dx = ex - sx;
            const dy = ey - sy;
            const angle = Math.atan2(dy, dx);

            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLength * Math.cos(angle - Math.PI / 6), ey - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLength * Math.cos(angle + Math.PI / 6), ey - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }
    });

    const scaledX = cursorX * devicePixelRatio;
    const scaledY = cursorY * devicePixelRatio;

    ctx.beginPath();
    ctx.arc(scaledX, scaledY, 22, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(251, 146, 60)';
    ctx.stroke();

    ctx.restore();
  };

  image.onload = () => {
    // Scale the CSS coordinates to image physical pixels
    const scaledX = cursorX * devicePixelRatio;
    const scaledY = cursorY * devicePixelRatio;

    let idealPanX = (canvasWidth / 2) - scaledX;
    let idealPanY = (canvasHeight / 2) - scaledY;

    const minPanX = canvasWidth - image.width;
    const minPanY = canvasHeight - image.height;

    if (image.width >= canvasWidth) {
      panX = Math.min(0, Math.max(minPanX, idealPanX));
    } else {
      panX = 0;
    }

    if (image.height >= canvasHeight) {
      panY = Math.min(0, Math.max(minPanY, idealPanY));
    } else {
       panY = 0;
    }

    draw();
  };
  image.src = base64Image;
  image.setAttribute('data-id', index);

  canvas.classList.add('rounded-lg', 'canvas');
  canvas.setAttribute('data-id', index);

  // -- Event Listeners for Pan/Zoom --

  canvas.__updateAndRedraw = (updates) => {
    if (updates.shapes !== undefined) shapes = updates.shapes;
    if (updates.cursorX !== undefined) cursorX = updates.cursorX;
    if (updates.cursorY !== undefined) cursorY = updates.cursorY;
    draw();
  };

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startDragX = e.clientX;
    startDragY = e.clientY;
  });

  const onDragEnd = () => {
    if (isDragging) {
      isDragging = false;
    }
  };
  canvas.addEventListener('mouseup', onDragEnd);
  canvas.addEventListener('mouseleave', onDragEnd);

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startDragX;
    const dy = e.clientY - startDragY;

    panX += dx;
    panY += dy;

    startDragX = e.clientX;
    startDragY = e.clientY;

    draw();
  });

  // -- End Event Listeners --

  const dragLabel = document.createElement('div');
  dragLabel.className = 'absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-none select-none opacity-0 transition-opacity duration-300 group-hover:opacity-100';
  dragLabel.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    </svg>
    <span>Drag to Pan</span>
  `;

  // Zoom Controls
  const zoomControls = document.createElement('div');
  zoomControls.className = 'absolute bottom-4 right-4 flex flex-col bg-slate-800/90 text-white rounded-lg shadow-lg overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100';

  const zoomInBtn = document.createElement('button');
  zoomInBtn.className = 'p-2 hover:bg-slate-700 active:bg-slate-600 transition-colors';
  zoomInBtn.title = 'Zoom In';
  zoomInBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  `;
  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const factor = 1.2;

    const mouseX = canvasWidth / 2;
    const mouseY = canvasHeight / 2;

    const worldX = (mouseX - panX) / scale;
    const worldY = (mouseY - panY) / scale;

    const newScale = Math.max(0.1, Math.min(scale * factor, 5));

    panX = mouseX - (worldX * newScale);
    panY = mouseY - (worldY * newScale);
    scale = newScale;
    draw();
  });

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.className = 'p-2 hover:bg-slate-700 active:bg-slate-600 transition-colors';
  zoomOutBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
    </svg>
  `;
  zoomOutBtn.title = 'Zoom Out';
  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const factor = 1 / 1.2;
    const mouseX = canvasWidth / 2;
    const mouseY = canvasHeight / 2;

    const worldX = (mouseX - panX) / scale;
    const worldY = (mouseY - panY) / scale;

    const newScale = Math.max(0.1, Math.min(scale * factor, 5));

    panX = mouseX - (worldX * newScale);
    panY = mouseY - (worldY * newScale);
    scale = newScale;
    draw();
  });

  const viewBtn = document.createElement('button');
  viewBtn.className = 'p-2 hover:bg-slate-700 active:bg-slate-600 transition-colors';
  viewBtn.title = "View Full Image";
  viewBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    </svg>
  `;
  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentStep = currentSteps[index] || {};

    openImageModal(
        base64Image,
        currentStep.cursorX,
        currentStep.cursorY,
        devicePixelRatio,
        currentStep.shapes || [],
        (updates) => {
            updateStepData(index, updates);
        }
    );
  });

  zoomControls.appendChild(viewBtn);
  zoomControls.appendChild(zoomInBtn);
  zoomControls.appendChild(zoomOutBtn);

  const stepImage = document.createElement('div');
  stepImage.classList.add('step-image', 'shadow-inner', 'border', 'rounded-lg', 'border-neutral-100', 'overflow-hidden', 'relative', 'group');
  stepImage.appendChild(canvas);
  stepImage.appendChild(dragLabel);
  stepImage.appendChild(zoomControls);

  const stepHeaderIndex = document.createElement('div');
  stepHeaderIndex.classList.add('step-header-index');
  stepHeaderIndex.innerText = `${index + 1}`;

  const stepHeaderTitle = document.createElement('textarea');
  stepHeaderTitle.classList.add('step-header-title', 'w-full', 'resize-none', 'outline-none', 'bg-transparent', 'text-lg', 'font-medium', 'print:hidden');
  stepHeaderTitle.value = currentSteps[index]?.instruction || "";
  stepHeaderTitle.placeholder = "Add step description...";
  stepHeaderTitle.style.overflow = 'hidden';
  stepHeaderTitle.rows = 1;

  const stepHeaderTitlePrint = document.createElement('div');
  stepHeaderTitlePrint.classList.add('step-header-title-print', 'hidden', 'print:block', 'w-full', 'text-lg', 'font-medium', 'text-neutral-800', 'whitespace-pre-wrap', 'break-words');
  stepHeaderTitlePrint.textContent = currentSteps[index]?.instruction || "";

  stepHeaderTitle.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
    stepHeaderTitlePrint.textContent = this.value;
    currentSteps[index].instruction = this.value;
    saveCurrentGuide();
  });

  const stepHeader = document.createElement('div');
  stepHeader.classList.add('step-header', 'mb-4', 'flex', 'items-start', 'gap-4');
  stepHeader.appendChild(stepHeaderIndex);
  stepHeader.appendChild(stepHeaderTitle);
  stepHeader.appendChild(stepHeaderTitlePrint);

  const moveControls = document.createElement('div');
  moveControls.classList.add('move-controls', 'p-2', 'flex', 'flex-col', 'items-center', 'justify-start', 'gap-2', 'text-neutral-400', 'print:hidden');

  const btnUp = document.createElement('button');
  btnUp.classList.add('btn-move-up', 'p-1', 'hover:text-neutral-600', 'hover:bg-neutral-100', 'rounded', 'transition-colors');
  btnUp.title = "Move Up";
  btnUp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd" /></svg>`;
  btnUp.addEventListener('click', () => {
    if (index > 0) {
      const temp = currentSteps[index];
      currentSteps[index] = currentSteps[index - 1];
      currentSteps[index - 1] = temp;
      renderSteps();
      saveCurrentGuide();
    }
  });

  const btnDown = document.createElement('button');
  btnDown.classList.add('btn-move-down', 'p-1', 'hover:text-neutral-600', 'hover:bg-neutral-100', 'rounded', 'transition-colors');
  btnDown.title = "Move Down";
  btnDown.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd" /></svg>`;
  btnDown.addEventListener('click', () => {
    if (index < currentSteps.length - 1) {
      const temp = currentSteps[index];
      currentSteps[index] = currentSteps[index + 1];
      currentSteps[index + 1] = temp;
      renderSteps();
      saveCurrentGuide();
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'p-1 hover:bg-neutral-100 hover:text-red-600 rounded transition-colors text-neutral-400 mt-2';
  deleteBtn.title = "Delete Step";
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  `;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this step?')) {
      currentSteps.splice(index, 1);
      renderSteps();
      saveCurrentGuide();
    }
  });

  moveControls.appendChild(btnUp);
  moveControls.appendChild(btnDown);
  moveControls.appendChild(deleteBtn);

  const contentWrapper = document.createElement('div');
  contentWrapper.classList.add('step', 'flex-grow', 'flex', 'flex-col', 'bg-white', 'rounded-lg', 'p-6', 'shadow-sm', 'gap-y-2');
  contentWrapper.appendChild(stepHeader);
  contentWrapper.appendChild(stepImage);

  const stepWrapper = document.createElement('div');
  stepWrapper.classList.add('step-wrapper', 'pagebreak', 'flex', 'flex-row', 'gap-2', 'items-start');
  stepWrapper.appendChild(moveControls);
  stepWrapper.appendChild(contentWrapper);

  return stepWrapper;
};

const createTextStepTemplate = (index) => {
  const stepIndex = document.createElement('div');
  stepIndex.className = 'step-header-index';
  stepIndex.innerText = `${index + 1}`;
  stepIndex.style.flexShrink = '0';

  const textInput = document.createElement('textarea');
  textInput.className = 'step-header-title w-full resize-none outline-none bg-transparent text-lg font-medium print:hidden';
  textInput.rows = 1;
  textInput.placeholder = "Add context instruction details...";
  textInput.value = currentSteps[index]?.instruction || "";
  textInput.style.overflow = 'hidden';

  const textPrint = document.createElement('div');
  textPrint.className = 'step-header-title-print hidden print:block w-full text-lg font-medium text-neutral-800 whitespace-pre-wrap break-words';
  textPrint.textContent = currentSteps[index]?.instruction || "";

  textInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
    textPrint.textContent = this.value;
    currentSteps[index].instruction = this.value;
    saveCurrentGuide();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'p-2 hover:bg-neutral-100 hover:text-red-600 rounded-full transition-colors text-slate-400 ml-auto flex-shrink-0 print:hidden';
  deleteBtn.title = "Delete Step";
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  `;

  const stepWrapper = document.createElement('div');
  stepWrapper.className = 'step-wrapper pagebreak flex flex-row gap-2 items-start';

  deleteBtn.addEventListener('click', () => {
    if (confirm('Delete this text step?')) {
      currentSteps.splice(index, 1);
      renderSteps();
      saveCurrentGuide();
    }
  });

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'step-text-only';
  contentWrapper.appendChild(stepIndex);
  contentWrapper.appendChild(textInput);
  contentWrapper.appendChild(textPrint);
  contentWrapper.appendChild(deleteBtn);

  const moveControls = document.createElement('div');
  moveControls.className = 'move-controls p-2 flex flex-col items-center justify-start gap-2 text-neutral-400 print:hidden';

  const btnUp = document.createElement('button');
  btnUp.className = 'btn-move-up p-1 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors';
  btnUp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd" /></svg>`;
  btnUp.addEventListener('click', () => {
    if (index > 0) {
      const temp = currentSteps[index];
      currentSteps[index] = currentSteps[index - 1];
      currentSteps[index - 1] = temp;
      renderSteps();
      saveCurrentGuide();
    }
  });

  const btnDown = document.createElement('button');
  btnDown.className = 'btn-move-down p-1 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors';
  btnDown.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd" /></svg>`;
  btnDown.addEventListener('click', () => {
    if (index < currentSteps.length - 1) {
      const temp = currentSteps[index];
      currentSteps[index] = currentSteps[index + 1];
      currentSteps[index + 1] = temp;
      renderSteps();
      saveCurrentGuide();
    }
  });

  moveControls.appendChild(btnUp);
  moveControls.appendChild(btnDown);

  stepWrapper.appendChild(moveControls);
  stepWrapper.appendChild(contentWrapper);

  return stepWrapper;
};

const addTextBtn = document.getElementById('btn-add-text');
if (addTextBtn) {
  addTextBtn.addEventListener('click', () => {
    const textStepObj = {
      id: 'step_' + Date.now(),
      type: 'text',
      instruction: ''
    };
    currentSteps.push(textStepObj);
    renderSteps();
    saveCurrentGuide();

    // Scroll to new step
    const steps = document.querySelectorAll('.step-wrapper');
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      lastStep.scrollIntoView({ behavior: 'smooth' });
      const textarea = lastStep.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  });
}

chrome.runtime.onMessage.addListener(async (message, sender, callback) => {
  if (message.type === "EDITOR-RENDERED") {
    currentSteps = message.data;

    let guideId = localStorage.getItem('current_guide_id');
    if (!guideId) {
      guideId = 'guide_' + Date.now();
      localStorage.setItem('current_guide_id', guideId);

      const newGuide = {
        id: guideId,
        title: "Recording Guide",
        createdAt: Date.now(),
        lastModified: Date.now(),
        stepCount: currentSteps.length,
        steps: currentSteps
      };
      await saveGuide(newGuide);
    }
    
    const guide = await getGuide(guideId);
    if (guide) {
      editorTitle.innerText = guide.title || "Recording Guide";
    }

    renderSteps();
  }
});

const renderSteps = () => {
    const stepsRegion = document.querySelector('[data-region="steps"]');
    stepsRegion.innerHTML = '';
    currentSteps.forEach((step, index) => {
      let stepElement;
      if (step.type === 'text') {
        stepElement = createTextStepTemplate(index);
      } else {
        stepElement = stepWithCanvasTemplate(
          index,
          step.cursorX,
          step.cursorY,
          step.base64Image,
          step.devicePixelRatio,
          step.shapes || []
        );
      }
      stepsRegion.appendChild(stepElement);
    });
    updateStepControls();
    updateStepIndices();

    requestAnimationFrame(() => {
      document.querySelectorAll('.step-header-title').forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    });
};

const updateStepData = (index, updates) => {
    if (currentSteps[index]) {
        Object.assign(currentSteps[index], updates);
        const canvas = document.querySelector(`canvas[data-id="${index}"]`);
        if (canvas && canvas.__updateAndRedraw) {
            canvas.__updateAndRedraw(updates);
        }
        saveCurrentGuide();
    }
};

const printBtn = document.getElementById('btn-print');
if (printBtn) {
  printBtn.addEventListener('click', () => {
    window.print();
  });
}

// History Dashboard Logic
const historyBtn = document.getElementById('btn-history');
const historyCloseBtn = document.getElementById('btn-close-history');

const toggleHistoryDrawer = (show) => {
  if (show) {
    historyDrawer.classList.remove('translate-x-full');
    historyBackdrop.classList.remove('hidden');
  } else {
    historyDrawer.classList.add('translate-x-full');
    historyBackdrop.classList.add('hidden');
  }
};

const renderHistoryList = async () => {
  try {
    const list = await getAllGuides();
    historyListContainer.innerHTML = '';

    if (list.length === 0) {
      historyListContainer.innerHTML = '<div class="text-neutral-500 text-sm text-center mt-12">No saved guides found.</div>';
      return;
    }

    list.forEach(guide => {
      const row = document.createElement('div');
      row.className = 'bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:border-neutral-300 transition-colors';
      
      const dateStr = new Date(guide.lastModified).toLocaleDateString() + ' ' + new Date(guide.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      row.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex flex-col">
            <span class="font-bold text-neutral-800">${guide.title}</span>
            <span class="text-xs text-neutral-400 mt-1">${dateStr} • ${guide.stepCount} step${guide.stepCount === 1 ? '' : 's'}</span>
          </div>
          <button data-action="delete-guide" class="text-neutral-400 hover:text-red-600 p-1.5 hover:bg-neutral-100 rounded-full transition-colors" title="Delete Guide">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
        <div class="flex gap-2">
          <button data-action="resume-guide" class="flex-grow bg-neutral-800 text-white hover:bg-neutral-900 py-1.5 rounded text-sm font-medium transition-colors">Resume Editing</button>
        </div>
      `;

      const deleteBtn = row.querySelector('[data-action="delete-guide"]');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to permanently delete this guide recording?')) {
          await deleteGuide(guide.id);
          renderHistoryList();
          
          // If we deleted the guide currently being edited, reset the active workspace
          const activeId = localStorage.getItem('current_guide_id');
          if (activeId === guide.id) {
            currentSteps = [];
            editorTitle.innerText = "Recording Guide";
            localStorage.removeItem('current_guide_id');
            renderSteps();
          }
        }
      });

      const resumeBtn = row.querySelector('[data-action="resume-guide"]');
      resumeBtn.addEventListener('click', async () => {
        const fullGuide = await getGuide(guide.id);
        if (fullGuide) {
          localStorage.setItem('current_guide_id', guide.id);
          currentSteps = fullGuide.steps || [];
          editorTitle.innerText = fullGuide.title || "Recording Guide";
          renderSteps();
          toggleHistoryDrawer(false);
        }
      });

      historyListContainer.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load history list:', err);
  }
};

if (historyBtn) {
  historyBtn.addEventListener('click', () => {
    toggleHistoryDrawer(true);
    renderHistoryList();
  });
}

if (historyCloseBtn) {
  historyCloseBtn.addEventListener('click', () => toggleHistoryDrawer(false));
}

if (historyBackdrop) {
  historyBackdrop.addEventListener('click', () => toggleHistoryDrawer(false));
}

// Editable Title listener
if (editorTitle) {
  editorTitle.addEventListener('blur', () => {
    saveCurrentGuide();
  });
  editorTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editorTitle.blur();
    }
  });
}

// Reload warnings (beforeunload)
window.addEventListener('beforeunload', (event) => {
  event.preventDefault();
  event.returnValue = '';
});

// Initial loader restoration
const loadActiveSession = async () => {
  try {
    const estimate = await checkStorageEstimate();
    if (estimate.isLowSpace) {
      const warningBanner = document.createElement('div');
      warningBanner.className = 'w-full bg-amber-500 text-white text-center py-2 text-sm font-medium print:hidden';
      warningBanner.innerText = '⚠️ Warning: Local browser storage is running low. Please delete older guide recordings in History to prevent data loss.';
      document.body.insertBefore(warningBanner, document.body.firstChild);
    }
  } catch (err) {
    console.error('Failed to estimate storage:', err);
  }

  const guideId = localStorage.getItem('current_guide_id');
  if (guideId) {
    try {
      const guide = await getGuide(guideId);
      if (guide) {
        currentSteps = guide.steps || [];
        editorTitle.innerText = guide.title || "Recording Guide";
        renderSteps();
      }
    } catch (err) {
      console.error('Failed to restore active session:', err);
    }
  }
};

loadActiveSession();

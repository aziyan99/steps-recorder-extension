import "./editor.css";

/**@type {boolean} */
const DEBUG = false;

/**
 * @ function stepWithCanvasTemplate
 * 
 * @param {number} index 
 * @param {number} cursorX 
 * @param {number} cursorY 
 * @param {string} base64Image 
 * 
 * @returns {HTMLElement}
 */
const stepWithCanvasTemplate = (index, cursorX, cursorY, base64Image) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const canvasWidth = 688;
  const canvasHeight = 384;
  ctx.canvas.width = canvasWidth;
  ctx.canvas.height = canvasHeight;

  const image = new Image();

  const draw = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const dx = Math.max(0, cursorX - (canvasWidth / 2)); // Adjust so (cursorX, cursorY) is near the center horizontally
    const dy = Math.max(0, cursorY - (canvasHeight / 1.5)); // Adjust to center vertically

    ctx.drawImage(image, dx, dy, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight);

    const circleX = cursorX - dx;
    const circleY = cursorY - dy;
    ctx.beginPath();
    ctx.arc(circleX, circleY, 22, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(251, 146, 60)';
    ctx.stroke();
  };

  image.onload = () => {
    draw();
  };
  image.src = base64Image;
  image.setAttribute('data-id', index);

  canvas.classList.add('rounded-lg', 'canvas');
  canvas.setAttribute('data-id', index);
  canvas.setAttribute('data-img', base64Image);
  canvas.setAttribute('data-posx', cursorX);
  canvas.setAttribute('data-posy', cursorY);

  const stepHeaderIndex = document.createElement('div');
  stepHeaderIndex.classList.add('step-header-index');
  stepHeaderIndex.innerText = `${index + 1}`;

  const stepHeaderTitle = document.createElement('textarea');
  stepHeaderTitle.classList.add('step-header-title');
  stepHeaderTitle.innerText = `Step ${index + 1}.`;
  stepHeaderTitle.style.overflow = 'hidden';

  stepHeaderTitle.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const stepHeader = document.createElement('div');
  stepHeader.classList.add('step-header', 'mb-4');
  stepHeader.appendChild(stepHeaderIndex);
  stepHeader.appendChild(stepHeaderTitle);

  const stepImage = document.createElement('div');
  stepImage.classList.add('step-image', 'shadow-inner', 'border', 'rounded-lg', 'border-neutral-100');
  stepImage.appendChild(canvas);

  const step = document.createElement('div');
  step.classList.add('step');
  step.appendChild(stepHeader);
  step.appendChild(stepImage);

  return step;
};

chrome.runtime.onMessage.addListener((message, sender, callback) => {
  if (message.type === "EDITOR-RENDERED") {
    const stepsRegion = document.querySelector('[data-region="steps"]');
    stepsRegion.innerHTML = '';
    message.data.forEach((step, index) => {
      const stepElement = stepWithCanvasTemplate(index, step.cursorX, step.cursorY, step.base64Image);
      stepsRegion.appendChild(stepElement);
    });
  }
});


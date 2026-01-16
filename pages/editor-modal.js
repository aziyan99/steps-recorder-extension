let modalElements = null;

const createModal = () => {
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.className = 'fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/80 backdrop-blur-sm';

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    const content = document.createElement('div');
    content.className = 'relative w-[95vw] h-[95vh] bg-neutral-900 rounded-lg shadow-2xl overflow-hidden flex flex-col';

    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'modal-canvas-container';
    canvasContainer.className = 'w-full h-full cursor-move relative overflow-hidden';

    const helperText = document.createElement('div');
    helperText.className = 'absolute top-4 left-4 text-white/50 text-sm pointer-events-none select-none z-10';
    helperText.innerHTML = 'Scroll to Zoom • Drag to Pan • Drag Circle to Edit';
    canvasContainer.appendChild(helperText);

    const canvas = document.createElement('canvas');
    canvas.className = 'block';
    canvasContainer.appendChild(canvas);
    content.appendChild(canvasContainer);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-20';
    closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    closeBtn.addEventListener('click', closeModal);
    content.appendChild(closeBtn);

    modal.appendChild(content);
    document.body.appendChild(modal);

    return { modal, canvas, container: canvasContainer };
};

let state = {
    image: null,
    base64Image: null,
    cursorX: 0,
    cursorY: 0,
    dpr: 1,
    scale: 1,
    panX: 0,
    panY: 0,
    isDraggingCanvas: false,
    isDraggingCircle: false,
    dragStartX: 0,
    dragStartY: 0,
    initialCursorX: 0,
    initialCursorY: 0,
    onUpdate: null
};

const draw = () => {
    if (!modalElements || !state.image) return;
    const { canvas, container } = modalElements;
    const ctx = canvas.getContext('2d');

    if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.scale, state.scale);

    ctx.drawImage(state.image, 0, 0);

    const visualRadius = 22 / state.scale;

    ctx.beginPath();
    ctx.arc(state.cursorX, state.cursorY, visualRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
    ctx.fill();

    ctx.lineWidth = 2 / state.scale;
    ctx.strokeStyle = 'rgb(251, 146, 60)';
    ctx.stroke();

    ctx.restore();
};

const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const mouseX = e.clientX - modalElements.container.getBoundingClientRect().left;
    const mouseY = e.clientY - modalElements.container.getBoundingClientRect().top;

    const worldX = (mouseX - state.panX) / state.scale;
    const worldY = (mouseY - state.panY) / state.scale;

    state.scale *= factor;
    // Clamp scale?
    state.scale = Math.max(0.01, Math.min(state.scale, 50));

    state.panX = mouseX - worldX * state.scale;
    state.panY = mouseY - worldY * state.scale;

    draw();
};

const handleMouseDown = (e) => {
    const mouseX = e.clientX - modalElements.container.getBoundingClientRect().left;
    const mouseY = e.clientY - modalElements.container.getBoundingClientRect().top;

    const worldX = (mouseX - state.panX) / state.scale;
    const worldY = (mouseY - state.panY) / state.scale;
    const hitRadius = 30 / state.scale;

    const dist = Math.sqrt((worldX - state.cursorX) ** 2 + (worldY - state.cursorY) ** 2);

    if (dist < hitRadius) {
        state.isDraggingCircle = true;
        state.initialCursorX = state.cursorX;
        state.initialCursorY = state.cursorY;
    } else {
        state.isDraggingCanvas = true;
    }

    state.dragStartX = mouseX;
    state.dragStartY = mouseY;
};

const handleMouseMove = (e) => {
    if (!state.isDraggingCanvas && !state.isDraggingCircle) return;

    const mouseX = e.clientX - modalElements.container.getBoundingClientRect().left;
    const mouseY = e.clientY - modalElements.container.getBoundingClientRect().top;

    if (state.isDraggingCanvas) {
        state.panX += mouseX - state.dragStartX;
        state.panY += mouseY - state.dragStartY;
    } else if (state.isDraggingCircle) {
        const dx = (mouseX - state.dragStartX) / state.scale;
        const dy = (mouseY - state.dragStartY) / state.scale;

        state.cursorX += dx;
        state.cursorY += dy;

        if (state.onUpdate) {
             state.onUpdate(state.cursorX / state.dpr, state.cursorY / state.dpr);
        }
    }

    state.dragStartX = mouseX;
    state.dragStartY = mouseY;
    draw();
};

const handleMouseUp = () => {
    state.isDraggingCanvas = false;
    state.isDraggingCircle = false;
};


export const openImageModal = (base64Image, rawCursorX, rawCursorY, dpr, onUpdate) => {
    if (!modalElements) {
        modalElements = createModal();
        modalElements.canvas.addEventListener('wheel', handleWheel, { passive: false });
        modalElements.canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    const effectiveDpr = dpr || 1;

    // Reset state
    state = {
        image: new Image(),
        base64Image,
        cursorX: rawCursorX * effectiveDpr,
        cursorY: rawCursorY * effectiveDpr,
        dpr: effectiveDpr,
        scale: 1,
        panX: 0,
        panY: 0,
        isDraggingCanvas: false,
        isDraggingCircle: false,
        dragStartX: 0,
        dragStartY: 0,
        onUpdate
    };

    state.image.src = base64Image;
    state.image.onload = () => {
        // Auto-fit logic
        const containerW = modalElements.container.clientWidth;
        const containerH = modalElements.container.clientHeight;
        const imgW = state.image.width;
        const imgH = state.image.height;

        const scaleW = containerW / imgW;
        const scaleH = containerH / imgH;
        state.scale = Math.min(scaleW, scaleH) * 0.9;

        state.panX = (containerW - imgW * state.scale) / 2;
        state.panY = (containerH - imgH * state.scale) / 2;

        draw();
    };

    modalElements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    if (modalElements) {
        modalElements.modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

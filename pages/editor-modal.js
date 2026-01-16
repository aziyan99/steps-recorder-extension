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

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-800 rounded-full px-4 py-2 flex gap-4 shadow-lg z-30 border border-neutral-700';
    toolbar.id = 'modal-toolbar';

    const tools = [
        { id: 'move', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834-1.385-.042.042m0 0-1.591 1.591M20.25 10.5H18m2.208 5.875-.042-.042m0 0-1.591-1.591M12 19.5v2.25m-5.834-1.385.042-.042m0 0 1.591-1.591M3.75 10.5H6m-2.208 5.875.042-.042m0 0 1.591-1.591m-1.591-7.468.042.042m0 0 1.591 1.591" /></svg>', title: 'Move' },
        { id: 'arrow', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>', title: 'Arrow' },
        { id: 'line', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>', title: 'Line' },
        { id: 'rect', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" transform="scale(0.001)" /><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/></svg>', title: 'Rectangle' },
    ];

    tools.forEach(tool => {
        const btn = document.createElement('button');
        btn.innerHTML = tool.icon;
        btn.dataset.tool = tool.id;
        btn.className = 'p-2 rounded-full hover:bg-neutral-700 text-neutral-400 transition-colors cursor-pointer';
        if (tool.id === 'move') btn.classList.add('bg-neutral-700', 'text-white');
        btn.title = tool.title;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setTool(tool.id);
        });
        toolbar.appendChild(btn);
    });

    // Separator
    const sep = document.createElement('div');
    sep.className = 'w-px h-6 bg-neutral-600 self-center';
    toolbar.appendChild(sep);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.className = 'p-2 rounded-full hover:bg-red-900/50 text-neutral-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    deleteBtn.title = "Delete Selected";
    deleteBtn.disabled = true;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSelectedShape();
    });
    toolbar.appendChild(deleteBtn);

    content.appendChild(toolbar);

    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'modal-canvas-container';
    canvasContainer.className = 'w-full h-full cursor-crosshair relative overflow-hidden'; // Default cursor

    const canvas = document.createElement('canvas');
    canvas.className = 'block';
    canvasContainer.appendChild(canvas);
    content.appendChild(canvasContainer);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-20';
    closeBtn.title = "Close";
    closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    closeBtn.addEventListener('click', closeModal);
    content.appendChild(closeBtn);

    modal.appendChild(content);
    document.body.appendChild(modal);

    return { modal, canvas, container: canvasContainer, toolbar, deleteBtn };
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

    // Interaction
    activeTool: 'move', // 'move', 'arrow', 'line', 'rect'
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,

    // For Move Tool
    isDraggingCircle: false,
    initialCursorX: 0,
    initialCursorY: 0,

    // For Shapes
    shapes: [],
    tempShape: null, // Shape currently being drawn
    selectedShapeIndex: -1,

    onUpdate: null
};

const setTool = (toolId) => {
    state.activeTool = toolId;
    state.selectedShapeIndex = -1; // Deselect on tool change
    updateDeleteButton();

    // Update UI
    const buttons = modalElements.toolbar.querySelectorAll('button[data-tool]');
    buttons.forEach(btn => {
        if (btn.dataset.tool === toolId) {
            btn.classList.add('bg-neutral-700', 'text-white');
            btn.classList.remove('text-neutral-400');
        } else {
            btn.classList.remove('bg-neutral-700', 'text-white');
            btn.classList.add('text-neutral-400');
        }
    });

    // Cursor update
    if (toolId === 'move') {
        modalElements.container.style.cursor = 'move';
    } else {
        modalElements.container.style.cursor = 'crosshair';
    }

    draw();
};

const updateDeleteButton = () => {
    if (modalElements && modalElements.deleteBtn) {
        if (state.selectedShapeIndex >= 0) {
            modalElements.deleteBtn.disabled = false;
            modalElements.deleteBtn.classList.remove('text-neutral-500');
            modalElements.deleteBtn.classList.add('text-red-500');
        } else {
            modalElements.deleteBtn.disabled = true;
            modalElements.deleteBtn.classList.add('text-neutral-500');
            modalElements.deleteBtn.classList.remove('text-red-500');
        }
    }
};

const deleteSelectedShape = () => {
    if (state.selectedShapeIndex >= 0) {
        state.shapes.splice(state.selectedShapeIndex, 1);
        state.selectedShapeIndex = -1;
        updateDeleteButton();
        if (state.onUpdate) {
            state.onUpdate({
                cursorX: state.cursorX / state.dpr,
                cursorY: state.cursorY / state.dpr,
                shapes: state.shapes
            });
        }
        draw();
    }
};

// Hit test helper
const distanceToSegment = (p, v, w) => {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
};

const hitTest = (x, y) => {
    const visualHitRadius = 10 / state.scale; // 10px screen space tolerance

    for (let i = state.shapes.length - 1; i >= 0; i--) {
        const shape = state.shapes[i];
        if (shape.type === 'line' || shape.type === 'arrow') {
            const dist = distanceToSegment(
                {x, y},
                {x: shape.x, y: shape.y},
                {x: shape.endX, y: shape.endY}
            );
            if (dist < visualHitRadius) return i;
        } else if (shape.type === 'rect') {
            // Check if point is near borders
            const minX = Math.min(shape.x, shape.endX);
            const maxX = Math.max(shape.x, shape.endX);
            const minY = Math.min(shape.y, shape.endY);
            const maxY = Math.max(shape.y, shape.endY);

            // Outer tolerance
            const outC = (x >= minX - visualHitRadius && x <= maxX + visualHitRadius &&
                          y >= minY - visualHitRadius && y <= maxY + visualHitRadius);

            // Inner exclusion (so we only hit borders)
            // Or just allow filling hit? User said "border only", so hitting border is intuitive.
            // But let's allow hitting "inside" for easier selection if it's simpler.
            // Actually, for a frame, selecting by clicking inside is quite common.
            // Let's stick to bounding box hit for now.
            if (outC) return i;
        }
    }
    return -1;
};

const drawShapes = (ctx) => {
    const shapesToDraw = [...state.shapes];

    shapesToDraw.forEach((shape, index) => {
        ctx.beginPath();
        ctx.strokeStyle = shape.color || 'rgb(251, 146, 60)';
        ctx.lineWidth = (shape.width || 4);

        if (shape.type === 'line') {
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
        } else if (shape.type === 'rect') {
            ctx.rect(shape.x, shape.y, shape.endX - shape.x, shape.endY - shape.y);
            ctx.stroke();
        } else if (shape.type === 'arrow') {
            const headLength = 15;
            const dx = shape.endX - shape.x;
            const dy = shape.endY - shape.y;
            const angle = Math.atan2(dy, dx);

            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(shape.endX - headLength * Math.cos(angle - Math.PI / 6), shape.endY - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(shape.endX - headLength * Math.cos(angle + Math.PI / 6), shape.endY - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }

        // Selection Highlight
        if (index === state.selectedShapeIndex) {
            ctx.save();
            ctx.strokeStyle = '#3b82f6'; // Blue selection
            ctx.lineWidth = 2 / state.scale;
            ctx.setLineDash([5 / state.scale, 5 / state.scale]);

            // Bounding box for selection
            const minX = Math.min(shape.x, shape.endX);
            const maxX = Math.max(shape.x, shape.endX);
            const minY = Math.min(shape.y, shape.endY);
            const maxY = Math.max(shape.y, shape.endY);

            const padding = 8 / state.scale;
            ctx.strokeRect(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);
            ctx.restore();
        }
    });

    if (state.tempShape) {
        // Draw temp shape (Active drawing)
        const shape = state.tempShape;
        ctx.beginPath();
        ctx.strokeStyle = shape.color || 'rgb(251, 146, 60)';
        ctx.lineWidth = (shape.width || 4);

        if (shape.type === 'line') {
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
        } else if (shape.type === 'rect') {
            ctx.rect(shape.x, shape.y, shape.endX - shape.x, shape.endY - shape.y);
            ctx.stroke();
        } else if (shape.type === 'arrow') {
             const headLength = 15;
            const dx = shape.endX - shape.x;
            const dy = shape.endY - shape.y;
            const angle = Math.atan2(dy, dx);
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.endX, shape.endY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(shape.endX - headLength * Math.cos(angle - Math.PI / 6), shape.endY - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(shape.endX, shape.endY);
            ctx.lineTo(shape.endX - headLength * Math.cos(angle + Math.PI / 6), shape.endY - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }
    }
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

    drawShapes(ctx);

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

    state.dragStartX = mouseX;
    state.dragStartY = mouseY;
    state.isDragging = true;

    if (state.activeTool === 'move') {
        const hitRadius = 30 / state.scale;
        const dist = Math.sqrt((worldX - state.cursorX) ** 2 + (worldY - state.cursorY) ** 2);

        if (dist < hitRadius) {
            state.isDraggingCircle = true;
            state.initialCursorX = state.cursorX;
            state.initialCursorY = state.cursorY;
            state.selectedShapeIndex = -1; // Deselect shape if dragging circle
            updateDeleteButton();
            draw();
        } else {
            // Hit test shapes
            const hitIndex = hitTest(worldX, worldY);
            if (hitIndex >= 0) {
                state.selectedShapeIndex = hitIndex;
                updateDeleteButton();
                draw();
                // TODO: dragging shapes
            } else {
                if (state.selectedShapeIndex !== -1) {
                    state.selectedShapeIndex = -1;
                    updateDeleteButton();
                    draw();
                }
            }
        }
    } else {
        // Start Drawing
        state.selectedShapeIndex = -1;
        updateDeleteButton();
        state.tempShape = {
            type: state.activeTool,
            x: worldX,
            y: worldY,
            endX: worldX,
            endY: worldY,
            color: 'rgb(251, 146, 60)',
            width: 4
        };
    }
};

const handleMouseMove = (e) => {
    if (!state.isDragging) return;

    const mouseX = e.clientX - modalElements.container.getBoundingClientRect().left;
    const mouseY = e.clientY - modalElements.container.getBoundingClientRect().top;
    const worldX = (mouseX - state.panX) / state.scale;
    const worldY = (mouseY - state.panY) / state.scale;

    if (state.activeTool === 'move') {
        if (state.isDraggingCircle) {
             const dx = (mouseX - state.dragStartX) / state.scale;
             const dy = (mouseY - state.dragStartY) / state.scale;
             state.cursorX += dx;
             state.cursorY += dy;

            if (state.onUpdate) {
                state.onUpdate({
                    cursorX: state.cursorX / state.dpr,
                    cursorY: state.cursorY / state.dpr,
                    shapes: state.shapes
                });
            }
        } else {
            // Pan
            state.panX += mouseX - state.dragStartX;
            state.panY += mouseY - state.dragStartY;
        }
    } else {
        // Drawing
        if (state.tempShape) {
            state.tempShape.endX = worldX;
            state.tempShape.endY = worldY;
        }
    }

    state.dragStartX = mouseX;
    state.dragStartY = mouseY;
    draw();
};

const handleMouseUp = () => {
    if (state.activeTool !== 'move' && state.tempShape) {
        state.shapes.push(state.tempShape);
        state.tempShape = null;
        if (state.onUpdate) {
            state.onUpdate({
                cursorX: state.cursorX / state.dpr,
                cursorY: state.cursorY / state.dpr,
                shapes: state.shapes
            });
        }
        draw();
    }

    state.isDragging = false;
    state.isDraggingCircle = false;
};

const handleKeyDown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedShape();
    }
    if (e.key === 'Escape') {
        closeModal();
    }
};

export const openImageModal = (base64Image, rawCursorX, rawCursorY, dpr, shapes, onUpdate) => {
    if (!modalElements) {
        modalElements = createModal();
        modalElements.canvas.addEventListener('wheel', handleWheel, { passive: false });
        modalElements.canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        // TODO: remove 'keydown' listener for escape
    }

    const effectiveDpr = dpr || 1;

    state = {
        image: new Image(),
        base64Image,
        cursorX: rawCursorX * effectiveDpr,
        cursorY: rawCursorY * effectiveDpr,
        dpr: effectiveDpr,
        shapes: shapes ? JSON.parse(JSON.stringify(shapes)) : [],
        scale: 1,
        panX: 0,
        panY: 0,

        activeTool: 'move',
        isDragging: false,
        isDraggingCircle: false,
        dragStartX: 0,
        dragStartY: 0,
        tempShape: null,
        selectedShapeIndex: -1,

        onUpdate
    };

    setTool('move');

    state.image.src = base64Image;
    state.image.onload = () => {
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

document.removeEventListener('keydown', handleKeyDown);
document.addEventListener('keydown', handleKeyDown);

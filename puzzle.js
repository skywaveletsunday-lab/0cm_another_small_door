const imagePath = "images/puzzle-sun-children.png";
const columns = 4;
const rows = 3;
const totalPieces = columns * rows;
const workspace = document.getElementById("puzzleWorkspace");
const board = document.getElementById("puzzleBoard");
const guide = board.querySelector(".puzzle-guide");
const finalArt = document.getElementById("finalArt");
const piecesLayer = document.getElementById("puzzlePieces");
const completeMessage = document.getElementById("completeMessage");
const resetButton = document.getElementById("resetButton");

let pieces = [];
let activePiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lockedCount = 0;
let audioContext = null;
let completeTimer = null;
let topZ = 100;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playClickSound() {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(780, now);
  oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.055);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.08);
}

function playTone(context, frequency, startTime, duration) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.045, startTime + 0.035);
  gain.gain.setValueAtTime(0.038, startTime + duration * 0.58);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.04);
}

function playCompletionMelody() {
  const context = getAudioContext();
  const now = context.currentTime + 0.14;
  const melody = [
    { frequency: 523.25, delay: 0, duration: 0.32 },
    { frequency: 659.25, delay: 0.26, duration: 0.34 },
    { frequency: 783.99, delay: 0.53, duration: 0.36 },
    { frequency: 1046.5, delay: 0.82, duration: 0.42 },
    { frequency: 783.99, delay: 1.12, duration: 0.38 },
    { frequency: 1046.5, delay: 1.4, duration: 0.58 }
  ];

  melody.forEach((note) => {
    playTone(context, note.frequency, now + note.delay, note.duration);
  });
}

function completePuzzle() {
  workspace.classList.add("is-complete");
  board.classList.add("is-complete");
  playCompletionMelody();

  completeTimer = window.setTimeout(() => {
    completeMessage.hidden = false;
  }, 820);
}

function makeSurroundSlots() {
  const slots = [
    { side: "top", index: 0 },
    { side: "top", index: 1 },
    { side: "top", index: 2 },
    { side: "top", index: 3 },
    { side: "right", index: 0 },
    { side: "right", index: 1 },
    { side: "bottom", index: 0 },
    { side: "bottom", index: 1 },
    { side: "bottom", index: 2 },
    { side: "bottom", index: 3 },
    { side: "left", index: 0 },
    { side: "left", index: 1 }
  ];

  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return slots;
}

function measurePuzzle() {
  const workspaceRect = workspace.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  if (workspaceRect.width <= 0 || workspaceRect.height <= 0 || boardRect.width <= 0 || boardRect.height <= 0) {
    return null;
  }

  return {
    workspaceWidth: workspaceRect.width,
    workspaceHeight: workspaceRect.height,
    boardWidth: boardRect.width,
    boardHeight: boardRect.height,
    boardLeft: boardRect.left - workspaceRect.left,
    boardTop: boardRect.top - workspaceRect.top,
    pieceWidth: boardRect.width / columns,
    pieceHeight: boardRect.height / rows,
    gap: boardRect.width < 440 ? 8 : 10
  };
}

function rowSlotPosition(slotIndex, side, metrics) {
  const rowPieces = 4;
  const rowWidth = rowPieces * metrics.pieceWidth + (rowPieces - 1) * metrics.gap;
  const boardCenterX = metrics.boardLeft + metrics.boardWidth / 2;
  const startX = clamp(
    boardCenterX - rowWidth / 2,
    metrics.gap,
    metrics.workspaceWidth - rowWidth - metrics.gap
  );
  const y = side === "top"
    ? clamp(metrics.boardTop - metrics.pieceHeight - metrics.gap, metrics.gap, metrics.workspaceHeight - metrics.pieceHeight - metrics.gap)
    : clamp(metrics.boardTop + metrics.boardHeight + metrics.gap, metrics.gap, metrics.workspaceHeight - metrics.pieceHeight - metrics.gap);

  return {
    x: startX + slotIndex * (metrics.pieceWidth + metrics.gap),
    y
  };
}

function sideSlotPosition(slotIndex, side, metrics) {
  const sidePieces = 2;
  const columnHeight = sidePieces * metrics.pieceHeight + metrics.gap;
  const boardCenterY = metrics.boardTop + metrics.boardHeight / 2;
  const y = clamp(
    boardCenterY - columnHeight / 2 + slotIndex * (metrics.pieceHeight + metrics.gap),
    metrics.gap,
    metrics.workspaceHeight - metrics.pieceHeight - metrics.gap
  );
  const x = side === "left"
    ? clamp(metrics.boardLeft - metrics.pieceWidth - metrics.gap, metrics.gap, metrics.workspaceWidth - metrics.pieceWidth - metrics.gap)
    : clamp(metrics.boardLeft + metrics.boardWidth + metrics.gap, metrics.gap, metrics.workspaceWidth - metrics.pieceWidth - metrics.gap);

  return { x, y };
}

function startPosition(piece, metrics) {
  if (piece.startSlot.side === "top" || piece.startSlot.side === "bottom") {
    return rowSlotPosition(piece.startSlot.index, piece.startSlot.side, metrics);
  }

  return sideSlotPosition(piece.startSlot.index, piece.startSlot.side, metrics);
}

function correctPosition(piece, metrics) {
  return {
    x: metrics.boardLeft + piece.col * metrics.pieceWidth,
    y: metrics.boardTop + piece.row * metrics.pieceHeight
  };
}

function createPieces() {
  if (completeTimer) {
    window.clearTimeout(completeTimer);
    completeTimer = null;
  }

  piecesLayer.innerHTML = "";
  pieces = [];
  activePiece = null;
  lockedCount = 0;
  topZ = 100;
  workspace.classList.remove("is-complete");
  board.classList.remove("is-complete");
  completeMessage.hidden = true;

  const slots = makeSurroundSlots();

  for (let index = 0; index < totalPieces; index += 1) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const element = document.createElement("div");

    element.className = "puzzle-piece";
    element.dataset.index = String(index);
    element.dataset.col = String(col);
    element.dataset.row = String(row);
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `Puzzle piece ${index + 1}`);

    const piece = {
      element,
      col,
      row,
      startSlot: slots[index],
      locked: false,
      hasMoved: false,
      xRatio: 0,
      yRatio: 0
    };

    element.addEventListener("pointerdown", (event) => startDrag(event, piece));
    element.addEventListener("pointermove", moveDrag);
    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);

    piecesLayer.appendChild(element);
    pieces.push(piece);
  }

  layoutPieces();
}

function layoutPieces() {
  const metrics = measurePuzzle();

  if (!metrics) {
    return;
  }

  pieces.forEach((piece) => {
    const correct = correctPosition(piece, metrics);
    let x;
    let y;

    if (piece.locked) {
      x = correct.x;
      y = correct.y;
    } else if (piece.hasMoved) {
      x = clamp(piece.xRatio * metrics.workspaceWidth, 0, metrics.workspaceWidth - metrics.pieceWidth);
      y = clamp(piece.yRatio * metrics.workspaceHeight, 0, metrics.workspaceHeight - metrics.pieceHeight);
    } else {
      const spot = startPosition(piece, metrics);
      x = spot.x;
      y = spot.y;
      piece.xRatio = x / metrics.workspaceWidth;
      piece.yRatio = y / metrics.workspaceHeight;
    }

    piece.element.style.width = `${metrics.pieceWidth}px`;
    piece.element.style.height = `${metrics.pieceHeight}px`;
    piece.element.style.left = `${x}px`;
    piece.element.style.top = `${y}px`;
    piece.element.style.backgroundImage = `url("${imagePath}")`;
    piece.element.style.backgroundSize = `${metrics.boardWidth}px ${metrics.boardHeight}px`;
    piece.element.style.backgroundPosition = `-${piece.col * metrics.pieceWidth}px -${piece.row * metrics.pieceHeight}px`;
  });
}

function startDrag(event, piece) {
  if (piece.locked) {
    return;
  }

  activePiece = piece;
  piece.hasMoved = true;
  piece.element.style.zIndex = String(topZ);
  topZ += 1;

  const pieceRect = piece.element.getBoundingClientRect();

  dragOffsetX = event.clientX - pieceRect.left;
  dragOffsetY = event.clientY - pieceRect.top;
  piece.element.classList.add("is-dragging");
  piece.element.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveDrag(event) {
  if (!activePiece) {
    return;
  }

  const metrics = measurePuzzle();

  if (!metrics) {
    return;
  }

  const workspaceRect = workspace.getBoundingClientRect();
  const x = clamp(
    event.clientX - workspaceRect.left - dragOffsetX,
    0,
    metrics.workspaceWidth - metrics.pieceWidth
  );
  const y = clamp(
    event.clientY - workspaceRect.top - dragOffsetY,
    0,
    metrics.workspaceHeight - metrics.pieceHeight
  );

  activePiece.xRatio = x / metrics.workspaceWidth;
  activePiece.yRatio = y / metrics.workspaceHeight;
  activePiece.element.style.left = `${x}px`;
  activePiece.element.style.top = `${y}px`;
}

function endDrag(event) {
  if (!activePiece) {
    return;
  }

  const piece = activePiece;
  const metrics = measurePuzzle();

  piece.element.classList.remove("is-dragging");

  if (piece.element.hasPointerCapture(event.pointerId)) {
    piece.element.releasePointerCapture(event.pointerId);
  }

  if (!metrics) {
    activePiece = null;
    return;
  }

  const currentX = piece.xRatio * metrics.workspaceWidth;
  const currentY = piece.yRatio * metrics.workspaceHeight;
  const correct = correctPosition(piece, metrics);
  const distance = Math.hypot(currentX - correct.x, currentY - correct.y);
  const snapDistance = Math.min(metrics.pieceWidth, metrics.pieceHeight) * 0.28;

  if (distance <= snapDistance) {
    piece.locked = true;
    piece.xRatio = correct.x / metrics.workspaceWidth;
    piece.yRatio = correct.y / metrics.workspaceHeight;
    piece.element.classList.add("is-locked");
    piece.element.style.left = `${correct.x}px`;
    piece.element.style.top = `${correct.y}px`;
    piece.element.style.zIndex = "2";
    lockedCount += 1;
    playClickSound();

    if (lockedCount === totalPieces) {
      completePuzzle();
    }
  }

  activePiece = null;
}

function resetPuzzle() {
  createPieces();
}

guide.addEventListener("load", () => {
  board.style.aspectRatio = `${guide.naturalWidth} / ${guide.naturalHeight}`;
  createPieces();
});

finalArt.addEventListener("load", () => {
  if (!board.style.aspectRatio && finalArt.naturalWidth > 0) {
    board.style.aspectRatio = `${finalArt.naturalWidth} / ${finalArt.naturalHeight}`;
  }
});

if (guide.complete && guide.naturalWidth > 0) {
  board.style.aspectRatio = `${guide.naturalWidth} / ${guide.naturalHeight}`;
  createPieces();
}

resetButton.addEventListener("click", resetPuzzle);
window.addEventListener("resize", layoutPieces);

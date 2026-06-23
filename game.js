const buttons = document.querySelectorAll(".item-button");
const gameStage = document.getElementById("gameStage");
const world = document.getElementById("world");
const endingCard = document.getElementById("endingCard");
const endingImage = document.getElementById("endingImage");
const endingMessageJa = document.getElementById("endingMessageJa");
const endingMessageEn = document.getElementById("endingMessageEn");
const endingCommonJa = document.getElementById("endingCommonJa");
const endingCommonEn = document.getElementById("endingCommonEn");
const resetButton = document.getElementById("resetButton");
const totalItems = buttons.length;
const endings = {
  leaf: {
    image: "images/game-endings/ending-leaf.png",
    messageJa: "葉っぱのあとに、小さな庭道がひらきました。",
    messageEn: "After the leaf, a tiny garden path opened."
  },
  pencil: {
    image: "images/game-endings/ending-pencil.png",
    messageJa: "色をえらぶように、色鉛筆の庭があらわれました。",
    messageEn: "As if choosing colors, a colored-pencil garden appeared."
  },
  light: {
    image: "images/game-endings/ending-light.png",
    messageJa: "小さな灯の先に、あたたかな部屋がありました。",
    messageEn: "Beyond the small light, there was a warm room."
  },
  cat: {
    image: "images/game-endings/ending-cat.png",
    messageJa: "猫が先に来たので、静かな居場所がひらきました。",
    messageEn: "Because the cat came first, a quiet place opened."
  },
  letter: {
    image: "images/game-endings/ending-letter.png",
    messageJa: "手紙の向こうに、やさしい返事が待っていました。",
    messageEn: "Beyond the letter, a gentle reply was waiting."
  },
  cloud: {
    image: "images/game-endings/ending-cloud.png",
    messageJa: "雲を追いかけた先に、空の扉がひらきました。",
    messageEn: "Beyond the clouds, a door to the sky opened."
  },
  window: {
    image: "images/game-endings/ending-window.png",
    messageJa: "窓の向こうに、やわらかな光の部屋が見えました。",
    messageEn: "Beyond the window, a room of soft light appeared."
  },
  chair: {
    image: "images/game-endings/ending-chair.png",
    messageJa: "小さな椅子の先に、ひと休みできる場所がありました。",
    messageEn: "Beyond the small chair, there was a place to rest."
  }
};

let selectedOrder = [];
let firstChoice = "";
let placedCount = 0;
let endingTimer = null;
let audioContext = null;
const activeAudioNodes = new Set();

function getAudioContext() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  } catch (error) {
    return null;
  }
}

function scheduleTone(context, frequency, startTime, duration, volume, type = "sine") {
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const endTime = startTime + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.04);
    gain.gain.setValueAtTime(volume * 0.7, startTime + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(context.destination);

    activeAudioNodes.add(oscillator);
    oscillator.addEventListener("ended", () => {
      activeAudioNodes.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    });

    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  } catch (error) {
    // Audio is decorative; the game should continue even if sound is unavailable.
  }
}

function playItemSound(step) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const notes = [392, 440, 493.88, 523.25, 587.33, 659.25];
  const base = notes[step % notes.length];
  const now = context.currentTime + 0.01;

  scheduleTone(context, base, now, 0.18, 0.032, "triangle");
  scheduleTone(context, base * 1.5, now + 0.08, 0.2, 0.018, "sine");
}

function playEndingMelody() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime + 0.12;
  const melody = [
    { frequency: 392, start: 0, duration: 0.42 },
    { frequency: 523.25, start: 0.46, duration: 0.48 },
    { frequency: 659.25, start: 0.98, duration: 0.58 },
    { frequency: 587.33, start: 1.62, duration: 0.44 },
    { frequency: 659.25, start: 2.1, duration: 0.58 },
    { frequency: 783.99, start: 2.72, duration: 0.64 },
    { frequency: 659.25, start: 3.42, duration: 0.9 }
  ];

  melody.forEach((note) => {
    scheduleTone(context, note.frequency, now + note.start, note.duration, 0.03, "sine");
    scheduleTone(context, note.frequency * 2, now + note.start + 0.02, note.duration * 0.8, 0.007, "triangle");
  });
}

function stopActiveAudio() {
  activeAudioNodes.forEach((node) => {
    try {
      node.stop();
    } catch (error) {
      // The node may already be stopped or not yet started.
    }
  });

  activeAudioNodes.clear();
}

function placeItem(itemName) {
  const item = document.querySelector(`[data-item="${itemName}"]:not(button)`);

  if (!item) {
    return;
  }

  item.classList.add("is-visible");
  selectedOrder.push(itemName);

  if (!firstChoice) {
    firstChoice = itemName;
  }

  placedCount += 1;

  if (placedCount === totalItems) {
    showEnding();
  }
}

function showEnding() {
  const ending = endings[firstChoice];

  if (!ending) {
    return;
  }

  world.classList.add("is-complete");
  playEndingMelody();
  endingImage.src = ending.image;
  endingImage.alt = `${ending.messageJa} エンディング画像`;
  endingMessageJa.textContent = ending.messageJa;
  endingMessageEn.textContent = ending.messageEn;

  endingTimer = window.setTimeout(() => {
    gameStage.classList.add("is-ended");
    world.hidden = true;
    endingCard.hidden = false;

    window.requestAnimationFrame(() => {
      endingCard.classList.add("is-visible");
    });
  }, 950);
}

buttons.forEach((button) => {
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }

    button.disabled = true;
    button.setAttribute("aria-pressed", "true");
    playItemSound(placedCount);
    placeItem(button.dataset.item);
  });
});

resetButton.addEventListener("click", () => {
  stopActiveAudio();

  if (endingTimer) {
    window.clearTimeout(endingTimer);
    endingTimer = null;
  }

  selectedOrder = [];
  firstChoice = "";
  placedCount = 0;
  gameStage.classList.remove("is-ended");
  world.classList.remove("is-complete");
  world.hidden = false;
  endingCard.hidden = true;
  endingCard.classList.remove("is-visible");
  endingImage.removeAttribute("src");
  endingImage.removeAttribute("alt");
  endingMessageJa.textContent = "";
  endingMessageEn.textContent = "";
  endingCommonJa.textContent = "見つけてくれてありがとう。ここは、0㎝の美術館です。";
  endingCommonEn.textContent = "Thank you for finding this place. This is the 0cm Museum.";

  document.querySelectorAll(".game-piece").forEach((item) => {
    item.classList.remove("is-visible");
  });

  buttons.forEach((button) => {
    button.disabled = false;
    button.setAttribute("aria-pressed", "false");
  });
});

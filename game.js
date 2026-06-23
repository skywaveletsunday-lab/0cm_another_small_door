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
const scaleNotes = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  349.23, // F4
  392.00, // G4
  440.00, // A4
  493.88, // B4
  523.25  // C5
];

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

  const base = scaleNotes[Math.min(step, scaleNotes.length - 1)];
  const now = context.currentTime + 0.01;

  scheduleTone(context, base, now, 0.18, 0.032, "triangle");
  scheduleTone(context, base, now + 0.07, 0.18, 0.016, "sine");
}

function playEndingMelody() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime + 0.12;
  const melody = [
    { frequency: scaleNotes[0], start: 0, duration: 0.42 },
    { frequency: scaleNotes[1], start: 0.46, duration: 0.48 },
    { frequency: scaleNotes[2], start: 0.98, duration: 0.52 },
    { frequency: scaleNotes[3], start: 1.52, duration: 0.52 },
    { frequency: scaleNotes[4], start: 2.08, duration: 0.56 },
    { frequency: scaleNotes[5], start: 2.68, duration: 0.6 },
    { frequency: scaleNotes[6], start: 3.34, duration: 0.62 },
    { frequency: scaleNotes[7], start: 4.02, duration: 0.78 }
  ];

  melody.forEach((note) => {
    scheduleTone(context, note.frequency, now + note.start, note.duration, 0.03, "sine");
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

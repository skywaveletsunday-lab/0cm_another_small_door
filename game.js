const buttons = document.querySelectorAll(".item-button");
const gameStage = document.getElementById("gameStage");
const world = document.getElementById("world");
const endingCard = document.getElementById("endingCard");
const endingImage = document.getElementById("endingImage");
const endingMessage = document.getElementById("endingMessage");
const resetButton = document.getElementById("resetButton");
const totalItems = buttons.length;
const endings = {
  leaf: {
    image: "images/game-endings/ending-leaf.png",
    message: "葉っぱのあとに、小さな庭道がひらきました。"
  },
  pencil: {
    image: "images/game-endings/ending-pencil.png",
    message: "色をえらぶように、色鉛筆の庭があらわれました。"
  },
  light: {
    image: "images/game-endings/ending-light.png",
    message: "小さな灯の先に、あたたかな部屋がありました。"
  },
  cat: {
    image: "images/game-endings/ending-cat.png",
    message: "猫が先に来たので、静かな居場所がひらきました。"
  },
  letter: {
    image: "images/game-endings/ending-letter.png",
    message: "手紙の向こうに、やさしい返事が待っていました。"
  },
  cloud: {
    image: "images/game-endings/ending-cloud.png",
    message: "雲を追いかけた先に、空の扉がひらきました。"
  },
  window: {
    image: "images/game-endings/ending-window.png",
    message: "窓の向こうに、やわらかな光の部屋が見えました。"
  },
  chair: {
    image: "images/game-endings/ending-chair.png",
    message: "小さな椅子の先に、ひと休みできる場所がありました。"
  }
};

let selectedOrder = [];
let firstChoice = "";
let placedCount = 0;
let endingTimer = null;

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
  endingImage.src = ending.image;
  endingImage.alt = `${ending.message} エンディング画像`;
  endingMessage.textContent = ending.message;

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
    placeItem(button.dataset.item);
  });
});

resetButton.addEventListener("click", () => {
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
  endingMessage.textContent = "";

  document.querySelectorAll(".placed-item, .sky-piece").forEach((item) => {
    item.classList.remove("is-visible");
  });

  buttons.forEach((button) => {
    button.disabled = false;
    button.setAttribute("aria-pressed", "false");
  });
});

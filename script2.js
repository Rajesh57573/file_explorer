/* ===== Contributors Typing Animation ===== */
const contributors = [
  "Kailash Rooj: Backend Dev",
  "Abhishek Banerjee: Backend Dev",
  "Rajesh Paul: Frontend Dev",
  "Arunima Pal: Frontend Dev",
];
let element;
let currentNameIndex = 0;
let currentCharIndex = 0;
const typingSpeed = 90;
const pauseBetweenNames = 1600;

function typeContributor() {
  if (!element) return;
  if (currentCharIndex < contributors[currentNameIndex].length) {
    element.textContent += contributors[currentNameIndex].charAt(currentCharIndex);
    currentCharIndex++;
    setTimeout(typeContributor, typingSpeed);
  } else {
    setTimeout(eraseContributor, pauseBetweenNames);
  }
}

function eraseContributor() {
  if (!element) return;
  if (currentCharIndex > 0) {
    element.textContent = contributors[currentNameIndex].substring(0, currentCharIndex - 1);
    currentCharIndex--;
    setTimeout(eraseContributor, typingSpeed / 2);
  } else {
    currentNameIndex = (currentNameIndex + 1) % contributors.length;
    setTimeout(typeContributor, typingSpeed);
  }
}

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  element = document.getElementById("contributors");
  if (element) typeContributor();
  listFiles("");
});

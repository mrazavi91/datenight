import confetti from "canvas-confetti";

export function celebrate() {
  const colors = ["#E35D77", "#F6A6B2", "#E4794C", "#FFD9A8", "#FFBE73"];
  const duration = 1500;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
      shapes: ["circle"],
      scalar: 1.1,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
      shapes: ["circle"],
      scalar: 1.1,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  confetti({
    particleCount: 90,
    spread: 100,
    origin: { y: 0.6 },
    colors,
  });
}

import confetti from 'canvas-confetti'

export function triggerTaskConfetti(element?: HTMLElement | null) {
  let origin = { y: 0.7, x: 0.5 }
  if (element) {
    const rect = element.getBoundingClientRect()
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    }
  }

  confetti({
    particleCount: 22,
    spread: 50,
    startVelocity: 16,
    origin,
    colors: ['#38a16c', '#2b8256', '#d99b26', '#4e93b8', '#cfc6b8'],
    ticks: 100,
    gravity: 0.85,
    scalar: 0.65,
    disableForReducedMotion: true,
  })
}

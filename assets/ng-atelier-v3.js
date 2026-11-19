(() => {
  "use strict";

  const hero = document.querySelector("[data-gold-balance]");
  if (!hero) return;

  const scale = hero.querySelector(".ngw-scale");
  const result = hero.querySelector("[data-ngw-result]");
  const playback = hero.querySelector("[data-ngw-motion]");
  const controls = hero.querySelector(".ngw-inputs");
  const samples = Array.from(hero.querySelectorAll("[data-ngw-mass]"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const loadTime = 220;
  const duration = 3740;
  let state = "ready";
  let mass = Number(hero.dataset.mass);
  let angle = 0;
  let startAngle = 0;
  let peak = -12;
  let elapsed = 0;
  let startedAt = 0;
  let frameId = 0;
  let userPaused = false;

  function rotate(value) {
    angle = value;
    scale.style.setProperty("--ngw-angle", value.toFixed(3) + "deg");
  }

  function showState(next) {
    state = next;
    const stateText = {
      running: mass + " g aufgelegt",
      paused: mass + " g · pausiert",
      ready: mass + " g im Gleichgewicht"
    };
    const action = {
      running: ["pause", "Bewegung pausieren"],
      paused: ["play", "Bewegung fortsetzen"],
      ready: ["replay", "Wägung wiederholen"]
    }[next];
    result.textContent = stateText[next];
    playback.dataset.action = action[0];
    playback.setAttribute("aria-label", action[1]);
    playback.title = action[1];
  }

  function stopFrame() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function settle() {
    stopFrame();
    hero.dataset.counterMass = String(mass);
    rotate(0);
    elapsed = 0;
    showState("ready");
  }

  function tick(now) {
    frameId = 0;
    elapsed = Math.max(0, now - startedAt);
    if (elapsed >= duration) {
      settle();
      return;
    }
    if (elapsed < loadTime) {
      const phase = elapsed / loadTime;
      rotate(startAngle + (peak - startAngle) * Math.sin(phase * Math.PI / 2));
    } else {
      const seconds = (elapsed - loadTime) / 1000;
      const omega = 6.8;
      const damping = 1.12;
      const decay = Math.exp(-damping * seconds);
      rotate(peak * decay * (Math.cos(omega * seconds) + damping / omega * Math.sin(omega * seconds)));
    }
    if (elapsed >= loadTime && hero.dataset.counterMass !== String(mass)) {
      hero.dataset.counterMass = String(mass);
    }
    frameId = requestAnimationFrame(tick);
  }

  function run() {
    stopFrame();
    startedAt = performance.now() - elapsed;
    showState("running");
    frameId = requestAnimationFrame(tick);
  }

  function weigh(next, explicitPlayback = false) {
    const previous = mass;
    mass = next;
    hero.dataset.mass = String(mass);
    samples.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.ngwMass) === mass)));
    if ((reduce.matches || userPaused) && !explicitPlayback) {
      settle();
      return;
    }
    startAngle = angle;
    peak = (mass < previous ? 1 : -1) * (10 + mass * .12);
    elapsed = 0;
    run();
  }

  function interrupt() {
    elapsed = Math.max(0, performance.now() - startedAt);
    stopFrame();
    userPaused = true;
    showState("paused");
  }

  controls.hidden = false;
  scale.classList.add("ngw-js");
  samples.forEach(button => button.addEventListener("click", () => weigh(Number(button.dataset.ngwMass))));
  playback.addEventListener("click", () => {
    if (state === "running") {
      interrupt();
      return;
    }
    userPaused = false;
    if (state === "paused") run();
    else weigh(mass, true);
  });
  const preferenceChanged = () => { if (reduce.matches) settle(); };
  if (reduce.addEventListener) reduce.addEventListener("change", preferenceChanged);
  else if (reduce.addListener) reduce.addListener(preferenceChanged);
  weigh(mass);
})();

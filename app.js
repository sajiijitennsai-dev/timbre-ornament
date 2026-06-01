const canvas = document.querySelector("#visualizer");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const toneGrid = document.querySelector("#toneGrid");
const toneNameEl = document.querySelector("#toneName");
const noteNameEl = document.querySelector("#noteName");
const midiButton = document.querySelector("#midiButton");
const inputSelect = document.querySelector("#inputSelect");
const panicButton = document.querySelector("#panicButton");
const keyboard = document.querySelector("#keyboard");
const attackMeter = document.querySelector("#attackMeter");
const bodyMeter = document.querySelector("#bodyMeter");
const airMeter = document.querySelector("#airMeter");

const tones = [
  { name: "Crystal Keys", family: "keys", color: "#79f2c0", color2: "#7bc6ff", attack: 0.72, body: 0.48, air: 0.84, shape: "rings" },
  { name: "Velvet Pad", family: "pad", color: "#a98bff", color2: "#ff8db8", attack: 0.18, body: 0.86, air: 0.62, shape: "cloud" },
  { name: "Glass Pluck", family: "pluck", color: "#ffcf5a", color2: "#69e6ff", attack: 0.94, body: 0.34, air: 0.76, shape: "shards" },
  { name: "Deep Bass", family: "bass", color: "#ff6b4a", color2: "#7df0a7", attack: 0.55, body: 0.95, air: 0.2, shape: "waves" },
  { name: "Brass Bloom", family: "brass", color: "#ff9f43", color2: "#f7f06d", attack: 0.5, body: 0.72, air: 0.5, shape: "flares" },
  { name: "Bell Rain", family: "bell", color: "#b9f7ff", color2: "#f4d35e", attack: 0.86, body: 0.28, air: 0.95, shape: "drops" },
  { name: "Dust Drum", family: "drum", color: "#ff5f7a", color2: "#d9f99d", attack: 1, body: 0.58, air: 0.36, shape: "bursts" },
];

const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeNotes = new Map();
const particles = [];
let width = 0;
let height = 0;
let dpr = 1;
let midiAccess = null;
let selectedInputId = "";
let toneIndex = 0;
let pulse = 0;
let currentAttack = 0;
let currentBody = 0;
let currentAir = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function noteLabel(note) {
  const octave = Math.floor(note / 12) - 1;
  return `${notes[note % 12]}${octave}`;
}

function setTone(index) {
  toneIndex = (index + tones.length) % tones.length;
  const tone = tones[toneIndex];
  toneNameEl.textContent = tone.name;
  document.documentElement.style.setProperty("--accent", tone.color);
  document.documentElement.style.setProperty("--accent-2", tone.color2);
  document.querySelectorAll(".tone").forEach((button, buttonIndex) => {
    button.setAttribute("aria-pressed", String(buttonIndex === toneIndex));
  });
}

function buildToneGrid() {
  tones.forEach((tone, index) => {
    const button = document.createElement("button");
    button.className = "tone";
    button.type = "button";
    button.style.setProperty("--tone-color", tone.color);
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<b>${tone.name}</b><small>${tone.family}</small>`;
    button.addEventListener("click", () => setTone(index));
    toneGrid.append(button);
  });
}

function buildKeyboard() {
  for (let note = 60; note <= 72; note += 1) {
    const key = document.createElement("button");
    key.className = notes[note % 12].includes("#") ? "key black" : "key";
    key.type = "button";
    key.dataset.note = String(note);
    key.textContent = noteLabel(note).replace("#", "♯");
    key.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      key.setPointerCapture(event.pointerId);
      triggerNoteOn(note, 100);
    });
    key.addEventListener("pointerup", () => triggerNoteOff(note));
    key.addEventListener("pointercancel", () => triggerNoteOff(note));
    key.addEventListener("pointerleave", (event) => {
      if (event.buttons) triggerNoteOff(note);
    });
    keyboard.append(key);
  }
}

function triggerNoteOn(note, velocity = 96) {
  const tone = tones[toneIndex];
  const intensity = Math.max(0.08, velocity / 127);
  activeNotes.set(note, { velocity: intensity, started: performance.now(), tone: toneIndex });
  noteNameEl.textContent = noteLabel(note).replace("#", "♯");
  pulse = Math.min(1, pulse + 0.32 + intensity * 0.34);
  spawnParticles(note, intensity, tone);
  document.querySelector(`[data-note="${note}"]`)?.classList.add("active");
}

function triggerNoteOff(note) {
  activeNotes.delete(note);
  document.querySelector(`[data-note="${note}"]`)?.classList.remove("active");
  if (!activeNotes.size) noteNameEl.textContent = "--";
}

function spawnParticles(note, intensity, tone) {
  const pitch = (note - 36) / 60;
  const x = width * (0.12 + Math.min(1, Math.max(0, pitch)) * 0.76);
  const y = height * (0.5 + (Math.random() - 0.5) * 0.2);
  const count = Math.round(10 + tone.attack * 18 + intensity * 18);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * (4.2 + tone.attack * 4);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - tone.air * 1.4,
      life: 0.72 + Math.random() * 0.85 + tone.body * 0.55,
      age: 0,
      size: 2 + Math.random() * (8 + tone.body * 14),
      color: Math.random() > 0.46 ? tone.color : tone.color2,
      note,
      shape: tone.shape,
    });
  }
}

function connectInput(inputId) {
  if (!midiAccess) return;
  for (const input of midiAccess.inputs.values()) input.onmidimessage = null;
  selectedInputId = inputId;
  const input = midiAccess.inputs.get(inputId);
  if (!input) return;
  input.onmidimessage = handleMidiMessage;
  statusEl.textContent = `${input.name} 接続中`;
}

function refreshInputs() {
  if (!midiAccess) return;
  inputSelect.innerHTML = "";
  const inputs = Array.from(midiAccess.inputs.values());
  if (!inputs.length) {
    inputSelect.append(new Option("入力なし", ""));
    statusEl.textContent = "MIDI入力なし";
    return;
  }
  inputs.forEach((input) => inputSelect.append(new Option(input.name, input.id)));
  const nextId = inputs.some((input) => input.id === selectedInputId) ? selectedInputId : inputs[0].id;
  inputSelect.value = nextId;
  connectInput(nextId);
}

async function requestMidi() {
  if (!navigator.requestMIDIAccess) {
    statusEl.textContent = "このブラウザはMIDI非対応";
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshInputs;
    midiButton.textContent = "再接続";
    refreshInputs();
  } catch {
    statusEl.textContent = "MIDI接続がキャンセルされました";
  }
}

function handleMidiMessage(event) {
  const [status, data1, data2] = event.data;
  const command = status & 0xf0;
  if (command === 0x90 && data2 > 0) {
    triggerNoteOn(data1, data2);
  } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    triggerNoteOff(data1);
  } else if (command === 0xc0) {
    setTone(data1 % tones.length);
  } else if (command === 0xb0 && data1 === 1) {
    currentAir = data2 / 127;
  }
}

function stopAll() {
  activeNotes.clear();
  noteNameEl.textContent = "--";
  document.querySelectorAll(".key.active").forEach((key) => key.classList.remove("active"));
}

function drawBackground(tone, energy) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#07090d");
  gradient.addColorStop(0.46, blendColor(tone.color, "#07090d", 0.78));
  gradient.addColorStop(1, blendColor(tone.color2, "#07090d", 0.72));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.28 + energy * 0.26;
  const cx = width * 0.62;
  const cy = height * 0.46;
  for (let i = 0; i < 9; i += 1) {
    const radius = 90 + i * 64 + pulse * 80;
    ctx.strokeStyle = i % 2 ? tone.color : tone.color2;
    ctx.lineWidth = 1 + energy * 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * (1.45 + tone.air), radius * (0.54 + tone.body * 0.35), performance.now() / 3600 + i, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(dt) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.age += dt;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.992;
    p.vy = p.vy * 0.992 + 0.01;
    const t = p.age / p.life;
    if (t >= 1) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = (1 - t) * 0.82;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    const size = p.size * (1 - t * 0.55);
    if (p.shape === "shards") {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - size);
      ctx.lineTo(p.x + size * 0.5, p.y + size * 0.4);
      ctx.lineTo(p.x - size * 0.6, p.y + size * 0.52);
      ctx.closePath();
      ctx.stroke();
    } else if (p.shape === "drops") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawWave(tone, energy, time) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineWidth = 2 + energy * 7;
  for (let layer = 0; layer < 4; layer += 1) {
    ctx.beginPath();
    ctx.strokeStyle = layer % 2 ? tone.color : tone.color2;
    ctx.globalAlpha = 0.28 + energy * 0.22;
    const yBase = height * (0.58 + (layer - 1.5) * 0.075);
    for (let x = -20; x <= width + 20; x += 14) {
      const y =
        yBase +
        Math.sin(x * (0.006 + tone.air * 0.004) + time * (0.0015 + layer * 0.0004)) * (22 + tone.body * 42 + energy * 54) +
        Math.sin(x * 0.021 - time * 0.002) * (8 + tone.attack * 16);
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function blendColor(hex, base, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(base);
  const mixed = a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  const tone = tones[toneIndex];
  let energy = 0;
  for (const note of activeNotes.values()) energy += note.velocity;
  energy = Math.min(1, energy / 4);
  currentAttack += (Math.max(energy, pulse) * tone.attack - currentAttack) * 0.08;
  currentBody += (Math.max(energy, pulse * 0.55) * tone.body - currentBody) * 0.06;
  currentAir += (Math.max(energy, pulse * 0.72) * tone.air - currentAir) * 0.05;
  pulse *= 0.94;

  attackMeter.style.setProperty("--meter", currentAttack.toFixed(3));
  bodyMeter.style.setProperty("--meter", currentBody.toFixed(3));
  airMeter.style.setProperty("--meter", currentAir.toFixed(3));

  drawBackground(tone, Math.max(energy, pulse));
  drawWave(tone, Math.max(energy, pulse), now);
  drawParticles(dt);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
midiButton.addEventListener("click", requestMidi);
inputSelect.addEventListener("change", () => connectInput(inputSelect.value));
panicButton.addEventListener("click", stopAll);
window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const map = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72 };
  const note = map[event.key.toLowerCase()];
  if (note) triggerNoteOn(note, 100);
});
window.addEventListener("keyup", (event) => {
  const map = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72 };
  const note = map[event.key.toLowerCase()];
  if (note) triggerNoteOff(note);
});

buildToneGrid();
buildKeyboard();
setTone(0);
resize();
requestAnimationFrame(frame);

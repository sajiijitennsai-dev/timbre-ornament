/*!
 * Timbre Ornament v0.1.0
 * Tiny MIDI-reactive canvas decoration for ordinary websites.
 * MIT License
 */
(function () {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const defaultTones = [
    { name: "Crystal Keys", color: "#79f2c0", color2: "#7bc6ff", attack: 0.72, body: 0.48, air: 0.84 },
    { name: "Velvet Pad", color: "#a98bff", color2: "#ff8db8", attack: 0.18, body: 0.86, air: 0.62 },
    { name: "Glass Pluck", color: "#ffcf5a", color2: "#69e6ff", attack: 0.94, body: 0.34, air: 0.76 },
    { name: "Deep Bass", color: "#ff6b4a", color2: "#7df0a7", attack: 0.55, body: 0.95, air: 0.2 },
    { name: "Bell Rain", color: "#b9f7ff", color2: "#f4d35e", attack: 0.86, body: 0.28, air: 0.95 },
  ];

  function mount(target, options = {}) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) throw new Error("TimbreOrnament target was not found.");

    const settings = {
      fixed: false,
      opacity: 0.62,
      intensity: 0.78,
      autoDemo: true,
      tones: defaultTones,
      ...options,
    };

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const activeNotes = new Map();
    const particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let toneIndex = 0;
    let pulse = 0.08;
    let raf = 0;
    let last = performance.now();
    let midiAccess = null;
    let demoTimer = 0;

    canvas.className = "timbre-ornament";
    Object.assign(canvas.style, {
      position: settings.fixed ? "fixed" : "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: String(settings.zIndex ?? 0),
      opacity: String(settings.opacity),
    });

    const hostStyle = getComputedStyle(host);
    if (!settings.fixed && hostStyle.position === "static") host.style.position = "relative";
    host.prepend(canvas);

    function resize() {
      const rect = settings.fixed ? { width: window.innerWidth, height: window.innerHeight } : host.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setTone(index) {
      toneIndex = ((index % settings.tones.length) + settings.tones.length) % settings.tones.length;
      pulse = Math.min(1, pulse + 0.12);
    }

    function noteOn(note = 60, velocity = 96) {
      const intensity = Math.max(0.06, velocity / 127);
      activeNotes.set(note, { velocity: intensity, started: performance.now() });
      pulse = Math.min(1, pulse + 0.22 + intensity * 0.32);
      spawn(note, intensity);
    }

    function noteOff(note = 60) {
      activeNotes.delete(note);
    }

    function hit(amount = 0.65) {
      noteOn(48 + Math.round(Math.random() * 32), Math.round(52 + amount * 75));
    }

    function spawn(note, velocity) {
      const tone = settings.tones[toneIndex];
      const pitch = Math.max(0, Math.min(1, (note - 36) / 60));
      const x = width * (0.1 + pitch * 0.8);
      const y = height * (0.28 + Math.random() * 0.48);
      const count = Math.round((5 + tone.attack * 13 + velocity * 14) * settings.intensity);

      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * (2.2 + tone.attack * 3.4);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - tone.air * 1.2,
          age: 0,
          life: 0.7 + Math.random() * 1.1 + tone.body * 0.5,
          size: 1.5 + Math.random() * (6 + tone.body * 10),
          color: Math.random() > 0.45 ? tone.color : tone.color2,
        });
      }
    }

    async function enableMidi() {
      if (!navigator.requestMIDIAccess) return { ok: false, reason: "Web MIDI is not supported in this browser." };
      try {
        midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        for (const input of midiAccess.inputs.values()) input.onmidimessage = handleMidi;
        midiAccess.onstatechange = () => {
          for (const input of midiAccess.inputs.values()) input.onmidimessage = handleMidi;
        };
        return { ok: true, inputs: midiAccess.inputs.size };
      } catch (error) {
        return { ok: false, reason: error.message };
      }
    }

    function handleMidi(event) {
      const [status, data1, data2] = event.data;
      const command = status & 0xf0;
      if (command === 0x90 && data2 > 0) noteOn(data1, data2);
      else if (command === 0x80 || (command === 0x90 && data2 === 0)) noteOff(data1);
      else if (command === 0xc0) setTone(data1);
    }

    function drawBackground(tone, energy, time) {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const gradient = ctx.createRadialGradient(width * 0.58, height * 0.38, 0, width * 0.58, height * 0.38, Math.max(width, height));
      gradient.addColorStop(0, withAlpha(tone.color, 0.18 + energy * 0.16));
      gradient.addColorStop(0.46, withAlpha(tone.color2, 0.08 + energy * 0.1));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = (0.18 + energy * 0.24) * settings.intensity;
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.strokeStyle = i % 2 ? tone.color : tone.color2;
        ctx.lineWidth = 0.8 + energy * 3;
        const yBase = height * (0.22 + i * 0.12);
        for (let x = -20; x < width + 20; x += 18) {
          const y = yBase + Math.sin(x * 0.01 + time * 0.0012 + i) * (18 + tone.body * 34 + energy * 28);
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
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
        p.vx *= 0.99;
        p.vy = p.vy * 0.99 + 0.006;
        const progress = p.age / p.life;
        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = (1 - progress) * 0.68 * settings.intensity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function tick(now) {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const tone = settings.tones[toneIndex];
      let energy = 0;
      for (const note of activeNotes.values()) energy += note.velocity;
      energy = Math.min(1, energy / 3);
      pulse *= 0.945;

      if (settings.autoDemo && now - demoTimer > 1900 + Math.random() * 1600) {
        demoTimer = now;
        hit(0.18 + Math.random() * 0.35);
      }

      drawBackground(tone, Math.max(energy, pulse), now);
      drawParticles(dt);
      raf = requestAnimationFrame(tick);
    }

    function destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) input.onmidimessage = null;
      }
    }

    window.addEventListener("resize", resize);
    resize();
    raf = requestAnimationFrame(tick);

    return {
      canvas,
      destroy,
      enableMidi,
      hit,
      noteOff,
      noteOn,
      setTone,
      tones: settings.tones,
      noteName(note) {
        return `${notes[note % 12]}${Math.floor(note / 12) - 1}`;
      },
    };
  }

  function withAlpha(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
  }

  window.TimbreOrnament = { mount };
})();

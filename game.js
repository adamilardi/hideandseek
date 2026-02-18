const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const kidsNames = ['Robo', 'Jobo', 'Mikey', 'Eric', 'Avery', 'Matthew', 'Franklin'];
const keys = new Set();

const ui = {
  difficulty: document.getElementById('difficulty'),
  startRound: document.getElementById('startRound'),
  runToggle: document.getElementById('runToggle'),
  toolButton: document.getElementById('toolButton'),
  phaseLabel: document.getElementById('phaseLabel'),
  timerLabel: document.getElementById('timerLabel'),
  foundLabel: document.getElementById('foundLabel'),
  staminaLabel: document.getElementById('staminaLabel'),
  seekerLabel: document.getElementById('seekerLabel'),
  hintLabel: document.getElementById('hintLabel'),
  kidsList: document.getElementById('kidsList')
};

const house = {
  rooms: [
    { name: 'Kitchen', x: 40, y: 40, w: 220, h: 170, color: '#ffef99' },
    { name: 'Living Room', x: 280, y: 40, w: 280, h: 220, color: '#f7cc8f' },
    { name: 'Hall', x: 580, y: 40, w: 260, h: 170, color: '#dfc4ff' },
    { name: 'Study', x: 40, y: 230, w: 220, h: 170, color: '#b7efc5' },
    { name: 'Storage', x: 280, y: 280, w: 200, h: 180, color: '#ffd6d6' },
    { name: 'Bathroom', x: 500, y: 230, w: 170, h: 230, color: '#bde0fe' },
    { name: 'Bedroom', x: 690, y: 230, w: 150, h: 230, color: '#f3c4fb' },
    { name: 'Play Room', x: 40, y: 420, w: 220, h: 140, color: '#ffd166' },
    { name: 'Garage', x: 280, y: 480, w: 560, h: 80, color: '#c8d6a5' }
  ],
  doors: [
    { x: 260, y: 130, w: 20, h: 30, open: true, roomA: 'Kitchen', roomB: 'Living Room' },
    { x: 560, y: 130, w: 20, h: 30, open: true, roomA: 'Living Room', roomB: 'Hall' },
    { x: 260, y: 300, w: 20, h: 30, open: true, roomA: 'Study', roomB: 'Storage' },
    { x: 670, y: 330, w: 20, h: 30, open: true, roomA: 'Bathroom', roomB: 'Bedroom' }
  ],
  secretPaths: [
    { x: 215, y: 390, w: 50, h: 14, active: false },
    { x: 480, y: 260, w: 20, h: 20, active: false }
  ],
  obstacles: [
    { x: 120, y: 470, r: 35, type: 'sand' },
    { x: 365, y: 370, r: 30, type: 'food' },
    { x: 780, y: 510, r: 25, type: 'food' }
  ]
};

const state = {
  phase: 'setup',
  timer: 60,
  seeker: 'Player 2',
  difficulty: 'normal',
  round: 1,
  totalFound: 0,
  toolUnlocked: false,
  toolReady: false,
  giggleTimer: 10,
  alarmPlayed: false,
  kids: [],
  hiderIndex: 0,
  seekerPos: { x: 80, y: 80, speed: 2.1 },
  run: false,
  stamina: 100,
  tired: false,
  toolPulse: 0,
  hint: null
};

function initKids() {
  state.kids = kidsNames.map((name) => ({ name, x: 0, y: 0, found: false, room: null }));
  renderKidsList();
}

function renderKidsList() {
  ui.kidsList.innerHTML = '';
  state.kids.forEach((k) => {
    const li = document.createElement('li');
    li.textContent = `${k.name} ${k.found ? '✅ found' : state.phase === 'hide' ? '🙈 hidden soon' : '❓ missing'}`;
    li.className = k.found ? 'found' : 'hidden';
    ui.kidsList.appendChild(li);
  });
}

function startRound() {
  state.phase = 'hide';
  state.timer = 60;
  state.totalFound = 0;
  state.hiderIndex = 0;
  state.seekerPos.x = 80;
  state.seekerPos.y = 80;
  state.stamina = 100;
  state.tired = false;
  state.toolPulse = 0;
  state.alarmPlayed = false;
  state.hint = null;
  state.giggleTimer = 9;
  initKids();
  applyDifficulty(ui.difficulty.value);
  ui.hintLabel.textContent = 'Hint: Click rooms to hide kids.';
}

function beginSeekPhase() {
  if (state.kids.some(k => !k.room)) {
    autoPlaceRemainingKids();
  }
  state.phase = 'seek';
  state.timer = 120;
  ui.hintLabel.textContent = 'Hint: Kids giggle every few seconds.';
}

function autoPlaceRemainingKids() {
  state.kids.forEach((kid) => {
    if (!kid.room) {
      const room = house.rooms[Math.floor(Math.random() * house.rooms.length)];
      kid.room = room.name;
      kid.x = room.x + 25 + Math.random() * (room.w - 50);
      kid.y = room.y + 25 + Math.random() * (room.h - 50);
    }
  });
}

function applyDifficulty(level) {
  state.difficulty = level;
  const closed = level === 'hard' ? [0, 1, 2, 3] : level === 'normal' ? [2, 3] : [3];
  house.doors.forEach((d, i) => { d.open = !closed.includes(i); });
  house.secretPaths.forEach((p, i) => {
    p.active = level === 'hard' ? true : level === 'normal' ? i === 0 : false;
  });
}

function update(delta) {
  if (state.phase === 'hide' || state.phase === 'seek') {
    state.timer -= delta;
    if (state.timer <= 0) {
      if (state.phase === 'hide') beginSeekPhase();
      else endRound(false);
    }
  }

  if (state.phase === 'seek') {
    moveSeeker();
    checkDiscovery();
    manageStamina(delta);
    manageGiggles(delta);
    playAlarmIfNeeded();

    if (state.totalFound === state.kids.length) {
      endRound(true);
    }
  }

  if (state.toolPulse > 0) {
    state.toolPulse -= delta;
  }

  syncUI();
}

function moveSeeker() {
  let vx = 0;
  let vy = 0;
  if (keys.has('ArrowUp') || keys.has('w')) vy -= 1;
  if (keys.has('ArrowDown') || keys.has('s')) vy += 1;
  if (keys.has('ArrowLeft') || keys.has('a')) vx -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) vx += 1;

  const mag = Math.hypot(vx, vy) || 1;
  vx /= mag;
  vy /= mag;

  const runHeld = keys.has('Shift') || state.run;
  const runBoost = runHeld && state.stamina > 0 && !state.tired ? 1.75 : 1;
  let speed = state.seekerPos.speed * runBoost;

  for (const o of house.obstacles) {
    const dist = Math.hypot(state.seekerPos.x - o.x, state.seekerPos.y - o.y);
    if (dist < o.r + 4) speed *= 0.55;
  }

  state.seekerPos.x += vx * speed;
  state.seekerPos.y += vy * speed;
  state.seekerPos.x = Math.max(10, Math.min(canvas.width - 10, state.seekerPos.x));
  state.seekerPos.y = Math.max(10, Math.min(canvas.height - 10, state.seekerPos.y));

  for (const door of house.doors) {
    if (!door.open && isNearRect(state.seekerPos.x, state.seekerPos.y, door, 12)) {
      state.seekerPos.x -= vx * speed;
      state.seekerPos.y -= vy * speed;
    }
  }
}

function manageStamina(delta) {
  const runHeld = keys.has('Shift') || state.run;
  if (runHeld && !state.tired) {
    state.stamina -= delta * 24;
    if (state.stamina <= 0) {
      state.stamina = 0;
      state.tired = true;
      ui.hintLabel.textContent = 'Hint: You are tired! Walk to recover.';
    }
  } else {
    state.stamina += delta * (state.tired ? 15 : 10);
    if (state.stamina > 45) state.tired = false;
    state.stamina = Math.min(100, state.stamina);
  }
}

function manageGiggles(delta) {
  state.giggleTimer -= delta;
  if (state.giggleTimer <= 0) {
    const remaining = state.kids.filter(k => !k.found);
    if (remaining.length) {
      const giggler = remaining[Math.floor(Math.random() * remaining.length)];
      state.hint = { x: giggler.x + (Math.random() * 80 - 40), y: giggler.y + (Math.random() * 80 - 40), ttl: 4 };
      beep(640, .08, 'triangle');
      ui.hintLabel.textContent = `Hint: ${giggler.name} giggled near ${giggler.room}!`;
    }
    state.giggleTimer = 8 + Math.random() * 4;
  }
  if (state.hint) {
    state.hint.ttl -= delta;
    if (state.hint.ttl <= 0) state.hint = null;
  }
}

function playAlarmIfNeeded() {
  if (!state.alarmPlayed && state.timer <= 5) {
    state.alarmPlayed = true;
    [0, 0.3, 0.6, 0.9].forEach((offset) => setTimeout(() => beep(180, .12, 'sawtooth'), offset * 1000));
    ui.hintLabel.textContent = 'Hint: ALARM! 5 seconds left!';
  }
}

function checkDiscovery() {
  const reach = 22;
  state.kids.forEach((kid) => {
    if (!kid.found && Math.hypot(kid.x - state.seekerPos.x, kid.y - state.seekerPos.y) <= reach) {
      kid.found = true;
      state.totalFound += 1;
      playFoundSound();
      ui.hintLabel.textContent = `Hint: Found ${kid.name}! Bonk-boing!`;
      renderKidsList();
    }
  });
}

function endRound(allFound) {
  state.phase = 'ended';
  if (allFound) {
    state.toolUnlocked = true;
    state.toolReady = true;
    ui.hintLabel.textContent = 'Hint: All kids found! You unlocked a sonar tool next round.';
  } else {
    ui.hintLabel.textContent = `Hint: Round over! Found ${state.totalFound}/${state.kids.length}.`;
  }
  rotateSeeker();
}

function rotateSeeker() {
  const pool = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
  state.seeker = pool[Math.floor(Math.random() * pool.length)];
}

function tryOpenDoor() {
  for (const d of house.doors) {
    if (isNearRect(state.seekerPos.x, state.seekerPos.y, d, 20)) {
      d.open = true;
      beep(420, .07, 'square');
    }
  }
}

function useTool() {
  if (!(state.phase === 'seek' && state.toolUnlocked && state.toolReady)) return;
  state.toolReady = false;
  state.toolPulse = 2.2;
  beep(900, .06, 'sine');
}

function isNearRect(x, y, rect, dist) {
  return x >= rect.x - dist && x <= rect.x + rect.w + dist && y >= rect.y - dist && y <= rect.y + rect.h + dist;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const room of house.rooms) {
    ctx.fillStyle = room.color;
    ctx.fillRect(room.x, room.y, room.w, room.h);
    ctx.strokeStyle = '#1f263d';
    ctx.lineWidth = 2;
    ctx.strokeRect(room.x, room.y, room.w, room.h);
    ctx.fillStyle = '#1e1e1e';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(room.name, room.x + 8, room.y + 18);
  }

  for (const o of house.obstacles) {
    ctx.beginPath();
    ctx.fillStyle = o.type === 'sand' ? '#e7d3a0' : '#ff9a8b';
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4b3f30';
    ctx.fillText(o.type, o.x - 16, o.y + 4);
  }

  for (const d of house.doors) {
    ctx.fillStyle = d.open ? '#7dd87d' : '#ad3434';
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }

  for (const path of house.secretPaths) {
    if (path.active) {
      ctx.fillStyle = '#6f00ff88';
      ctx.fillRect(path.x, path.y, path.w, path.h);
      ctx.fillStyle = '#33006b';
      ctx.fillText('secret', path.x, path.y - 4);
    }
  }

  const hideVision = state.phase === 'seek';
  for (const kid of state.kids) {
    if (state.phase === 'hide' || kid.found || !hideVision) {
      drawKid(kid, kid.found ? '#66d19e' : '#f7d154');
    }
  }

  if (state.hint) {
    ctx.beginPath();
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 4;
    ctx.arc(state.hint.x, state.hint.y, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    ctx.fillText('giggle?', state.hint.x - 22, state.hint.y - 34);
  }

  drawSeeker();

  if (state.toolPulse > 0) {
    ctx.beginPath();
    ctx.strokeStyle = '#00f5ff88';
    ctx.lineWidth = 3;
    ctx.arc(state.seekerPos.x, state.seekerPos.y, 150 * (1.2 - state.toolPulse / 2.2), 0, Math.PI * 2);
    ctx.stroke();
    for (const kid of state.kids.filter(k => !k.found)) {
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(kid.x - 2, kid.y - 2, 4, 4);
    }
  }

  if (state.phase === 'seek') {
    drawFog();
  }
}

function drawKid(kid, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(kid.x, kid.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.fillText(kid.name, kid.x - 22, kid.y - 14);
}

function drawSeeker() {
  ctx.beginPath();
  ctx.fillStyle = state.tired ? '#8d99ae' : '#06d6a0';
  ctx.arc(state.seekerPos.x, state.seekerPos.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.fillText(state.seeker, state.seekerPos.x - 35, state.seekerPos.y - 16);
}

function drawFog() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.74)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  const vision = state.difficulty === 'hard' ? 95 : state.difficulty === 'normal' ? 125 : 160;
  const gradient = ctx.createRadialGradient(state.seekerPos.x, state.seekerPos.y, 20, state.seekerPos.x, state.seekerPos.y, vision);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(state.seekerPos.x, state.seekerPos.y, vision, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function syncUI() {
  ui.phaseLabel.textContent = `Phase: ${state.phase}`;
  ui.timerLabel.textContent = `Time: ${Math.max(0, Math.ceil(state.timer))}`;
  ui.foundLabel.textContent = `Found: ${state.totalFound} / ${state.kids.length}`;
  ui.staminaLabel.textContent = `Stamina: ${Math.round(state.stamina)}`;
  ui.seekerLabel.textContent = `Seeker: ${state.seeker}`;
  ui.runToggle.textContent = `Run: ${state.run ? 'ON' : 'OFF'} (Shift)`;
  ui.toolButton.disabled = !(state.toolUnlocked && state.phase === 'seek' && state.toolReady);
}

function playFoundSound() {
  beep(520, .07, 'square');
  setTimeout(() => beep(760, .1, 'triangle'), 70);
}

function beep(freq, duration, type = 'sine') {
  const audioCtx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

canvas.addEventListener('click', (e) => {
  if (state.phase !== 'hide') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const room = house.rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (!room) return;
  const kid = state.kids[state.hiderIndex];
  if (!kid) return;
  kid.room = room.name;
  kid.x = x;
  kid.y = y;
  state.hiderIndex += 1;
  ui.hintLabel.textContent = `Hint: ${kid.name} hidden in ${room.name}.`;
  if (state.hiderIndex >= state.kids.length) beginSeekPhase();
  renderKidsList();
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', ' ', 'e', 'E', 'r', 'R', 'w', 'a', 's', 'd'].includes(e.key)) {
    e.preventDefault();
  }
  keys.add(e.key);
  if (e.key === 'e' || e.key === 'E') tryOpenDoor();
  if (e.key === 'r' || e.key === 'R') useTool();
  if (e.key === ' ') checkDiscovery();
});
window.addEventListener('keyup', (e) => keys.delete(e.key));

ui.startRound.addEventListener('click', startRound);
ui.runToggle.addEventListener('click', () => { state.run = !state.run; });
ui.toolButton.addEventListener('click', useTool);
ui.difficulty.addEventListener('change', (e) => applyDifficulty(e.target.value));

let previous = performance.now();
function frame(now) {
  const delta = (now - previous) / 1000;
  previous = now;
  update(delta);
  draw();
  requestAnimationFrame(frame);
}

startRound();
requestAnimationFrame(frame);

// ===== Roster Data =====
const ROSTER = [
  "James Lee",
  "Josh Kim",
  "Garrett Lee",
  "Gene Wang",
  "Jin Kim",
  "Matt Nobuhara",
  "Matt Yoshihara",
  "Mike Lin",
  "Nathan Wu",
  "Raine Min",
  "Shiju Jacob",
  "Simon Mason",
  "Timothy Lu"
];

// ===== State =====
let state = {
  presentPlayers: [],   // player names attending
  courtPlayers: [],     // up to 5 player names on court
  benchPlayers: [],     // remaining present players
  timers: {},           // { playerName: seconds }
  fouls: {},            // { playerName: number }
  gameRunning: false,
  gameSeconds: 0,
  intervalId: null,
  subOutPlayer: null,   // player being subbed out
};

// ===== Helpers =====
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ===== Setup Screen =====
function initSetup() {
  const grid = document.getElementById('roster-setup');
  grid.innerHTML = '';

  ROSTER.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'roster-btn';
    btn.dataset.name = name;
    btn.innerHTML = `
      <span class="check">✓</span>
      <span class="player-label">${name}</span>
    `;
    btn.addEventListener('click', () => togglePlayerSetup(btn, name));
    grid.appendChild(btn);
  });

  updateSetupCount();
  updateSelectAllBtn();
}

function togglePlayerSetup(btn, name) {
  btn.classList.toggle('selected');
  updateSetupCount();
  updateSelectAllBtn();
}

function updateSelectAllBtn() {
  const all = document.querySelectorAll('.roster-btn');
  const selected = document.querySelectorAll('.roster-btn.selected');
  const btn = document.getElementById('select-all-btn');
  if (!btn) return;
  const allSelected = selected.length === all.length;
  btn.textContent = allSelected ? 'Deselect All' : 'Select All';
  btn.classList.toggle('deselect-mode', allSelected);
}

function toggleSelectAll() {
  const all = document.querySelectorAll('.roster-btn');
  const selected = document.querySelectorAll('.roster-btn.selected');
  const shouldSelectAll = selected.length < all.length;
  all.forEach(btn => {
    if (shouldSelectAll) btn.classList.add('selected');
    else btn.classList.remove('selected');
  });
  updateSetupCount();
  updateSelectAllBtn();
}

function updateSetupCount() {
  const selected = document.querySelectorAll('.roster-btn.selected');
  const count = selected.length;
  document.getElementById('selected-count').textContent =
    `${count} player${count !== 1 ? 's' : ''} selected`;
  document.getElementById('start-game-btn').disabled = count === 0;
}

// ===== Start Game =====
function startGame() {
  const selected = [...document.querySelectorAll('.roster-btn.selected')]
    .map(btn => btn.dataset.name);

  if (selected.length === 0) return;

  state.presentPlayers = selected;
  state.timers = {};
  state.fouls = {};
  selected.forEach(name => { state.timers[name] = 0; state.fouls[name] = 0; });

  // Put first 5 (or fewer) on court
  state.courtPlayers = selected.slice(0, 5);
  state.benchPlayers = selected.slice(5);
  state.gameRunning = false;
  state.gameSeconds = 0;

  showScreen('game-screen');
  renderGame();
  initDropZones();
  updateGameClock();
}

// ===== Render Game =====
function renderGame() {
  renderCourt();
  renderBench();
  document.getElementById('court-count').textContent = `${state.courtPlayers.length}/5`;
  document.getElementById('bench-count').textContent = state.benchPlayers.length;
}

function renderCourt() {
  const container = document.getElementById('court-players');
  container.innerHTML = '';

  if (state.courtPlayers.length === 0) {
    container.innerHTML = '<div class="empty-state">No players on court</div>';
    return;
  }

  state.courtPlayers.forEach(name => {
    container.appendChild(createCourtCard(name));
  });
}

function renderBench() {
  const container = document.getElementById('bench-players');
  container.innerHTML = '';

  if (state.benchPlayers.length === 0) {
    container.innerHTML = '<div class="empty-state">Bench is empty</div>';
    return;
  }

  state.benchPlayers.forEach(name => {
    container.appendChild(createBenchCard(name));
  });
}

function createCourtCard(name) {
  const fouls = state.fouls[name] || 0;
  const fouledOut = fouls >= 6;
  const foulWarning = fouls === 5;
  const card = document.createElement('div');
  card.className = 'player-card on-court' + (state.gameRunning ? ' timer-running' : '') + (fouledOut ? ' fouled-out' : '') + (foulWarning ? ' foul-warning' : '');
  card.dataset.name = name;
  card.id = `card-${safeName(name)}`;
  card.draggable = true;

  card.innerHTML = `
    <div class="drag-handle" title="Drag to move">☰</div>
    <div class="player-name">${name}</div>
    <div class="player-timer" id="timer-${safeName(name)}">${formatTime(state.timers[name])}</div>
    <div class="player-card-mid">
      <div class="player-status">● On Court</div>
      <div class="foul-tracker" id="fouls-${safeName(name)}">
        ${renderFoulDots(fouls)}
      </div>
    </div>
    <div class="foul-controls">
      <button class="btn-foul-minus" onclick="changeFoul('${name}', -1)" ${fouls === 0 ? 'disabled' : ''}>−</button>
      <span class="foul-label">${fouledOut ? '🚫 FOULED OUT' : foulWarning ? '⚠️ 5 FOULS' : `${fouls} foul${fouls !== 1 ? 's' : ''}`}</span>
      <button class="btn-foul-plus" onclick="changeFoul('${name}', 1)" ${fouledOut ? 'disabled' : ''}>+</button>
    </div>
    <div class="card-actions">
      <button class="btn-sub" onclick="openSubModal('${name}')">↔ Sub Out</button>
      <button class="btn-send-bench" onclick="sendToBench('${name}')" title="Send to bench">⤓</button>
    </div>
  `;

  addDragListeners(card, name);
  return card;
}

function createBenchCard(name) {
  const fouls = state.fouls[name] || 0;
  const fouledOut = fouls >= 6;
  const foulWarning = fouls === 5;
  const courtFull = state.courtPlayers.length >= 5;
  const card = document.createElement('div');
  card.className = 'player-card' + (fouledOut ? ' fouled-out' : '') + (foulWarning ? ' foul-warning' : '');
  card.dataset.name = name;
  card.id = `card-${safeName(name)}`;
  card.draggable = true;

  card.innerHTML = `
    <div class="drag-handle" title="Drag to move">☰</div>
    <div class="player-name">${name}</div>
    <div class="player-timer" id="timer-${safeName(name)}">${formatTime(state.timers[name])}</div>
    <div class="player-card-mid">
      <div class="player-status">Bench</div>
      <div class="foul-tracker" id="fouls-${safeName(name)}">
        ${renderFoulDots(fouls)}
      </div>
    </div>
    <div class="foul-controls">
      <button class="btn-foul-minus" onclick="changeFoul('${name}', -1)" ${fouls === 0 ? 'disabled' : ''}>−</button>
      <span class="foul-label">${fouledOut ? '🚫 FOULED OUT' : foulWarning ? '⚠️ 5 FOULS' : `${fouls} foul${fouls !== 1 ? 's' : ''}`}</span>
      <button class="btn-foul-plus" onclick="changeFoul('${name}', 1)" ${fouledOut ? 'disabled' : ''}>+</button>
    </div>
    <div class="card-actions">
      <button class="btn-put-in" ${courtFull || fouledOut ? 'disabled' : ''}
        title="${fouledOut ? 'Fouled out' : courtFull ? 'Court is full — sub someone out first' : ''}"
        onclick="putOnCourt('${name}')">
        ${fouledOut ? '🚫 Fouled Out' : courtFull ? '🔒 Court Full' : '↑ Put In'}
      </button>
    </div>
  `;

  addDragListeners(card, name);
  return card;
}

// ===== Drag & Drop =====
let drag = { name: null, fromZone: null };

function addDragListeners(card, name) {
  card.addEventListener('dragstart', (e) => {
    drag.name = name;
    drag.fromZone = state.courtPlayers.includes(name) ? 'court' : 'bench';
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', name);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over', 'drag-over-invalid'));
    document.querySelectorAll('.player-card').forEach(c => c.classList.remove('drag-target'));
  });
  // Allow dropping onto another card (for swaps)
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (drag.name && drag.name !== name) card.classList.add('drag-target');
  });
  card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('drag-target');
    if (!drag.name || drag.name === name) return;
    handleCardDrop(drag.name, drag.fromZone, name);
  });
}

function handleCardDrop(fromName, fromZone, toName) {
  const toZone = state.courtPlayers.includes(toName) ? 'court' : 'bench';

  if (fromZone === 'court' && toZone === 'bench') {
    // Court → Bench card: swap positions
    const ci = state.courtPlayers.indexOf(fromName);
    const bi = state.benchPlayers.indexOf(toName);
    state.courtPlayers[ci] = toName;
    state.benchPlayers[bi] = fromName;
  } else if (fromZone === 'bench' && toZone === 'court') {
    // Bench → Court card: swap positions
    const fouledOut = (state.fouls[fromName] || 0) >= 6;
    if (fouledOut) return;
    const bi = state.benchPlayers.indexOf(fromName);
    const ci = state.courtPlayers.indexOf(toName);
    state.benchPlayers[bi] = toName;
    state.courtPlayers[ci] = fromName;
  } else if (fromZone === 'court' && toZone === 'court') {
    // Reorder within court
    const a = state.courtPlayers.indexOf(fromName);
    const b = state.courtPlayers.indexOf(toName);
    [state.courtPlayers[a], state.courtPlayers[b]] = [state.courtPlayers[b], state.courtPlayers[a]];
  } else {
    // Reorder within bench
    const a = state.benchPlayers.indexOf(fromName);
    const b = state.benchPlayers.indexOf(toName);
    [state.benchPlayers[a], state.benchPlayers[b]] = [state.benchPlayers[b], state.benchPlayers[a]];
  }
  drag = { name: null, fromZone: null };
  renderGame();
}

function initDropZones() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      const targetZone = zone.dataset.zone;
      const fouledOut = drag.name && (state.fouls[drag.name] || 0) >= 6;
      const wouldOverfill = targetZone === 'court' && drag.fromZone === 'bench' && state.courtPlayers.length >= 5;
      if (fouledOut || wouldOverfill) {
        zone.classList.add('drag-over-invalid');
      } else {
        zone.classList.add('drag-over');
      }
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over', 'drag-over-invalid');
      }
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over', 'drag-over-invalid');
      if (!drag.name) return;
      const targetZone = zone.dataset.zone;
      const fouledOut = (state.fouls[drag.name] || 0) >= 6;
      if (fouledOut && targetZone === 'court') return;

      if (targetZone === 'court' && drag.fromZone === 'bench') {
        if (state.courtPlayers.length >= 5) return; // court full, need card swap
        const bi = state.benchPlayers.indexOf(drag.name);
        state.benchPlayers.splice(bi, 1);
        state.courtPlayers.push(drag.name);
        drag = { name: null, fromZone: null };
        renderGame();
      } else if (targetZone === 'bench' && drag.fromZone === 'court') {
        const ci = state.courtPlayers.indexOf(drag.name);
        state.courtPlayers.splice(ci, 1);
        state.benchPlayers.push(drag.name);
        drag = { name: null, fromZone: null };
        renderGame();
      }
    });
  });
}

// ===== Foul Tracking =====
function renderFoulDots(count) {
  return Array.from({length: 6}, (_, i) =>
    `<span class="foul-dot ${i < count ? (count >= 6 ? 'foul-dot-out' : count === 5 ? 'foul-dot-warn' : 'foul-dot-filled') : ''}"></span>`
  ).join('');
}

function changeFoul(name, delta) {
  const current = state.fouls[name] || 0;
  const next = Math.max(0, Math.min(6, current + delta));
  if (next === current) return;
  state.fouls[name] = next;
  // Re-render the affected card only
  const card = document.getElementById(`card-${safeName(name)}`);
  if (!card) return;
  const isOnCourt = state.courtPlayers.includes(name);
  const newCard = isOnCourt ? createCourtCard(name) : createBenchCard(name);
  card.replaceWith(newCard);
  // Update court/bench counts in case fouled-out state changed
  document.getElementById('court-count').textContent = `${state.courtPlayers.length}/5`;
  document.getElementById('bench-count').textContent = state.benchPlayers.length;
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

// ===== Substitutions =====
function openSubModal(playerOut) {
  if (state.benchPlayers.length === 0) {
    // No bench — just send to bench directly
    sendToBench(playerOut);
    return;
  }
  state.subOutPlayer = playerOut;
  document.getElementById('sub-out-name').textContent = playerOut;

  const options = document.getElementById('sub-options');
  options.innerHTML = '';

  state.benchPlayers.forEach(benchName => {
    const btn = document.createElement('button');
    btn.className = 'sub-option-btn';
    btn.innerHTML = `
      <span>${benchName}</span>
      <span class="sub-option-time">${formatTime(state.timers[benchName])}</span>
    `;
    btn.addEventListener('click', () => completeSub(benchName));
    options.appendChild(btn);
  });

  document.getElementById('sub-modal').classList.remove('hidden');
}

function completeSub(playerIn) {
  const playerOut = state.subOutPlayer;
  if (!playerOut) return;

  const courtIdx = state.courtPlayers.indexOf(playerOut);
  const benchIdx = state.benchPlayers.indexOf(playerIn);

  if (courtIdx !== -1 && benchIdx !== -1) {
    state.courtPlayers[courtIdx] = playerIn;
    state.benchPlayers[benchIdx] = playerOut;
  }

  closeSubModal();
  renderGame();
}

function sendToBench(name) {
  const idx = state.courtPlayers.indexOf(name);
  if (idx === -1) return;
  state.courtPlayers.splice(idx, 1);
  state.benchPlayers.push(name);
  renderGame();
}

function putOnCourt(name) {
  if (state.courtPlayers.length >= 5) return;
  const idx = state.benchPlayers.indexOf(name);
  if (idx === -1) return;
  state.benchPlayers.splice(idx, 1);
  state.courtPlayers.push(name);
  renderGame();
}

function closeSubModal() {
  state.subOutPlayer = null;
  document.getElementById('sub-modal').classList.add('hidden');
}

// ===== Timers =====
function tick() {
  state.gameSeconds++;
  updateGameClock();

  // Increment time for every on-court player
  state.courtPlayers.forEach(name => {
    state.timers[name]++;
    const el = document.getElementById(`timer-${safeName(name)}`);
    if (el) el.textContent = formatTime(state.timers[name]);
  });
}

function updateGameClock() {
  document.getElementById('game-clock').textContent = formatTime(state.gameSeconds);
}

function toggleGameTimer() {
  const btn = document.getElementById('game-timer-btn');
  if (state.gameRunning) {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.gameRunning = false;
    btn.textContent = '▶ Resume';
    btn.dataset.state = 'stopped';
    btn.classList.remove('running');
    // Remove animation from court cards
    document.querySelectorAll('.player-card.on-court').forEach(c => c.classList.remove('timer-running'));
  } else {
    state.gameRunning = true;
    state.intervalId = setInterval(tick, 1000);
    btn.textContent = '⏸ Pause';
    btn.dataset.state = 'running';
    btn.classList.add('running');
    // Add animation to court cards
    document.querySelectorAll('.player-card.on-court').forEach(c => c.classList.add('timer-running'));
  }
}

function resetGame() {
  if (!confirm('Reset all timers and the game clock?')) return;
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.gameRunning = false;
  state.gameSeconds = 0;

  state.presentPlayers.forEach(name => { state.timers[name] = 0; state.fouls[name] = 0; });

  const btn = document.getElementById('game-timer-btn');
  btn.textContent = '▶ Start';
  btn.dataset.state = 'stopped';
  btn.classList.remove('running');

  updateGameClock();
  renderGame();
}

// ===== Screen Navigation =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function goToSetup() {
  if (state.gameRunning) {
    if (!confirm('Go back to setup? The game clock will be paused.')) return;
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.gameRunning = false;
  }
  showScreen('setup-screen');
}

// ===== Event Listeners =====
document.getElementById('start-game-btn').addEventListener('click', startGame);
document.getElementById('select-all-btn').addEventListener('click', toggleSelectAll);
document.getElementById('game-timer-btn').addEventListener('click', toggleGameTimer);
document.getElementById('reset-btn').addEventListener('click', resetGame);
document.getElementById('back-btn').addEventListener('click', goToSetup);
document.getElementById('modal-close').addEventListener('click', closeSubModal);
document.getElementById('modal-cancel').addEventListener('click', closeSubModal);
document.getElementById('sub-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('sub-modal')) closeSubModal();
});

// ===== Init =====
initSetup();
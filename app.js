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
}

function togglePlayerSetup(btn, name) {
  btn.classList.toggle('selected');
  updateSetupCount();
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
  selected.forEach(name => { state.timers[name] = 0; });

  // Put first 5 (or fewer) on court
  state.courtPlayers = selected.slice(0, 5);
  state.benchPlayers = selected.slice(5);
  state.gameRunning = false;
  state.gameSeconds = 0;

  showScreen('game-screen');
  renderGame();
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
  const card = document.createElement('div');
  card.className = 'player-card on-court' + (state.gameRunning ? ' timer-running' : '');
  card.dataset.name = name;
  card.id = `card-${safeName(name)}`;

  card.innerHTML = `
    <div class="player-name">${name}</div>
    <div class="player-timer" id="timer-${safeName(name)}">${formatTime(state.timers[name])}</div>
    <div class="player-status">● On Court</div>
    <div class="card-actions">
      <button class="btn-sub" onclick="openSubModal('${name}')">↔ Sub Out</button>
      <button class="btn-send-bench" onclick="sendToBench('${name}')" title="Send to bench">⤓</button>
    </div>
  `;
  return card;
}

function createBenchCard(name) {
  const card = document.createElement('div');
  card.className = 'player-card';
  card.dataset.name = name;
  card.id = `card-${safeName(name)}`;

  const courtFull = state.courtPlayers.length >= 5;

  card.innerHTML = `
    <div class="player-name">${name}</div>
    <div class="player-timer" id="timer-${safeName(name)}">${formatTime(state.timers[name])}</div>
    <div class="player-status">Bench</div>
    <div class="card-actions">
      <button class="btn-put-in" ${courtFull ? 'disabled title="Court is full — sub someone out first"' : ''}
        onclick="putOnCourt('${name}')">
        ${courtFull ? '🔒 Court Full' : '↑ Put In'}
      </button>
    </div>
  `;
  return card;
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

  state.presentPlayers.forEach(name => { state.timers[name] = 0; });

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
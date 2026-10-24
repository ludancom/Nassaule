// Saves each player's progress in their own browser (no server needed).
// Progress survives a refresh, so restarting can't reset the clock.
const KEY = 'nasscade:v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode or storage blocked: the game still works, it just won't remember */
  }
}

export function loadProgress(puzzleId) {
  return readAll()[puzzleId] || null;
}

export function saveProgress(puzzleId, progress) {
  const all = readAll();
  all[puzzleId] = progress;
  writeAll(all);
}

export function allProgress() {
  return readAll();
}

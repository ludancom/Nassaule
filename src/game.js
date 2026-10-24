// Pure game logic, shared by the game and the puzzle builder.
import { WORD_LENGTH, PUZZLE_DIR } from './config.js';

/** Starting reveal grid. With revealFirst, every word's first letter is shown. */
export function emptyGrid(answers, revealFirst = false) {
  return answers.map(() => Array.from({ length: WORD_LENGTH }, (_, c) => revealFirst && c === 0));
}

/**
 * Apply a guess to every row at once. A letter is revealed in a row when the
 * guess has that same letter in that same position (no "yellows").
 * Returns the new grid plus what changed, for animation and feedback.
 */
export function applyGuess(answers, revealed, guess) {
  const next = revealed.map((r) => [...r]);
  const newCells = []; // [row, col]
  answers.forEach((ans, r) => {
    for (let c = 0; c < WORD_LENGTH; c++) {
      if (!next[r][c] && guess[c] === ans[c]) {
        next[r][c] = true;
        newCells.push([r, c]);
      }
    }
  });
  const newlySolved = answers
    .map((_, r) => r)
    .filter((r) => !revealed[r].every(Boolean) && next[r].every(Boolean));
  return { revealed: next, newCells, newlySolved };
}

export function isSolved(revealed) {
  return revealed.every((row) => row.every(Boolean));
}

export function solvedCount(revealed) {
  return revealed.filter((row) => row.every(Boolean)).length;
}

/** Reveal one hidden letter in a row (the first hidden one). */
export function revealOne(answers, revealed, row) {
  const col = revealed[row].findIndex((v) => !v);
  if (col === -1) return null;
  const next = revealed.map((r) => [...r]);
  next[row][col] = true;
  const newlySolved = next[row].every(Boolean) ? [row] : [];
  return { revealed: next, newCells: [[row, col]], newlySolved };
}

/** How many positions two words share (same letter, same spot). */
export function sharedPositions(a, b) {
  const out = [];
  for (let i = 0; i < WORD_LENGTH; i++) if (a[i] && a[i] === b[i]) out.push(i);
  return out;
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Local date as YYYY-MM-DD (so a puzzle unlocks at local midnight). */
export function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let wordsPromise;
export function loadWords() {
  wordsPromise ??= fetch('./words.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => new Set(list))
    .catch(() => new Set());
  return wordsPromise;
}

export async function loadIndex({ includeFuture = false } = {}) {
  const r = await fetch(`${PUZZLE_DIR}/index.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Could not load the puzzle list.');
  const { puzzles } = await r.json();
  // Only puzzles whose date has arrived (so you can schedule ahead); newest first.
  const today = todayISO();
  return puzzles
    .filter((p) => includeFuture || p.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function loadPuzzle(id) {
  const r = await fetch(`${PUZZLE_DIR}/${id}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Could not load puzzle ${id}.`);
  const p = await r.json();
  p.words = p.words.map((w) => ({ ...w, answer: w.answer.toUpperCase().trim() }));
  return p;
}

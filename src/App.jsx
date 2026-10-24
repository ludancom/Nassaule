import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME_NAME, PUBLICATION, WORD_LENGTH, HINT_PENALTY_SECONDS, SHARE_URL } from './config.js';
import {
  applyGuess, emptyGrid, formatTime, isSolved, loadIndex, loadPuzzle, loadWords,
  revealOne, solvedCount,
} from './game.js';
import { allProgress, loadProgress, saveProgress } from './storage.js';
import { useIframeHeight } from './useIframeHeight.js';
import Keyboard from './Keyboard.jsx';

const now = () => Date.now();

export default function App() {
  useIframeHeight();
  const [index, setIndex] = useState([]);
  const [puzzle, setPuzzle] = useState(null);
  const [error, setError] = useState('');
  const [words, setWords] = useState(null);
  const [phase, setPhase] = useState('loading'); // intro | playing | paused | done
  const [revealed, setRevealed] = useState([]);
  const [guesses, setGuesses] = useState([]); // {word, lit, solved}
  const [hints, setHints] = useState(0);
  const [chains, setChains] = useState([]); // per row: how many words the clearing guess cleared
  const [accum, setAccum] = useState(0); // ms of play before runningSince
  const [runningSince, setRunningSince] = useState(null);
  const [tick, setTick] = useState(0);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState(null);
  const [anim, setAnim] = useState({ id: 0, cells: {}, rows: [] });
  const [selected, setSelected] = useState(null);
  const [shake, setShake] = useState(0);
  const [showArchive, setShowArchive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const msgTimer = useRef();

  const answers = useMemo(() => (puzzle ? puzzle.words.map((w) => w.answer) : []), [puzzle]);
  const bestChain = Math.max(1, ...guesses.map((g) => g.solved || 0));
  const elapsedMs = accum + (runningSince ? now() - runningSince : 0);
  const totalSeconds = Math.floor(elapsedMs / 1000) + hints * HINT_PENALTY_SECONDS;

  // ---------- loading ----------
  const openPuzzle = useCallback(async (id) => {
    setPhase('loading');
    setShowArchive(false);
    try {
      const p = await loadPuzzle(id);
      const saved = loadProgress(p.id);
      setPuzzle(p);
      setInput('');
      setMessage(null);
      setSelected(null);
      setAnim({ id: 0, cells: {}, rows: [] });
      setRunningSince(null);
      if (saved) {
        setRevealed(saved.revealed);
        setGuesses(saved.guesses);
        setHints(saved.hints);
        setChains(saved.chains || []);
        setAccum(saved.accum);
        setPhase(saved.status === 'done' ? 'done' : 'paused');
      } else {
        setRevealed(emptyGrid(p.words.map((w) => w.answer)));
        setChains([]);
        setGuesses([]);
        setHints(0);
        setAccum(0);
        setPhase('intro');
      }
      const url = new URL(window.location.href);
      url.searchParams.set('p', p.id);
      window.history.replaceState(null, '', url);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadWords().then(setWords);
    loadIndex()
      .then((list) => {
        setIndex(list);
        if (!list.length) throw new Error('No puzzle is out yet. Check back soon!');
        const want = new URLSearchParams(window.location.search).get('p');
        const pick = list.find((p) => p.id === want) || list[0];
        return openPuzzle(pick.id);
      })
      .catch((e) => setError(e.message));
  }, [openPuzzle]);

  // ---------- persistence ----------
  const persist = useCallback(
    (over = {}) => {
      if (!puzzle) return;
      const running = runningSince ? now() - runningSince : 0;
      saveProgress(puzzle.id, {
        revealed, guesses, hints, chains,
        accum: accum + running,
        status: phase === 'done' ? 'done' : 'playing',
        ...over,
      });
    },
    [puzzle, revealed, guesses, hints, chains, accum, runningSince, phase],
  );

  useEffect(() => {
    if (phase === 'playing' || phase === 'done' || phase === 'paused') persist();
  }, [revealed, guesses, hints, chains, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- clock ----------
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [phase]);

  const pause = useCallback(() => {
    if (phase !== 'playing') return;
    const add = runningSince ? now() - runningSince : 0;
    setAccum((a) => a + add);
    setRunningSince(null);
    setPhase('paused');
  }, [phase, runningSince]);

  const resume = () => {
    setRunningSince(now());
    setPhase('playing');
  };

  useEffect(() => {
    const onHide = () => document.hidden && pause();
    const onUnload = () => persist();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [pause, persist]);

  // ---------- feedback ----------
  const flash = (text, kind = 'info', ms = 2200) => {
    clearTimeout(msgTimer.current);
    setMessage({ text, kind, key: now() });
    msgTimer.current = setTimeout(() => setMessage(null), ms);
  };

  const animate = (newCells, newlySolved) => {
    const cells = {};
    // Cascade: rows light up top to bottom, letters left to right.
    const rowsTouched = [...new Set(newCells.map(([r]) => r))].sort((a, b) => a - b);
    newCells.forEach(([r, c]) => {
      cells[`${r}-${c}`] = rowsTouched.indexOf(r) * 90 + c * 45;
    });
    setAnim((a) => ({ id: a.id + 1, cells, rows: newlySolved }));
  };

  const finish = (finalRevealed, finalGuesses = guesses, finalHints = hints, finalChains = chains) => {
    const add = runningSince ? now() - runningSince : 0;
    const finalAccum = accum + add;
    setAccum(finalAccum);
    setRunningSince(null);
    setTimeout(() => setPhase('done'), 900);
    saveProgress(puzzle.id, {
      revealed: finalRevealed, guesses: finalGuesses, hints: finalHints, chains: finalChains, accum: finalAccum, status: 'done',
    });
  };

  const withChain = (rows, size) => {
    const next = [...chains];
    rows.forEach((r) => { next[r] = size; });
    return next;
  };

  // ---------- actions ----------
  const submit = () => {
    if (phase !== 'playing') return;
    const guess = input.toUpperCase();
    if (guess.length < WORD_LENGTH) {
      setShake((n) => n + 1);
      return flash('Not enough letters');
    }
    const valid = answers.includes(guess) || !words || words.size === 0 || words.has(guess);
    if (!valid) {
      setShake((n) => n + 1);
      return flash('Not in word list');
    }
    if (guesses.some((g) => g.word === guess)) {
      setShake((n) => n + 1);
      return flash('Already tried that one');
    }
    const res = applyGuess(answers, revealed, guess);
    const entry = { word: guess, lit: res.newCells.length, solved: res.newlySolved.length };
    setGuesses((g) => [...g, entry]);
    setRevealed(res.revealed);
    const nextChains = withChain(res.newlySolved, res.newlySolved.length);
    setChains(nextChains);
    setInput('');
    animate(res.newCells, res.newlySolved);
    if (res.newlySolved.length > 1) flash(`×${res.newlySolved.length} chain! ${res.newlySolved.length} words cleared`, 'win');
    else if (res.newlySolved.length === 1) flash(`${answers[res.newlySolved[0]]} cleared`, 'win');
    else if (res.newCells.length) {
      const rows = new Set(res.newCells.map(([r]) => r)).size;
      flash(`${res.newCells.length} letter${res.newCells.length > 1 ? 's' : ''} in ${rows} word${rows > 1 ? 's' : ''}`);
    } else flash('Nothing lined up');
    if (isSolved(res.revealed)) finish(res.revealed, [...guesses, entry], hints, nextChains);
  };

  const hint = () => {
    if (phase !== 'playing') return;
    const row = selected ?? revealed.findIndex((r) => !r.every(Boolean));
    if (row < 0 || revealed[row].every(Boolean)) return flash('Tap an unsolved clue first');
    const res = revealOne(answers, revealed, row);
    if (!res) return;
    setHints((h) => h + 1);
    setRevealed(res.revealed);
    const nextChains = withChain(res.newlySolved, 1);
    setChains(nextChains);
    animate(res.newCells, res.newlySolved);
    flash(`+${HINT_PENALTY_SECONDS} seconds`, 'penalty');
    if (isSolved(res.revealed)) finish(res.revealed, guesses, hints + 1, nextChains);
  };

  // Keep the latest handlers in a ref so the key listener never goes stale.
  const latest = useRef();
  latest.current = { submit, phase };
  const onKey = useCallback((key) => {
    if (latest.current.phase !== 'playing') return;
    if (key === 'ENTER') return latest.current.submit();
    if (key === 'BACK') return setInput((s) => s.slice(0, -1));
    if (/^[A-Z]$/.test(key)) setInput((s) => (s.length < WORD_LENGTH ? s + key : s));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') onKey('ENTER');
      else if (e.key === 'Backspace') onKey('BACK');
      else if (/^[a-zA-Z]$/.test(e.key)) onKey(e.key.toUpperCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  // ---------- share ----------
  const shareText = () => {
    const strip = guesses.map((g) => (g.solved > 1 ? '🟧' : g.solved ? '⬛' : g.lit ? '🟨' : '⬜')).join('');
    const hintPart = hints ? ` · ${hints} hint${hints > 1 ? 's' : ''}` : '';
    return [
      `${GAME_NAME} #${puzzle.number ?? ''} · ${puzzle.title}`.trim(),
      `⏱ ${formatTime(totalSeconds)} · ${guesses.length} guesses${hintPart}`,
      bestChain > 1 ? `⚡ best chain ×${bestChain}` : '',
      strip,
      SHARE_URL,
    ].filter(Boolean).join('\n');
  };

  const share = async () => {
    const text = shareText();
    try {
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      flash('Copied to clipboard', 'win');
    } catch {
      flash('Could not copy. Try a screenshot!');
    }
  };

  // ---------- render ----------
  if (error) {
    return (
      <Shell>
        <div className="notice"><p>{error}</p></div>
      </Shell>
    );
  }
  if (!puzzle || phase === 'loading') {
    return <Shell><div className="notice"><p>Loading…</p></div></Shell>;
  }

  const hideBoard = phase === 'intro' || phase === 'paused';
  const solved = solvedCount(revealed);
  const progress = allProgress();

  return (
    <Shell
      right={
        <div className="toolbar">
          <button className="link-btn" onClick={() => setShowHelp(true)}>how to play</button>
          {index.length > 1 && (
            <button className="link-btn" onClick={() => setShowArchive((v) => !v)}>archive</button>
          )}
        </div>
      }
    >
      <section className="masthead">
        <p className="kicker">{PUBLICATION} · No. {puzzle.number}</p>
        <h1 className="title">{puzzle.title}</h1>
        <p className="byline">by {puzzle.author}</p>
      </section>

      <div className="statusbar">
        <div className="clock" aria-live="off">
          <span className="clock-time">{formatTime(totalSeconds)}</span>
          {hints > 0 && <span className="clock-pen">incl. +{hints * HINT_PENALTY_SECONDS}s</span>}
        </div>
        <div className="count">{solved} / {answers.length} cleared</div>
        {phase === 'playing' && (
          <button className="ghost-btn" onClick={pause} aria-label="Pause">❙❙ pause</button>
        )}
      </div>

      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${(solved / answers.length) * 100}%` }} />
      </div>

      <div className={`board ${hideBoard ? 'board-hidden' : ''}`}>
        {puzzle.words.map((w, r) => {
          const rowSolved = revealed[r]?.every(Boolean);
          const isNewSolve = anim.rows.includes(r);
          const chain = rowSolved ? Math.min(chains[r] || 1, 5) : 0;
          return (
            <button
              type="button"
              key={r}
              className={`row ${rowSolved ? `solved chain-${chain}` : ''} ${isNewSolve ? 'just-solved' : ''} ${selected === r && !rowSolved ? 'selected' : ''}`}
              onClick={() => setSelected(selected === r ? null : r)}
              style={isNewSolve ? { animationDelay: '380ms' } : undefined}
            >
              <span className="num">
                {puzzle.revealFirst ? w.answer[0] : r + 1}
                {chain > 1 && <span className="chain-badge">×{chains[r]}</span>}
              </span>
              <span className="clue">{hideBoard ? ' ' : w.clue}</span>
              <span className="tiles">
                {w.answer.split('').map((ch, c) => {
                  const show = revealed[r]?.[c];
                  const delay = anim.cells[`${r}-${c}`];
                  const fresh = delay !== undefined;
                  return (
                    <span
                      key={fresh ? `${c}-${anim.id}` : c}
                      className={`tile ${show ? 'on' : ''} ${fresh ? 'fresh' : ''}`}
                      style={fresh ? { animationDelay: `${delay}ms` } : undefined}
                    >
                      {show && !hideBoard ? ch : ''}
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}

        {phase === 'intro' && (
          <div className="overlay">
            <p className="overlay-kicker">{GAME_NAME}</p>
            <h2>Eight words. One clock.</h2>
            <p>Every guess is checked against all eight answers at once. Letters in the right spot light up wherever they fit.</p>
            <button className="solid-btn" onClick={resume}>Start the clock</button>
            <button className="link-btn" onClick={() => setShowHelp(true)}>how to play</button>
          </div>
        )}
        {phase === 'paused' && (
          <div className="overlay">
            <p className="overlay-kicker">Paused</p>
            <h2>{formatTime(totalSeconds)}</h2>
            <p>The clock stops while you're away.</p>
            <button className="solid-btn" onClick={resume}>Keep going</button>
          </div>
        )}
      </div>

      {guesses.length > 0 && phase !== 'done' && (
        <div className="history" aria-label="Your guesses">
          {guesses.map((g) => (
            <span key={g.word} className={`chip ${g.solved ? 'chip-solved' : g.lit ? 'chip-lit' : ''}`}>
              {g.word}<sup>{g.lit}</sup>
            </span>
          ))}
        </div>
      )}

      {phase === 'playing' && (
        <div className="play-area">
          <div className={`msg ${message ? `msg-${message.kind}` : ''}`} key={message?.key} role="status">
            {message?.text ?? ' '}
          </div>
          <div className="entry" key={`shake-${shake}`} data-shake={shake > 0}>
            {Array.from({ length: WORD_LENGTH }, (_, i) => (
              <span key={i} className={`entry-tile ${input[i] ? 'filled' : ''}`}>{input[i] ?? ''}</span>
            ))}
          </div>
          <div className="actions">
            <button className="ghost-btn" onClick={hint}>
              reveal a letter{selected !== null && !revealed[selected]?.every(Boolean) ? ` in #${selected + 1}` : ''} · +{HINT_PENALTY_SECONDS}s
            </button>
          </div>
          <Keyboard onKey={onKey} />
        </div>
      )}

      {phase === 'done' && (
        <section className="results">
          <p className="kicker">Solved</p>
          <div className="big-time">{formatTime(totalSeconds)}</div>
          <p className="stats">
            {guesses.length} guesses
            {bestChain > 1 && <> · best chain ×{bestChain}</>}
            {hints > 0 && <> · {hints} hint{hints > 1 ? 's' : ''} (+{hints * HINT_PENALTY_SECONDS}s)</>}
          </p>
          <div className="strip">
            {guesses.map((g, i) => (
              <span key={i} className={`dot ${g.solved ? `dot-solved chain-${Math.min(g.solved, 5)}` : g.lit ? 'dot-lit' : ''}`} title={g.word} />
            ))}
          </div>
          <div className="msg-wrap">
            <div className={`msg ${message ? `msg-${message.kind}` : ''}`} key={message?.key}>{message?.text ?? ' '}</div>
          </div>
          <button className="solid-btn" onClick={share}>Share your time</button>
          <p className="fine">New puzzle with every issue.</p>
        </section>
      )}

      {showArchive && (
        <Modal onClose={() => setShowArchive(false)} title="Archive">
          <ul className="archive">
            {index.map((p) => {
              const pr = progress[p.id];
              const t = pr?.status === 'done'
                ? formatTime(Math.floor(pr.accum / 1000) + pr.hints * HINT_PENALTY_SECONDS)
                : pr ? 'in progress' : '';
              return (
                <li key={p.id}>
                  <button onClick={() => openPuzzle(p.id)} className={p.id === puzzle.id ? 'current' : ''}>
                    <span className="a-title">{p.title}</span>
                    <span className="a-date">{fmtDate(p.date)}</span>
                    <span className="a-time">{t}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {showHelp && (
        <Modal onClose={() => setShowHelp(false)} title="How to play">
          <ol className="help">
            <li>There are <b>eight hidden five-letter words</b>, each with a clue.{puzzle.revealFirst && <> The letter beside each row is how that word starts.</>}</li>
            <li>Type any word. It's checked against <b>all eight at once</b>.</li>
            <li>A letter lights up only where it's in the <b>exact same spot</b> in an answer. No yellows.</li>
            <li>When every letter of a word is lit, it clears. One good guess can cascade across the board, and clearing several words at once makes a <b>chain</b>. Cleared words are colored by chain size: black, then teal ×2, sage ×3, pink ×4, red ×5+.</li>
            <li>There's no guess limit. You're racing the clock. Stuck? Tap a clue and reveal a letter for <b>+{HINT_PENALTY_SECONDS} seconds</b>.</li>
          </ol>
          <div className="help-legend">
            <p><b>Your results</b>, one square per guess:</p>
            <ul>
              <li>⬜ Nothing lined up</li>
              <li>🟨 Lit some letters</li>
              <li>⬛ Cleared a word</li>
              <li>🟧 Chain: cleared two or more words at once</li>
            </ul>
          </div>

          <div className="help-example">
            <p>If the answer is <b>CRAMS</b> and you guess <b>GRADE</b>:</p>
            <span className="tiles">
              {'CRAMS'.split('').map((ch, i) => (
                <span key={i} className={`tile ${i === 1 || i === 2 ? 'on' : ''}`}>{i === 1 || i === 2 ? ch : ''}</span>
              ))}
            </span>
            <p className="fine">R and A light up. They're in the same spots.</p>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Shell({ children, right }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">{GAME_NAME}</span>
          <span className="from">from the Nassau Weekly</span>
        </div>
        {right}
      </header>
      <main>{children}</main>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

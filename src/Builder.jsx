import { useEffect, useMemo, useState } from 'react';
import { GAME_NAME, WORD_LENGTH } from './config.js';
import { loadIndex, loadPuzzle, loadWords, sharedPositions, todayISO } from './game.js';

const blankWord = () => ({ answer: '', clue: '' });
const DEFAULT_COUNT = 8;

export default function Builder() {
  const [meta, setMeta] = useState({ title: '', author: 'The Nass Games Desk', date: todayISO(), number: '', revealFirst: false });
  const [rows, setRows] = useState(() => Array.from({ length: DEFAULT_COUNT }, blankWord));
  const [dict, setDict] = useState(null);
  const [existing, setExisting] = useState([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadWords().then(setDict);
    loadIndex({ includeFuture: true })
      .then((list) => {
        setExisting(list);
        setMeta((m) => ({ ...m, number: m.number || String(list.length + 1) }));
      })
      .catch(() => {});
  }, []);

  const answers = rows.map((r) => r.answer.toUpperCase().replace(/[^A-Z]/g, ''));
  const complete = answers.filter((a) => a.length === WORD_LENGTH);

  // Per-word checks and connections.
  const info = answers.map((a, i) => {
    const problems = [];
    if (!a) return { problems, links: [] };
    if (a.length !== WORD_LENGTH) problems.push(`needs ${WORD_LENGTH} letters`);
    else if (dict && dict.size && !dict.has(a)) problems.push('not in the word list (players can still guess it)');
    if (answers.some((b, j) => j !== i && b && b === a)) problems.push('duplicate');
    if (!rows[i].clue.trim()) problems.push('needs a clue');
    const links = answers
      .map((b, j) => ({ j, pos: j !== i && b.length === WORD_LENGTH && a.length === WORD_LENGTH ? sharedPositions(a, b) : [] }))
      .filter((l) => l.pos.length);
    if (a.length === WORD_LENGTH && complete.length > 1 && links.length === 0) {
      problems.push('shares no letter positions with any other word, so the cascade never helps it');
    }
    return { problems, links };
  });

  const totalShared = useMemo(() => {
    let t = 0;
    for (let i = 0; i < complete.length; i++)
      for (let j = i + 1; j < complete.length; j++) t += sharedPositions(complete[i], complete[j]).length;
    return t;
  }, [complete.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const rating = totalShared >= 24 ? ['great', 'Lots of cascades. Feels like the board solves itself.']
    : totalShared >= 15 ? ['good', 'Solid. A few satisfying chain reactions.']
    : complete.length >= 4 ? ['weak', 'Not much overlap. It will play like eight separate puzzles.']
    : ['', 'Add some words to see how well they connect.'];

  // Dictionary words that would connect best with the words so far.
  const suggestions = useMemo(() => {
    if (!dict || complete.length < 2) return [];
    const used = new Set(complete);
    const out = [];
    for (const w of dict) {
      if (used.has(w)) continue;
      let score = 0, touches = 0;
      for (const a of complete) {
        const s = sharedPositions(w, a).length;
        score += s;
        if (s) touches++;
      }
      if (touches >= 2) out.push([w, score, touches]);
    }
    out.sort((x, y) => y[1] - x[1] || y[2] - x[2]);
    return out.slice(0, 14);
  }, [dict, complete.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const id = meta.date || todayISO();
  const puzzle = {
    id,
    number: Number(meta.number) || undefined,
    date: meta.date,
    title: meta.title.trim(),
    author: meta.author.trim(),
    ...(meta.revealFirst ? { revealFirst: true } : {}),
    words: rows.map((r, i) => ({ answer: answers[i], clue: r.clue.trim() })),
  };
  const json = JSON.stringify(puzzle, null, 2);
  const indexEntry = JSON.stringify({ id, date: meta.date, title: puzzle.title });
  const allProblems = info.flatMap((x) => x.problems);
  const ready = !allProblems.some((p) => !p.startsWith('not in the word list') && !p.startsWith('shares no'))
    && complete.length === rows.length && puzzle.title && meta.date;

  const update = (i, field, value) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  const move = (i, d) => setRows((rs) => {
    const j = i + d;
    if (j < 0 || j >= rs.length) return rs;
    const n = [...rs];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const loadExisting = async (pid) => {
    if (!pid) return;
    const p = await loadPuzzle(pid);
    setMeta({ title: p.title, author: p.author || '', date: p.date, number: String(p.number ?? ''), revealFirst: !!p.revealFirst });
    setRows(p.words.map((w) => ({ answer: w.answer, clue: w.clue })));
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1600);
    } catch { /* ignore */ }
  };

  const download = () => {
    const blob = new Blob([json + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app builder">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">{GAME_NAME}</span>
          <span className="from">puzzle builder · for editors</span>
        </div>
        <div className="toolbar">
          <select className="b-select" defaultValue="" onChange={(e) => loadExisting(e.target.value)}>
            <option value="">edit an existing puzzle…</option>
            {existing.map((p) => <option key={p.id} value={p.id}>{p.date} · {p.title}</option>)}
          </select>
        </div>
      </header>

      <section className="b-meta">
        <label>Title<input value={meta.title} placeholder="e.g. Midterm Season" onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></label>
        <label>Publish date<input type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} /></label>
        <label>No.<input value={meta.number} inputMode="numeric" onChange={(e) => setMeta({ ...meta, number: e.target.value.replace(/\D/g, '') })} /></label>
        <label>By<input value={meta.author} onChange={(e) => setMeta({ ...meta, author: e.target.value })} /></label>
        <label className="b-check">
          <input type="checkbox" checked={meta.revealFirst} onChange={(e) => setMeta({ ...meta, revealFirst: e.target.checked })} />
          Label each row with its word's first letter, like Rushle (makes it easier; good for tough clues or themes)
        </label>
      </section>

      <h2 className="b-h">Words &amp; clues</h2>
      <div className="b-rows">
        {rows.map((r, i) => (
          <div className={`b-row ${info[i].problems.length ? 'has-problem' : ''}`} key={i}>
            <span className="num">{i + 1}</span>
            <input
              className="b-answer" value={r.answer} maxLength={WORD_LENGTH} placeholder="WORDS"
              onChange={(e) => update(i, 'answer', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            />
            <input className="b-clue" value={r.clue} placeholder="Clue" onChange={(e) => update(i, 'clue', e.target.value)} />
            <span className="b-links" title="How many other words share a letter in the same spot">
              {answers[i].length === WORD_LENGTH ? `${info[i].links.length} link${info[i].links.length === 1 ? '' : 's'}` : ''}
            </span>
            <span className="b-move">
              <button onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              {rows.length > 4 && <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove">×</button>}
            </span>
            {info[i].problems.length > 0 && <p className="b-problem">{info[i].problems.join(' · ')}</p>}
          </div>
        ))}
      </div>
      {rows.length < 12 && (
        <button className="ghost-btn" onClick={() => setRows((rs) => [...rs, blankWord()])}>+ add a word</button>
      )}

      <h2 className="b-h">How well it cascades</h2>
      <div className={`b-rating r-${rating[0]}`}>
        <span className="b-score">{totalShared}</span>
        <span><b>shared letter positions</b><br />{rating[1]}</span>
      </div>

      {complete.length > 1 && (
        <div className="b-matrix-wrap">
          <table className="b-matrix">
            <thead>
              <tr><th />{complete.map((a) => <th key={a}>{a}</th>)}</tr>
            </thead>
            <tbody>
              {complete.map((a) => (
                <tr key={a}>
                  <th>{a}</th>
                  {complete.map((b) => {
                    const n = a === b ? null : sharedPositions(a, b).length;
                    return <td key={b} className={n ? `m${Math.min(n, 3)}` : ''}>{n === null ? '·' : n || ''}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <h3 className="b-sub">Words that would connect well</h3>
          <p className="fine">From the dictionary, ranked by how many letter positions they share with your words. Use them for inspiration, or ignore them.</p>
          <div className="b-sugg">
            {suggestions.map(([w, s]) => <span key={w} className="chip chip-lit">{w}<sup>{s}</sup></span>)}
          </div>
        </>
      )}

      <h2 className="b-h">Publish</h2>
      {!ready && <p className="b-problem">Fill in a title, a date and every word and clue before publishing.</p>}
      <ol className="b-steps">
        <li>
          Save this file into the project's <code>public/puzzles/</code> folder.
          <div className="b-buttons">
            <button className="solid-btn" disabled={!ready} onClick={download}>Download {id}.json</button>
            <button className="ghost-btn" onClick={() => copy(json, 'json')}>{copied === 'json' ? 'copied' : 'copy JSON'}</button>
          </div>
        </li>
        <li>
          Add this line to the list in <code>public/puzzles/index.json</code>:
          <pre className="b-pre">{indexEntry}</pre>
          <button className="ghost-btn" onClick={() => copy(indexEntry, 'index')}>{copied === 'index' ? 'copied' : 'copy line'}</button>
        </li>
        <li>Commit and push. Vercel redeploys, and the puzzle goes live on its publish date.</li>
      </ol>

      <details className="b-details">
        <summary>Preview JSON</summary>
        <pre className="b-pre">{json}</pre>
      </details>
    </div>
  );
}

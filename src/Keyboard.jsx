const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export default function Keyboard({ onKey }) {
  return (
    <div className="keyboard" role="group" aria-label="Keyboard">
      {ROWS.map((row, i) => (
        <div className="kb-row" key={row}>
          {i === 2 && (
            <button className="key key-wide" onClick={() => onKey('ENTER')}>enter</button>
          )}
          {row.split('').map((k) => (
            <button className="key" key={k} onClick={() => onKey(k)}>{k}</button>
          ))}
          {i === 2 && (
            <button className="key key-wide" onClick={() => onKey('BACK')} aria-label="Delete">⌫</button>
          )}
        </div>
      ))}
    </div>
  );
}

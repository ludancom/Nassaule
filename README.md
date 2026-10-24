# Nasscade

A word game for the Nassau Weekly. Eight hidden five-letter words, each with a clue. 
Every guess is checked against all eight at once, and letters light up wherever they're
in the exact same spot. Solve one word and its letters cascade into the others.
No guess limit: you're racing the clock. Hints reveal a letter for +15 seconds.

- **Game:** `index.html` (the page players see)
- **Puzzle builder:** `builder.html` (for editors, not linked from the game)
- **Puzzles:** `public/puzzles/` (one JSON file per puzzle, plus `index.json`)

No server or database. Each player's progress and times are saved in their own browser.

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) (the LTS version). Then, in VS Code:

1. **File → Open Folder…** and pick this folder.
2. Open the terminal: **Terminal → New Terminal**.
3. Run:

   ```
   npm install
   npm run dev
   ```

4. Open the link it prints (usually http://localhost:5173). The builder is at
   http://localhost:5173/builder.html.

Edits to the code show up in the browser as soon as you save.

## 2. Put it online with Vercel (free)

1. Make a GitHub account if you don't have one, create a new repository, and upload this
   folder to it (GitHub Desktop is the easiest way if you're new to git).
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project**,
   and import the repository. Vercel detects Vite automatically. Click **Deploy**.
3. You get a link like `nasscade.vercel.app`. Every time you push to GitHub, it redeploys.

## 3. Put it on the WordPress site

In WordPress, edit the page where the game should live (e.g. under "more → crosswords"),
add a **Custom HTML** block, and paste this, replacing the URL with your Vercel link:

```html
<iframe id="nasscade" src="https://YOUR-PROJECT.vercel.app/"
  title="Nasscade" style="width:100%;border:0;height:1150px;display:block"
  allow="clipboard-write"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'nasscade:height') {
      document.getElementById('nasscade').style.height = e.data.height + 'px';
    }
  });
</script>
```

The script makes the frame grow and shrink with the game, so there are no scrollbars.
If WordPress strips the `<script>` (some accounts aren't allowed to add scripts), the iframe
alone still works at a fixed height. Ask a site admin if it gets removed.

On phones the full-page version is nicer, because the keyboard stays pinned to the bottom of
the screen. Consider also linking straight to the Vercel URL (or a subdomain like
`games.nassauweekly.com`, if whoever manages the domain can point it at Vercel).

## 4. Publishing a new puzzle each week

1. Open `/builder.html` on the live site (or locally).
2. Fill in the title, publish date and eight words with clues. Watch **"How well it
   cascades"**: aim for 20+ shared positions. Tick "label each row with its first letter" for a
   tougher theme to make it easier. Words with 0 links never get help from the
   cascade, so swap them out.
3. Click **Download** and put the file in `public/puzzles/`.
4. Add the line it gives you to the list in `public/puzzles/index.json` (remember the comma
   between entries).
5. Commit and push. The puzzle appears automatically on its publish date, so you can
   schedule weeks ahead. Older puzzles stay playable in the archive.

## Customizing

- **Name, hint penalty, share link:** `src/config.js`
- **Colors and fonts:** the variables at the top of `src/styles.css`
- **Valid guesses:** `public/words.json` (about 12,500 five-letter words). Puzzle answers
  always count as valid even if they're not in the list.

## Good to know

- Answers sit in plain JSON, so a determined player could peek with browser dev tools.
  That's normal for small web games; it's fine for a campus magazine.
- Times are stored per browser. A shared leaderboard would need a small backend
  (e.g. a Vercel serverless function plus a database) and is a good next step if people
  get competitive.

## Tech stack

| Part | What we use | What it does |
|---|---|---|
| UI | [React](https://react.dev) 19 | Builds the game's screens from components (`App.jsx`, `Keyboard.jsx`, `Builder.jsx`) and redraws them when the game state changes |
| Build tool | [Vite](https://vite.dev) 8 | Runs the local dev server (`npm run dev`) and bundles the site for production (`npm run build`) |
| Game logic | Plain JavaScript (`src/game.js`) | The rules: which letters light up, when words clear. Shared by the game and the builder |
| Styling | Plain CSS (`src/styles.css`) | All colors, fonts and layout. Colors are CSS variables at the top |
| Fonts | [Google Fonts](https://fonts.google.com): Source Serif 4 and Figtree | Serif for the wordmark and bylines, heavy sans for headings, matching nassauweekly.com |
| Puzzle data | Static JSON files (`public/puzzles/`) | One file per puzzle plus `index.json`. No database |
| Word list | `public/words.json` | ~12,500 valid five-letter guesses, from the [word-list](https://github.com/sindresorhus/word-list) package |
| Player data | Browser `localStorage` | Saves each player's progress and times on their own device. No accounts or server |
| Hosting | [Vercel](https://vercel.com) | Rebuilds and redeploys automatically on every push to GitHub |
| Embedding | `<iframe>` + `postMessage` | Puts the game on the WordPress site; the game tells the page its height so the frame resizes |
| Runtime requirement | [Node.js](https://nodejs.org) (LTS) | Only needed to develop and build, not to play |

There is no backend. A shared leaderboard would be the first thing to need one.


## Credits

Nasscade is inspired by [Rushle](https://rushle.io), a daily word game by
u/wallshark (AKA Brandon). ([original post on r/wordgames](https://www.reddit.com/r/wordgames/comments/1s7qlwx/i_built_a_daily_word_game_where_one_guess_can/)).
Its core idea is the one we built on: every guess is checked against all the
hidden words at once, letters only light up in their exact position, and solving
one word cascades letters into the rest.

What Nasscade changes: eight words instead of twenty-six, a clue for every word
written by the Nass, a count-up clock instead of a miss limit, and styling to
match the Nassau Weekly. If you like this, go play the original!
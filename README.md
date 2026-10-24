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

# T-Zero

**Your mission. Your moment.** A NASA-inspired launch clock with a warm amber display, mission naming, manual sequence controls, and scheduled launches. Independent project; not affiliated with or endorsed by NASA.

## v0.1

- **Launch date & time:** choose local time or UTC and set an exact instant. T− counts down, then T+ counts elapsed time. Closing the page does not change the deadline.
- **Manual sequence:** set up to 999:59:59, start, hold, resume, and reset. Hold freezes both countdown and T+ elapsed time. Reset restores the configured duration. Reset before editing a running or held sequence. A zero duration starts directly in T+.
- **Persistent configuration:** mission name, selected mode, schedule, and manual state are stored in this browser. Running manual clocks include time spent away; held clocks remain frozen. Switching modes does not stop either clock. Other tabs on the same origin synchronize saved changes.
- **Fullscreen:** use the top-right button; Escape exits on supported browsers. Unsupported browsers receive a helpful message.
- Responsive layout, keyboard controls, visible focus, labeled inputs, reduced-motion support, and screen-reader status messages. The clock itself does not announce every tick.
- No build step, dependencies, analytics, accounts, external fonts, or network time services.

## Activate GitHub Pages

1. Open [repository Settings → Pages](https://github.com/h27096/T-Zero/settings/pages).
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **main** and **/(root)**, then **Save**.
4. Wait for the Pages deployment in the Actions tab to finish. The intended URL is **https://h27096.github.io/T-Zero/**.

All assets use relative URLs so the project subpath works. `.nojekyll` keeps the site static. The included workflow runs tests; GitHub's branch-based Pages deployment publishes the site separately. See [GitHub's publishing source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Run locally

Install Node.js 22 or newer, then from the repository:

```sh
npm start
```

Open **http://127.0.0.1:4173/T-Zero/**. No install command is needed. Use an HTTP server, not a `file://` URL, because the app uses JavaScript modules.

```sh
npm test
```

Tests use Node's built-in test runner and cover the zero boundary, hours beyond 24, hold/resume before and after launch, reset, zero duration, serialization across time away, invalid storage, and date parsing. CI runs them on pushes and pull requests.

## Timing and persistence

`clock.js` contains pure timing functions. `app.js` renders them and manages browser storage and controls. A running manual clock stores an anchor timestamp and signed offset; a scheduled clock stores a UTC epoch timestamp. Each render computes from `Date.now()` instead of decrementing a counter. Background timer throttling, sleep, and closed tabs therefore do not introduce accumulated drift. The display rounds up before launch and down after launch, changing to T+ at the deadline.

The device clock is the time source; changing it changes running clocks. This is a personal launch display, not flight-certified timing equipment. Local date entry follows the browser time zone and daylight-saving rules. Nonexistent spring-forward times are rejected; ambiguous fall-back times use the first occurrence. Choose UTC for an unambiguous instant. Switching the timezone selector preserves the instant currently entered; press **Set launch time** to apply a draft.

Data is local to this browser and site origin, not synced between devices. Clearing site data removes it. Private browsing or storage restrictions may prevent persistence; the UI warns when storage fails. If a tab is closed while running, the clock catches up on reopening; no code needs to execute while closed. Fullscreen is not automatically restored after reopening.

## Quick browser check

1. Set manual duration to 00:00:03; start and observe T− → T+.
2. Hold before and after zero. Wait, then resume; the held interval must be excluded.
3. Reload while running, reload while held, and reset; confirm each state remains correct.
4. Schedule a launch a minute ahead in UTC. Reload and confirm the same deadline; set a past date to verify T+.
5. Switch modes, use keyboard-only controls, test fullscreen and Escape, and try a narrow phone viewport.
6. Block browser storage and confirm the session still works with a persistence warning.

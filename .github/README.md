<h1 align="center">Track the Gap 🕳️</h1>
<p align="center">
<i>Live London Underground headways, service gaps and train bunching</i>
<br />
<b>🌐 <a href="https://track-the-gap.peng.ly/">track-the-gap.peng.ly</a></b><br />
</p>

---

## About

TfL will tell you a line has a good service. It won't tell you that the next Central line train
to Hainault is nine minutes away when it should be four.

Track the Gap works that bit out. It reads TfL's live arrival predictions, rebuilds the trains
from them, and measures the **headway** - the time between one train and the next in the same
direction over the same bit of route. That gets compared against the timetabled headway for that
stop, that day type and that hour, and the ratio is the whole story: near 1 is an even service,
2 means your wait has doubled.

Branches are kept apart from trunks, beacuse they're different railways. A train only counts
towards a section if its service pattern actually runs over it. Where lines share track, you get
the combined corridor headway and each line's own figure side by side.

The map on each line page is a **time axis**, not a geographic one - distance across the page is
timetabled running time, so two trains six minutes apart sit six minutes apart on screen.

---

## Usage

Nothing to configure. `/` is the board for all eleven lines, and each line has its own page at
`/central-line`, `/district-line` and so on. Hover, tap or tab onto any section of a line map to
see its headways, the trains on it, and how far off the timetable it is.

Every reading carries the time it was taken. Nothing is judged on colour alone - each state has
its own mark and its own words.

---

## Deployment

### Option 1: Quick deploy

Fork the repo, import it into Vercel, and set `TFL_APP_KEY` (see [Configuration](#configuration)).
Or use the button 👇

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNotAFlightRisk%2Ftrack-the-gap&env=TFL_APP_KEY)

For Cloudflare Workers it's `ADAPTER=cloudflare npm run build` then `npx wrangler deploy` - the
config is already in `wrangler.jsonc`, and the app needs `wrangler secret put TFL_APP_KEY` once.
That's what [track-the-gap.peng.ly](https://track-the-gap.peng.ly/) runs on, deploying itself off
`main`.

---

### Option 2: Docker

Multi-arch image on [DockerHub](https://hub.docker.com/r/notaflightrisk/track-the-gap) and GHCR
([`ghcr.io/notaflightrisk/track-the-gap`](https://github.com/NotAFlightRisk/track-the-gap/pkgs/container/track-the-gap)):

```shell
docker run -p 3000:3000 -e TFL_APP_KEY=your-key notaflightrisk/track-the-gap
```

---

### Option 3: From a release

Grab `site.zip` off the [latest release](https://github.com/NotAFlightRisk/track-the-gap/releases/latest),
unzip it, then `node build`. It's a plain Node server, port 3000 by default.

---

### Option 4: Build from source

Follow the [Development](#development) steps, then `ADAPTER=node npm run build` and `node build`.

---

## Configuration

| Variable           | Default | What it does                                                                                                                                          |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TFL_APP_KEY`      | none    | Your TfL Unified API key, free from [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk/). The API answers without one, at a much lower rate limit. |
| `TFL_POLL_SECONDS` | `15`    | How long a live snapshot is held before refetching. Two API calls per refresh, no matter how many people are looking.                                 |
| `ADAPTER`          | vercel  | Set to `node` for a self-hosted server build.                                                                                                         |

Thresholds, the day-type bands and the "insufficient data" cutoff all live in
`src/lib/config/health.ts` rather than in any component, so you can retune what counts as a gap
without touching the UI.

The network model - topology, branches, run times and timetabled headways - is generated, not
hand-written. `npm run network` rebuilds `src/lib/data/network.json` off the TfL API, and the
🗺️ Network workflow does it monthly and opens a PR if anything moved.

---

## Development

You'll need [Node](https://nodejs.org/) 22 or newer, plus [Git](https://git-scm.com/). It's a
[SvelteKit](https://svelte.dev/docs/kit) app.

```bash
git clone git@github.com:NotAFlightRisk/track-the-gap.git
cd track-the-gap
cp .env.example .env   # then put your TfL key in it
npm install
npm run dev
```

Dev server is on [localhost:5173](http://localhost:5173).<br>
Before committing, run `npm run check` (types), `npm test` (tests) and `npm run format`.

You can also build the container with `docker build -t track-the-gap .`

---

## Credits

Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016 and Geomni
UK Map data © and database rights 2019. The headways here are worked out from those predictions
and are not official TfL figures.

##### Contributors

[![contributors badge](https://readme-contribs.as93.net/contributors/NotAFlightRisk/track-the-gap?shape=squircle)](https://github.com/NotAFlightRisk/track-the-gap/graphs/contributors)

---

<!-- License + Copyright -->
<p  align="center">
  <a href="https://github.com/NotAFlightRisk"><img width="64" src="https://pixelflare.cc/iain/gif/penguin-dance.gif" /></a><br>
  <sup>
    <i>Licensed under <a href="../LICENSE">MIT</a>, © <a href="https://github.com/NotAFlightRisk">NotAFlightRisk</a> 2026</i>
  </sup>
</p>

<!--
oooh, hello there! hope you're having a nice day :)
   |\__      |\___
 (:> __)X  (:o ___(
   |/        |/
-->

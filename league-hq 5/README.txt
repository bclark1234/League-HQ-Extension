LEAGUE HQ — INDIGO FOOTBALL LEAGUE
Version 0.5.2 — Frivolities Archive

INSTALL
1. Extract this ZIP to a folder.
2. Open chrome://extensions (or Opera's extensions page).
3. Enable Developer mode.
4. Choose Load unpacked and select the extracted league-hq folder.
5. Open All22 and sign in as usual. Navigate to the active franchise page.
6. Click the League HQ extension icon to open the dashboard.
7. Choose a collection mode, click Scan Franchise Data, review the preview, then choose Import to League HQ.

WHAT'S NEW IN 0.5.0

A. Playoff support
- The collector now reads All22's own playoff structure (the same data its Bracket tab uses): wildcard,
  divisional, conference and Indigo Bowl games, each with its round, conference and seed, plus the
  current seeding and champion once available.
- Playoff games are no longer silently dropped. (The previous build excluded any result carrying a
  playoff "round" property; that filter has been removed and replaced with explicit round-aware
  handling throughout the database, standings and stats.)
- Regular-season standings and team scoring records are calculated from regular-season games only;
  playoff games are tracked and shown separately so postseason results never distort the regular-season
  table.

B. Collection modes
The Game Week Collector's "COLLECTION MODE" selector now offers:
  - Latest available regular-season week
  - All completed regular-season weeks
  - Playoffs only (all rounds)
  - Regular season + playoffs (everything)
  - Any specific regular-season week (populated after a scan)
"Full Historical Import" now imports regular season + playoffs together.

C. Weekly Story Generator
The Media Center generates individual, source-grounded stories for every collected regular-season week
and every collected playoff round:
  - Weekly League Recap / Playoff Round Recap
  - Game of the Week
  - Upset of the Week (only when a team's record entering the week supports calling it an upset;
    otherwise League HQ says so rather than guessing)
  - Player of the Week, Offensive Performance of the Week, Defensive Performance of the Week
    (from replay-verified player lines only)
  - Statistical Leaders (season-to-date)
  - Biggest Winners and Losers
  - Power Rankings Update (League HQ's own win%/point-differential formula, clearly labeled as such,
    with week-over-week movement)
  - Playoff Picture (once seeding has been detected)
  - Championship Preview / Championship Recap for the Indigo Bowl
All of these are generated only from collected game results and replay-derived player statistics. None
of them are invented; where the data needed for a story isn't available yet, League HQ says so instead
of fabricating a number.

D. Media Center redesign
The Media Center is now organized by edition (one entry per collected week and per playoff round) with
a featured story, a grid of article cards per category, and a season selector. Opening an edition shows
every story generated for it. Each story has its own "Copy" button.

KNOWN LIMITATION CARRIED INTO 0.5.1
Stories are generated on demand from the stored database; they are not yet saved as drafts, and there
is no edit/publish/archive workflow yet. That editorial layer (story status, manual edits preserved
across regeneration, featured-article selection) is the planned 0.5.1 milestone and has intentionally
not been built ahead of schedule in this release.

WHAT THIS BUILD DOES (CARRIED OVER)
- Adds a season selector to League Database. Games, standings, player totals and record leaders are
  filtered to the selected season (or all collected seasons).
- Adds a Records view for season statistical leaders and regular-season team scoring records.
- Adds a clickable League Database with Teams, Players, Games, Standings, Playoffs and Statistics views.
- Team profiles show roster, derived W-L record and stored game results. Player profiles show
  replay-derived career totals and games with recorded stats. Game details show available
  replay-derived player lines.
- Search and week/round filtering are available in the database views.
- Separate Manifest V3 extension; it does not modify All22++ or the franchise.
- Opens a branded commissioner dashboard.
- Reads the active franchise using the site's own read-only client modules.
- Collects teams, current player/roster metadata, completed game results (regular season and playoffs)
  and available replay-derived player statistics.
- Deduplicates/upserts games by game ID.
- Flags missing replay data and replay parsing errors rather than inventing statistics.
- Stores data locally in IndexedDB (schema version bumped to add a "seasons" store for playoff
  seeding/champion) and exports a JSON database backup.

IMPORTANT LIMITATIONS
- This remains a local-first commissioner build. Season selection is based on the season values present
  in collected game records; historical rosters are not yet versioned snapshots.
- Discord publishing and a hosted backend are not yet connected.
- The All22 page must be open, logged in, and fully loaded in the same browser profile.
- The All22 data structures, playoff/bracket data and replay endpoints are not a documented public API.
  The collector uses read-only modules and behavior observed in the supplied All22++ source
  (bracket-main.js, specifically L.playoffs / seeds / round naming). It has not been live-tested against
  an authenticated Indigo league session that has actually reached the postseason -- if All22 names or
  shapes playoff fields differently than observed here, please share the error and the collector will be
  adapted.
- The site may change its internal modules or response shapes. If collection fails, refresh All22 and
  retry; share the error and we can adapt the collector.
- IndexedDB data is local to this browser profile. It is not yet synced across devices and there is no
  Discord bot/backend in this build.
- "Upset of the Week" and "Power Rankings" use League HQ's own, clearly-labeled formulas built from
  stored results (records entering the week, and win% + point differential respectively). They are not
  official league awards or rankings.

PRIVACY / SAFETY
- No passwords or Discord tokens are requested or stored.
- No franchise writes are performed. The extension only imports module data and fetches replay files.
- The extension requests access only to all22pokemon.com and the public blob storage host used for
  replay assets.


WHAT'S NEW IN 0.5.2 — FRIVOLITIES
- Adds a Frivolities archive page with the Record Room, Rabbit Hole, Time Machine, Laboratory, Funhouse and Surprise Me discovery.
- Reads the existing League HQ IndexedDB stores (schema version 2); it does not create a separate database or clear existing records.
- Player line leaderboards use replay-verified game records. Coverage counts are displayed and explicitly caution that the local archive may not represent complete league history.
- Player labels preserve the collector's nickname (species) display name.
- Random historical game/player and single-game passing, rushing and receiving leaderboards are generated from stored records.
- Comparison tools in the Laboratory are clearly marked as planned rather than displaying invented comparisons.


VERSION 0.6.0 — LEAGUE MEDIA DEPARTMENT
- Adds a unified Media Department alongside the existing Media Center and Frivolities tools.
- Newsroom: builds copy-ready edition recaps, closest-finish and scoring spotlights, plus replay-verified player spotlights from the latest collected season.
- Broadcast Booth: creates a historical matchup dossier with archived team records, head-to-head count, player yardage leaders and copy-ready notes. It explicitly does not claim upcoming schedule data that is not stored.
- Awards Desk: provides statistical watchlists for passing, rushing, receiving and defensive categories. These are not automatic official award decisions.
- Franchise Files: provides team profiles, archived records, stored roster snapshots and game history.
- Record Watch: provides single-game replay-verified leaderboards and career yardage totals within the local archive.
- Graphics Studio: creates downloadable SVG social/broadcast templates with editable headline, subhead, label and accent color.
- League Archives: season summaries and a clearly labeled Hall of Fame research shortlist, not automatic inductions.
- All departments read the existing IndexedDB v2 stores. No new store, migration, data reset, or writes to All22 are introduced.
- Every data-driven department identifies archive coverage and replay verification limitations. Historical completeness depends on what the commissioner has imported.
- The pre-existing Media Center and Frivolities remain available as separate pages.

TESTING NOTE
The source has been integrated on a separate development branch. Browser-based functional testing against a live authenticated All22 franchise has not yet been performed. Review the branch and test with an exported database backup before relying on it for official reporting.

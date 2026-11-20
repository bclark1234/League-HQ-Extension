IFL POWER RANKINGS & PLAYER WATCH — VERSION 1.0.0

A standalone Chrome Manifest V3 extension for the Indigo Football League. It is separate from League HQ and All22++; it does not modify either extension or write to All22.

INSTALL
1. Download and extract this extension folder.
2. Open chrome://extensions.
3. Enable Developer mode.
4. Choose Load unpacked and select this folder.
5. Sign in to All22 and open the active franchise page.
6. Click the IFL Power Rankings extension icon.
7. Click COLLECT FROM ALL22. The extension reads available results, teams, player identities, rosters and replay stats from the active franchise.

POWER RANKINGS MODEL
The weekly ranking is separate from standings and uses these weighted components:
- Win percentage: 30%
- Point differential per game: 25%
- Strength of schedule: 15%
- Recent form (last three completed games): 20%
- Consistency (lower game-to-game point differential volatility): 10%

The point-differential component is scaled to a 0–100 band around -30 to +30 points per game. The consistency score rewards lower standard deviation in game point differential. Rankings recalculate through the selected week. These are transparent editorial power rankings, not official league standings.

MATCHUP PLAYER WATCH
For each completed matchup in the selected week, the extension lists the top five players from each side based on replay-verified production in earlier regular-season games. If no pre-week sample exists, it falls back to all collected verified games and labels that basis. The impact formula weights passing yards, passing touchdowns, interceptions, rushing yards, rushing touchdowns, receiving yards, receiving touchdowns, receptions, tackles, sacks, interceptions and forced fumbles. This gives a position-spanning graphics research shortlist. It is not a player rating or a forecast.

DATA / LIMITATIONS
- Reads All22 franchise data using the same read-only module approach as League HQ.
- Player names preserve nickname and Pokémon species where available.
- Regular-season, playoff and combined ranking scopes are available.
- The initial version's matchup panel uses completed matchups in the selected week. Future schedule-only matchups are not yet guaranteed to appear; if no completed games exist for that week, the app explains the limitation rather than inventing fixtures.
- Player watchlists use verified games before the selected week. If there are not enough verified games, fewer than five players may appear.
- Historical coverage depends on the data exposed by the active All22 franchise and replay service.
- Collected data is stored in chrome.storage.local in this extension. It does not read League HQ's separate IndexedDB database.

PRIVACY
The extension only runs on all22pokemon.com/franchise pages and reads the active franchise data for local calculations. It does not transmit rankings or player lists to an external service.

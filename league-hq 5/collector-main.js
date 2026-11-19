(() => {
  if (window.__leagueHQCollectorInstalled) return;
  window.__leagueHQCollectorInstalled = true;
  const safe = (fn, fallback = null) => { try { const v = fn(); return v == null ? fallback : v; } catch (_) { return fallback; } };
  const plain = (v) => { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return null; } };
  const emit = (payload) => window.postMessage({ source: 'LEAGUE_HQ_MAIN', type: 'RESULT', payload }, location.origin);
  const ROUND_ORDER = { wildcard: 1, divisional: 2, conference: 3, indigo: 4 };
  const shortPlayer = (p, vm, dex) => {
    // Use the same canonical naming helper as All22's own analytics/roster UI.
    // The raw player object commonly separates its nickname from its species identifier.
    const speciesName = safe(() => dex.speciesOf(p.id).name, null) || p.speciesName || p.species || p.pokemon || null;
    const canonical = safe(() => vm.shortName(p), null);
    const nickname = p.nick || (canonical && speciesName && canonical.toLowerCase() !== speciesName.toLowerCase() ? canonical : null);
    const name = speciesName ? (nickname ? `${nickname} (${speciesName})` : speciesName) : ([canonical, p.fullName, p.name, p.nick].find(v => typeof v === 'string' && v.trim() && !/^unknown(?: player)?$/i.test(v.trim())) || 'Unknown player');
    return {
      pid: String(p.pid ?? p.id ?? ''), id: p.id ?? null,
      name: String(name).trim(), displayName: String(name).trim(),
      nick: p.nick || null, species: speciesName || null,
      speciesId: p.id ?? p.speciesId ?? p.species_id ?? null,
      team: p.team || null, pos: p.pos || null, level: p.level ?? null,
      retired: !!p.retired, roles: plain(p.roles || {}), rawName: p.name || null
    };
  };
  // Collection scopes the commissioner can request from the dashboard:
  //   { scope: 'week', week: N }   -> one regular-season week
  //   { scope: 'currentWeek' }     -> the latest available regular-season week
  //   { scope: 'allRegular' }      -> every completed regular-season week
  //   { scope: 'allPlayoffs' }     -> every completed playoff game (all rounds)
  //   { scope: 'everything' }      -> regular season + playoffs together
  const normalizeOptions = (requested) => {
    if (requested == null) return { scope: 'currentWeek' };
    if (typeof requested === 'object') return { scope: requested.scope || 'currentWeek', week: requested.week };
    // backward compatibility with the old week-only message shape
    if (requested === 'all') return { scope: 'allRegular' };
    if (requested === 'current') return { scope: 'currentWeek' };
    return { scope: 'week', week: Number(requested) };
  };
  const read = async (requestedOptions) => {
    const options = normalizeOptions(requestedOptions);
    const origin = location.origin;
    const [vm, state, session, dex] = await Promise.all([
      import(origin + '/franchise-ui/vm.js'),
      import(origin + '/franchise-ui/state.js'),
      import(origin + '/franchise-ui/league/session.js').catch(() => null),
      import(origin + '/franchise/dex.js').catch(() => null)
    ]);
    if (!dex?.speciesOf) throw new Error('Could not load the franchise Pokémon species directory. Please reload All22 and try again.');
    const L = vm.L?.();
    if (!L?.teams || !L?.schedule) throw new Error('The active franchise data is not ready yet. Wait for All22 to finish loading.');
    const solo = state.S?.mode === 'solo';
    const leagueId = solo ? ('solo:' + state.S?.fid) : (session?.LG?.id || null);
    const teamEntries = Object.entries(L.teams);
    const teams = teamEntries.map(([key, t]) => ({ key, name: t.name || key, short: t.short || null, abbr: t.abbr || String(key).slice(0,3).toUpperCase(), town: t.town || null, conf: t.conf || null, colors: plain(t.colors || []), scheme: plain(t.scheme || {}), coach: t.coach || null }));
    const players = Object.values(L.players || {}).map(p => shortPlayer(p, vm, dex)).filter(p => p.pid);

    // Playoff structure, when the franchise has reached the postseason: seeds by conference, each
    // bracket game's round/conference, and the champion once the Indigo Bowl is decided. This is the
    // same data All22's own Bracket tab reads; we never infer seeds or rounds ourselves.
    const playoffsRaw = safe(() => L.playoffs, null);
    const playoffGameMeta = {};
    if (playoffsRaw && Array.isArray(playoffsRaw.games)) {
      for (const g of playoffsRaw.games) if (g?.gid != null) playoffGameMeta[String(g.gid)] = { round: g.round || null, conf: g.conf || null };
    }
    const seedsByTeam = {};
    const playoffSeeds = plain(playoffsRaw?.seeds || {}) || {};
    for (const [conf, arr] of Object.entries(playoffSeeds)) (arr || []).forEach((teamKey, i) => { seedsByTeam[String(teamKey)] = { conf, seed: i + 1 }; });
    const champion = safe(() => playoffsRaw.champion, null) || null;
    const hasPlayoffs = !!(playoffsRaw && Array.isArray(playoffsRaw.games) && playoffsRaw.games.length);

    const allResults = Object.entries(L.results || {}).map(([gid, r]) => {
      if (!r) return null;
      const meta = playoffGameMeta[String(gid)] || null;
      const round = r.round || meta?.round || null;
      const home = r.home, away = r.away;
      return {
        gid: String(gid), week: Number(r.week ?? 0), home, away,
        homeScore: Number(r.hs ?? 0), awayScore: Number(r.as ?? 0),
        round, conf: meta?.conf || null,
        homeSeed: seedsByTeam[String(home)]?.seed ?? null, awaySeed: seedsByTeam[String(away)]?.seed ?? null,
        source: plain(r)
      };
    }).filter(Boolean);

    const regularResults = allResults.filter(g => !g.round);
    const playoffResults = allResults.filter(g => !!g.round);
    const completedWeeks = [...new Set(regularResults.map(g => g.week).filter(Number.isFinite))].sort((a,b)=>a-b);
    const scheduleWeeks = new Set();
    const walk = (v, depth=0) => {
      if (depth > 5 || v == null) return;
      if (Array.isArray(v)) { for (const x of v) walk(x, depth+1); return; }
      if (typeof v !== 'object') return;
      for (const [k,x] of Object.entries(v)) {
        if (/^(week|wk|round|weekNumber)$/i.test(k) && Number.isFinite(Number(x))) scheduleWeeks.add(Number(x));
        if (/^\d+$/.test(k) && Number(k) > 0 && (Array.isArray(x) || (x && typeof x === 'object'))) scheduleWeeks.add(Number(k));
        walk(x, depth+1);
      }
    };
    walk(L.schedule);
    [L.week, L.currentWeek, L.schedule?.week, L.schedule?.currentWeek].forEach(v => { if (Number.isFinite(Number(v)) && Number(v)>0) scheduleWeeks.add(Number(v)); });
    const availableWeeks = [...new Set([...completedWeeks, ...scheduleWeeks])].sort((a,b)=>a-b);
    const latestWeek = Math.max(0, ...availableWeeks, ...completedWeeks);
    const availableRounds = [...new Set(playoffResults.map(g => g.round))].sort((a,b) => (ROUND_ORDER[a]||9) - (ROUND_ORDER[b]||9));

    let games, selectedLabel;
    if (options.scope === 'week') {
      const wk = Number(options.week);
      games = regularResults.filter(g => g.week === wk);
      selectedLabel = `week:${wk}`;
    } else if (options.scope === 'allRegular') {
      games = regularResults.slice();
      selectedLabel = 'allRegular';
    } else if (options.scope === 'allPlayoffs') {
      games = playoffResults.slice();
      selectedLabel = 'allPlayoffs';
    } else if (options.scope === 'everything') {
      games = [...regularResults, ...playoffResults];
      selectedLabel = 'everything';
    } else {
      games = regularResults.filter(g => g.week === latestWeek);
      selectedLabel = 'currentWeek';
    }

    let replayMap = {};
    if (!solo && leagueId) {
      try {
        const response = await fetch('/api/franchise?a=replays&lg=' + encodeURIComponent(leagueId), { credentials: 'same-origin', cache: 'no-store' });
        if (response.ok) { const data = await response.json(); replayMap = data?.games || {}; }
      } catch (_) {}
    }
    const gameStats = [];
    for (const game of games) {
      let box = null, replayStatus = 'missing_replay_data';
      try {
        const replay = replayMap[game.gid];
        if (replay?.url && window.__a22gameStats) {
          box = await window.__a22gameStats({ url: replay.url });
          if (box?.by) replayStatus = 'verified';
        }
      } catch (e) { replayStatus = 'needs_review'; }
      gameStats.push({ ...game, replayStatus, playerStats: box?.by || null, playerDirectory: box?.who || null, plays: box?.plays || null, replayTeams: { home: box?.home || null, away: box?.away || null } });
    }
    const season = safe(() => L.season, null) ?? safe(() => L.year, null) ?? null;
    return {
      schemaVersion: 3, collectedAt: new Date().toISOString(), source: 'all22pokemon.com/franchise', leagueId, leagueName: 'Indigo Football League', solo,
      season, selectedScope: options.scope, selectedWeek: selectedLabel, latestWeek, availableWeeks, availableRounds, hasPlayoffs,
      teamCount: teams.length, playerCount: players.length,
      teams, players, schedule: plain(L.schedule), games: gameStats,
      playoffs: hasPlayoffs ? { seeds: playoffSeeds, champion } : null,
      collectionSummary: {
        completedGames: gameStats.filter(g=>!g.round).length,
        playoffGames: gameStats.filter(g=>!!g.round).length,
        replayVerified: gameStats.filter(g=>g.replayStatus==='verified').length,
        missingReplay: gameStats.filter(g=>g.replayStatus==='missing_replay_data').length,
        needsReview: gameStats.filter(g=>g.replayStatus==='needs_review').length
      }
    };
  };
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'LEAGUE_HQ_EXTENSION' || event.data?.type !== 'COLLECT') return;
    try { emit({ ok: true, data: await read(event.data.options ?? event.data.week) }); }
    catch (e) { emit({ ok: false, error: e?.message || 'Collection failed.' }); }
  });
})();

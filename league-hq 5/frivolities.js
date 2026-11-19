(() => {
  'use strict';
  const DB_NAME = 'indigo-league-hq';
  const DB_VERSION = 2;
  const root = document.getElementById('frivolitiesContent');
  if (!root) return;
  let mode = 'home';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', {keyPath:'gid'});
        if (!db.objectStoreNames.contains('teams')) db.createObjectStore('teams', {keyPath:'key'});
        if (!db.objectStoreNames.contains('players')) db.createObjectStore('players', {keyPath:'pid'});
        if (!db.objectStoreNames.contains('imports')) db.createObjectStore('imports', {keyPath:'id'});
        if (!db.objectStoreNames.contains('seasons')) db.createObjectStore('seasons', {keyPath:'id'});
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function readStore(name) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(name).objectStore(name).getAll();
      req.onsuccess = () => { const value = req.result || []; db.close(); resolve(value); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }
  const verified = g => g?.replayStatus === 'verified' || g?.validationStatus === 'verified';
  function playerName(p, game) {
    const d = game?.playerDirectory?.[p.pid] || {};
    if (p.displayName && p.displayName !== 'Unknown player') return p.displayName;
    if (p.name && p.name !== 'Unknown player') return p.name;
    const species = p.species || d.species || '';
    const nick = p.nick || d.nick || '';
    if (species && nick && species.toLowerCase() !== nick.toLowerCase()) return nick + ' (' + species + ')';
    return nick || species || d.displayName || d.name || p.pid || 'Unknown player';
  }
  const teamName = (key, teams) => teams.find(t => String(t.key) === String(key) || String(t.name) === String(key) || String(t.abbr) === String(key))?.name || String(key ?? 'Unknown team');
  function lines(game) {
    const out = [];
    for (const side of ['home','away']) for (const [pid,line] of Object.entries(game?.playerStats?.[side] || {})) out.push({pid,side,line:line || {}});
    return out;
  }
  function playerIndex(games, players) {
    const map = new Map();
    for (const game of games.filter(verified)) for (const entry of lines(game)) {
      let p = map.get(entry.pid);
      if (!p) { const roster = players.find(x => String(x.pid) === String(entry.pid)) || {pid:entry.pid}; p = {pid:entry.pid,name:playerName(roster,game),regular:new Set(),playoffs:new Set(),seasons:new Set(),best:[]}; map.set(entry.pid,p); }
      (game.round ? p.playoffs : p.regular).add(String(game.gid));
      if (game.season != null) p.seasons.add(String(game.season));
      p.best.push({game,line:entry.line});
    }
    return [...map.values()];
  }
  function table(headers, rows) {
    if (!rows.length) return '<div class="db-empty"><b>No matching records</b>Collect game data with replay-verified player lines to populate this table.</div>';
    return '<div class="db-table-wrap"><table class="db-table"><thead><tr>' + headers.map(x=>'<th>'+esc(x)+'</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }
  function coverage(games) {
    const seasons = new Set(games.map(g=>g.season).filter(x=>x!=null));
    return 'Based on '+seasons.size+' collected season(s), '+games.length+' recorded game(s), and '+games.filter(verified).length+' replay-verified game(s). This may not cover complete league history.';
  }
  function matchup(g,teams) { return teamName(g.away,teams)+' '+n(g.awayScore)+'–'+n(g.homeScore)+' '+teamName(g.home,teams); }
  function category(title,desc,key) { return '<button class="friv-category" data-category="'+esc(key)+'"><span class="eyebrow">EXPLORE</span><strong>'+esc(title)+'</strong><span>'+esc(desc)+'</span></button>'; }
  function home(data) {
    const ix=playerIndex(data.games,data.players);
    return '<section class="friv-hero"><div class="eyebrow">THE INDIGO FOOTBALL LEAGUE ARCHIVE</div><h2>The numbers nobody asked for.<br><em>The stories everybody will remember.</em></h2><p>Explore odd records and replay-verified player lines from the games in your local database.</p><div class="friv-actions"><button class="primary" data-action="surprise">SURPRISE ME →</button><button class="secondary" data-action="random-game">Random historical game</button><button class="secondary" data-action="random-player">Random player</button></div></section><p class="db-note">'+esc(coverage(data.games))+'</p><div class="friv-counts"><div class="db-metric"><b>'+data.teams.length+'</b><span>STORED TEAMS</span></div><div class="db-metric"><b>'+data.players.length+'</b><span>ROSTER RECORDS</span></div><div class="db-metric"><b>'+data.games.length+'</b><span>RECORDED GAMES</span></div><div class="db-metric"><b>'+data.games.filter(verified).length+'</b><span>REPLAY-VERIFIED</span></div><div class="db-metric"><b>'+ix.length+'</b><span>PLAYERS WITH LINES</span></div></div><h3 class="friv-section-title">Explore the archive</h3><div class="friv-categories">'+category('The Record Room','Recorded player lines and one-game stat lines.','records')+category('The Rabbit Hole','Browse unusual player and game records.','rabbit')+category('The Time Machine','Jump into a random recorded game.','time')+category('The Laboratory','Compare records as the archive grows.','laboratory')+category('The Funhouse','Random player and game discovery tools.','funhouse')+category('Surprise Me','Pick an unusual fact from stored data.','surprise')+'</div><div id="frivTool"></div>';
  }
  function records(data) {
    const ix=playerIndex(data.games,data.players);
    const noPlayoffs=ix.filter(p=>p.regular.size && !p.playoffs.size).sort((a,b)=>b.regular.size-a.regular.size).slice(0,50);
    const oneGame=ix.filter(p=>p.regular.size+p.playoffs.size===1).sort((a,b)=>a.name.localeCompare(b.name));
    const pRows=list=>list.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+p.regular.size+'</td><td>'+p.playoffs.size+'</td><td>'+p.seasons.size+'</td></tr>');
    const leaders=key=>ix.flatMap(p=>p.best.map(x=>({p,g:x.game,v:n(x.line[key])}))).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,10).map(x=>'<tr><td>'+esc(x.p.name)+'</td><td>'+x.v+'</td><td>'+esc(x.g.round||('Week '+x.g.week))+'</td><td>'+esc(matchup(x.g,data.teams))+'</td></tr>');
    return '<div class="db-detail"><div class="eyebrow">RECORD ROOM</div><h3>Recorded player lines</h3><p class="db-note">'+esc(coverage(data.games))+'</p><p class="db-note">Counts include only games where a replay stored a player stat line. They do not prove every game a player appeared in. “No playoff lines” does not prove a player never appeared in a playoff game.</p></div><h3>Most regular-season stat lines, no playoff stat line stored</h3>'+table(['PLAYER','REGULAR-SEASON GAMES WITH LINES','PLAYOFF GAMES WITH LINES','SEASONS'],pRows(noPlayoffs))+'<h3 style="margin-top:22px">One-game stat lines</h3>'+table(['PLAYER','REGULAR-SEASON GAMES WITH LINES','PLAYOFF GAMES WITH LINES','SEASONS'],pRows(oneGame))+'<h3 style="margin-top:22px">Single-game passing-yard leaders</h3>'+table(['PLAYER','PASS YARDS','WEEK / ROUND','GAME'],leaders('py'))+'<h3 style="margin-top:22px">Single-game rushing-yard leaders</h3>'+table(['PLAYER','RUSH YARDS','WEEK / ROUND','GAME'],leaders('ry'))+'<h3 style="margin-top:22px">Single-game receiving-yard leaders</h3>'+table(['PLAYER','RECEIVING YARDS','WEEK / ROUND','GAME'],leaders('recy'));
  }
  const pick = a => a.length ? a[Math.floor(Math.random()*a.length)] : null;
  function discovery(data) {
    const candidates=[];
    for(const g of data.games) {
      const margin=Math.abs(n(g.homeScore)-n(g.awayScore)), pts=n(g.homeScore)+n(g.awayScore);
      candidates.push('<div class="db-detail"><div class="eyebrow">HISTORICAL GAME</div><h3>'+esc(matchup(g,data.teams))+'</h3><p>'+esc(g.round||('Week '+g.week))+' · '+esc(g.season??'Season unknown')+'</p><p>Final-score margin: '+margin+' points. Combined points: '+pts+'.</p><p class="db-note">Source: stored game result '+esc(g.gid)+'.</p></div>');
    }
    for(const p of playerIndex(data.games,data.players)) for(const x of p.best) {
      const total=n(x.line.ry)+n(x.line.recy);
      if(n(x.line.py)>0 || total>0) candidates.push('<div class="db-detail"><div class="eyebrow">REPLAY-VERIFIED PLAYER LINE</div><h3>'+esc(p.name)+'</h3><p>'+esc([n(x.line.py)?n(x.line.py)+' pass yds':'',n(x.line.ry)?n(x.line.ry)+' rush yds':'',n(x.line.recy)?n(x.line.recy)+' rec yds':''].filter(Boolean).join(' · '))+'</p><p>'+esc(matchup(x.game,data.teams))+'</p><p class="db-note">Source: replay-verified game '+esc(x.game.gid)+'.</p></div>');
    }
    return candidates.length ? pick(candidates)+'<button class="primary" data-action="surprise">Find another discovery →</button>' : '<div class="db-empty"><b>No discovery available yet</b>Import game results to start exploring the archive.</div>';
  }
  function renderTool(data) {
    const tool=document.getElementById('frivTool'); if(!tool)return;
    if(mode==='records') tool.innerHTML=records(data);
    else if(mode==='surprise') tool.innerHTML=discovery(data);
    else if(mode==='time') { const g=pick(data.games); tool.innerHTML=g?'<h3>Random historical game</h3>'+table(['WEEK / ROUND','MATCHUP','GAME ID'],['<tr><td>'+esc(g.round||('Week '+g.week))+'</td><td>'+esc(matchup(g,data.teams))+'</td><td>'+esc(g.gid)+'</td></tr>']):'<div class="db-empty"><b>No games stored</b>Import game results first.</div>'; }
    else if(mode==='funhouse') { const p=pick(data.players); tool.innerHTML=p?'<div class="db-detail"><div class="eyebrow">RANDOM PLAYER</div><h3>'+esc(playerName(p))+'</h3><p>'+esc(p.pos||'Position not recorded')+' · '+esc(teamName(p.team,data.teams))+'</p><button class="secondary" data-action="random-player">Pick another player</button></div>':'<div class="db-empty"><b>No player records</b>Collect franchise data first.</div>'; }
    else if(mode==='rabbit') tool.innerHTML='<div class="db-detail"><div class="eyebrow">THE RABBIT HOLE</div><h3>Start with an oddity</h3><p>Explore one-game stat lines and single-game leaders in the Record Room.</p><button class="secondary" data-category="records">Open the Record Room</button></div>';
    else if(mode==='laboratory') tool.innerHTML='<div class="db-empty"><b>Comparison tools are planned for a later milestone</b>The current archive supports game and replay-derived player records. Historical roster snapshots and transaction data are not available yet.</div>';
    else tool.innerHTML='';
  }
  async function renderFrivolities() {
    root.innerHTML='<div class="db-empty"><b>Opening the league archive…</b></div>';
    try {
      const [games,teams,players]=await Promise.all([readStore('games'),readStore('teams'),readStore('players')]);
      root.innerHTML=home({games,teams,players});
      renderTool({games,teams,players});
    } catch(error) {
      root.innerHTML='<div class="db-empty"><b>Could not load Frivolities</b>'+esc(error?.message||'IndexedDB could not be read.')+'</div>';
    }
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-action],[data-category]');
    if(!button)return;
    if(button.dataset.category) mode=button.dataset.category;
    else if(button.dataset.action==='surprise') mode='surprise';
    else if(button.dataset.action==='random-game') mode='time';
    else if(button.dataset.action==='random-player') mode='funhouse';
    renderFrivolities();
  });
  window.renderFrivolities=renderFrivolities;
  window.frivolitiesMode='home';
})();
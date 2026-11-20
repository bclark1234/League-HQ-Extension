// Reads a finished league game's replay file and returns each player's line: window.__a22gameStats({ url }) -> { by: {home:{pid:{...}},away:{...}}, who } | null
(() => {
  if (window.__a22gameStats) return;
  window.__a22gameStats = async ({ url, bytes }) => {
    const o = location.origin;
    if (!url && !bytes) return null;
    const [R, P] = await Promise.all([import(o + "/franchise/replay.js"), import(o + "/allpro/net/proto.js")]);
    let raw;
    if (bytes) raw = new Uint8Array(bytes);
    else {
      const r = await fetch(url, { credentials: "omit" });
      if (!r.ok) throw new Error("replay " + r.status);
      raw = new Uint8Array(await r.arrayBuffer());
    }
    if (raw[0] === 0x1f && raw[1] === 0x8b) raw = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    const { header, frames } = R.readReplay(raw);
    const D = new P.DictIn(); let st = null, sq = null;
    const SO = P.SLOT_ORDER, idx = (r) => (r && r.$p != null ? r.$p : null);
    const sideOf = (i) => (i == null ? null : i >= 32 ? "away" : "home");
    const pidAt = (i) => { if (i == null) return null; const sd = sideOf(i); const arr = sq && sq[sd]; if (arr && arr[i & 31] != null) return String(arr[i & 31]); const pl = header[sd] && header[sd].players && header[sd].players[SO[i & 31]]; return pl ? String(pl.pid) : null; };
    const ref = (r) => { const i = idx(r); return i == null ? null : { pid: pidAt(i), side: sideOf(i), slot: SO[i & 31] }; };
    // ---- plays: one record per scrimmage down, built from the event stream (playCall … whistle) ----
    const plays = [], kicks = []; let cur = null, poss = "home", extra = [];
    const kPid = (side) => { const k = SO.indexOf("K"); return k < 0 ? null : pidAt(k + (side === "away" ? 32 : 0)); };
    const close = () => { if (cur) { cur.ev = undefined; plays.push(cur); } cur = null; };
    const newPlay = (tick, x) => ({ n: plays.length + 1, tick, off: poss, offPlay: null, defPlay: null, blocks: [], pan: [], shed: [], broken: [], tack: [], swat: [], extra: [], ...x });
    for (const f of frames) {
      const s = P.decodeSnap(f, D); if (!s || !s.tail) continue;
      if (s.tail.st) st = s.tail.st;
      if (s.tail.sq) sq = s.tail.sq;
      for (const [tick, type, d] of s.tail.e || []) {
        if (type === "possession") { poss = d.team; continue; }
        if (type === "fieldGoal") kicks.push({ kind: "fg", side: d.team, good: Boolean(d.good), dist: d.distance, blocked: Boolean(d.blocked), kicker: kPid(d.team) });
        else if (type === "patResult") kicks.push({ kind: "pat", side: d.team, good: Boolean(d.good), blocked: Boolean(d.blocked), kicker: kPid(d.team) });
        if (type === "playCall") { close(); cur = newPlay(tick, { down: d.down, toGo: d.toGo, los: d.los, two: Boolean(d.two) }); continue; }
        // a computer team's punt or field goal on 4th down (or its last-second kick) is set up without a play call: it gets a play of
        // its own (it used to fall into the down before it, already over, so no punt was ever counted and three-and-outs read 0%)
        if (((type === "punt" && d.setup) || (type === "kick" && d.kind === "fg")) && (!cur || cur.whistled)) {
          const prev = cur || plays[plays.length - 1] || null, pe = prev && prev.end, same = prev && prev.off === poss && !prev.turnover && !prev.int;
          close();
          cur = newPlay(tick, { kind: type === "punt" ? "punt" : "fg", auto: true, down: same && !prev.first ? Math.min(4, (prev.down || 3) + 1) : null, toGo: null, los: same && pe && pe.x != null ? pe.x : null });
          if (type === "kick") cur.kickSide = sideOf(idx(d.player));
          continue;
        }
        if (!cur) continue;
        if (cur.whistled) { // after the whistle only the scoring / turnover bookkeeping belongs to the play; the next phase change (the kick-off, the try) is not
          if (type === "phase" && d.phase !== "dead") cur.frozen = true;
          // (a field goal's result comes just after its whistle, at the same moment: the try's make or miss belongs to it)
          if (cur.frozen || !["scoreChange", "touchdown", "safety", "firstDown", "turnover", "fumble", "recover", "fieldGoal"].includes(type)) continue;
        }
        if (type === "snap") cur.snap = tick;
        else if (type === "presnap") { cur.offPlay = d.off && d.off.$pl; cur.defPlay = d.def && d.def.$pl; cur.flip = Boolean(d.off && d.off.f); }
        else if (type === "block") cur.blocks.push([ref(d.blocker), ref(d.defender), tick]);
        else if (type === "pancake") cur.pan.push([ref(d.blocker), ref(d.defender), tick]);
        else if (type === "shed") cur.shed.push([ref(d.blocker), ref(d.defender), tick]);
        else if (type === "handoff") { cur.kind = "run"; cur.carrier = cur.carrier || ref(d.player); cur.handoff = ref(d.player); }
        else if (type === "throw") { cur.kind = "pass"; cur.qb = ref(d.qb); cur.target = ref(d.target); cur.away = Boolean(d.away); cur.dist = d.dist; }
        else if (type === "catch" && !d.kick) cur.catch = ref(d.player);
        else if (type === "drop") cur.drop = ref(d.player);
        else if (type === "swat") cur.swat.push(ref(d.player));
        else if (type === "incomplete") { cur.incomplete = true; if (d.overthrow) cur.overthrow = true; if (d.drop) cur.dropped = true; }
        else if (type === "interception") { cur.int = ref(d.player); cur.turnover = "int"; }
        else if (type === "sack") { cur.kind = "sack"; cur.sackBy = ref(d.tackler); cur.qb = cur.qb || ref(d.qb); }
        else if (type === "brokenTackle") cur.broken.push(ref(d.tackler));
        else if (type === "tackle") cur.tack.push(ref(d.tackler));
        else if (type === "fumble") cur.fumble = ref(d.player);
        else if (type === "recover") cur.recover = ref(d.player);
        else if (type === "turnover") cur.turnover = d.kind;
        else if (type === "firstDown") cur.first = true;
        else if (type === "touchdown") { cur.td = d.team; cur.tdBy = ref(d.scorer); cur.defTd = Boolean(d.defensive); }
        else if (type === "fieldGoal") { cur.kind = "fg"; cur.fg = { good: d.good, dist: d.distance, blocked: d.blocked }; }
        else if (type === "fieldGoalSetup") cur.kind = "fg";
        else if (type === "punt" && d.player) { cur.kind = "punt"; cur.kickSide = sideOf(idx(d.player)); }
        else if (type === "patResult" || type === "pat") cur.kind = cur.kind || "pat";
        else if (type === "scoreChange") cur.score = { team: d.team, pts: d.pts, kind: d.kind };
        else if (type === "safety") cur.safety = d.team;
        else if (type === "whistle") { const r = d.result || {}; cur.end = { type: r.type, x: r.x, sack: r.sack, kneel: r.kneel, fumble: r.fumble, lost: r.lost, retYds: r.retYds, stop: r.stop, tackler: ref(r.tackler), carrier: ref(r.carrier) }; cur.carrier = cur.carrier || cur.end.carrier; cur.whistled = true; if (r.type === "fg") { cur.kind = "fg"; cur.fg = cur.fg || { good: Boolean(r.good), dist: r.kick && r.kick.dist, blocked: Boolean(r.blocked) }; } }
      }
    }
    close();
    if (!st || !st.by) return null;
    // a kneel is not a play at all: the whistle says so, or it is the QB going down behind the line with nothing called
    const isKneel = (p) => Boolean(/^kneel/i.test(String(p.offPlay || "")) || (p.end && p.end.kneel) || (p.kind === "run" && !p.offPlay && !p.defPlay && p.end && p.end.x != null && p.los - p.end.x >= 0 && p.los - p.end.x <= 2 && !p.handoff && !p.td && !(p.blocks && p.blocks.length)));
    // offense side: whoever blocked on the play (a blocker is always the offense); the possession event otherwise
    // (a punt or a field goal: the kicking team, whoever blocked on the return)
    for (const p of plays) { const b = p.blocks.concat(p.pan, p.shed).find((x) => x[0] && x[0].side); if (p.kickSide) p.off = p.kickSide; else if (b) p.off = b[0].side; else if (p.qb) p.off = p.qb.side; p.def = p.off === "home" ? "away" : "home"; }
    const KEEP = ["pa", "pc", "py", "ptd", "pint", "ra", "ry", "rtd", "rec", "recy", "rectd", "tkl", "int", "pd", "sck", "sk", "sky", "lr", "tgt", "lc", "td", "fum", "fuml", "stt", "blk", "hs", "ret", "rety", "fgm", "fga", "lfg", "xpm", "xpa", "kick", "pu", "puy", "p20", "so", "sd", "sst", "two", "hsk", "tfl", "prs", "itd", "krt", "prt", "ftd"];
    const by = {};
    for (const side of ["home", "away"]) {
      by[side] = {};
      for (const [pid, l] of Object.entries(st.by[side] || {})) {
        const x = {}; let any = false;
        for (const k of KEEP) if (l[k]) { x[k] = l[k]; any = true; }
        if (any) by[side][pid] = x;
      }
    }
    const who = {};
    for (const side of ["home", "away"]) for (const p of Object.values((header[side] && header[side].players) || {})) who[p.pid] = { id: p.id, name: p.name, num: p.num, pos: p.slot };
    const sch = (x) => { try { return x && x.scheme != null ? JSON.parse(JSON.stringify(x.scheme)) : null; } catch (_) { return null; } };
    return { by, who, plays: plays.filter((p) => (p.whistled || p.kind === "fg" || p.fg) && !isKneel(p)), kicks, home: header.home && header.home.abbr, away: header.away && header.away.abbr, schemes: { home: sch(header.home), away: sch(header.away) } };
  };
})();

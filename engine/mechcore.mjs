// MECHCORE — simulation de combat déterministe, partagée par les coquilles.
// Aucune donnée de ligue, de campagne ou de loot. Les systèmes ajoutés après v0.6
// (affinités, saut, eau, hauteur, inertie, corps) restent inertes sans leur clé de pack.
export class SplitMix64 {
  constructor(seed){ this.state = BigInt(seed) & 0xffffffffffffffffn; }
  next(){ this.state = (this.state + 0x9E3779B97f4A7C15n) & 0xffffffffffffffffn; let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & 0xffffffffffffffffn;
    return z ^ (z >> 31n); }
  unit(){ return Number(this.next() >> 11n) / Number(1n << 53n); }
  chance(p){ if (p <= 0) return false; if (p >= 1) return true; return this.unit() < p; }
  range(a, b){ return a + this.unit() * (b - a); }
}

export class CombatSim {
  constructor(ruleset, config, seed){
    this.ruleset = JSON.parse(JSON.stringify(ruleset));
    this.config = JSON.parse(JSON.stringify(config));
    this.seed = seed >>> 0; this.rng = new SplitMix64(this.seed);
    this.tickRate = ruleset.simulation.tick_hz; this.dt = 1 / this.tickRate;
    this.timeoutTicks = ruleset.simulation.battle_timeout_seconds * this.tickRate;
    this.arena = (ruleset.arenas && (config.arenaId ? ruleset.arenas[config.arenaId] : ruleset.arenas.proving_grounds)) || ruleset.arena; this.obstacles = this.arena.obstacles.map(o => ({ ...o })); // clone : les épaves ramassables sont retirées pendant la bataille
    this.water = ((this.arena && this.arena.water) || []).map(w => ({ ...w })); // v1.2.0 (D-037) : zones d'eau — ralentissement, pas de blocage
    this.platforms = this.obstacles.filter(o => o.climb && o.zh > 0); // v1.3.0 (D-038) : plateformes escaladables — liste vide = comportement v1.2.0 bit-à-bit
    this.mechs = config.mechs.map((m, i) => this.makeMech(m, this.slotOf(config.mechs, i)));
    if (this.worldCfg()) this.armStructures();
    if (this.frontCfg()) this.openLine();
    this.projectiles = []; this.events = []; this.tick = 0; this.winner = null; this.ended = false;
    this.smokes = []; // D-025 : nuages de fumigène actifs (bloquent la LOS, pas le déplacement)
    this.log('battle_started', null, { seed: this.seed });
  }
  // D-027 : index du mech dans son équipe (pour la formation au point de largage / couloir)
  slotOf(mechs, i){ let s = 0; for (let j = 0; j < i; j++) if (mechs[j].team === mechs[i].team) s++; return s; }
  // D-027 : spawn dérivé — chaque côté de l'arène a un point de largage ou un couloir d'entrée ;
  // sans `spawn` explicite dans le config, le mech entre par le côté de son équipe (côte à côte, écart `spread` = 4 m)
  deriveSpawn(cfg, slotIdx){
    const ss = this.arena.spawn_sides && this.arena.spawn_sides[cfg.side || (cfg.team === 0 ? 'alpha' : 'omega')];
    if (!ss) throw new Error('SPAWN DÉRIVÉ IMPOSSIBLE : pas de spawn_sides pour cette arène');
    const lat = [0, -1, 1, -2][slotIdx] * (ss.spread || 4);
    return { x: ss.x + lat * Math.sin(ss.dir || 0), z: ss.z - lat * Math.cos(ss.dir || 0) };
  }
  makeMech(cfg, slotIdx = 0){ const r = this.ruleset;
    const spawn = cfg.spawn || this.deriveSpawn(cfg, slotIdx);
    const sideSS = !cfg.spawn && this.arena.spawn_sides && this.arena.spawn_sides[cfg.side || (cfg.team === 0 ? 'alpha' : 'omega')];
    return { ...r.mechs[cfg.mechId], mechId: cfg.mechId, team: cfg.team, name: cfg.name,
      weapon: r.weapons[cfg.weaponId], weaponId: cfg.weaponId, processorId: cfg.processorId, proc: r.processors[cfg.processorId],
      weapons: [r.weapons[cfg.weaponId], r.weapons[cfg.secondaryWeaponId || this.unarmedId()]], secondaryWeaponId: cfg.secondaryWeaponId || this.unarmedId(),
      meleeReach: Math.max(0, ...[r.weapons[cfg.weaponId], r.weapons[cfg.secondaryWeaponId || this.unarmedId()]].filter(w => w.type === 'melee').map(w => w.range)),
      pos: { x: spawn.x, z: spawn.z }, heading: sideSS ? sideSS.dir : (cfg.team === 0 ? 0 : Math.PI), targetIdx: null,
      affinity: cfg.affinity || null, // v1.1.0 : liaisons d'escouade (bloc/origine) — neutre si absent
      hpNow: r.mechs[cfg.mechId].hp, shieldMax: r.mechs[cfg.mechId].shield, shieldNow: r.mechs[cfg.mechId].shield,
      heat: 0, cooldown: 0, cooldown2: 0, meleeState: null, pinned: false, stunTicks: 0, staggeredTicks: 0, staggerImmunityTicks: 0,
      damageDealt: 0, damageTaken: 0, shotsFired: 0, shotsHit: 0, crits: 0, dodges: 0, ticksMoved: 0, ticksStationary: 0,
      improvShield: 0, improvLabel: null, detourTicks: 0, // v0.14.1 (D-041) : budget de détour par épave
      smokeUsed: false, loggedDead: false,
      baseSpeedMps: r.mechs[cfg.mechId].speed_mps, droppedOnce: false, prevWeaponId: null,
      jumpT: 0, jumpCd: 0, // v1.2.0 (D-037) : saut — ticks restants en vol / recharge ; inactif sans combat.jump
      z: 0, zTgt: 0, zRender: 0, climbT: 0, climbTotal: 1, climbCd: 0, wantClimb: null, climbPlat: null, perchSlack: 0, // v1.3.0 (D-038) : élévation
      vx: 0, vz: 0, // v1.4.0 (D-039) : vélocité réelle du châssis (inertie) — inactive sans combat.motion
      r: (r.mechs[cfg.mechId].radius_m || 1.2), // v1.5.0 (D-040) : envergure du châssis (rayon physique)
      vel: { x: 0, z: 0 }, lastHitTick: -999, passiveActive: false,
      order: cfg.order || ((r.processors[cfg.processorId] && r.processors[cfg.processorId].squad === 'dogpile') ? 'push' : 'hold'),
      focusSlot: cfg.focusSlot != null ? cfg.focusSlot : null,
      pilotLv: cfg.pilotLv || 0,
      knockT: 0, knockVx: 0, knockVz: 0, knockBy: -1, knockImmune: 0,
      breachT: 0, breachCd: 0, threadCd: 0, reglage: 0, planted: false, fixedSpawn: !!cfg.spawn,
      prevPos: { x: spawn.x, z: spawn.z } };
  }
  log(type, mech, data){ this.events.push({ tick: this.tick, type, mech, ...(data || {}) }); }
  unarmedId(){ return this.ruleset.combat.unarmed_weapon_id || 'fists'; }
  otherIdx(i){ return this.mechs.findIndex(m => m.team !== this.mechs[i].team); } // 1v1 rétrocompat
  enemiesOf(i){ const out = []; for (let j = 0; j < this.mechs.length; j++) if (j !== i && this.mechs[j].team !== this.mechs[i].team && this.mechs[j].hpNow > 0) out.push(j); return out; }
  alliesOf(i){ const out = []; for (let j = 0; j < this.mechs.length; j++) if (j !== i && this.mechs[j].team === this.mechs[i].team && this.mechs[j].hpNow > 0) out.push(j); return out; }
  squadCfg(){ return (this.ruleset.combat.squad && this.ruleset.combat.squad.enabled) ? this.ruleset.combat.squad : null; }
  // Rôle d'escouade. null = on laisse le ciblage perso. Inerte sans combat.squad.
  squadTarget(i){
    const m = this.mechs[i], role = m.proc.squad;
    if (!role) return null;
    const es = this.enemiesOf(i);
    if (!es.length) return null;
    const mates = this.alliesOf(i);
    if (role === 'focus'){
      let best = null, bv = Infinity, seen = null, sv = Infinity;
      for (const j of es){
        let aimed = false;
        for (const a of mates) if (this.mechs[a].targetIdx === j) aimed = true;
        if (!aimed) continue;
        const v = this.mechs[j].hpNow + this.mechs[j].shieldNow;
        const d = this.distance(m.pos, this.mechs[j].pos);
        const see = d <= (m.weapon.range || 99) && d >= (m.weapon.min_range || 0) && this.losClear(m.pos, this.mechs[j].pos);
        if (see && v < sv){ sv = v; seen = j; }
        if (v < bv){ bv = v; best = j; }
      }
      const pick = seen !== null ? seen : best;
      if (pick !== null && pick !== m.targetIdx) this.log('squad_focus', i, { target: pick });
      return pick;
    }
    if (role === 'peel'){
      if (!mates.length) return null;
      let frag = mates[0], fv = Infinity;
      for (const a of mates){ const mm = this.mechs[a]; const v = (mm.hpNow + mm.shieldNow) / (mm.hp || 1); if (v < fv){ fv = v; frag = a; } }
      let pick = es[0], bd = Infinity;
      for (const j of es){ const dd = this.distance(this.mechs[j].pos, this.mechs[frag].pos); if (dd < bd){ bd = dd; pick = j; } }
      if (m.guardIdx !== frag){ m.guardIdx = frag; this.log('squad_cover', i, { target: frag }); }
      return pick;
    }
    if (role === 'flank'){
      const counts = {};
      for (const a of mates){ const t = this.mechs[a].targetIdx; if (t != null) counts[t] = (counts[t] || 0) + 1; }
      let best = null, bv = Infinity, free = false;
      for (const j of es){
        if ((counts[j] || 0) >= 2) continue;
        free = true;
        const v = this.mechs[j].hpNow + this.mechs[j].shieldNow;
        if (v < bv){ bv = v; best = j; }
      }
      if (free && best !== null && best !== m.targetIdx) this.log('squad_flank', i, { target: best });
      return free ? best : null;
    }
    if (role === 'dogpile'){
      let best = null, bd = Infinity;
      for (const j of es){
        const hunter = this.mechs[j].targetIdx;
        const huntingUs = hunter != null && this.mechs[hunter] && this.mechs[hunter].team === m.team && this.mechs[hunter].hpNow > 0;
        let piled = false;
        for (const a of mates){ if (this.distance(this.mechs[a].pos, this.mechs[j].pos) <= (this.mechs[a].meleeReach || 3) + 2.5) piled = true; }
        if (!huntingUs && !piled) continue;
        const dd = this.distance(m.pos, this.mechs[j].pos);
        if (dd < bd){ bd = dd; best = j; }
      }
      if (best !== null && best !== m.targetIdx) this.log('squad_dogpile', i, { target: best });
      return best;
    }
    return null;
  }
  // v1.1.0 (D-035) : affinités d'escouade — chaque coéquipier VIVANT partageant l'origine (ou le bloc) d'un mech
  // lui confère un bonus de visée. Générique et neutre : sans cfg.affinity, retourne 0 → 1v1 bit-identique à v1.0.0.
  affLinks(i){ const m = this.mechs[i]; let b = 0;
    if (!m.affinity || !m.affinity.bloc) return 0;
    for (const o of this.mechs){
      if (o === m || o.team !== m.team || o.hpNow <= 0 || !o.affinity || !o.affinity.bloc) continue;
      if (o.affinity.origin && o.affinity.origin === m.affinity.origin) b += (m.affinity.accSameOrigin || 0);
      else if (o.affinity.bloc === m.affinity.bloc) b += (m.affinity.accSameBloc || 0);
    }
    return b; }
  // D-024 : sélection de cible — profil par processeur (data-driven), sticky (focus-fire), déterministe
  enemySlot(team, slot){ let s = 0;
    for (let j = 0; j < this.mechs.length; j++){ if (this.mechs[j].team === team) continue; if (s === slot) return j; s++; }
    return null; }
  targetOf(i){ const m = this.mechs[i]; const es = this.enemiesOf(i);
    if (es.length === 0) return null;
    if (m.order === 'focus' && m.focusSlot != null){
      const j = this.enemySlot(m.team, m.focusSlot);
      if (j != null && this.mechs[j].hpNow > 0) return j;
    }
    if (this.squadCfg() && m.proc.squad && (m.targetIdx === null || this.tick % 30 === (i % 30))){
      const s = this.squadTarget(i);
      if (s !== null) return s;
    }
    const cur = m.targetIdx;
    if (cur !== null && this.mechs[cur] && this.mechs[cur].hpNow > 0 && this.mechs[cur].team !== m.team){
      // stickiness : on garde sa cible sauf 'threat' (guardian) qui re-cible sous hystérésis ×1,25
      if (m.proc.targeting === 'threat' && this.tick % 30 === 0){
        let best = cur, bd = this.mechs[cur].damageDealt;
        for (const j of es){ if (this.mechs[j].damageDealt > bd * 1.25){ bd = this.mechs[j].damageDealt; best = j; } }
        if (best !== cur) return best;
      }
      return cur;
    }
    const dist = j => this.distance(m.pos, this.mechs[j].pos);
    if (es.length === 1) return es[0];
    let pick = es[0];
    if (m.proc.targeting === 'weakest'){ let bv = Infinity;
      for (const j of es){ const v = this.mechs[j].hpNow + this.mechs[j].shieldNow; if (v < bv - 1e-9){ bv = v; pick = j; } } }
    else if (m.proc.targeting === 'protector'){ // D-024 « peel » : cibler l'ennemi le plus proche du coéquipier le plus fragilisé
      const mates = this.mechs.map((mm, j) => ({ mm, j })).filter(o => o.j !== i && o.mm.team === m.team && o.mm.hpNow > 0);
      if (mates.length){ let frag = mates[0], fv = Infinity;
        for (const o of mates){ const v = (o.mm.hpNow + o.mm.shieldNow) / o.mm.hp; if (v < fv - 1e-9){ fv = v; frag = o; } }
        let bd = Infinity;
        for (const j of es){ const dd = this.distance(this.mechs[j].pos, frag.mm.pos); if (dd < bd){ bd = dd; pick = j; } } }
      else { let bd = Infinity; for (const j of es){ if (dist(j) < bd){ bd = dist(j); pick = j; } } } }
    else if (m.proc.targeting === 'threat'){ let bv = -1;
      for (const j of es){ const v = this.mechs[j].damageDealt; if (v > bv + 1e-9){ bv = v; pick = j; } }
      if (bv <= 0){ let bd = Infinity; for (const j of es){ if (dist(j) < bd){ bd = dist(j); pick = j; } } } }
    else { let bd = Infinity; // 'closest'
      for (const j of es){ if (dist(j) < bd){ bd = dist(j); pick = j; } } }
    return pick; }
  // D-025 : fumigène — segment bloqué s'il croise un nuage actif (symétrique : dedans = aveugle aussi)
  segBlockedBySmoke(a, b){ for (const s of this.smokes){
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
      let t = l2 > 0 ? ((s.x - a.x) * dx + (s.z - a.z) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t - s.x, pz = a.z + dz * t - s.z;
      if (px * px + pz * pz <= s.r * s.r) return true; } return false; }
  distance(a, b){ const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
  losClear(a, b){ if (this.segBlockedBySmoke(a, b)) return false;
    if (this.platforms.length){ const lh = (this.ruleset.combat.climb && this.ruleset.combat.climb.los_height) || 2; // v1.3.0 (D-038) : un point surélevé voit par-dessus les obstacles du sol
      if ((a.zEl || 0) >= lh || (b.zEl || 0) >= lh) return true; }
    for (const o of this.obstacles){ if (!o.blocks_los) continue;
      const x1 = o.x - o.w / 2, x2 = o.x + o.w / 2, z1 = o.z - o.h / 2, z2 = o.z + o.h / 2;
      if (segRect(a, b, x1, z1, x2, z2)) return false; } return true; }
  blockedAt(x, z, r){ const rr = (r != null) ? r : 1.0; for (const o of this.obstacles){ if (o.rubble) continue; const ro = ((o.climb && o.zh > 0) ? Math.min(rr, 1.0) : rr); // v1.5.0 (D-040) : marge = envergure ; v0.14.1 (D-041) : une plateforme escaladable se laisse approcher au bord (marge 1.0), sinon un gros châssis ne peut plus grimper
      if (Math.abs(x - o.x) < o.w / 2 + ro && Math.abs(z - o.z) < o.h / 2 + ro) return true; } return false; }
  bodyBlocked(m, x, z){ // v1.5.0 (D-040) : un châssis n'entre pas dans un autre châssis (contact bord-à-bord autorisé) — inactive sans combat.bodies
    if (!this.bodiesCfg()) return false;
    for (const o of this.mechs){
      if (o === m || o.hpNow <= 0 || (o.z || 0) !== (m.z || 0)) continue; // pas d'interaction entre niveaux (D-038)
      const need = (m.r || 1.2) + (o.r || 1.2) - 0.25;
      const ddx = x - o.pos.x, ddz = z - o.pos.z;
      if (ddx * ddx + ddz * ddz < need * need) return true; }
    return false; }
  waterAt(x, z){ for (const w of this.water){ if (Math.abs(x - w.x) < w.w / 2 && Math.abs(z - w.z) < (w.d || w.w) / 2) return true; } return false; } // v1.2.0 (D-037)
  platformAt(x, z){ for (const o of this.platforms){ if (Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.h / 2) return o; } return null; } // v1.3.0 (D-038)
  edgeDist(o, x, z){ const dx = Math.max(Math.abs(x - o.x) - o.w / 2, 0), dz = Math.max(Math.abs(z - o.z) - o.h / 2, 0); return Math.hypot(dx, dz); } // v1.3.0 (D-038) : distance au bord de l'empreinte
  pushOutOfFootprint(m){ const pm = this.bodiesCfg() ? (m.r || 1.2) : undefined; const mr = (pm != null) ? pm : 1.0; // v1.5.0 (D-040) : sortie à l'envergure du châssis (défaut 1.0 = comportement v1.3.0)
    const mg = o => ((o.climb && o.zh > 0) ? Math.min(mr, 1.0) : mr); // v0.14.1 (D-041) : une plateforme se laisse approcher au bord
    for (let k = 0; k < 8 && this.blockedAt(m.pos.x, m.pos.z, pm); k++){ // v1.3.0 (D-038) : sortie déterministe de l'empreinte (après une descente)
      const o = this.obstacles.find(o => Math.abs(m.pos.x - o.x) < o.w / 2 + mg(o) && Math.abs(m.pos.z - o.z) < o.h / 2 + mg(o));
      if (!o) break;
      const dx = m.pos.x - o.x, dz = m.pos.z - o.z;
      if (dx / (o.w / 2) > dz / (o.h / 2)) m.pos.x = o.x + Math.sign(dx || 1) * (o.w / 2 + mg(o) + 0.2); else m.pos.z = o.z + Math.sign(dz || 1) * (o.h / 2 + mg(o) + 0.2); }
    const W = this.arena.width / 2, D = this.arena.depth / 2;
    m.pos.x = Math.max(-W + 1, Math.min(W - 1, m.pos.x)); m.pos.z = Math.max(-D + 1, Math.min(D - 1, m.pos.z)); }
  motionCfg(){ return (this.ruleset.combat.motion && this.ruleset.combat.motion.enabled) ? this.ruleset.combat.motion : null; } // v1.4.0 (D-039)
  bodiesCfg(){ return (this.ruleset.combat.bodies && this.ruleset.combat.bodies.enabled) ? this.ruleset.combat.bodies : null; } // v1.5.0 (D-040) : corps & envergure
  ballisticsCfg(){ return (this.ruleset.combat.ballistics && this.ruleset.combat.ballistics.enabled) ? this.ruleset.combat.ballistics : null; } // tirs alliés + éclats — inerte sans la clé
  worldCfg(){ return (this.ruleset.combat.world && this.ruleset.combat.world.enabled) ? this.ruleset.combat.world : null; }
  ordnanceCfg(){ return (this.ruleset.combat.ordnance && this.ruleset.combat.ordnance.enabled) ? this.ruleset.combat.ordnance : null; }
  frontCfg(){ return (this.ruleset.combat.front && this.ruleset.combat.front.enabled) ? this.ruleset.combat.front : null; }
  tradeCfg(){ return (this.ruleset.combat.trade && this.ruleset.combat.trade.enabled) ? this.ruleset.combat.trade : null; }
  separateBodies(){ // v1.5.0 (D-040) : résolution corps-corps — poussée minimale, ordre fixe, zéro RNG ; inactive sans combat.bodies
    const W = this.arena.width / 2, D = this.arena.depth / 2;
    const cl = (v, lim) => Math.max(-lim + 1, Math.min(lim - 1, v));
    const moved = new Set();
    for (let it = 0; it < 3; it++){ // quelques passes : résout les chaînes de corps pressés les uns contre les autres
      let any = false;
      for (let i = 0; i < this.mechs.length; i++){ const a = this.mechs[i];
        if (a.hpNow <= 0) continue;
        for (let j = i + 1; j < this.mechs.length; j++){ const b = this.mechs[j];
          if (b.hpNow <= 0 || (a.z || 0) !== (b.z || 0)) continue; // pas d'interaction entre niveaux (D-038)
          const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dd = Math.hypot(dx, dz);
          const ov = (a.r || 1.2) + (b.r || 1.2) - dd;
          if (ov <= 1e-6) continue;
          any = true;
          const ux = dd > 1e-6 ? dx / dd : 1, uz = dd > 1e-6 ? dz / dd : 0;
          let pa = ov / 2, pb = ov / 2, aAny = false, bAny = false;
          const aBad = this.blockedAt(a.pos.x, a.pos.z, a.r), bBad = this.blockedAt(b.pos.x, b.pos.z, b.r); // déjà dans la marge d'un obstacle ?
          const ax = cl(a.pos.x - ux * pa, W), az = cl(a.pos.z - uz * pa, D);
          if (this.blockedAt(ax, az, a.r)){ if (aBad) aAny = true; else { pa = 0; pb = ov; } } // a coincé ET position légale : b encaisse tout ; déjà en marge : on pousse quand même (le collage corps-corps est pire)
          const bx = cl(b.pos.x + ux * pb, W), bz = cl(b.pos.z + uz * pb, D);
          if (pb > 0 && this.blockedAt(bx, bz, b.r)){ if (bBad) bAny = true; else { if (pa === 0) continue; pb = 0; pa = ov; } }
          if (pa > 0){ const ax2 = cl(a.pos.x - ux * pa, W), az2 = cl(a.pos.z - uz * pa, D);
            if (aAny || !this.blockedAt(ax2, az2, a.r)){ a.pos.x = ax2; a.pos.z = az2; moved.add(a); } }
          if (pb > 0){ const bx2 = cl(b.pos.x + ux * pb, W), bz2 = cl(b.pos.z + uz * pb, D);
            if (bAny || !this.blockedAt(bx2, bz2, b.r)){ b.pos.x = bx2; b.pos.z = bz2; moved.add(b); } } } }
      if (!any) break; }
    for (const m of moved){ m.vel = { x: (m.pos.x - m.prevPos.x) / this.dt, z: (m.pos.z - m.prevPos.z) / this.dt }; // l'élan réalisé intègre la poussée
      if (this.motionCfg()){ m.vx = m.vel.x; m.vz = m.vel.z; } } }
  heightBonus(i, j){ if (!this.platforms.length) return 0; const c = this.ruleset.combat.climb; // v1.3.0 (D-038) : avantage de hauteur pour le tireur surélevé
    const dh = (this.mechs[i].z || 0) - (this.mechs[j].z || 0);
    return (c && dh >= (c.aim_height || 2)) ? (c.aim_bonus || 0) : 0; }

  // --- passifs ---
  checkPassive(i){ const m = this.mechs[i];
    if (!m.passive || m.passiveActive) return;
    if (m.passive.id === 'bulwark_protocol' && m.hpNow <= m.hp * m.passive.hp_threshold){
      m.passiveActive = true; this.log('passive_triggered', i, { passive: m.passive.id, label: m.passive.label });
    } }
  applyPassiveMods(i, dmg){ const m = this.mechs[i]; let d = dmg;
    if (m.passiveActive && m.passive.id === 'bulwark_protocol') d = d * (1 - m.passive.dr_bonus);
    return d; }
  regenShields(){ const c = this.ruleset.combat;
    for (let i = 0; i < this.mechs.length; i++){ const m = this.mechs[i];
      if (m.passive && m.passive.id === 'aegis_loop' && m.shieldMax > 0 &&
          this.tick - m.lastHitTick > c.shield_regen_delay_ticks && m.shieldNow < m.shieldMax){
        m.shieldNow = Math.min(m.shieldMax, m.shieldNow + c.shield_regen_per_s * this.dt);
        if (m.shieldNow >= m.shieldMax) this.log('shield_restored', i, {}); } } }

  step(){ if (this.ended) return; this.tick++;
    for (let i = 0; i < this.mechs.length; i++) this.stepMech(i);
    this.regenShields();
    if (this.bodiesCfg()) this.separateBodies(); // v1.5.0 (D-040) : plus aucun chevauchement de châssis
    this.stepProjectiles();
    // D-025 : expiration des fumigènes (compte à rebours déterministe)
    for (const s of this.smokes) s.ticks--;
    const expired = this.smokes.filter(s => s.ticks <= 0);
    if (expired.length){ for (const s of expired) this.log('smoke_cleared', s.by, { x: s.x, z: s.z }); }
    this.smokes = this.smokes.filter(s => s.ticks > 0);
    // D-024 : fin de bataille par équipe — plus aucun mech debout d'un côté
    const teams = [...new Set(this.mechs.map(m => m.team))];
    const dead = this.mechs.filter(m => m.hpNow <= 0);
    for (const d of dead) if (!d.loggedDead){ d.loggedDead = true; this.log('mech_disabled', this.mechs.indexOf(d), {}); }
    const alive = t => this.mechs.some(m => m.team === t && m.hpNow > 0);
    if (teams.some(t => !alive(t))){
      const winner = alive(teams[0]) ? teams[0] : teams[1];
      this.winner = winner; this.ended = true;
      this.log('battle_ended', null, { winner, reason: 'disabled' }); }
    else if (this.tick >= this.timeoutTicks){ // D-024 : timeout au score d'équipe (somme des fractions HP)
      const score = t => this.mechs.filter(m => m.team === t).reduce((s, m) => s + m.hpNow / m.hp, 0);
      const s0 = score(teams[0]), s1 = score(teams[1]);
      this.winner = Math.abs(s0 - s1) < 1e-9 ? null : (s0 > s1 ? teams[0] : teams[1]); this.ended = true;
      this.log('battle_ended', null, { winner: this.winner, reason: 'timeout' }); } }

  // D-025 : fumigène — un mech sous le seuil HP de son profil lâche un rideau (1× par bataille), statique à sa position
  checkSmoke(i){ const m = this.mechs[i]; const sm = this.ruleset.combat.smoke;
    if (!sm || !sm.enabled || m.smokeUsed || m.hpNow <= 0) return;
    const th = (m.proc.smoke_hp_threshold != null) ? m.proc.smoke_hp_threshold : sm.default_hp_threshold;
    if (m.hpNow / m.hp <= th){
      m.smokeUsed = true;
      this.smokes.push({ x: m.pos.x, z: m.pos.z, r: sm.radius, ticks: sm.duration_ticks, by: i });
      this.log('smoke_deployed', i, { x: +m.pos.x.toFixed(2), z: +m.pos.z.toFixed(2), r: sm.radius, ticks: sm.duration_ticks, threshold: th }); } }

  stepMech(i){ const m = this.mechs[i];
    if (this.bodiesCfg() && m.hpNow <= 0) return; // v0.14.1 (D-041) : un châssis détruit reste où il est tombé — plus d'épave qui continue à marcher/tirer
    if ((m.breachCd || 0) > 0) m.breachCd--;
    if ((m.threadCd || 0) > 0) m.threadCd--;
    if ((m.breachT || 0) > 0) m.breachT--;
    if ((m.knockImmune || 0) > 0) m.knockImmune--;
    if (this.worldCfg() && (m.knockT || 0) > 0){ this.coastKnock(i); if ((m.knockT || 0) > 0) return; }
    m.prevPos = { ...m.pos };
    if (m.jumpCd > 0) m.jumpCd--; // v1.2.0 (D-037) : recharge du saut (no-op sans config)
    if (m.jumpT > 0){ m.jumpT--; if (m.jumpT === 0){ this.log('jump_landed', i, {});
      const pf = this.platformAt(m.pos.x, m.pos.z); // v1.3.0 (D-038) : atterrissage sur une plateforme = on se perche d'un bond
      if (pf){ m.z = pf.zh; m.zTgt = pf.zh; m.zRender = pf.zh; m.pos.zEl = pf.zh; m.climbPlat = pf;
        this.log('perch_landed', i, { platform: pf.id, z: pf.zh }); }
      else if (this.bodiesCfg()) this.pushOutOfFootprint(m); } } // v0.14.1 (D-041) : éjection de la marge d'obstacle seulement si pas perché — le perchage-saut est prioritaire
    if (m.climbCd > 0) m.climbCd--; // v1.3.0 (D-038)
    if (m.climbT > 0){ m.climbT--; m.zRender = m.zTgt * (1 - m.climbT / m.climbTotal); // v1.3.0 : progression d'escalade (déterministe, zéro RNG)
      if (m.climbT === 0){ const plat = m.climbPlat;
        if (m.zTgt > 0){ m.z = m.zTgt; m.zRender = m.z; m.pos.zEl = m.z; // montée finie : on se cale sur la plateforme et on tient le perchoir
          m.pos.x = Math.max(plat.x - plat.w / 2 + 0.8, Math.min(plat.x + plat.w / 2 - 0.8, m.pos.x));
          m.pos.z = Math.max(plat.z - plat.h / 2 + 0.8, Math.min(plat.z + plat.h / 2 - 0.8, m.pos.z));
          this.log('climb_done', i, { platform: plat.id, z: m.z });
        } else { m.z = 0; m.zTgt = 0; m.zRender = 0; delete m.pos.zEl; m.climbPlat = null; // descente finie : on repousse hors de l'empreinte
          this.pushOutOfFootprint(m);
          this.log('climb_down_done', i, { z: 0 }); } }
      return; } // en escalade : immobile, ne tire pas, ne recharge pas — fenêtre de vulnérabilité (hypothèse D-038)
    if (m.stunTicks > 0){ m.stunTicks--; m.heat = Math.max(0, m.heat - this.ruleset.combat.overheat_threshold / (this.tickRate * this.ruleset.combat.overheat_stun_seconds)); return; }
    if (m.staggeredTicks > 0){ m.staggeredTicks--; if (m.staggerImmunityTicks > 0) m.staggerImmunityTicks--; return; } // D-024 : le stagger fait perdre son tour, immunité décrémentée ensuite
    if (m.staggerImmunityTicks > 0) m.staggerImmunityTicks--;
    // Ordre direct du manager (coquille de jeu). Le moteur ne pose jamais ce drapeau :
    // absent, le tick est celui d'avant — les sims de régression restent bit-identiques.
    if (m.poweredOff) return;
    m.heat = Math.max(0, m.heat - m.cooling_per_s * this.dt);
    if (m.cooldown > 0) m.cooldown--;
    if (m.cooldown2 > 0) m.cooldown2--;
    this.checkPassive(i);
    this.checkSmoke(i);
    const tIdx = this.targetOf(i); // D-024 : cible par profil de processeur, pas juste « l'autre »
    if (tIdx === null) return;
    const foe = this.mechs[tIdx];
    if (m.targetIdx !== tIdx){ m.targetIdx = tIdx; this.log('target_acquired', i, { target: tIdx }); }
    const dist = this.distance(m.pos, foe.pos);
    const mo = this.motionCfg(), bo = this.bodiesCfg(); // v1.4.0 (D-039) inertie ; v1.5.0 (D-040) corps — sans config, comportement antérieur bit-à-bit
    if (m.meleeState){ m.meleeState.ticks--;
      if (m.meleeState.ticks <= 0){
        if (m.meleeState.phase === 'windup'){ const w = m.weapons[m.meleeState.slot || 0];
          if (foe.hpNow <= 0){ m.meleeState = { phase: 'recovery', ticks: w.recovery_ticks }; return; } // D-024 : cible tombée entre-temps → coup dans le vide
          const d = this.distance(m.pos, foe.pos);
          const acc = Math.min(0.98, w.accuracy + 0.01 * 5);
          if (d - (bo ? (m.r + foe.r) : 0) <= w.range * 1.15 && (foe.jumpT || 0) <= 0 && (foe.z || 0) === (m.z || 0) && this.rng.chance(acc)){ // v1.2.0 : cible en vol = coup dans le vide ; v1.3.0 : surélevée = hors de portée verticale ; v1.5.0 (D-040) : portée bord-à-bord
            const crit = this.rng.chance(w.crit_chance || 0);
            const dmg = crit ? Math.round(w.damage * (w.crit_mult || 1)) : w.damage;
            this.log('melee_attack', i, { target: m.targetIdx, damage: dmg, crit, weapon: m.meleeState.weaponId });
            if (crit){ m.crits++; this.log('critical_hit', i, { target: m.targetIdx, damage: dmg }); }
            this.applyDamage(i, m.targetIdx, dmg);
            let shocked = false;
            if (this.worldCfg() && foe.hpNow > 0){
              const base = w.impact != null ? w.impact : w.damage / 4;
              shocked = this.impulse(i, m.targetIdx, base * (crit ? 1.65 : 1));
            }
            if (!shocked && w.stagger && foe.hpNow > 0 && foe.staggerImmunityTicks <= 0){ // D-024 : immunité post-stagger — pas de verrouillage en chaîne
              foe.staggeredTicks = 4; foe.staggerImmunityTicks = 4 + this.ruleset.combat.stagger_immunity_ticks; this.log('stagger', m.targetIdx, { by: i }); }
          } else this.log('attack_missed', i, { kind: 'melee' });
          m.heat += w.heat; this.checkOverheat(i, m);
          m.meleeState = { phase: 'recovery', ticks: w.recovery_ticks };
        } else m.meleeState = null; }
      return; }
    const isMelee = m.weapon.type === 'melee';
    const inRange = isMelee ? dist - (bo ? (m.r + foe.r) : 0) <= m.weapon.range && (m.z || 0) === (foe.z || 0) // v1.3.0 (D-038) : mêlée = même niveau ; v1.5.0 (D-040) : bord-à-bord
      : dist <= m.weapon.range && dist >= m.weapon.min_range && this.losClear(m.pos, foe.pos);
    // D-026 : stabilité du châssis (garage D-019) accélère la visée — réduction plafonnée, déterministe
    const cc = this.ruleset.combat;
    const stabRed = Math.min(cc.stability_ticks_cap || 2, Math.floor((m.stability || 0) / (cc.stability_ticks_per || 15)));
    const stab = isMelee ? 0 : Math.max(0, (m.weapon.stabilization_ticks || 0) - stabRed); // D-021 : on s'immobilise pour tirer
    let stabUse = stab;
    if (this.tradeCfg() && m.proc.squad === 'focus' && (m.pilotLv || 0) >= 1 && (m.planted || m.ticksStationary >= 3)){
      stabUse = Math.max(0, stab - (1 + Math.floor(m.pilotLv / 2)));
      m.reglage = 0.06 * m.pilotLv;
    } else m.reglage = 0;
    if ((m.jumpT || 0) <= 0 && inRange && m.cooldown === 0 && m.ticksStationary >= stabUse && (!isMelee || this.rng.chance(m.proc.aggression))){ // v1.2.0 : rien en vol
      if (isMelee){ m.meleeState = { phase: 'windup', ticks: m.weapon.windup_ticks, slot: 0, weaponId: m.weaponId }; return; }
      this.fireProjectile(i, this.ballisticsCfg() ? m.targetIdx : this.otherIdx(i));
      return; }
    const bracing = !isMelee && inRange && m.cooldown === 0 && m.ticksStationary < stab; // D-021 : tracking shot — on ralentit pour épauler, pas d'arrêt total
    const sec = m.weapons[1];
    const wantSecMelee = sec && sec.type === 'melee' && m.weapon.type !== 'melee' &&
      (m.proc.preferred_range <= sec.range + 1.5 || m.pinned);
    if ((m.jumpT || 0) <= 0 && wantSecMelee && dist - (bo ? (m.r + foe.r) : 0) <= sec.range && (m.z || 0) === (foe.z || 0) && m.cooldown2 === 0 && this.rng.chance(m.proc.aggression)){ // v1.3.0 : mêlée = même niveau ; v1.5.0 (D-040) : bord-à-bord
      m.meleeState = { phase: 'windup', ticks: sec.windup_ticks, slot: 1, weaponId: m.secondaryWeaponId }; return; }
    // bouclier improvisé (D-020) : un mech capable de mêlée ramasse une épave à portée de main
    if (!m.improvShield && (isMelee || wantSecMelee) && dist > m.meleeReach * 2){
      const pi = this.obstacles.findIndex(o => o.pickable &&
        Math.hypot(o.x - m.pos.x, o.z - m.pos.z) < o.w / 2 + 2.2);
      if (pi !== -1){ const prop = this.obstacles[pi];
        if (prop.weaponId && prop.droppedBy === i && m.weaponId === this.unarmedId()){
          // récupération (D-022) : il reprend son arme larguée
          m.weaponId = prop.weaponId; m.weapon = this.ruleset.weapons[prop.weaponId]; m.weapons[0] = m.weapon;
          m.speed_mps = m.baseSpeedMps; m.ticksStationary = 0;
          this.obstacles.splice(pi, 1);
          this.log('weapon_recovered', i, { weapon: m.weaponId });
        } else {
          m.improvShield = prop.prop_hp; m.improvLabel = prop.weaponId ? 'ARME ENNEMIE' : (prop.label || 'ÉPAVE');
          this.obstacles.splice(pi, 1);
          this.log('prop_picked_up', i, { label: m.improvLabel, hp: prop.prop_hp }); } } }
    // largage d'arme (D-022) : un tireur acculé largue son arme pour s'alléger — l'arme devient un prop ramassable
    if (m.weapon.type === 'ranged' && !m.droppedOnce && m.pinned && dist < foe.meleeReach + 3){
      const fux = (foe.pos.x - m.pos.x) / (dist || 1), fuz = (foe.pos.z - m.pos.z) / (dist || 1);
      const dwx = m.pos.x + fux * 1.6, dwz = m.pos.z + fuz * 1.6;
      if (!this.blockedAt(dwx, dwz)){
        this.obstacles.push({ id: 'dropped_weapon_' + i, x: dwx, z: dwz, w: 1.5, h: 1.5,
          blocks_los: false, kind: 'prop', pickable: true, prop_hp: 12, label: 'ARME LARGUÉE',
          weaponId: m.weaponId, droppedBy: i });
        m.prevWeaponId = m.weaponId; m.droppedOnce = true;
        m.weaponId = this.unarmedId(); m.weapon = this.ruleset.weapons[m.weaponId]; m.weapons[0] = m.weapon;
        m.meleeReach = Math.max(m.meleeReach, this.ruleset.weapons[this.unarmedId()].range);
        m.speed_mps = m.baseSpeedMps * (1 + (this.ruleset.combat.drop_speed_bonus || 0.25));
        m.cooldown = 0; m.meleeState = null; m.ticksStationary = 0;
        this.log('weapon_dropped', i, { weapon: m.prevWeaponId }); } }
    const evade = bracing ? false : this.rng.chance(m.proc.evasion_frequency * 0.15);
    const wsf = (this.water.length && (m.z || 0) <= 0) ? (this.waterAt(m.pos.x, m.pos.z) ? (this.ruleset.combat.water_speed_factor || .65) : 1) : 1; // v1.2.0 (D-037) : patauge ; v1.3.0 (D-038) : perché, on ne patauge pas
    let spd = this.water.length ? m.speed_mps * wsf : m.speed_mps;
    if (this.worldCfg()){ const deb = this.debrisAt(m.pos.x, m.pos.z); if (deb && (m.z || 0) < (deb.zh || 0.8)) spd *= 0.62; }
    if ((m.breachT || 0) > 0) spd *= 1.7;
    const pref = m.proc.preferred_range;
    let nx = m.pos.x, nz = m.pos.z;
    // objectif intermédiaire (D-020) : un mêlée qui affronte un tireur fait un détour par une épave ramassable
    let tgtX = foe.pos.x, tgtZ = foe.pos.z;
    m.guardWalk = false;
    if (this.squadCfg() && m.proc.squad === 'peel' && m.guardIdx != null && this.mechs[m.guardIdx] && this.mechs[m.guardIdx].hpNow > 0){
      const g = this.mechs[m.guardIdx];
      const gdx = foe.pos.x - g.pos.x, gdz = foe.pos.z - g.pos.z, gl = Math.hypot(gdx, gdz) || 1;
      tgtX = g.pos.x + gdx / gl * 6; tgtZ = g.pos.z + gdz / gl * 6;
      if (Math.hypot(tgtX - m.pos.x, tgtZ - m.pos.z) > 2.5) m.guardWalk = true;
    }
    if (!m.improvShield && (isMelee || wantSecMelee) && foe.weapon.type === 'ranged' && dist > m.meleeReach + 3){
      const dtMax = this.bodiesCfg() ? 90 : Infinity; // v0.14.1 (D-041) : budget de détour — on ne s'acharne pas sur une épave inaccessible (6 s max, déterministe)
      if (m.detourTicks < dtMax){
        let bd = 14 * 14, bw = null; // rayon de détour = hypothèse D-020
        for (const o of this.obstacles){ if (!o.pickable) continue;
          const dd = (o.x - m.pos.x) ** 2 + (o.z - m.pos.z) ** 2;
          if (dd < bd){ bd = dd; bw = o; } }
        if (bw){ tgtX = bw.x; tgtZ = bw.z; m.detourTicks++; } else m.detourTicks = 0; } }
    // v1.3.0 (D-038) : prise de hauteur — un tireur en rechargement à portée de marche d'une plateforme escaladable va la tenir
    const cf = (this.ruleset.combat.climb && this.ruleset.combat.climb.enabled && this.platforms.length) ? this.ruleset.combat.climb : null;
    m.wantClimb = null;
    if (cf && m.z === 0 && m.climbT === 0 && m.climbCd === 0 && m.weapon.type === 'ranged' && m.cooldown > 0 && !m.improvShield
      && !(dist <= m.weapon.range && dist >= (m.weapon.min_range || 0) && this.losClear(m.pos, foe.pos))){ // v0.12.0 : anti-churn — on ne grimpe que si la position actuelle ne peut pas engager
      let bp = null, bd = (cf.seek_radius || 9) ** 2;
      for (const o of this.platforms){
        const dd = this.edgeDist(o, m.pos.x, m.pos.z) ** 2;
        if (dd >= bd) continue;
        const pDist = this.distance({ x: o.x, z: o.z }, foe.pos);
        if (pDist > m.weapon.range * 1.05 || pDist < (m.weapon.min_range || 0)) continue;
        if (this.segBlockedBySmoke({ x: o.x, z: o.z }, foe.pos)) continue;
        bd = dd; bp = o; }
      if (bp){ tgtX = bp.x; tgtZ = bp.z; m.wantClimb = bp; } }
    if (m.z > 0){ // v1.3.0 (D-038) : perché — on tient la hauteur tant qu'elle domine la cible, sinon on redescend
      const hold = dist <= m.weapon.range * 1.05 && dist >= (m.weapon.min_range || 0) * 0.9 && this.losClear(m.pos, foe.pos);
      if (hold) m.perchSlack = 0; // v0.12.0 : hystérésis — le perchoir se tient, on ne descend pas au premier tick défavorable
      else { m.perchSlack = (m.perchSlack || 0) + 1;
        if (m.perchSlack >= ((cf && cf.patience_ticks) || 30) && m.climbCd === 0){ const cc2 = this.ruleset.combat.climb || {};
          m.climbTotal = m.climbT = Math.max(1, Math.round(m.z * (cc2.ticks_per_meter || 6) * 0.5)); m.zTgt = 0; m.perchSlack = 0;
          m.climbCd = cc2.cooldown_ticks || 45;
          this.log('climb_down_started', i, { from: m.z }); } } }
    m.planted = false;
    if (this.frontCfg() && m.order !== 'push' && (m.z || 0) === 0){
      let threat = false;
      for (const j of this.enemiesOf(i)) if (this.distance(m.pos, this.mechs[j].pos) < 10) threat = true;
      const ward = m.guardIdx != null ? this.mechs[m.guardIdx] : null;
      const allyHurt = m.proc.squad === 'peel' && ward && ward.hpNow > 0 && (ward.hpNow / ward.hp) < 0.62;
      // Tenir la ligne seulement là où le tir part. Un allié qui masque, ou un mur, ne doit pas figer le mech.
      if (!threat && !allyHurt && inRange) m.planted = true;
    }
    const tdist = Math.hypot(tgtX - m.pos.x, tgtZ - m.pos.z) || 1;
    const ux = (tgtX - m.pos.x) / tdist, uz = (tgtZ - m.pos.z) / tdist;
    const bmf = (m.proc.brace_move_factor != null ? m.proc.brace_move_factor : (this.ruleset.combat.brace_move_factor || 0.5)); // tracking shot : visée en mouvement lent
    const blind = mo && m.weapon.type === 'ranged' && m.cooldown === 0 && dist <= m.weapon.range && dist >= (m.weapon.min_range || 0) && !this.losClear(m.pos, foe.pos); // v1.4.0 (D-039) : anti-stall — prêt à tirer mais ligne bloquée → on avance pour la rétablir
    if (!m.planted && m.z === 0 && (m.guardWalk || m.wantClimb || blind || dist > pref + 1.5 || (isMelee && dist > m.weapon.range) ||
        (wantSecMelee && dist > sec.range))){ // v1.3.0 : wantClimb = cap sur la plateforme la plus proche ; v1.4.0 : perché = on tient le perchoir
      if (m.ticksMoved === 0) this.log('movement_started', i, { toward: m.targetIdx });
      const sf = bracing ? bmf : ((mo && !isMelee && !m.wantClimb) ? Math.min(1, Math.max(.15, (dist - (pref + 1.5)) / (mo.brake_m || 8))) : 1); // v1.4.0 (D-039) : freinage anticipé — un coureur ralentit AVANT sa marque, l'élan ne dépasse plus la bande
      nx += ux * spd * this.dt * sf; nz += uz * spd * this.dt * sf; m.ticksMoved++;
    } else if (!m.planted && m.z === 0 && dist < pref - 1.5){ const rsf = this.ruleset.combat.retreat_speed_factor; let sf = bracing ? bmf : 1;
      if (mo && !isMelee) sf *= Math.min(1, Math.max(.15, (pref - 1.5 - dist) / (mo.brake_m || 8))); // v1.4.0 (D-039) : freinage symétrique en repli
      // D-024 : repli multi-menaces — on s'écarte du centre de gravité des poursuivants proches (pas de recul tout droit dans le 2e chasseur)
      let rx = -ux, rz = -uz;
      const rar = this.ruleset.combat.retreat_aware_radius || 20;
      const near = this.mechs.filter(o => o.team !== m.team && o.hpNow > 0 && this.distance(o.pos, m.pos) < rar);
      if (near.length >= 2){ let sx = 0, sz = 0;
        for (const o of near){ const dd = this.distance(o.pos, m.pos) || 1; sx += (m.pos.x - o.pos.x) / dd; sz += (m.pos.z - o.pos.z) / dd; }
        const sl = Math.hypot(sx, sz) || 1; rx = sx / sl; rz = sz / sl; }
      nx += rx * spd * this.dt * rsf * sf; nz += rz * spd * this.dt * rsf * sf; m.ticksMoved++; }
    if (evade && m.z === 0){ nx += -uz * spd * this.dt * 2; nz += ux * spd * this.dt * 2; } // v1.4.0 : pas d'esquive en perchoir (fix flottement v0.12.0)
    // couvert actif (D-020) : pendant son rechargement, un profil avec cover_usage se replace hors LOS (peek-shooting)
    if (m.z === 0 && !bracing && !isMelee && foe.weapon.type === "ranged" && m.cooldown > 3 && dist <= m.weapon.range && (m.proc.cover_usage || 0) >= 0.25 && this.losClear(m.pos, foe.pos)){ // v1.4.0 : idem
      const cp = this.coverPoint(m, foe);
      if (cp){ const cdx = cp.x - m.pos.x, cdz = cp.z - m.pos.z, cd = Math.hypot(cdx, cdz) || 1;
        nx = m.pos.x + cdx / cd * spd * this.dt; nz = m.pos.z + cdz / cd * spd * this.dt; m.ticksMoved++; } }
    const bx = this.ballisticsCfg();
    if (!m.planted && bx && m.z === 0 && !isMelee && (m.proc.cover_usage || 0) >= 0.25 && dist <= m.weapon.range && dist >= (m.weapon.min_range || 0) + 1){
      const exposed = foe.hpNow > 0 && foe.weapon.type === 'ranged' && this.losClear(m.pos, foe.pos) && dist <= (foe.weapon.range || 40) + 6;
      const shooting = inRange && m.cooldown === 0 && m.ticksStationary >= Math.max(0, stab - 1);
      if (exposed && !shooting){
        const cp = this.coverPoint(m, foe);
        if (cp){ const cdx = cp.x - m.pos.x, cdz = cp.z - m.pos.z, cd = Math.hypot(cdx, cdz) || 1;
          if (cd > 1.2){ nx = m.pos.x + cdx / cd * spd * this.dt; nz = m.pos.z + cdz / cd * spd * this.dt; m.ticksMoved++; } }
        else { const sgn = (i % 2 === 0) ? 1 : -1;
          nx += -uz * sgn * spd * this.dt; nz += ux * sgn * spd * this.dt; m.ticksMoved++; }
      }
    }
    const aiming = inRange && m.cooldown === 0;
    if (bx && m.z === 0 && m.targetIdx != null && !aiming){
      const me = this.mechs.indexOf(m);
      for (let j = 0; j < me; j++){ const o = this.mechs[j];
        if (o.team !== m.team || o.hpNow <= 0 || o.targetIdx !== m.targetIdx) continue;
        const dd = this.distance(o.pos, m.pos);
        if (dd < 8 && dd > 0.3){ nx += -uz * spd * this.dt * .85; nz += ux * spd * this.dt * .85; break; } } }
    if (this.squadCfg() && m.z === 0 && m.proc.squad !== 'dogpile' && !aiming){
      const mates = this.alliesOf(i);
      for (const a of mates){
        const o = this.mechs[a];
        if (o.weapon.type !== 'ranged' || o.targetIdx == null) continue;
        const foe2 = this.mechs[o.targetIdx];
        if (!foe2 || foe2.hpNow <= 0) continue;
        const ldx = foe2.pos.x - o.pos.x, ldz = foe2.pos.z - o.pos.z, l2 = ldx * ldx + ldz * ldz;
        if (l2 < 4) continue;
        let t = ((m.pos.x - o.pos.x) * ldx + (m.pos.z - o.pos.z) * ldz) / l2;
        if (t < 0.18 || t > 0.82) continue;
        const px = o.pos.x + ldx * t, pz = o.pos.z + ldz * t;
        const ox = m.pos.x - px, oz = m.pos.z - pz;
        if (ox * ox + oz * oz > 6.25) continue;
        const il = Math.sqrt(l2), sgn = (i % 2 === 0) ? 1 : -1;
        nx += -ldz / il * sgn * spd * this.dt; nz += ldx / il * sgn * spd * this.dt;
        break;
      }
    }
    if (bo && m.z === 0){ // v1.5.0 (D-040) : répulsion anticipée — on ne se colle pas, on se répartit autour de la cible (HYPOTHÈSE avoid_pad_m)
      let rpx = 0, rpz = 0;
      for (const o of this.mechs){
        if (o === m || o.hpNow <= 0) continue;
        const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, dd = Math.hypot(dx, dz);
        const infl = (m.r || 1.2) + (o.r || 1.2) + (bo.avoid_pad_m != null ? bo.avoid_pad_m : 1.5);
        if (dd > infl || dd < 1e-6) continue;
        const wgt = (infl - dd) / infl;
        rpx += dx / dd * wgt; rpz += dz / dd * wgt; }
      const rpl = Math.hypot(rpx, rpz);
      if (rpl > 1e-6){ const rps = spd * this.dt * Math.min(1, rpl); nx += rpx / rpl * rps; nz += rpz / rpl * rps; } }
    const W = this.arena.width / 2, D = this.arena.depth / 2;
    const clampA = (x, z) => [Math.max(-W + 1, Math.min(W - 1, x)), Math.max(-D + 1, Math.min(D - 1, z))];
    if (mo){ // le châssis est un corps : il se lance comme un coureur (accélération bornée), freine, et son élan dérape dans les virages
      const dvx = (nx - m.pos.x) / this.dt - m.vx, dvz = (nz - m.pos.z) / this.dt - m.vz;
      const dl = Math.hypot(dvx, dvz);
      if (dl > 1e-9){
        const accel = Math.hypot((nx - m.pos.x) / this.dt, (nz - m.pos.z) / this.dt) > Math.hypot(m.vx, m.vz);
        const cap = m.speed_mps / (accel ? (mo.launch_ticks || 18) : (mo.settle_ticks || 10)); // Δv max par tick (HYPOTHÈSES D-039)
        const k = Math.min(1, cap / dl);
        m.vx += dvx * k; m.vz += dvz * k; }
      nx = m.pos.x + m.vx * this.dt; nz = m.pos.z + m.vz * this.dt; }
    // glissement déterministe le long des obstacles (contournement sans pathfinding complet)
    const dxm = nx - m.pos.x, dzm = nz - m.pos.z;
    const len = Math.hypot(dxm, dzm);
    const jf = (this.ruleset.combat.jump && this.ruleset.combat.jump.enabled) ? this.ruleset.combat.jump : null; // v1.2.0 (D-037)
    if (jf && m.jumpT > 0){ // en vol : on survole les obstacles, déplacement direct borné à l'arène
      if (len > 1e-9){ const [cx, cz] = clampA(nx, nz); m.pos.x = cx; m.pos.z = cz; }
    } else if (len > 1e-9){
      const baseAng = Math.atan2(dzm, dxm);
      const sgn = (i % 2 === 0) ? 1 : -1; // asymétrie par mech : évite les blocages symétriques face à face
      let slid = false;
      const phase = (m.breachT || 0) > 0;
      if (!phase && this.tradeCfg() && m.proc.squad === 'dogpile' && (m.pilotLv || 0) >= 1 && (m.breachCd || 0) <= 0 && m.hpNow > m.hp * 0.3){
        let wall = this.wallAt(nx, nz, m);
        if (!wall){
          const fdx = foe.pos.x - m.pos.x, fdz = foe.pos.z - m.pos.z, fl = Math.hypot(fdx, fdz) || 1;
          const reach = Math.min(4.5, fl);
          wall = this.wallAt(m.pos.x + fdx / fl * reach, m.pos.z + fdz / fl * reach, m);
        }
        if (wall && this.wallBetween(m, foe, wall) && this.distance(m.pos, { x: wall.x, z: wall.z }) < 8) this.startBreach(i, wall);
      }
      const phasing = (m.breachT || 0) > 0;
      for (const da of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]){
        const a = baseAng + da * sgn;
        const [cx, cz] = clampA(m.pos.x + Math.cos(a) * len, m.pos.z + Math.sin(a) * len);
        if (phasing){ if (!this.bodyBlocked(m, cx, cz)){ m.pos.x = cx; m.pos.z = cz; slid = true; break; } }
        else if (!this.blockedAt(cx, cz, bo ? (m.r || 1.2) : undefined) && !this.bodyBlocked(m, cx, cz)){ m.pos.x = cx; m.pos.z = cz; slid = true; break; } // v1.5.0 : marge = envergure + corps
      }
      if (jf && !slid && m.jumpCd === 0){ // bloqué de partout → impulsion de saut par-dessus (D-037)
        m.jumpT = jf.duration_ticks; m.jumpCd = jf.cooldown_ticks;
        const [cx, cz] = clampA(nx, nz); m.pos.x = cx; m.pos.z = cz;
        this.log('jump_started', i, { duration: jf.duration_ticks, cooldown: jf.cooldown_ticks });
      }
    }
    if (m.wantClimb && m.z === 0 && m.climbT === 0 && this.edgeDist(m.wantClimb, m.pos.x, m.pos.z) <= 1.5){ // v1.3.0 (D-038) : au bord → on escalade
      const pf = m.wantClimb, cc3 = this.ruleset.combat.climb || {};
      m.climbTotal = m.climbT = Math.max(1, Math.ceil(pf.zh * (cc3.ticks_per_meter || 6)));
      m.zTgt = pf.zh; m.zRender = 0; m.climbCd = cc3.cooldown_ticks || 45; m.climbPlat = pf;
      this.log('climb_started', i, { platform: pf.id, z: pf.zh, ticks: m.climbT }); }
    const mdx = m.pos.x - m.prevPos.x, mdz = m.pos.z - m.prevPos.z;
    m.ticksStationary = bracing ? m.ticksStationary + 1 : 0; // D-021 : chaque tick de visée compte (tracking shot), reset sinon
    m.vel = { x: mdx / this.dt, z: mdz / this.dt };
    if (mo){ m.vx = m.vel.x; m.vz = m.vel.z; } // v1.4.0 (D-039) : l'élan réalisé remplace la consigne — un mur absorbe, un glissement dévie
    const rsf2 = this.ruleset.combat.retreat_speed_factor;
    m.pinned = (dist < pref - 1.5) && ((mdx * -ux + mdz * -uz) < 0.3 * m.speed_mps * this.dt * rsf2);
    if (mdx * mdx + mdz * mdz > 1e-6) m.heading = Math.atan2(mdz, mdx);
  }

  // --- projectiles avec temps de vol + esquive physique ---
  fireProjectile(i, targetIdx){
    const m = this.mechs[i], foe = this.mechs[targetIdx];
    const w = m.weapon, c = this.ruleset.combat;
    const dist = this.distance(m.pos, foe.pos);
    const ft = dist / w.proj_speed_mps; // temps de vol
    // visée prédictive : position prévue de la cible + erreur de visée
    const lead = c.aim_lead_factor;
    let ax = foe.pos.x + (foe.vel.x || 0) * ft * lead, az = foe.pos.z + (foe.vel.z || 0) * ft * lead;
    // D-026 : précision du châssis (garage D-019) resserre l'erreur de visée — tireurs seulement
    const acc = Math.min(0.98, w.accuracy + (m.accuracy_bonus || 0) + this.affLinks(i) + this.heightBonus(i, targetIdx)); // v1.1.0 : + liaisons vivantes ; v1.3.0 (D-038) : + avantage de hauteur
    let err = (1 - acc) * dist * c.aim_error_factor;
    const mo = this.motionCfg(); // v1.4.0 (D-039)
    if (mo && m.speed_mps > 0){ const spFrac = Math.min(1, Math.hypot(m.vel.x || 0, m.vel.z || 0) / m.speed_mps); // v1.4.0 (D-039) : tir en élan élargit l'erreur (HYPOTHÈSE)
      err *= 1 + spFrac * (mo.moving_aim_penalty || 0); }
    const ang = this.rng.range(-Math.PI, Math.PI), rad = this.rng.range(0, err);
    ax += Math.cos(ang) * rad; az += Math.sin(ang) * rad;
    ax = Math.max(-this.arena.width / 2 + 1, Math.min(this.arena.width / 2 - 1, ax));
    az = Math.max(-this.arena.depth / 2 + 1, Math.min(this.arena.depth / 2 - 1, az));
    const aim = { x: ax, z: az };
    const total = this.distance(m.pos, aim);
    const ord = this.ordnanceCfg();
    const delivery = (ord && w.delivery && w.delivery !== 'direct') ? w.delivery : 'direct';
    let fuse = delivery === 'direct' ? 0 : Math.max(0, (w.fuse_ticks || 0));
    if (delivery !== 'direct' && this.tradeCfg() && m.proc.squad === 'focus' && (m.pilotLv || 0) >= 1) fuse = Math.max(0, fuse - m.pilotLv);
    this.projectiles.push({ team: m.team, fromIdx: i, weaponId: m.weaponId,
      x: m.pos.x, z: m.pos.z, y: delivery === 'direct' ? 2.1 : 1.4, dx: (aim.x - m.pos.x) / (total || 1), dz: (aim.z - m.pos.z) / (total || 1),
      speed: w.proj_speed_mps, traveled: 0, maxDist: total,
      damage: w.damage, crit_chance: Math.min(0.7, (w.crit_chance || 0) + (m.reglage || 0)), crit_mult: w.crit_mult || 1,
      delivery, fuse, blast: w.blast_m || 4, apex: w.apex_m || 7, stunTicks: w.stun_ticks || 0, thread: false, armed: false });
    const pr = this.projectiles[this.projectiles.length - 1];
    if ((m.reglage || 0) > 0) this.log('exclusive_reglage', i, { target: targetIdx, bonus: +m.reglage.toFixed(2) });
    if (this.tradeCfg() && m.proc.squad === 'flank' && (m.pilotLv || 0) >= 1 && !(m.threadCd > 0) && !this.losClear(m.pos, foe.pos)){
      pr.thread = true; m.threadCd = Math.max(50, 150 - m.pilotLv * 12);
      this.log('exclusive_thread', i, { target: targetIdx });
    }
    m.shotsFired++;
    this.log('weapon_fired', i, { target: targetIdx, weapon: m.weaponId, fx: m.pos.x, fz: m.pos.z, tx: aim.x, tz: aim.z, proj_speed: w.proj_speed_mps });
    m.cooldown = w.cooldown_ticks; m.heat += w.heat; this.checkOverheat(i, m);
  }
  bodyRadius(m){ return this.bodiesCfg() ? (m.r || 1.2) : 0; }
  // premier châssis croisé par le segment, allié compris. Le tireur est ignoré.
  firstBodyOnSeg(p, x0, z0, x1, z1){
    const c = this.ruleset.combat;
    const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz;
    let best = null, bestT = Infinity;
    for (let j = 0; j < this.mechs.length; j++){
      if (j === p.fromIdx) continue;
      const mm = this.mechs[j];
      if (mm.hpNow <= 0) continue;
      let t = l2 > 0 ? ((mm.pos.x - x0) * dx + (mm.pos.z - z0) * dz) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      if (t < 0.04) continue;
      const px = x0 + dx * t, pz = z0 + dz * t;
      const hitR = c.proj_hit_radius + this.bodyRadius(mm);
      const ddx = mm.pos.x - px, ddz = mm.pos.z - pz;
      if (ddx * ddx + ddz * ddz <= hitR * hitR && t < bestT){ bestT = t; best = { idx: j, x: px, z: pz, t }; }
    }
    if (best && this.tradeCfg()){
      const vic = this.mechs[best.idx];
      for (let g = 0; g < this.mechs.length; g++){
        if (g === p.fromIdx || g === best.idx) continue;
        const gm = this.mechs[g];
        if (gm.hpNow <= 0 || gm.team !== vic.team || !gm.proc || gm.proc.squad !== 'peel' || (gm.pilotLv || 0) < 1) continue;
        if (gm.guardIdx !== best.idx) continue;
        let gt = l2 > 0 ? ((gm.pos.x - x0) * dx + (gm.pos.z - z0) * dz) / l2 : 0;
        gt = Math.max(0, Math.min(1, gt));
        if (gt > best.t + 0.02 || gt < 0.05) continue;
        const gx = x0 + dx * gt, gz = z0 + dz * gt;
        const ox = gm.pos.x - gx, oz = gm.pos.z - gz;
        if (ox * ox + oz * oz > 4.5 * 4.5) continue;
        this.log('exclusive_wall', g, { target: best.idx, by: p.fromIdx });
        best = { idx: g, x: gx, z: gz, t: gt };
        break;
      }
    }
    return best;
  }
  resolveShot(p, idx){
    const shooter = this.mechs[p.fromIdx], tgt = this.mechs[idx];
    const friendly = tgt.team === shooter.team;
    const crit = this.rng.chance(p.crit_chance);
    const dmg = crit ? Math.round(p.damage * p.crit_mult) : p.damage;
    shooter.shotsHit++;
    this.log(friendly ? 'friendly_fire' : 'projectile_impact', p.fromIdx, { target: idx, weapon: p.weaponId, damage: dmg, crit, friendly });
    if (crit){ shooter.crits++; this.log('critical_hit', p.fromIdx, { target: idx, damage: dmg, friendly }); }
    this.applyDamage(p.fromIdx, idx, dmg);
    if (this.worldCfg() && !friendly){
      const pwr = crit ? dmg / 9 : (p.damage >= 34 ? p.damage / 16 : 0);
      if (pwr > 1.2) this.impulse(p.fromIdx, idx, pwr);
    }
    this.splash(p, idx, tgt.pos.x, tgt.pos.z, dmg);
  }
  splash(p, primary, x, z, dmg){
    const bx = this.ballisticsCfg();
    if (!bx || !(bx.splash_m > 0)) return;
    const R = bx.splash_m, f = bx.splash_factor != null ? bx.splash_factor : 0.4;
    const shooter = this.mechs[p.fromIdx];
    for (let j = 0; j < this.mechs.length; j++){
      if (j === primary || j === p.fromIdx) continue;
      const mm = this.mechs[j];
      if (mm.hpNow <= 0) continue;
      const rad = R + this.bodyRadius(mm);
      const d = this.distance(mm.pos, { x, z });
      if (d > rad) continue;
      const sd = Math.max(1, Math.round(dmg * f * (1 - d / rad)));
      this.log('collateral', p.fromIdx, { target: j, damage: sd, friendly: mm.team === shooter.team });
      this.applyDamage(p.fromIdx, j, sd);
    }
  }
  stepProjectiles(){ const c = this.ruleset.combat;
    const bx = this.ballisticsCfg();
    if (!bx){
      for (const p of this.projectiles){
        const step = p.speed * this.dt;
        if (p.traveled + step >= p.maxDist){
          p.x += p.dx * (p.maxDist - p.traveled); p.z += p.dz * (p.maxDist - p.traveled); p.traveled = p.maxDist; p.arrived = true;
        } else { p.x += p.dx * step; p.z += p.dz * step; p.traveled += step; } }
      const still = [];
      for (const p of this.projectiles){
        if (!p.arrived){ still.push(p); continue; }
        const targetIdx = this.mechs.findIndex(m => m.team !== p.team && m.hpNow > 0 &&
          this.distance(m.pos, { x: p.x, z: p.z }) <= c.proj_hit_radius + (this.bodiesCfg() ? (m.r || 1.2) : 0));
        const shooter = this.mechs[p.fromIdx];
        if (targetIdx !== -1){
          const crit = this.rng.chance(p.crit_chance);
          const dmg = crit ? Math.round(p.damage * p.crit_mult) : p.damage;
          shooter.shotsHit++;
          this.log('projectile_impact', p.fromIdx, { target: targetIdx, weapon: p.weaponId, damage: dmg, crit });
          if (crit){ shooter.crits++; this.log('critical_hit', p.fromIdx, { target: targetIdx, damage: dmg }); }
          this.applyDamage(p.fromIdx, targetIdx, dmg);
        } else {
          let foe = -1, bd = Infinity;
          for (let j = 0; j < this.mechs.length; j++){ const mm = this.mechs[j];
            if (mm.team === p.team || mm.hpNow <= 0) continue;
            const dd = this.distance(mm.pos, { x: p.x, z: p.z }); if (dd < bd){ bd = dd; foe = j; } }
          if (foe !== -1){ this.mechs[foe].dodges++; }
          this.log('attack_missed', p.fromIdx, { kind: 'dodge', weapon: p.weaponId, x: p.x, z: p.z });
        } }
      this.projectiles = still;
      return;
    }
    const still = [];
    for (const p of this.projectiles){
      if (p.armed){
        p.fuseLeft--;
        if (p.fuseLeft <= 0) this.detonate(p);
        else still.push(p);
        continue;
      }
      const step = p.speed * this.dt;
      const x0 = p.x, z0 = p.z;
      let travel = step, arrive = false;
      if (p.traveled + step >= p.maxDist){ travel = Math.max(0, p.maxDist - p.traveled); arrive = true; }
      const x1 = x0 + p.dx * travel, z1 = z0 + p.dz * travel;
      const lob = p.delivery === 'lob' || p.delivery === 'emp';
      if (lob){
        const u = p.maxDist > 0 ? Math.max(0, Math.min(1, (p.traveled + travel) / p.maxDist)) : 1;
        p.y = 1.2 + Math.sin(u * Math.PI) * (p.apex || 7);
        const wall = this.worldCfg() ? this.firstWallOnSeg(x0, z0, x1, z1) : null;
        if (wall && p.y < (wall.o.zh || 3) - 0.5){
          p.x = wall.x; p.z = wall.z; p.y = Math.min(p.y, wall.o.zh || 2);
          this.chipStructure(wall.o, p.damage); this.detonate(p); continue;
        }
        p.x = x1; p.z = z1; p.traveled += travel;
        if (!arrive){ still.push(p); continue; }
        p.y = 0.5;
        if ((p.fuse | 0) > 0){ p.armed = true; p.fuseLeft = p.fuse; this.log('ordnance_armed', p.fromIdx, { weapon: p.weaponId, x: +p.x.toFixed(1), z: +p.z.toFixed(1), fuse: p.fuse, delivery: p.delivery }); still.push(p); }
        else this.detonate(p);
        continue;
      }
      let wall = (this.worldCfg() && !p.thread) ? this.firstWallOnSeg(x0, z0, x1, z1) : null;
      if (p.thread){ p.thread = false; wall = null; }
      const hit = travel > 1e-6 ? this.firstBodyOnSeg(p, x0, z0, x1, z1) : null;
      if (wall && !(hit && hit.t < wall.t)){
        p.x = wall.x; p.z = wall.z;
        this.chipStructure(wall.o, p.damage);
        this.splash(p, -1, wall.x, wall.z, Math.max(1, Math.round(p.damage * 0.35)));
        this.log('structure_hit', p.fromIdx, { structure: wall.o.id, damage: p.damage, x: +wall.x.toFixed(1), z: +wall.z.toFixed(1) });
        continue;
      }
      if (hit){ p.x = hit.x; p.z = hit.z; this.resolveShot(p, hit.idx); continue; }
      p.x = x1; p.z = z1; p.traveled += travel;
      if (!arrive){ still.push(p); continue; }
      let idx = -1, bd = Infinity;
      for (let j = 0; j < this.mechs.length; j++){
        if (j === p.fromIdx) continue;
        const mm = this.mechs[j];
        if (mm.hpNow <= 0) continue;
        const dd = this.distance(mm.pos, { x: p.x, z: p.z });
        if (dd <= c.proj_hit_radius + this.bodyRadius(mm) && dd < bd){ bd = dd; idx = j; }
      }
      if (idx !== -1) this.resolveShot(p, idx);
      else {
        this.splash(p, -1, p.x, p.z, p.damage);
        let foe = -1, miss = Infinity;
        for (let j = 0; j < this.mechs.length; j++){ const mm = this.mechs[j];
          if (mm.team === p.team || mm.hpNow <= 0) continue;
          const dd = this.distance(mm.pos, { x: p.x, z: p.z }); if (dd < miss){ miss = dd; foe = j; } }
        if (foe !== -1) this.mechs[foe].dodges++;
        this.log('attack_missed', p.fromIdx, { kind: 'dodge', weapon: p.weaponId, x: p.x, z: p.z });
      }
    }
    this.projectiles = still;
  }

  applyDamage(fromIdx, toIdx, dmg){
    if (this.tradeCfg()){ const src = this.mechs[fromIdx]; if (src && src.pilotLv) dmg = Math.max(1, Math.round(dmg * (1 + 0.03 * src.pilotLv))); }
    const m = this.mechs[toIdx]; let d = dmg;
    d = this.applyPassiveMods(toIdx, d);
    if (m.improvShield > 0){ const absorbed = Math.min(m.improvShield, Math.round(d)); m.improvShield -= absorbed; d -= absorbed;
      if (m.improvShield <= 0){ this.log('prop_destroyed', toIdx, { by: fromIdx }); m.improvLabel = null; } }
    if (m.shieldNow > 0){ const absorbed = Math.min(m.shieldNow, Math.round(d)); m.shieldNow -= absorbed; d -= absorbed;
      if (m.shieldNow === 0) this.log('shield_break', toIdx, {}); }
    if (d > 0){ const after = Math.max(this.ruleset.combat.min_damage_after_armor, Math.round(d - m.armor * 0.25));
      m.hpNow = Math.max(0, m.hpNow - after);
      m.lastHitTick = this.tick;
      this.log('armor_damaged', toIdx, { by: fromIdx, damage: after, hp: m.hpNow });
      this.mechs[fromIdx].damageDealt += after; m.damageTaken += after; } }
  // point derrière un couvert, côté opposé à l'ennemi — ordre de balayage fixe = déterministe
  coverPoint(m, foe){ let best = null, bestD = Infinity;
    const W = this.arena.width / 2, D = this.arena.depth / 2;
    for (const o of this.obstacles){ if (!o.blocks_los) continue;
      const dx = o.x - foe.pos.x, dz = o.z - foe.pos.z, dd = Math.hypot(dx, dz) || 1;
      const px = o.x + dx / dd * (Math.max(o.w, o.h) / 2 + 1.8), pz = o.z + dz / dd * (Math.max(o.w, o.h) / 2 + 1.8);
      if (Math.abs(px) > W - 1 || Math.abs(pz) > D - 1) continue;
      if (this.losClear({ x: px, z: pz }, foe.pos)) continue; // ne casse pas la LOS → inutile
      if (this.blockedAt(px, pz, this.bodiesCfg() ? (m.r || 1.2) : undefined)) continue; // v1.5.0 : le point de couvert doit contenir le châssis
      const d = Math.hypot(px - m.pos.x, pz - m.pos.z);
      if (d < bestD && d > 0.5){ bestD = d; best = { x: px, z: pz }; } }
    return best; }
  armStructures(){
    for (const o of this.obstacles){
      if (o.pickable || !o.blocks_los) continue;
      o.structMax = o.struct || (o.kind === 'building' ? 260 : o.kind === 'tree' ? 40 : o.kind === 'rock' ? 90 : 110);
      o.struct = o.structMax;
      if (!o.zh || o.zh <= 0) o.zh = o.kind === 'building' ? 8.5 : o.kind === 'tree' ? 3.4 : o.kind === 'pillar' ? 6 : 2.6;
    }
  }
  openLine(){
    for (const team of [0, 1]){
      const ids = [];
      this.mechs.forEach((m, i) => { if (m.team === team) ids.push(i); });
      ids.forEach((i, slot) => {
        const m = this.mechs[i];
        if (m.fixedSpawn) return;
        m.pos.z = (slot - (ids.length - 1) / 2) * 12;
        m.prevPos.z = m.pos.z;
        if (this.blockedAt(m.pos.x, m.pos.z, m.r)) this.pushOutOfFootprint(m);
      });
    }
  }
  lineAnchor(i){
    const m = this.mechs[i];
    const ids = [];
    this.mechs.forEach((mm, j) => { if (mm.team === m.team) ids.push(j); });
    const slot = Math.max(0, ids.indexOf(i));
    const side = m.team === 0 ? -1 : 1;
    const back = (m.proc.preferred_range || 20) > 24 ? 18 : 12;
    return { x: side * Math.min(this.arena.width / 2 - 8, back), z: (slot - (ids.length - 1) / 2) * 12 };
  }
  debrisAt(x, z){
    for (const o of this.obstacles){ if (!o.rubble) continue; if (Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.h / 2) return o; }
    return null;
  }
  solidAt(x, z, mz, r){
    const rr = (r || 1) * 0.45;
    for (const o of this.obstacles){
      if (o.pickable || o.rubble || !(o.struct > 0)) continue;
      if ((mz || 0) >= (o.zh || 2.5) - 0.3) continue;
      if (Math.abs(x - o.x) < o.w / 2 + rr && Math.abs(z - o.z) < o.h / 2 + rr) return o;
    }
    return null;
  }
  wallAt(x, z, m){
    const rr = (m.r || 1.2) * 0.45;
    for (const o of this.obstacles){
      if (o.rubble || !(o.struct > 0) || !o.blocks_los) continue;
      if (Math.abs(x - o.x) < o.w / 2 + rr && Math.abs(z - o.z) < o.h / 2 + rr) return o;
    }
    return null;
  }
  wallBetween(m, foe, o){
    const dx = foe.pos.x - m.pos.x, dz = foe.pos.z - m.pos.z, l2 = dx * dx + dz * dz;
    if (l2 < 9) return false;
    let t = ((o.x - m.pos.x) * dx + (o.z - m.pos.z) * dz) / l2;
    if (t < 0.08 || t > 0.92) return false;
    const px = m.pos.x + dx * t, pz = m.pos.z + dz * t;
    return Math.hypot(px - o.x, pz - o.z) < Math.max(o.w, o.h) * 0.8;
  }
  firstWallOnSeg(x0, z0, x1, z1){
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    if (len < 1e-4) return null;
    const steps = Math.max(1, Math.ceil(len));
    for (let s = 1; s <= steps; s++){
      const t = s / steps, x = x0 + dx * t, z = z0 + dz * t;
      for (const o of this.obstacles){
        if (o.rubble || !(o.struct > 0) || !o.blocks_los) continue;
        if (Math.abs(x - o.x) <= o.w / 2 && Math.abs(z - o.z) <= o.h / 2) return { o, t, x, z };
      }
    }
    return null;
  }
  chipStructure(o, dmg){
    if (!o || o.rubble || !(o.struct > 0) || !(dmg > 0)) return;
    o.struct -= dmg;
    if (o.struct > 0) return;
    o.struct = 0; o.rubble = true; o.blocks_los = false;
    o.w *= 0.6; o.h *= 0.6; o.zh = 0.65;
    if (o.climb) o.climb = false;
    this.platforms = this.platforms.filter(p => p !== o);
    this.log('structure_break', null, { structure: o.id, x: +o.x.toFixed(1), z: +o.z.toFixed(1) });
  }
  startBreach(i, o){
    const m = this.mechs[i], lv = m.pilotLv || 1;
    const cost = Math.max(3, 11 - lv * 2);
    m.hpNow = Math.max(1, m.hpNow - cost);
    m.breachT = 8 + lv;
    m.breachCd = Math.max(45, 130 - lv * 10);
    this.chipStructure(o, 90 + lv * 20);
    this.log('exclusive_breach', i, { structure: o.id, cost, lv });
  }
  impulse(from, to, power){ return this.impulseFrom(this.mechs[from].pos.x, this.mechs[from].pos.z, from, to, power); }
  impulseFrom(x, z, from, to, power){
    if (!this.worldCfg() || !(power > 0)) return false;
    const b = this.mechs[to];
    if (!b || b.hpNow <= 0) return false;
    // Une projection, puis le mech reprend pied. Le coup suivant blesse encore, il ne le renvoie pas en l'air.
    if ((b.knockImmune || 0) > 0 || (b.knockT || 0) > 0) return false;
    let dx = b.pos.x - x, dz = b.pos.z - z, l = Math.hypot(dx, dz);
    if (l < 0.25){ const a = this.mechs[from]; dx = Math.cos((a && a.heading) || 0); dz = Math.sin((a && a.heading) || 0); l = 1; }
    let pwr = power;
    if (b.proc && b.proc.squad === 'peel' && (b.pilotLv || 0) >= 1) pwr *= Math.max(0.35, 1 - 0.12 * b.pilotLv);
    b.knockVx = dx / l * pwr; b.knockVz = dz / l * pwr;
    b.knockT = Math.max(b.knockT || 0, Math.max(4, Math.round(pwr * 1.5)));
    b.knockBy = from;
    this.log('knockback', to, { by: from, power: +pwr.toFixed(1) });
    if (pwr >= 6){
      const stun = Math.max(3, Math.round(6 + pwr) - (b.pilotLv || 0) * 2);
      b.stunTicks = Math.max(b.stunTicks || 0, stun); b.meleeState = null;
      this.log('shock', to, { by: from, stun_ticks: stun });
      return true;
    }
    return false;
  }
  coastKnock(i){
    const m = this.mechs[i];
    m.knockT--;
    const W = this.arena.width / 2, D = this.arena.depth / 2;
    const nx = Math.max(-W + 1, Math.min(W - 1, m.pos.x + m.knockVx * this.dt));
    const nz = Math.max(-D + 1, Math.min(D - 1, m.pos.z + m.knockVz * this.dt));
    const solid = this.solidAt(nx, nz, m.z || 0, m.r);
    if (solid){ this.slam(i, solid); return; }
    const rub = this.debrisAt(nx, nz);
    if (rub && (m.z || 0) < (rub.zh || 0.8)) this.trip(i, rub);
    if (!this.bodyBlocked(m, nx, nz)){ m.pos.x = nx; m.pos.z = nz; }
    m.knockVx *= 0.8; m.knockVz *= 0.8;
    if (m.knockT <= 0 || Math.hypot(m.knockVx, m.knockVz) < 0.9) this.endKnock(m);
  }
  endKnock(m){
    m.knockT = 0; m.knockVx = 0; m.knockVz = 0;
    m.knockImmune = Math.max(m.knockImmune || 0, 75);
  }
  slam(i, o){
    const m = this.mechs[i];
    const sp = Math.hypot(m.knockVx, m.knockVz);
    this.endKnock(m); m.meleeState = null;
    const dmg = Math.max(4, Math.round(sp * 2.4));
    const by = (m.knockBy != null && m.knockBy >= 0) ? m.knockBy : i;
    this.applyDamage(by, i, dmg);
    this.chipStructure(o, Math.round(sp * 8));
    if (sp >= 3.5 && (o.zh || 3) >= 2.2){
      const stun = Math.max(4, Math.round(sp + 4) - (m.pilotLv || 0) * 2);
      m.stunTicks = Math.max(m.stunTicks || 0, stun);
      this.log('shock', i, { by, stun_ticks: stun, structure: o.id });
    }
    this.log('structure_slam', i, { structure: o.id, damage: dmg, speed: +sp.toFixed(1) });
  }
  trip(i, o){
    const m = this.mechs[i];
    const sp = Math.hypot(m.knockVx, m.knockVz);
    m.knockVx *= 0.35; m.knockVz *= 0.35;
    if (sp < 2.5) return;
    if (m.staggerImmunityTicks <= 0){ m.staggeredTicks = Math.max(m.staggeredTicks || 0, 3); this.log('stagger', i, { by: m.knockBy, kind: 'debris' }); }
    const dmg = Math.max(1, Math.round(sp * 0.7));
    const by = (m.knockBy != null && m.knockBy >= 0) ? m.knockBy : i;
    this.applyDamage(by, i, dmg);
    this.log('debris_trip', i, { structure: o.id, damage: dmg });
  }
  detonate(p){
    const x = p.x, z = p.z, R = p.blast || 4, emp = p.delivery === 'emp';
    this.log('ordnance_burst', p.fromIdx, { weapon: p.weaponId, x: +x.toFixed(1), z: +z.toFixed(1), r: R, delivery: p.delivery || 'lob' });
    let any = false;
    for (let j = 0; j < this.mechs.length; j++){
      const mm = this.mechs[j];
      if (mm.hpNow <= 0) continue;
      const d = this.distance(mm.pos, { x, z });
      const rad = R + this.bodyRadius(mm);
      if (d > rad) continue;
      any = true;
      const fall = 1 - d / rad;
      const sd = Math.max(1, Math.round(p.damage * (emp ? 0.45 : 1) * (0.45 + 0.55 * fall)));
      const friendly = mm.team === this.mechs[p.fromIdx].team;
      this.log(friendly ? 'friendly_fire' : 'projectile_impact', p.fromIdx, { target: j, weapon: p.weaponId, damage: sd, crit: false, friendly });
      this.applyDamage(p.fromIdx, j, sd);
      if (emp){
        const stun = Math.max(4, (p.stunTicks || 16) - (mm.pilotLv || 0) * 2);
        mm.stunTicks = Math.max(mm.stunTicks || 0, stun); mm.meleeState = null;
        this.log('shock', j, { by: p.fromIdx, stun_ticks: stun, kind: 'emp' });
      } else if (this.worldCfg() && j !== p.fromIdx){
        const pwr = (p.damage / 10) * fall;
        if (pwr >= 1.5) this.impulseFrom(x, z, p.fromIdx, j, pwr);
      }
    }
    if (this.worldCfg()){
      for (const o of this.obstacles){
        if (!(o.struct > 0) || o.rubble) continue;
        if (Math.hypot(o.x - x, o.z - z) > R + Math.max(o.w, o.h) / 2) continue;
        this.chipStructure(o, Math.round(p.damage * (emp ? 0.25 : 0.7)));
      }
    }
    const shooter = this.mechs[p.fromIdx];
    if (any && shooter) shooter.shotsHit++;
  }
  checkOverheat(i, m){ if (m.heat >= this.ruleset.combat.overheat_threshold){
      m.heat = this.ruleset.combat.overheat_threshold;
      m.stunTicks = this.ruleset.combat.overheat_stun_seconds * this.tickRate; m.meleeState = null;
      this.log('overheated', i, { stun_ticks: m.stunTicks }); } }
}

export function segRect(a, b, x1, z1, x2, z2){
  const dx = b.x - a.x, dz = b.z - a.z; let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dz, dz], q = [a.x - x1, x2 - a.x, a.z - z1, z2 - a.z];
  for (let k = 0; k < 4; k++){ if (p[k] === 0){ if (q[k] < 0) return false; }
    else { const r = q[k] / p[k]; if (p[k] < 0){ if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; } } }
  return true;
}

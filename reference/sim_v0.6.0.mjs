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
    this.mechs = config.mechs.map((m, i) => this.makeMech(m, this.slotOf(config.mechs, i)));
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
      weapons: [r.weapons[cfg.weaponId], r.weapons[cfg.secondaryWeaponId || 'fists']], secondaryWeaponId: cfg.secondaryWeaponId || 'fists',
      meleeReach: Math.max(0, ...[r.weapons[cfg.weaponId], r.weapons[cfg.secondaryWeaponId || 'fists']].filter(w => w.type === 'melee').map(w => w.range)),
      pos: { x: spawn.x, z: spawn.z }, heading: sideSS ? sideSS.dir : (cfg.team === 0 ? 0 : Math.PI), targetIdx: null,
      hpNow: r.mechs[cfg.mechId].hp, shieldMax: r.mechs[cfg.mechId].shield, shieldNow: r.mechs[cfg.mechId].shield,
      heat: 0, cooldown: 0, cooldown2: 0, meleeState: null, pinned: false, stunTicks: 0, staggeredTicks: 0, staggerImmunityTicks: 0,
      damageDealt: 0, damageTaken: 0, shotsFired: 0, shotsHit: 0, crits: 0, dodges: 0, ticksMoved: 0, ticksStationary: 0,
      improvShield: 0, improvLabel: null,
      smokeUsed: false, loggedDead: false,
      baseSpeedMps: r.mechs[cfg.mechId].speed_mps, droppedOnce: false, prevWeaponId: null,
      vel: { x: 0, z: 0 }, lastHitTick: -999, passiveActive: false,
      prevPos: { x: spawn.x, z: spawn.z } };
  }
  log(type, mech, data){ this.events.push({ tick: this.tick, type, mech, ...(data || {}) }); }
  otherIdx(i){ return this.mechs.findIndex(m => m.team !== this.mechs[i].team); } // 1v1 rétrocompat
  enemiesOf(i){ const out = []; for (let j = 0; j < this.mechs.length; j++) if (j !== i && this.mechs[j].team !== this.mechs[i].team && this.mechs[j].hpNow > 0) out.push(j); return out; }
  // D-024 : sélection de cible — profil par processeur (data-driven), sticky (focus-fire), déterministe
  targetOf(i){ const m = this.mechs[i]; const es = this.enemiesOf(i);
    if (es.length === 0) return null;
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
    for (const o of this.obstacles){ if (!o.blocks_los) continue;
      const x1 = o.x - o.w / 2, x2 = o.x + o.w / 2, z1 = o.z - o.h / 2, z2 = o.z + o.h / 2;
      if (segRect(a, b, x1, z1, x2, z2)) return false; } return true; }
  blockedAt(x, z){ for (const o of this.obstacles){
      if (Math.abs(x - o.x) < o.w / 2 + 1.0 && Math.abs(z - o.z) < o.h / 2 + 1.0) return true; } return false; }

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
    m.prevPos = { ...m.pos };
    if (m.stunTicks > 0){ m.stunTicks--; m.heat = Math.max(0, m.heat - this.ruleset.combat.overheat_threshold / (this.tickRate * this.ruleset.combat.overheat_stun_seconds)); return; }
    if (m.staggeredTicks > 0){ m.staggeredTicks--; if (m.staggerImmunityTicks > 0) m.staggerImmunityTicks--; return; } // D-024 : le stagger fait perdre son tour, immunité décrémentée ensuite
    if (m.staggerImmunityTicks > 0) m.staggerImmunityTicks--;
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
    if (m.meleeState){ m.meleeState.ticks--;
      if (m.meleeState.ticks <= 0){
        if (m.meleeState.phase === 'windup'){ const w = m.weapons[m.meleeState.slot || 0];
          if (foe.hpNow <= 0){ m.meleeState = { phase: 'recovery', ticks: w.recovery_ticks }; return; } // D-024 : cible tombée entre-temps → coup dans le vide
          const d = this.distance(m.pos, foe.pos);
          const acc = Math.min(0.98, w.accuracy + 0.01 * 5);
          if (d <= w.range * 1.15 && this.rng.chance(acc)){
            const crit = this.rng.chance(w.crit_chance || 0);
            const dmg = crit ? Math.round(w.damage * (w.crit_mult || 1)) : w.damage;
            this.log('melee_attack', i, { target: m.targetIdx, damage: dmg, crit, weapon: m.meleeState.weaponId });
            if (crit){ m.crits++; this.log('critical_hit', i, { target: m.targetIdx, damage: dmg }); }
            this.applyDamage(i, m.targetIdx, dmg);
            if (w.stagger && foe.hpNow > 0 && foe.staggerImmunityTicks <= 0){ // D-024 : immunité post-stagger — pas de verrouillage en chaîne
              foe.staggeredTicks = 4; foe.staggerImmunityTicks = 4 + this.ruleset.combat.stagger_immunity_ticks; this.log('stagger', m.targetIdx, { by: i }); }
          } else this.log('attack_missed', i, { kind: 'melee' });
          m.heat += w.heat; this.checkOverheat(i, m);
          m.meleeState = { phase: 'recovery', ticks: w.recovery_ticks };
        } else m.meleeState = null; }
      return; }
    const isMelee = m.weapon.type === 'melee';
    const inRange = isMelee ? dist <= m.weapon.range
      : dist <= m.weapon.range && dist >= m.weapon.min_range && this.losClear(m.pos, foe.pos);
    // D-026 : stabilité du châssis (garage D-019) accélère la visée — réduction plafonnée, déterministe
    const cc = this.ruleset.combat;
    const stabRed = Math.min(cc.stability_ticks_cap || 2, Math.floor((m.stability || 0) / (cc.stability_ticks_per || 15)));
    const stab = isMelee ? 0 : Math.max(0, (m.weapon.stabilization_ticks || 0) - stabRed); // D-021 : on s'immobilise pour tirer
    if (inRange && m.cooldown === 0 && m.ticksStationary >= stab && (!isMelee || this.rng.chance(m.proc.aggression))){
      if (isMelee){ m.meleeState = { phase: 'windup', ticks: m.weapon.windup_ticks, slot: 0, weaponId: m.weaponId }; return; }
      this.fireProjectile(i, this.otherIdx(i));
      return; }
    const bracing = !isMelee && inRange && m.cooldown === 0 && m.ticksStationary < stab; // D-021 : tracking shot — on ralentit pour épauler, pas d'arrêt total
    const sec = m.weapons[1];
    const wantSecMelee = sec && sec.type === 'melee' && m.weapon.type !== 'melee' &&
      (m.proc.preferred_range <= sec.range + 1.5 || m.pinned);
    if (wantSecMelee && dist <= sec.range && m.cooldown2 === 0 && this.rng.chance(m.proc.aggression)){
      m.meleeState = { phase: 'windup', ticks: sec.windup_ticks, slot: 1, weaponId: m.secondaryWeaponId }; return; }
    // bouclier improvisé (D-020) : un mech capable de mêlée ramasse une épave à portée de main
    if (!m.improvShield && (isMelee || wantSecMelee) && dist > m.meleeReach * 2){
      const pi = this.obstacles.findIndex(o => o.pickable &&
        Math.hypot(o.x - m.pos.x, o.z - m.pos.z) < o.w / 2 + 2.2);
      if (pi !== -1){ const prop = this.obstacles[pi];
        if (prop.weaponId && prop.droppedBy === i && m.weaponId === 'fists'){
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
        m.weaponId = 'fists'; m.weapon = this.ruleset.weapons.fists; m.weapons[0] = this.ruleset.weapons.fists;
        m.meleeReach = Math.max(m.meleeReach, this.ruleset.weapons.fists.range);
        m.speed_mps = m.baseSpeedMps * (1 + (this.ruleset.combat.drop_speed_bonus || 0.25));
        m.cooldown = 0; m.meleeState = null; m.ticksStationary = 0;
        this.log('weapon_dropped', i, { weapon: m.prevWeaponId }); } }
    const evade = bracing ? false : this.rng.chance(m.proc.evasion_frequency * 0.15);
    const pref = m.proc.preferred_range;
    let nx = m.pos.x, nz = m.pos.z;
    // objectif intermédiaire (D-020) : un mêlée qui affronte un tireur fait un détour par une épave ramassable
    let tgtX = foe.pos.x, tgtZ = foe.pos.z;
    if (!m.improvShield && (isMelee || wantSecMelee) && foe.weapon.type === 'ranged' && dist > m.meleeReach + 3){
      let bd = 14 * 14, bw = null; // rayon de détour = hypothèse D-020
      for (const o of this.obstacles){ if (!o.pickable) continue;
        const dd = (o.x - m.pos.x) ** 2 + (o.z - m.pos.z) ** 2;
        if (dd < bd){ bd = dd; bw = o; } }
      if (bw){ tgtX = bw.x; tgtZ = bw.z; } }
    const tdist = Math.hypot(tgtX - m.pos.x, tgtZ - m.pos.z) || 1;
    const ux = (tgtX - m.pos.x) / tdist, uz = (tgtZ - m.pos.z) / tdist;
    const bmf = (m.proc.brace_move_factor != null ? m.proc.brace_move_factor : (this.ruleset.combat.brace_move_factor || 0.5)); // tracking shot : visée en mouvement lent
    if (dist > pref + 1.5 || (isMelee && dist > m.weapon.range) ||
        (wantSecMelee && dist > sec.range)){
      if (m.ticksMoved === 0) this.log('movement_started', i, { toward: m.targetIdx });
      const sf = bracing ? bmf : 1;
      nx += ux * m.speed_mps * this.dt * sf; nz += uz * m.speed_mps * this.dt * sf; m.ticksMoved++;
    } else if (dist < pref - 1.5){ const rsf = this.ruleset.combat.retreat_speed_factor; const sf = bracing ? bmf : 1;
      // D-024 : repli multi-menaces — on s'écarte du centre de gravité des poursuivants proches (pas de recul tout droit dans le 2e chasseur)
      let rx = -ux, rz = -uz;
      const rar = this.ruleset.combat.retreat_aware_radius || 20;
      const near = this.mechs.filter(o => o.team !== m.team && o.hpNow > 0 && this.distance(o.pos, m.pos) < rar);
      if (near.length >= 2){ let sx = 0, sz = 0;
        for (const o of near){ const dd = this.distance(o.pos, m.pos) || 1; sx += (m.pos.x - o.pos.x) / dd; sz += (m.pos.z - o.pos.z) / dd; }
        const sl = Math.hypot(sx, sz) || 1; rx = sx / sl; rz = sz / sl; }
      nx += rx * m.speed_mps * this.dt * rsf * sf; nz += rz * m.speed_mps * this.dt * rsf * sf; m.ticksMoved++; }
    if (evade){ nx += -uz * m.speed_mps * this.dt * 2; nz += ux * m.speed_mps * this.dt * 2; }
    // couvert actif (D-020) : pendant son rechargement, un profil avec cover_usage se replace hors LOS (peek-shooting)
    if (!bracing && !isMelee && foe.weapon.type === "ranged" && m.cooldown > 3 && dist <= m.weapon.range && (m.proc.cover_usage || 0) >= 0.25 && this.losClear(m.pos, foe.pos)){
      const cp = this.coverPoint(m, foe);
      if (cp){ const cdx = cp.x - m.pos.x, cdz = cp.z - m.pos.z, cd = Math.hypot(cdx, cdz) || 1;
        nx = m.pos.x + cdx / cd * m.speed_mps * this.dt; nz = m.pos.z + cdz / cd * m.speed_mps * this.dt; m.ticksMoved++; } }
    const W = this.arena.width / 2, D = this.arena.depth / 2;
    const clampA = (x, z) => [Math.max(-W + 1, Math.min(W - 1, x)), Math.max(-D + 1, Math.min(D - 1, z))];
    // glissement déterministe le long des obstacles (contournement sans pathfinding complet)
    const dxm = nx - m.pos.x, dzm = nz - m.pos.z;
    const len = Math.hypot(dxm, dzm);
    if (len > 1e-9){
      const baseAng = Math.atan2(dzm, dxm);
      const sgn = (i % 2 === 0) ? 1 : -1; // asymétrie par mech : évite les blocages symétriques face à face
      for (const da of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]){
        const a = baseAng + da * sgn;
        const [cx, cz] = clampA(m.pos.x + Math.cos(a) * len, m.pos.z + Math.sin(a) * len);
        if (!this.blockedAt(cx, cz)){ m.pos.x = cx; m.pos.z = cz; break; }
      }
    }
    const mdx = m.pos.x - m.prevPos.x, mdz = m.pos.z - m.prevPos.z;
    m.ticksStationary = bracing ? m.ticksStationary + 1 : 0; // D-021 : chaque tick de visée compte (tracking shot), reset sinon
    m.vel = { x: mdx / this.dt, z: mdz / this.dt };
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
    const acc = Math.min(0.98, w.accuracy + (m.accuracy_bonus || 0));
    const err = (1 - acc) * dist * c.aim_error_factor;
    const ang = this.rng.range(-Math.PI, Math.PI), rad = this.rng.range(0, err);
    ax += Math.cos(ang) * rad; az += Math.sin(ang) * rad;
    ax = Math.max(-this.arena.width / 2 + 1, Math.min(this.arena.width / 2 - 1, ax));
    az = Math.max(-this.arena.depth / 2 + 1, Math.min(this.arena.depth / 2 - 1, az));
    const aim = { x: ax, z: az };
    const total = this.distance(m.pos, aim);
    this.projectiles.push({ team: m.team, fromIdx: i, weaponId: m.weaponId,
      x: m.pos.x, z: m.pos.z, dx: (aim.x - m.pos.x) / (total || 1), dz: (aim.z - m.pos.z) / (total || 1),
      speed: w.proj_speed_mps, traveled: 0, maxDist: total,
      damage: w.damage, crit_chance: w.crit_chance || 0, crit_mult: w.crit_mult || 1 });
    m.shotsFired++;
    this.log('weapon_fired', i, { target: targetIdx, weapon: m.weaponId, fx: m.pos.x, fz: m.pos.z, tx: aim.x, tz: aim.z, proj_speed: w.proj_speed_mps });
    m.cooldown = w.cooldown_ticks; m.heat += w.heat; this.checkOverheat(i, m);
  }
  stepProjectiles(){ const c = this.ruleset.combat;
    for (const p of this.projectiles){
      const step = p.speed * this.dt;
      if (p.traveled + step >= p.maxDist){
        p.x += p.dx * (p.maxDist - p.traveled); p.z += p.dz * (p.maxDist - p.traveled); p.traveled = p.maxDist; p.arrived = true;
      } else { p.x += p.dx * step; p.z += p.dz * step; p.traveled += step; } }
    // résolution des projectiles arrivés
    const still = [];
    for (const p of this.projectiles){
      if (!p.arrived){ still.push(p); continue; }
      const targetIdx = this.mechs.findIndex(m => m.team !== p.team && m.hpNow > 0 &&
        this.distance(m.pos, { x: p.x, z: p.z }) <= c.proj_hit_radius);
      const shooter = this.mechs[p.fromIdx];
      if (targetIdx !== -1){
        const crit = this.rng.chance(p.crit_chance);
        const dmg = crit ? Math.round(p.damage * p.crit_mult) : p.damage;
        shooter.shotsHit++;
        this.log('projectile_impact', p.fromIdx, { target: targetIdx, weapon: p.weaponId, damage: dmg, crit });
        if (crit){ shooter.crits++; this.log('critical_hit', p.fromIdx, { target: targetIdx, damage: dmg }); }
        this.applyDamage(p.fromIdx, targetIdx, dmg);
      } else {
        let foe = -1, bd = Infinity; // D-024 : l'esquive est attribuée à l'ennemi vivant le plus proche du point d'impact
        for (let j = 0; j < this.mechs.length; j++){ const mm = this.mechs[j];
          if (mm.team === p.team || mm.hpNow <= 0) continue;
          const dd = this.distance(mm.pos, { x: p.x, z: p.z }); if (dd < bd){ bd = dd; foe = j; } }
        if (foe !== -1){ this.mechs[foe].dodges++; }
        this.log('attack_missed', p.fromIdx, { kind: 'dodge', weapon: p.weaponId, x: p.x, z: p.z });
      } }
    this.projectiles = still;
  }

  applyDamage(fromIdx, toIdx, dmg){ const m = this.mechs[toIdx]; let d = dmg;
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
      if (this.blockedAt(px, pz)) continue;
      const d = Math.hypot(px - m.pos.x, pz - m.pos.z);
      if (d < bestD && d > 0.5){ bestD = d; best = { x: px, z: pz }; } }
    return best; }
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
export const RULESET = {
  "version": "0.6.0",
  "simulation": {
    "tick_hz": 15,
    "battle_timeout_seconds": 120
  },
  "arenas": {
    "proving_grounds": {
      "label": "TERRAIN D'ESSAI",
      "width": 80,
      "depth": 40,
      "spawns": [
        {
          "x": -30,
          "z": -10
        },
        {
          "x": 30,
          "z": 10
        }
      ],
      "spawn_sides": {
        "alpha": { "type": "drop", "x": -36, "z": 0, "dir": 0 },
        "omega": { "type": "drop", "x": 36, "z": 0, "dir": 3.14159 }
      },
      "obstacles": [
        {
          "id": "cover_left",
          "x": -18,
          "z": 2,
          "w": 6,
          "h": 3,
          "blocks_los": true,
          "kind": "cover"
        },
        {
          "id": "cover_right",
          "x": 18,
          "z": -2,
          "w": 6,
          "h": 3,
          "blocks_los": true,
          "kind": "cover"
        },
        {
          "id": "crate_mid",
          "x": 0,
          "z": 12,
          "w": 4,
          "h": 4,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "pillar_high",
          "x": -5,
          "z": -12,
          "w": 3,
          "h": 3,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "wreck_a",
          "x": -24,
          "z": -14,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        },
        {
          "id": "wreck_b",
          "x": 24,
          "z": 14,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        }
      ]
    },
    "open_field": {
      "label": "PLAINE OUVERTE",
      "width": 90,
      "depth": 30,
      "spawns": [
        {
          "x": -40,
          "z": 0
        },
        {
          "x": 40,
          "z": 0
        }
      ],
      "spawn_sides": {
        "alpha": { "type": "corridor", "x": -41, "z": 0, "dir": 0 },
        "omega": { "type": "corridor", "x": 41, "z": 0, "dir": 3.14159 }
      },
      "obstacles": [
        {
          "id": "crate_a",
          "x": -25,
          "z": 9,
          "w": 4,
          "h": 3,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "crate_b",
          "x": 25,
          "z": -9,
          "w": 4,
          "h": 3,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "wreck_a",
          "x": -15,
          "z": -8,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        },
        {
          "id": "wreck_b",
          "x": 15,
          "z": 8,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        }
      ]
    },
    "industrial_complex": {
      "label": "COMPLEXE INDUSTRIEL",
      "width": 70,
      "depth": 50,
      "spawns": [
        {
          "x": -30,
          "z": 0
        },
        {
          "x": 30,
          "z": 0
        }
      ],
      "spawn_sides": {
        "alpha": { "type": "corridor", "x": -31, "z": 0, "dir": 0 },
        "omega": { "type": "corridor", "x": 31, "z": 0, "dir": 3.14159 }
      },
      "obstacles": [
        {
          "id": "pillar_a",
          "x": -15,
          "z": 15,
          "w": 3,
          "h": 3,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "pillar_b",
          "x": -15,
          "z": -15,
          "w": 3,
          "h": 3,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "pillar_c",
          "x": 15,
          "z": 15,
          "w": 3,
          "h": 3,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "pillar_d",
          "x": 15,
          "z": -15,
          "w": 3,
          "h": 3,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "core_block",
          "x": 0,
          "z": 0,
          "w": 5,
          "h": 5,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "catwalk_n",
          "x": 0,
          "z": 22,
          "w": 4,
          "h": 3,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "catwalk_s",
          "x": 0,
          "z": -22,
          "w": 4,
          "h": 3,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "wreck_a",
          "x": -25,
          "z": 8,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        },
        {
          "id": "wreck_b",
          "x": 25,
          "z": -8,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        }
      ]
    },
    "canyon_run": {
      "label": "DÉFILÉ",
      "width": 100,
      "depth": 24,
      "spawns": [
        {
          "x": -45,
          "z": 0
        },
        {
          "x": 45,
          "z": 0
        }
      ],
      "spawn_sides": {
        "alpha": { "type": "drop", "x": -45, "z": 0, "dir": 0 },
        "omega": { "type": "drop", "x": 45, "z": 0, "dir": 3.14159 }
      },
      "obstacles": [
        {
          "id": "plat_left",
          "x": -10,
          "z": 8.5,
          "w": 8,
          "h": 3,
          "blocks_los": false,
          "kind": "platform"
        },
        {
          "id": "plat_right",
          "x": 10,
          "z": -8.5,
          "w": 8,
          "h": 3,
          "blocks_los": false,
          "kind": "platform"
        },
        {
          "id": "spire_mid",
          "x": 0,
          "z": 0,
          "w": 3,
          "h": 4,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "wreck_a",
          "x": -20,
          "z": -9,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        },
        {
          "id": "wreck_b",
          "x": 20,
          "z": 9,
          "w": 2,
          "h": 2,
          "blocks_los": false,
          "kind": "prop",
          "pickable": true,
          "prop_hp": 12,
          "label": "ÉPAVE"
        }
      ]
    }
  },
  "combat": {
    "overheat_threshold": 100,
    "overheat_stun_seconds": 3,
    "min_damage_after_armor": 1,
    "proj_hit_radius": 1.5,
    "aim_error_factor": 0.18,    "aim_lead_factor": 0.75,
    "retreat_speed_factor": 0.7,
    "brace_move_factor": 0.6,
    "drop_speed_bonus": 0.25,
    "shield_regen_delay_ticks": 60,
    "shield_regen_per_s": 4,
    "stagger_immunity_ticks": 30,
    "stability_ticks_per": 15,
    "stability_ticks_cap": 2,
    "retreat_aware_radius": 20,
    "smoke": {
      "enabled": true,
      "radius": 8,
      "duration_ticks": 105,
      "default_hp_threshold": 0.5,
      "phantom_hp_threshold": 0.85,
      "charges": 1
    }
  },
  "weapons": {
    "autocannon_mk1": {
      "type": "ranged",
      "range": 40,
      "min_range": 0,
      "damage": 12,
      "cooldown_ticks": 13,
      "heat": 5,
      "accuracy": 0.85,
      "proj_speed_mps": 100,
      "crit_chance": 0.1,
      "crit_mult": 1.5,
      "stabilization_ticks": 2,
      "label": "AUTOCANON MK1"
    },
    "seraph_lrm_pod": {
      "type": "ranged",
      "range": 70,
      "min_range": 15,
      "damage": 36,
      "cooldown_ticks": 26,
      "heat": 9,
      "accuracy": 0.75,
      "proj_speed_mps": 70,
      "crit_chance": 0.15,
      "crit_mult": 1.75,
      "stabilization_ticks": 2,
      "label": "SERAPH LRM"
    },
    "reaver_blade": {
      "type": "melee",
      "range": 3,
      "damage": 24,
      "windup_ticks": 8,
      "recovery_ticks": 12,
      "heat": 10,
      "accuracy": 0.85,
      "crit_chance": 0.2,
      "crit_mult": 2,
      "stagger": true,
      "label": "LAME REAVER"
    },
    "impact_ram": {
      "type": "melee",
      "range": 2.5,
      "damage": 14,
      "windup_ticks": 3,
      "recovery_ticks": 6,
      "heat": 6,
      "accuracy": 0.85,
      "crit_chance": 0.1,
      "crit_mult": 1.75,
      "stagger": true,
      "label": "BÉLIER D'IMPACT"
    },
    "rail_gun_mk1": {
      "type": "ranged",
      "range": 80,
      "min_range": 18,
      "damage": 42,
      "cooldown_ticks": 34,
      "heat": 12,
      "accuracy": 0.9,
      "proj_speed_mps": 150,
      "crit_chance": 0.2,
      "crit_mult": 2,
      "stabilization_ticks": 4,
      "label": "RAILLARD MK1"
    },
    "scatter_gun_mk1": {
      "type": "ranged",
      "range": 18,
      "min_range": 0,
      "damage": 15,
      "cooldown_ticks": 12,
      "heat": 5,
      "accuracy": 0.8,
      "proj_speed_mps": 60,
      "crit_chance": 0.1,
      "crit_mult": 1.5,
      "stabilization_ticks": 1,
      "label": "FUSIL À ÉCLATS"
    },
    "war_pike_mk1": {
      "type": "melee",
      "range": 3.8,
      "damage": 18,
      "windup_ticks": 5,
      "recovery_ticks": 9,
      "heat": 5,
      "accuracy": 0.8,
      "crit_chance": 0.15,
      "crit_mult": 1.75,
      "stagger": true,
      "label": "PIQUE D'ASSAUT"
    },
    "grinder_mk1": {
      "type": "melee",
      "range": 2,
      "damage": 11,
      "windup_ticks": 2,
      "recovery_ticks": 2,
      "heat": 2,
      "accuracy": 0.9,
      "crit_chance": 0.1,
      "crit_mult": 1.25,
      "stagger": false,
      "label": "BROYEUR À CHAÎNES"
    },
    "fists": {
      "type": "melee",
      "range": 1.8,
      "damage": 8,
      "windup_ticks": 3,
      "recovery_ticks": 5,
      "heat": 2,
      "accuracy": 0.8,
      "crit_chance": 0.05,
      "crit_mult": 1.5,
      "stagger": false,
      "hidden": true,
      "label": "POINGS"
    }
  },
  "mechs": {
    "hound_prime": {
      "class": "heavy",
      "speed_mps": 3.6,
      "hp": 200,
      "armor": 22,
      "shield": 0,
      "cooling_per_s": 8,
      "passive": {
        "id": "bulwark_protocol",
        "label": "PROTOCOLE BASTION",
        "hp_threshold": 0.5,
        "dr_bonus": 0.25
      },
      "label": "HOUND PRIME (HEAVY)"
    },
    "longbow_mk1": {
      "class": "artillery",
      "speed_mps": 4.2,
      "hp": 160,
      "armor": 18,
      "shield": 40,
      "cooling_per_s": 6,
      "passive": {
        "id": "aegis_loop",
        "label": "BOUCLE ÉGIDE",
        "regen_delay_ticks": 60,
        "regen_per_s": 4
      },
      "label": "LONGBOW MK1 (ARTILLERY)"
    },
    "warden_x1": {
      "class": "assault",
      "speed_mps": 3.8,
      "hp": 180,
      "armor": 20,
      "shield": 20,
      "cooling_per_s": 7,
      "passive": {
        "id": "bulwark_protocol",
        "label": "PROTOCOLE BASTION",
        "hp_threshold": 0.5,
        "dr_bonus": 0.25
      },
      "label": "WARDEN X1 (ASSAUT)"
    },
    "ghost_lt": {
      "class": "scout",
      "speed_mps": 4.6,
      "hp": 150,
      "armor": 15,
      "shield": 35,
      "cooling_per_s": 5,
      "passive": {
        "id": "aegis_loop",
        "label": "BOUCLE ÉGIDE",
        "regen_delay_ticks": 60,
        "regen_per_s": 4
      },
      "label": "GHOST LT (ÉCLAIREUR)"
    }
  },
  "processors": {
    "berserker": {
      "preferred_range": 3,
      "aggression": 0.9,
      "risk_tolerance": 0.8,
      "cover_usage": 0,
      "evasion_frequency": 0.1,
      "retreat_threshold": 0.05,
      "targeting": "closest",
      "smoke_hp_threshold": 0.5,
      "label": "BERSERKER"
    },
    "tactician": {
      "preferred_range": 35,
      "aggression": 0.5,
      "risk_tolerance": 0.4,
      "cover_usage": 0.6,
      "evasion_frequency": 0.3,
      "retreat_threshold": 0.3,
      "targeting": "weakest",
      "smoke_hp_threshold": 0.5,
      "label": "TACTICIAN"
    },
    "guardian": {
      "preferred_range": 25,
      "aggression": 0.35,
      "risk_tolerance": 0.2,
      "cover_usage": 0.8,
      "evasion_frequency": 0.2,
      "retreat_threshold": 0.5,
      "targeting": "protector",
      "smoke_hp_threshold": 0.5,
      "label": "GUARDIAN"
    },
    "phantom": {
      "preferred_range": 18,
      "aggression": 0.6,
      "risk_tolerance": 0.5,
      "cover_usage": 0.3,
      "evasion_frequency": 0.7,
      "retreat_threshold": 0.25,
      "targeting": "weakest",
      "smoke_hp_threshold": 0.85,
      "label": "PHANTOM"
    }
  }
};



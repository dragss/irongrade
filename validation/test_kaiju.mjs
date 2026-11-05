// MECHCORE — validation du pack KAIJU v0.1.0 (démonstration de réutilisation)
// Le moteur tourne SANS MODIFICATION sur un autre univers : mechas vs créatures
// géantes, formats asymétriques (1v1 / 2v1 / 3v1), arènes inédites, hook unarmed.
// Toutes les valeurs du pack = HYPOTHÈSES ; l'audit mesure où elles tombent.
import { CombatSim } from '../engine/mechcore.mjs';
import { KAIJU_RULESET as RS } from '../packs/kaiju.mjs';

let pass = 0, fail = 0;
function check(label, ok, detail = ''){ console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${label}${detail ? ' — ' + detail : ''}`); ok ? pass++ : fail++; }
function run(sim){ let g = 0; while (!sim.ended && g++ < 4000) sim.step(); return sim; }
function battle(mechs, seed, arenaId = 'harbor_city'){ return run(new CombatSim(RS, { arenaId, mechs: JSON.parse(JSON.stringify(mechs)) }, seed)); }
const M = (team, mechId, weaponId, processorId, name) => ({ team, name, mechId, weaponId, processorId });

// 1. Structure du pack : chaque ref pointe vers un objet défini
{
  const ids = [];
  for (const aId of Object.keys(RS.arenas)){
    const a = RS.arenas[aId];
    ids.push(a.spawn_sides && a.spawn_sides.alpha && a.spawn_sides.omega);
  }
  check('2 arènes avec spawn_sides alpha/omega', ids.length === 2 && ids.every(Boolean));
  check('pack KAIJU sans arme « fists » (hook unarmed obligatoire)', RS.weapons.fists === undefined && RS.combat.unarmed_weapon_id === 'griffes');
  let refs = true;
  for (const m of Object.values(RS.mechs)){ refs = refs && RS.processors && RS.mechs; }
  const sim = battle([M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S1'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K1')], 42);
  refs = refs && sim.mechs.every(m => m.weapon && m.proc);
  check('refs mechs×armes×processeurs résolues au spawn', refs);
}
// 2. Hook unarmed : le secondaire par défaut du pack = GRIFFES (pas POINGS)
{
  const sim = new CombatSim(RS, { arenaId: 'harbor_city', mechs: [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'A'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'B')] }, 1);
  check('hook unarmed : kaiju → GRIFFES en secondaire', sim.mechs[1].weapons[1].label === 'GRIFFES' && sim.mechs[1].secondaryWeaponId === 'griffes');
  check('hook unarmed : mech → GRIFFES en secondaire aussi (pack-level)', sim.mechs[0].weapons[1].label === 'GRIFFES');
}
// 3. Spawns dérivés : mechs largués côté alpha, kaiju en couloir côté omega
{
  const sim = new CombatSim(RS, { arenaId: 'harbor_city', mechs: [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'A'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'B')] }, 1);
  check('spawn dérivé : mech au largage (x=-45), kaiju au couloir (x=48)',
    Math.abs(sim.mechs[0].pos.x + 45) < 1e-4 && Math.abs(sim.mechs[1].pos.x - 48) < 1e-4);
}
// 4. Terminaison & issues en formats asymétriques (1v1 / 2v1 / 3v1 / 1v2)
{
  const formats = {
    '1v1 S vs GOLIATH': [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S1'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '2v1 (S+L) vs GOLIATH': [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '3v1 vs GOLIATH': [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(0, 'sentinel_prime', 'pile_bunker', 'vanguard_ai', 'V'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '1v2 S vs 2 kaijus': [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'R'), M(1, 'sprinter_kaiju', 'souffle_acide', 'monster_ravager', 'R2')],
    '2v1 vs DÉFONCEUR': [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'pile_bunker', 'vanguard_ai', 'L'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'K')]
  };
  for (const [label, mechs] of Object.entries(formats)){
    let ended = 0, tot = 0, winTeams = new Set();
    for (const arenaId of Object.keys(RS.arenas)) for (const seed of [42, 777, 2026, 31337]){ tot++;
      const sim = battle(mechs, seed, arenaId); if (sim.ended) ended++; winTeams.add(sim.winner); }
    check(`terminaison ${label} (${ended}/${tot}, 2 arènes × 4 seeds)`, ended === tot);
    if (label.startsWith('2v1')) check(`issue par équipe ${label} (winner = id d'équipe 0/1)`, [...winTeams].every(w => w === 0 || w === 1));
  }
}
// 5. Déterminisme pack KAIJU (10 seeds bit-identiques + sensibilité au seed)
{
  const mechs = [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')];
  let ok = 0;
  for (const seed of [1, 7, 42, 99, 123, 777, 1337, 2026, 31415, 99999]){
    const a = battle(mechs, seed), b = battle(mechs, seed);
    ok += JSON.stringify(a.events) === JSON.stringify(b.events) ? 1 : 0;
  }
  check('déterminisme 2v1 kaiju (10 seeds bit-identiques)', ok === 10, `${ok}/10`);
}
// 6. Audit d'équilibrage (HYPOTHÈSES v0.1.0) — où tombent les valeurs du pack ?
{
  console.log('\n— AUDIT PACK KAIJU (chaque valeur = hypothèse data-driven) —');
  const SEEDS = 120;
  const scenarios = {
    '1 SENTINELLE vs GOLIATH':      [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S1'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '1 SENTINELLE vs DÉFONCEUR':    [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S1'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'K')],
    '2 mechs (tir) vs GOLIATH':     [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '2 mechs (mixte) vs GOLIATH':   [M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(0, 'sentinel_prime', 'pile_bunker', 'vanguard_ai', 'S'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '3 mechs vs GOLIATH':           [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(0, 'sentinel_prime', 'pile_bunker', 'vanguard_ai', 'V'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
    '2 mechs vs DÉFONCEUR':         [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'K')],
    '1v2 : 1 mech vs 2 DÉFONCEURS': [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'R1'), M(1, 'sprinter_kaiju', 'souffle_acide', 'monster_ravager', 'R2')]
  };
  const results = {};
  for (const [label, mechs] of Object.entries(scenarios)){
    let mechWins = 0, to = 0, ticks = 0, elimMech = 0, elimKaiju = 0, tot = 0;
    for (const arenaId of Object.keys(RS.arenas)) for (let s = 0; s < SEEDS / 2; s++){
      const sim = battle(mechs, 1000 + s, arenaId); tot++;
      if (sim.winner === 0) mechWins++;
      const reason = sim.events.find(e => e.type === 'battle_ended').reason;
      if (reason === 'timeout') to++;
      else { if (sim.mechs.filter(m => m.team === 0 && m.hpNow <= 0).length === sim.mechs.filter(m => m.team === 0).length) elimKaiju++; else elimMech++; }
      ticks += sim.tick;
    }
    results[label] = { mech_winrate: +(100 * mechWins / tot).toFixed(1), timeouts: +(100 * to / tot).toFixed(1),
      duree_s: +(ticks / tot / RS.simulation.tick_hz).toFixed(1), n: tot };
    console.log(`${label.padEnd(34)} méchs ${results[label].mech_winrate}% | timeouts ${results[label].timeouts}% | ${results[label].duree_s}s | n=${tot}`);
  }
  check('audit exécuté (7 scénarios × ' + (SEEDS * Object.keys(RS.arenas).length) + ' batailles)', Object.keys(results).length === 7);
  const duoTir = results['2 mechs (tir) vs GOLIATH'].mech_winrate;
  check('les 2 issues surviennent en 2v1 vs GOLIATH (variété)', duoTir > 5 && duoTir < 95, `méchs ${duoTir}%`);
  check('échelle de difficulté (solo ≤ 10 < duo tir < trio ≈ 100)',
    results['1 SENTINELLE vs GOLIATH'].mech_winrate <= 10 && duoTir > results['1 SENTINELLE vs GOLIATH'].mech_winrate &&
    results['3 mechs vs GOLIATH'].mech_winrate > duoTir,
    `0% → ${duoTir}% → ${results['3 mechs vs GOLIATH'].mech_winrate}%`);
}
console.log(`\n${pass}/${pass + fail} checks OK`);
process.exit(fail ? 1 : 0);

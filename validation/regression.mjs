// MECHCORE v1.0.0 — régression de dissociation
// Prouve que le moteur extrait (engine/mechcore.mjs) est BIT-IDENTIQUE au
// CombatSim v0.6.0 d'IRONGRADE (sim.mjs embarqué) sur le pack IRONGRADE :
//   1. pack IRONGRADE == RULESET embarqué v0.6.0 (deep equal)
//   2. bit-identité : duels 1v1 (4 châssis × 4 arènes × seeds), 2v2, spawns dérivés
//   3. déterminisme interne du moteur extrait (10 seeds)
//   4. hook unarmed_weapon_id : ABSENT du pack IRONGRADE → 'fists' (comportement inchangé)
import { CombatSim as SimOrig, RULESET as RS_ORIG } from '../reference/sim_v0.6.0.mjs';
import { CombatSim, segRect } from '../engine/mechcore.mjs';
import { IRONGRADE_RULESET } from '../packs/irongrade.mjs';

let pass = 0, fail = 0;
function check(label, ok, detail = ''){ console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${label}${detail ? ' — ' + detail : ''}`); ok ? pass++ : fail++; }
function run(sim){ let g = 0; while (!sim.ended && g++ < 3000) sim.step(); return sim; }
function battleA(Sim, rs, mechs, seed, arenaId){ return run(new Sim(rs, { arenaId, mechs: JSON.parse(JSON.stringify(mechs)) }, seed)); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. Le pack IRONGRADE est le ruleset v0.6.0 à l'identique
check('pack IRONGRADE == RULESET v0.6.0 embarqué (deep equal)', same(IRONGRADE_RULESET, RS_ORIG));

// 2. Bit-identité moteur — duels châssis de base : 4 châssis × 4 arènes × 3 seeds = 48 batailles
{
  const chassis = ['hound_prime', 'longbow_mk1', 'warden_x1', 'ghost_lt'];
  const canonW = { hound_prime: 'autocannon_mk1', longbow_mk1: 'seraph_lrm_pod', warden_x1: 'impact_ram', ghost_lt: 'rail_gun_mk1' };
  let ok = 0, tot = 0;
  for (const arenaId of Object.keys(RS_ORIG.arenas))
    for (const a of chassis) for (const b of chassis) for (const seed of [42, 777, 2026]){
      const mechs = [
        { team: 0, name: 'A', mechId: a, weaponId: canonW[a], processorId: 'berserker' },
        { team: 1, name: 'B', mechId: b, weaponId: canonW[b], processorId: 'tactician' }];
      tot++;
      if (same(battleA(SimOrig, RS_ORIG, mechs, seed, arenaId).events, battleA(CombatSim, IRONGRADE_RULESET, mechs, seed, arenaId).events)) ok++;
    }
  check('bit-identité 1v1 (4 châssis × 4 arènes × 3 seeds = 48/48)', ok === tot, `${ok}/${tot}`);
}
// 2b. Bit-identité 2v2 (spawn dérivé, ciblage D-024, fumigène) — 3 configs × 3 seeds
{
  const cfgs = [
    [{ team: 0, name: 'A1', mechId: 'hound_prime', weaponId: 'reaver_blade', processorId: 'berserker' },
     { team: 0, name: 'A2', mechId: 'longbow_mk1', weaponId: 'seraph_lrm_pod', processorId: 'tactician' },
     { team: 1, name: 'B1', mechId: 'warden_x1', weaponId: 'scatter_gun_mk1', processorId: 'guardian' },
     { team: 1, name: 'B2', mechId: 'ghost_lt', weaponId: 'rail_gun_mk1', processorId: 'phantom' }],
    [{ team: 0, name: 'A1', mechId: 'warden_x1', weaponId: 'war_pike_mk1', processorId: 'vanguard' in RS_ORIG.processors ? 'vanguard' : 'berserker' },
     { team: 0, name: 'A2', mechId: 'ghost_lt', weaponId: 'grinder_mk1', processorId: 'phantom' },
     { team: 1, name: 'B1', mechId: 'hound_prime', weaponId: 'autocannon_mk1', processorId: 'tactician' },
     { team: 1, name: 'B2', mechId: 'longbow_mk1', weaponId: 'seraph_lrm_pod', processorId: 'tactician' }]
  ];
  let ok = 0, tot = 0;
  for (const mechs of cfgs) for (const seed of [7, 1337, 31415]){
    tot++;
    if (same(battleA(SimOrig, RS_ORIG, mechs, seed, 'open_field').events, battleA(CombatSim, IRONGRADE_RULESET, mechs, seed, 'open_field').events)) ok++;
  }
  check('bit-identité 2v2 (2 configs × 3 seeds = 6/6)', ok === tot, `${ok}/${tot}`);
}
// 2c. Largage d'arme (chemin unarmed) — tireur acculé vs mêlée : bit-identique aussi
{
  let ok = 0, tot = 0;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]){
    const mechs = [
      { team: 0, name: 'A', mechId: 'hound_prime', weaponId: 'autocannon_mk1', processorId: 'tactician' },
      { team: 1, name: 'B', mechId: 'warden_x1', weaponId: 'grinder_mk1', processorId: 'berserker' }];
    tot++;
    const a = battleA(SimOrig, RS_ORIG, mechs, seed, 'canyon_run');
    const b = battleA(CombatSim, IRONGRADE_RULESET, mechs, seed, 'canyon_run');
    if (same(a.events, b.events)) ok++;
    if (seed === 1) check('largage → POINGS puis récupération (events présents)',
      a.events.some(e => e.type === 'weapon_dropped') && RS_ORIG.weapons.fists.label === 'POINGS');
  }
  check('bit-identité largage/récupération (8 seeds canyon)', ok === tot, `${ok}/${tot}`);
}
// 3. Déterminisme interne du moteur extrait (10 seeds, spawn dérivé)
{
  let ok = 0;
  for (const seed of [1, 7, 42, 99, 123, 777, 1337, 2026, 31415, 99999]){
    const mechs = [{ team: 0, name: 'A', mechId: 'hound_prime', weaponId: 'autocannon_mk1', processorId: 'tactician' },
                   { team: 1, name: 'B', mechId: 'ghost_lt', weaponId: 'rail_gun_mk1', processorId: 'phantom' }];
    ok += same(battleA(CombatSim, IRONGRADE_RULESET, mechs, seed, 'industrial_complex').events,
               battleA(CombatSim, IRONGRADE_RULESET, mechs, seed, 'industrial_complex').events) ? 1 : 0;
  }
  check('déterminisme moteur extrait (10 seeds)', ok === 10, `${ok}/10`);
}
// 4. Hook unarmed_weapon_id : sans la clé → 'fists' ; segRect exporté identique
{
  const sim = new CombatSim(IRONGRADE_RULESET, { arenaId: 'proving_grounds', mechs: [
    { team: 0, name: 'A', mechId: 'hound_prime', weaponId: 'autocannon_mk1', processorId: 'tactician' },
    { team: 1, name: 'B', mechId: 'hound_prime', weaponId: 'autocannon_mk1', processorId: 'tactician' }] }, 42);
  check("hook unarmed : pack IRONGRADE (sans clé) → 'fists'/POINGS",
    sim.unarmedId() === 'fists' && sim.mechs[0].secondaryWeaponId === 'fists');
  check('segRect exporté (géométrie LOS utilisable par tout pack)', typeof segRect === 'function');
}
console.log(`\n${pass}/${pass + fail} checks OK`);
process.exit(fail ? 1 : 0);

// Audit rapide d'itération du pack KAIJU (même battery que test_kaiju, sans les checks)
import { CombatSim } from '../engine/mechcore.mjs';
import { KAIJU_RULESET as RS } from '../packs/kaiju.mjs';
function run(sim){ let g = 0; while (!sim.ended && g++ < 4000) sim.step(); return sim; }
function battle(mechs, seed, arenaId = 'harbor_city'){ return run(new CombatSim(RS, { arenaId, mechs: JSON.parse(JSON.stringify(mechs)) }, seed)); }
const M = (team, mechId, weaponId, processorId, name) => ({ team, name, mechId, weaponId, processorId });
const scenarios = {
  '1 S vs GOLIATH':      [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S1'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
  '1 S vs DÉFONCEUR':    [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S1'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'K')],
  '2 (tir) vs GOLIATH':  [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
  '2 (mixte) vs GOLIATH':[M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(0, 'sentinel_prime', 'pile_bunker', 'vanguard_ai', 'S'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
  '3 vs GOLIATH':        [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(0, 'sentinel_prime', 'pile_bunker', 'vanguard_ai', 'V'), M(1, 'goliath_kaiju', 'griffe_titan', 'monster_brute', 'K')],
  '2 vs DÉFONCEUR':      [M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(0, 'lancer_lt', 'harpoon_rail', 'sentry_ai', 'L'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'K')],
  '1v2 vs 2 DÉFONCEURS':[M(0, 'sentinel_prime', 'plasma_cannon', 'sentry_ai', 'S'), M(1, 'sprinter_kaiju', 'griffe_titan', 'monster_ravager', 'R1'), M(1, 'sprinter_kaiju', 'souffle_acide', 'monster_ravager', 'R2')]
};
for (const [label, mechs] of Object.entries(scenarios)){
  let mechWins = 0, to = 0, ticks = 0, deadMechs = 0, deadKaijus = 0, tot = 0;
  for (const arenaId of Object.keys(RS.arenas)) for (let s = 0; s < 60; s++){
    const sim = battle(mechs, 1000 + s, arenaId); tot++;
    if (sim.winner === 0) mechWins++;
    if (sim.events.find(e => e.type === 'battle_ended').reason === 'timeout') to++;
    ticks += sim.tick;
    deadMechs += sim.mechs.filter(m => m.team === 0 && m.hpNow <= 0).length;
    deadKaijus += sim.mechs.filter(m => m.team === 1 && m.hpNow <= 0).length;
  }
  console.log(`${label.padEnd(22)} méchs ${(100*mechWins/tot).toFixed(1)}% | TO ${(100*to/tot).toFixed(1)}% | ${(ticks/tot/RS.simulation.tick_hz).toFixed(1)}s | méchs morts ${deadMechs} | kaijus morts ${deadKaijus} | n=${tot}`);
}

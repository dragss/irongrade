# MECHCORE v1.0.0 — moteur de combat dissocié

Bibliothèque de simulation de combat **générique et déterministe**, extraite d'IRONGRADE v0.6.0
sans aucun changement de comportement. Le jeu IRONGRADE est devenu **un pack de données parmi
d'autres** : le même moteur tourne tel quel sur un autre univers — prouvé ici par le pack de
démonstration **KAIJU** (mechas de défense contre des créatures géantes).

## Structure

```
engine/mechcore.mjs        Moteur vivant (SplitMix64, CombatSim, segRect) — zéro donnée de jeu
engine/loadout.mjs         Résolveur de loadout, partagé, sans catalogue
games/irongrade/           Coquille ligue : atelier (catalog.mjs). Les écrans restent dans index.html
games/campagne/            Coquille campagne, vide
reference/sim_v0.6.0.mjs   Gel v0.6.0 (moteur + ruleset) pour la preuve bit-identique
packs/irongrade.mjs        Pack ligue vivant
packs/kaiju.mjs            Pack KAIJU v0.1.0 (HYPOTHÈSES) — démo de réutilisation
validation/regression.mjs  Bit-identité du moteur vivant contre le gel, sur le ruleset gelé
validation/test_kaiju.mjs  Validation du pack KAIJU + audit (17/17)
validation/audit_kaiju.mjs Runner d'audit d'itération (même battery, rapide)
```

## API

```js
import { CombatSim } from './engine/mechcore.mjs';
import { IRONGRADE_RULESET } from './packs/irongrade.mjs';   // ou KAIJU_RULESET
const sim = new CombatSim(IRONGRADE_RULESET, {
  arenaId: 'proving_grounds',
  mechs: [
    { team: 0, name: 'A', mechId: 'hound_prime', weaponId: 'autocannon_mk1', processorId: 'tactician' },
    { team: 1, name: 'B', mechId: 'ghost_lt',   weaponId: 'rail_gun_mk1',     processorId: 'phantom' },
  ]   // spawn dérivé du côté d'équipe ; formats libres : 1v1, 2v2, 2v1, 3v1, 1v2…
}, seed);
while (!sim.ended) sim.step();
sim.winner; sim.events; sim.mechs;
```

**Un pack = du pur data** : arènes (spawn_sides/obstacles/épaves), armes (ranged avec temps de
vol ou mêlée avec wind-up), unités (mechs, kaijus…), processeurs (IA), constantes. Tout l'
arsenal mécanique est réutilisable par tout pack : projectiles prédictifs, esquive, stabilisation,
chaleur, boucliers + régénération, passifs (`bulwark_protocol`, `aegis_loop`), épaves/boucliers
improvisés, largage d'arme, couvert actif, fumigène, ciblage d'équipe, spawns dérivés, stagger.

**Seul ajout moteur v1.0.0** : `combat.unarmed_weapon_id` (défaut `'fists'`). Un pack peut définir
sa propre attaque sans arme (KAIJU : `griffes`). Sans la clé, comportement v0.6.0 inchangé —
bit-identité prouvée.

## Preuve — `validation/regression.mjs`

Le moteur vivant est comparé au gel v0.6.0 **sur le ruleset gelé** (`reference/sim_v0.6.0.mjs`).
Le pack ligue vivant n'est plus ce gel : il porte le saut, l'inertie et les corps.

- **Bit-identité** : 192 batailles 1v1 (4 châssis × 4 arènes × 3 seeds), 2v2, largage→poings→récupération.
- Déterminisme interne 10/10 ; hook unarmed sans clé → `fists`/POINGS.
- Les presets de l'atelier passent le résolveur sur le pack vivant.

## Pack KAIJU v0.1.0 — `validation/test_kaiju.mjs` (17/17)

Autre univers, mêmes règles de simulation, zéro ligne de moteur modifiée :

- **Unités** : SENTINELLE (tank+passif rempart réutilisé), LANCIER (scout+bouclier égide
  réutilisé) vs **GOLIATH** (900 HP) et **DÉFONCEUR** (rapide). Armes : canon à plasma,
  rail harpon, **pile bunker** (arme anti-kaiju), griffe titanesque, souffle acide.
- **Formats asymétriques** : 1v1 / 2v1 / 3v1 / 1v2 — le moteur est déjà multi-équipes (D-024),
  la victoire reste par équipe.
- **Arènes inédites** : BAIE DE FER (ville-port, largage vs couloir de brèche), COULOIR
  D'ÉVACUATION ; véhicules d'évac ramassables (boucliers improvisés réutilisés).

### Itérations d'équilibrage documentées (audit 120 batailles/scénario, 2 arènes)

| Scénario | Baseline | It.1 (tank+vitesse kaiju) | It.2 (pile bunker 48, défonceur 460) |
|---|---|---|---|
| 1 SENTINELLE vs GOLIATH | 3,3% | 0% | **0%** |
| 2 mechs (tir) vs GOLIATH | 100% | 61,7% | **61,7%** |
| 2 mechs (mixte) vs GOLIATH | 100% | 0% (pile 26) | **29,2%** (pile 48) |
| 3 mechs vs GOLIATH | 100% | 99,2% | **100%** |
| 2 mechs vs DÉFONCEUR | 100% | 100% | **100%** (12 morts méchs) |
| 1 mech vs 2 DÉFONCEURS | 0% | 0% | **0%** |

Échelle émergente : **solo impossible → duo de tireurs possible (62%) → mêlée anti-kaiju =
mode difficile (29%) → trio confortable**. Le GOLIATH est un boss, le DÉFONCEUR le kaiju
d'entrée. Timeouts 0% partout.

## Gouvernance

- **Toutes les valeurs du pack KAIJU = hypothèses data-driven** (v0.1.0) : rien n'est acté sans
  décision owner ; l'audit mesure où elles tombent, la retouche est une décision owner.
- **Nommage/IP** : « kaiju » est un mot générique ; tout nom de marque (Jaeger, Pacific Rim,
  créatures d'une œuvre existante) est interdit dans un produit final — noms originaux requis.
- Le moteur reste la future bibliothèque C# partagée client/serveur de la spec : MECHCORE en est
  le miroir JS de référence ; les deltas de portage sont dans PORT_NOTES.md du zip v0.6.0.
- La coquille IRONGRADE importe le moteur. Le hangar 3D reste dans cette coquille : visuel de
  prototype, à refaire avec la techno finale. La campagne est une deuxième entrée, vide pour l'instant.

## Lancer les validations

```bash
node validation/regression.mjs   # moteur vivant bit-identique au gel v0.6.0 : 9/9
node validation/test_kaiju.mjs   # pack KAIJU : 17/17 + audit
node validation/audit_kaiju.mjs  # itération rapide d'équilibrage
```

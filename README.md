# IRONGRADE — prototype manager de mechs + moteur MECHCORE

> ⚠️ **Prototype greybox** — valeurs d'équilibrage = hypothèses data-driven, rien d'acté.
> Visuels de prototype, pas d'assets finaux.

**IRONGRADE** : jeu mobile F2P de gestion d'une organisation de combat de mechs — le combat
n'est que le match observé (manager_observer_only). **MECHCORE** : le moteur de simulation de
combat déterministe, dissocié du jeu et réutilisable sur d'autres univers (prouvé par le pack
KAIJU — mechas vs créatures géantes).

## 🎮 Jouer

- **En ligne (GitHub Pages)** : `https://dragss.github.io/irongrade/` — le jeu est le fichier
  `index.html` à la racine.
  *Activation (une fois) : Settings → Pages → Source « Deploy from a branch » → branche `main`,
  dossier `/ (root)` → Save.*
- **En local** : depuis la racine du dépôt, `python3 -m http.server 8080`, puis
  [http://localhost:8080](http://localhost:8080). Les modules du moteur ne se chargent pas en
  `file://`. Sauvegarde automatique (localStorage, bouton CONTINUER).
- **Campagne** (coquille vide, même moteur) : [http://localhost:8080/games/campagne/](http://localhost:8080/games/campagne/).

Boucle de jeu : nouvelle carrière → centre de commandement → roster (5 pilotes) → garage
(atelier 14 slots, processeur par mech) → championnat LIGUE FER (6 équipes, 10 journées) →
analyse d'adversaire → pré-bataille (3 duels 1v1, ordre d'engagement au choix) → match observé
→ rapport → fin de saison (primes, promotion LIGUE ACIER) → sauvegarde.

## 🧠 Moteur MECHCORE

Simulation de combat déterministe (15 Hz) : projectiles à temps de vol + esquive physique,
visée prédictive, stabilisation avant tir, chaleur/surchauffe, boucliers + régénération,
passifs, mêlée (approche/wind-up/stagger), couvert actif, épaves ramassables, largage d'arme,
fumigène, ciblage par équipe, spawns dérivés par côté d'entrée. Formats libres : 1v1, 2v2,
2v1, 3v1, 1v2.

**Un jeu = un pack de données** (`packs/`) : arènes, armes, unités, processeurs IA.

- `packs/irongrade.mjs` — ligue de mechs (4 châssis, 9 armes, 4 processeurs, 4 arènes)
- `packs/kaiju.mjs` — univers alternatif : SENTINELLE/LANCIER vs GOLIATH/DÉFONCEUR,
  arènes BAIE DE FER + COULOIR D'ÉVACUATION, échelle de difficulté auditée
  (solo impossible → duo 62% → trio confortable)

### Valider

```bash
node validation/regression.mjs   # moteur vivant bit-identique au gel v0.6.0, sur le ruleset gelé
node validation/test_kaiju.mjs    # pack KAIJU : 17/17 + audit d'équilibrage
node validation/audit_kaiju.mjs  # table d'équilibrage rapide
```

## Structure

```
index.html                 Coquille IRONGRADE — ligue, garage, écrans, hangar 3D (prototype)
games/campagne/index.html  Coquille campagne — vide, branchée sur le moteur
engine/mechcore.mjs        Moteur vivant (zéro donnée de jeu, zéro loot)
engine/loadout.mjs         Résolveur de loadout (catalogue → stats de sim)
packs/irongrade.mjs        Pack ligue vivant
packs/kaiju.mjs            Pack de démonstration KAIJU (hypothèses v0.1.0)
games/irongrade/catalog.mjs  Atelier IRONGRADE (châssis, modules, presets)
reference/sim_v0.6.0.mjs   Gel v0.6.0 (preuve bit-identique, ruleset inclus)
validation/                Harnesses de validation + audits
docs/MECHCORE.md           Documentation moteur
```

## Notes

- Le moteur JavaScript est le miroir de référence ; la cible production de la spec est une
  bibliothèque **C#** partagée client/serveur (Unity 6 + ASP.NET Core).
- Nommage : « kaiju » est un mot générique ; tout nom de marque (Jaeger, Pacific Rim, créatures
  d'une œuvre existante) est proscrit dans tout produit dérivé de ce dépôt.
- Aucune donnée personnelle, aucun secret, aucun service tiers dans ce prototype.

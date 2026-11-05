// MECHCORE — pack de démonstration KAIJU v0.1.0 (HYPOTHÈSES)
// Démontre la réutilisation du moteur pour un AUTRE jeu : mechas de défense
// contre des créatures géantes (inspiration « mecha vs kaiju »).
// ⚠️ TOUTES les valeurs = hypothèses data-driven (gouvernance projet) :
//    rien n'est acté sans décision owner ; l'audit de ce pack mesure où elles tombent.
// ⚠️ Nommage : « kaiju » est un mot générique ; tout nom de marque (Jaeger,
//    Pacific Rim, créatures nommées d'une œuvre) est interdit dans le produit final.
export const KAIJU_RULESET = {
  "version": "0.1.0-kaiju",
  "simulation": { "tick_hz": 15, "battle_timeout_seconds": 150 },
  "arenas": {
    "harbor_city": {
      "label": "BAIE DE FER",
      "width": 100, "depth": 60,
      "spawn_sides": {
        "alpha": { "type": "drop", "x": -45, "z": 0, "dir": 0 },
        "omega": { "type": "corridor", "x": 48, "z": 0, "dir": 3.14159 }
      },
      "obstacles": [
        { "id": "tour_ouest", "x": -20, "z": 12, "w": 8, "h": 8, "blocks_los": true, "kind": "cover" },
        { "id": "tour_est", "x": 14, "z": -14, "w": 8, "h": 8, "blocks_los": true, "kind": "cover" },
        { "id": "entrepot", "x": -2, "z": 20, "w": 12, "h": 5, "blocks_los": true, "kind": "cover" },
        { "id": "quai_casse", "x": 26, "z": 8, "w": 10, "h": 4, "blocks_los": true, "kind": "cover" },
        { "id": "evac_1", "x": -12, "z": -6, "w": 2, "h": 2, "blocks_los": false, "kind": "prop", "pickable": true, "prop_hp": 12, "label": "VÉHICULE D'ÉVAC" },
        { "id": "evac_2", "x": 8, "z": 4, "w": 2, "h": 2, "blocks_los": false, "kind": "prop", "pickable": true, "prop_hp": 12, "label": "VÉHICULE D'ÉVAC" },
        { "id": "evac_3", "x": 30, "z": -12, "w": 2, "h": 2, "blocks_los": false, "kind": "prop", "pickable": true, "prop_hp": 12, "label": "VÉHICULE D'ÉVAC" }
      ]
    },
    "evac_corridor": {
      "label": "COULOIR D'ÉVACUATION",
      "width": 90, "depth": 32,
      "spawn_sides": {
        "alpha": { "type": "corridor", "x": -41, "z": 0, "dir": 0 },
        "omega": { "type": "corridor", "x": 41, "z": 0, "dir": 3.14159 }
      },
      "obstacles": [
        { "id": "bloc_nord", "x": -14, "z": 10, "w": 10, "h": 4, "blocks_los": true, "kind": "cover" },
        { "id": "bloc_sud", "x": 12, "z": -10, "w": 10, "h": 4, "blocks_los": true, "kind": "cover" },
        { "id": "evac_4", "x": 0, "z": 0, "w": 2, "h": 2, "blocks_los": false, "kind": "prop", "pickable": true, "prop_hp": 12, "label": "VÉHICULE D'ÉVAC" }
      ]
    }
  },
  "weapons": {
    "plasma_cannon": { "type": "ranged", "range": 60, "min_range": 0, "damage": 20, "cooldown_ticks": 14, "stabilization_ticks": 2, "heat": 6, "proj_speed_mps": 55, "accuracy": 0.82, "crit_chance": 0.08, "crit_mult": 1.6, "label": "CANON À PLASMA" },
    "harpoon_rail": { "type": "ranged", "range": 80, "min_range": 15, "damage": 46, "cooldown_ticks": 30, "stabilization_ticks": 4, "heat": 9, "proj_speed_mps": 90, "accuracy": 0.88, "crit_chance": 0.15, "crit_mult": 2.0, "label": "RAIL HARPON" },
    "pile_bunker": { "type": "melee", "range": 3.6, "damage": 48, "windup_ticks": 6, "recovery_ticks": 12, "heat": 8, "accuracy": 0.9, "crit_chance": 0.1, "crit_mult": 1.8, "stagger": true, "label": "PILE BUNKER" },
    "griffe_titan": { "type": "melee", "range": 6.5, "damage": 40, "windup_ticks": 5, "recovery_ticks": 9, "heat": 0, "accuracy": 0.85, "crit_chance": 0.1, "crit_mult": 1.6, "stagger": true, "label": "GRIFFE TITANESQUE" },
    "souffle_acide": { "type": "ranged", "range": 24, "min_range": 3, "damage": 26, "cooldown_ticks": 40, "stabilization_ticks": 1, "heat": 4, "proj_speed_mps": 14, "accuracy": 0.75, "crit_chance": 0, "crit_mult": 1, "label": "SOUFFLE ACIDE" },
    "griffes": { "type": "melee", "range": 2.2, "damage": 12, "windup_ticks": 3, "recovery_ticks": 5, "heat": 0, "accuracy": 0.8, "crit_chance": 0.05, "crit_mult": 1.5, "stagger": false, "hidden": true, "label": "GRIFFES" }
  },
  "processors": {
    "sentry_ai": { "preferred_range": 30, "aggression": 0.5, "risk_tolerance": 0.4, "cover_usage": 0.6, "evasion_frequency": 0.3, "retreat_threshold": 0.3, "targeting": "weakest", "smoke_hp_threshold": 0.5, "brace_move_factor": 0.6, "label": "IA SENTINELLE" },
    "vanguard_ai": { "preferred_range": 3, "aggression": 0.9, "risk_tolerance": 0.8, "cover_usage": 0, "evasion_frequency": 0.15, "retreat_threshold": 0.05, "targeting": "closest", "smoke_hp_threshold": 0.5, "label": "IA VANGUARD" },
    "monster_brute": { "preferred_range": 5, "aggression": 1.0, "risk_tolerance": 1.0, "cover_usage": 0, "evasion_frequency": 0.05, "retreat_threshold": 0, "targeting": "closest", "smoke_hp_threshold": 0.5, "label": "BÊTE DE SIÈGE" },
    "monster_ravager": { "preferred_range": 6, "aggression": 0.85, "risk_tolerance": 0.9, "cover_usage": 0, "evasion_frequency": 0.2, "retreat_threshold": 0.05, "targeting": "closest", "smoke_hp_threshold": 0.5, "label": "RAVAGEUR" }
  },
  "mechs": {
    "sentinel_prime": {
      "label": "SENTINELLE", "hp": 210, "armor": 18, "shield": 30, "speed_mps": 3.6,
      "cooling_per_s": 10, "accuracy_bonus": 0.04, "stability": 45,
      "passive": { "id": "bulwark_protocol", "label": "PROTOCOLE REMPART", "hp_threshold": 0.4, "dr_bonus": 0.25 }
    },
    "lancer_lt": {
      "label": "LANCIER", "hp": 150, "armor": 10, "shield": 20, "speed_mps": 4.7,
      "cooling_per_s": 12, "accuracy_bonus": 0.06, "stability": 20,
      "passive": { "id": "aegis_loop", "label": "BOUCLIER ÉGIDE" }
    },
    "goliath_kaiju": {
      "label": "GOLIATH", "hp": 900, "armor": 30, "shield": 0, "speed_mps": 4.4,
      "cooling_per_s": 20, "accuracy_bonus": 0, "stability": 0
    },
    "sprinter_kaiju": {
      "label": "DÉFONCEUR", "hp": 460, "armor": 20, "shield": 0, "speed_mps": 5.2,
      "cooling_per_s": 20, "accuracy_bonus": 0, "stability": 0
    }
  },
  "combat": {
    "unarmed_weapon_id": "griffes",
    "overheat_threshold": 100, "overheat_stun_seconds": 3,
    "min_damage_after_armor": 1, "proj_hit_radius": 1.5,
    "aim_error_factor": 0.18, "aim_lead_factor": 0.75,
    "retreat_speed_factor": 0.7, "brace_move_factor": 0.6, "drop_speed_bonus": 0.25,
    "shield_regen_delay_ticks": 60, "shield_regen_per_s": 4,
    "stagger_immunity_ticks": 30, "stability_ticks_per": 15, "stability_ticks_cap": 2,
    "retreat_aware_radius": 20,
    "smoke": { "enabled": true, "radius": 8, "duration_ticks": 105, "default_hp_threshold": 0.5, "charges": 1 }
  }
};

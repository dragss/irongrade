// Pack IRONGRADE — catalogue de la ligue (arènes, armes, châssis, processeurs).
// Le gel v0.6.0 de la preuve bit-identique est dans reference/sim_v0.6.0.mjs.
export const IRONGRADE_RULESET = {
  "version": "0.10.0",
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
        "alpha": {
          "type": "drop",
          "x": -36,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "drop",
          "x": 36,
          "z": 0,
          "dir": 3.14159
        }
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
        "alpha": {
          "type": "corridor",
          "x": -41,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "corridor",
          "x": 41,
          "z": 0,
          "dir": 3.14159
        }
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
        "alpha": {
          "type": "corridor",
          "x": -31,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "corridor",
          "x": 31,
          "z": 0,
          "dir": 3.14159
        }
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
        "alpha": {
          "type": "drop",
          "x": -45,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "drop",
          "x": 45,
          "z": 0,
          "dir": 3.14159
        }
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
    },
    "downtown_kestrel": {
      "label": "CENTRE-VILLE DE KESTREL",
      "width": 110,
      "depth": 55,
      "spawns": [
        {
          "x": -44,
          "z": -8
        },
        {
          "x": 44,
          "z": 8
        }
      ],
      "spawn_sides": {
        "alpha": {
          "type": "drop",
          "x": -50,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "drop",
          "x": 50,
          "z": 0,
          "dir": 3.14159
        }
      },
      "obstacles": [
        {
          "id": "bld_n1",
          "x": -38,
          "z": -16,
          "w": 12,
          "h": 9,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_n2",
          "x": -13,
          "z": -19,
          "w": 10,
          "h": 8,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_n3",
          "x": 13,
          "z": -17,
          "w": 12,
          "h": 9,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_n4",
          "x": 38,
          "z": -15,
          "w": 10,
          "h": 8,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_s1",
          "x": -36,
          "z": 16,
          "w": 10,
          "h": 8,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_s2",
          "x": -10,
          "z": 19,
          "w": 12,
          "h": 9,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_s3",
          "x": 16,
          "z": 17,
          "w": 10,
          "h": 8,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "bld_s4",
          "x": 38,
          "z": 19,
          "w": 12,
          "h": 9,
          "blocks_los": true,
          "kind": "building"
        },
        {
          "id": "tower_mid",
          "x": 0,
          "z": 0,
          "w": 5,
          "h": 5,
          "blocks_los": true,
          "kind": "pillar",
          "climb": true,
          "zh": 5
        },
        {
          "id": "kiosk_a",
          "x": -24,
          "z": 3,
          "w": 4,
          "h": 4,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "kiosk_b",
          "x": 24,
          "z": -3,
          "w": 4,
          "h": 4,
          "blocks_los": true,
          "kind": "crate"
        },
        {
          "id": "wreck_a",
          "x": -30,
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
          "x": 30,
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
    "ironwood_forest": {
      "label": "FORÊT DE FER-NOIR",
      "width": 100,
      "depth": 60,
      "spawns": [
        {
          "x": -38,
          "z": -6
        },
        {
          "x": 38,
          "z": 6
        }
      ],
      "spawn_sides": {
        "alpha": {
          "type": "corridor",
          "x": -45,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "corridor",
          "x": 45,
          "z": 0,
          "dir": 3.14159
        }
      },
      "obstacles": [
        {
          "id": "tree_01",
          "x": -40,
          "z": -20,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_02",
          "x": -32,
          "z": -9,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_03",
          "x": -36,
          "z": 7,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_04",
          "x": -28,
          "z": 18,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_05",
          "x": -22,
          "z": -14,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_06",
          "x": -18,
          "z": -2,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_07",
          "x": -24,
          "z": 22,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_08",
          "x": -12,
          "z": 10,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_09",
          "x": -8,
          "z": -18,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_10",
          "x": -4,
          "z": 14,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_11",
          "x": 2,
          "z": -8,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_12",
          "x": 6,
          "z": 20,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_13",
          "x": 12,
          "z": -16,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_14",
          "x": 16,
          "z": 3,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_15",
          "x": 22,
          "z": -21,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_16",
          "x": 26,
          "z": 12,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_17",
          "x": 34,
          "z": -6,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_18",
          "x": 30,
          "z": 19,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_19",
          "x": 40,
          "z": -15,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "tree_20",
          "x": 38,
          "z": 8,
          "w": 2.6,
          "h": 2.6,
          "blocks_los": true,
          "kind": "tree"
        },
        {
          "id": "rock_mid",
          "x": 0,
          "z": 0,
          "w": 5,
          "h": 4,
          "blocks_los": true,
          "kind": "rock",
          "climb": true,
          "zh": 2.2
        },
        {
          "id": "rock_n",
          "x": -15,
          "z": 25,
          "w": 4,
          "h": 3,
          "blocks_los": true,
          "kind": "rock",
          "climb": true,
          "zh": 2.2
        },
        {
          "id": "rock_s",
          "x": 20,
          "z": -25,
          "w": 4,
          "h": 3,
          "blocks_los": true,
          "kind": "rock",
          "climb": true,
          "zh": 2.2
        },
        {
          "id": "wreck_a",
          "x": -20,
          "z": 4,
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
          "x": 18,
          "z": -4,
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
    "kessari_delta": {
      "label": "DELTA DE KESSARI",
      "width": 105,
      "depth": 50,
      "spawns": [
        {
          "x": -40,
          "z": -7
        },
        {
          "x": 40,
          "z": 7
        }
      ],
      "spawn_sides": {
        "alpha": {
          "type": "drop",
          "x": -48,
          "z": 0,
          "dir": 0
        },
        "omega": {
          "type": "drop",
          "x": 48,
          "z": 0,
          "dir": 3.14159
        }
      },
      "water": [
        {
          "id": "river_mid",
          "x": 0,
          "z": 0,
          "w": 30,
          "d": 46
        },
        {
          "id": "pool_west",
          "x": -36,
          "z": 10,
          "w": 18,
          "d": 20
        },
        {
          "id": "pool_east",
          "x": 34,
          "z": -12,
          "w": 20,
          "d": 18
        }
      ],
      "obstacles": [
        {
          "id": "pile_n1",
          "x": 0,
          "z": -14,
          "w": 2.5,
          "h": 2.5,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "pile_n2",
          "x": -5,
          "z": 0,
          "w": 2.5,
          "h": 2.5,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "pile_s",
          "x": 0,
          "z": 14,
          "w": 2.5,
          "h": 2.5,
          "blocks_los": true,
          "kind": "pillar"
        },
        {
          "id": "pont_e",
          "x": 9,
          "z": 0,
          "w": 12,
          "h": 3,
          "blocks_los": false,
          "kind": "platform",
          "climb": true,
          "zh": 3
        },
        {
          "id": "pont_w",
          "x": -10,
          "z": 0,
          "w": 10,
          "h": 3,
          "blocks_los": false,
          "kind": "platform",
          "climb": true,
          "zh": 3
        },
        {
          "id": "bank_w",
          "x": -20,
          "z": 12,
          "w": 6,
          "h": 3,
          "blocks_los": true,
          "kind": "cover"
        },
        {
          "id": "bank_w2",
          "x": -22,
          "z": -10,
          "w": 6,
          "h": 3,
          "blocks_los": true,
          "kind": "cover"
        },
        {
          "id": "bank_e",
          "x": 22,
          "z": 10,
          "w": 6,
          "h": 3,
          "blocks_los": true,
          "kind": "cover"
        },
        {
          "id": "bank_e2",
          "x": 24,
          "z": -12,
          "w": 6,
          "h": 3,
          "blocks_los": true,
          "kind": "cover"
        },
        {
          "id": "wreck_a",
          "x": -14,
          "z": 2,
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
          "x": 16,
          "z": -4,
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
    "jump": {
      "enabled": true,
      "duration_ticks": 18,
      "cooldown_ticks": 90
    },
    "water_speed_factor": 0.65,
    "overheat_threshold": 100,
    "overheat_stun_seconds": 3,
    "min_damage_after_armor": 1,
    "proj_hit_radius": 1.5,
    "aim_error_factor": 0.18,
    "aim_lead_factor": 0.75,
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
    },
    "climb": {
      "enabled": true,
      "ticks_per_meter": 6,
      "cooldown_ticks": 45,
      "seek_radius": 9,
      "aim_bonus": 0.04,
      "aim_height": 2,
      "los_height": 2,
      "patience_ticks": 30
    },
    "motion": {
      "enabled": true,
      "launch_ticks": 18,
      "settle_ticks": 10,
      "moving_aim_penalty": 0.35,
      "brake_m": 8
    },
    "bodies": {
      "enabled": true,
      "avoid_pad_m": 1.5
    },
    "ballistics": {
      "enabled": true,
      "splash_m": 3.2,
      "splash_factor": 0.4
    },
    "squad": { "enabled": true },
    "world": { "enabled": true },
    "ordnance": { "enabled": true },
    "front": { "enabled": true },
    "trade": { "enabled": true, "fiche_step": 80, "fiche_cap": 5 }
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
      "delivery": "lob",
      "fuse_ticks": 10,
      "blast_m": 5.5,
      "apex_m": 10,
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
      "impact": 5.4,
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
      "impact": 7.6,
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
      "impact": 4.8,
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
      "impact": 2.4,
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
      "impact": 2.2,
      "label": "POINGS"
    },
    "pulse_emp": {
      "type": "ranged",
      "range": 55,
      "min_range": 12,
      "damage": 8,
      "cooldown_ticks": 40,
      "heat": 8,
      "accuracy": 0.8,
      "proj_speed_mps": 46,
      "crit_chance": 0,
      "crit_mult": 1,
      "stabilization_ticks": 3,
      "delivery": "emp",
      "fuse_ticks": 14,
      "blast_m": 7,
      "apex_m": 8,
      "stun_ticks": 18,
      "label": "IEM PULSE"
    },
    "frag_charge": {
      "type": "ranged",
      "range": 32,
      "min_range": 6,
      "damage": 22,
      "cooldown_ticks": 20,
      "heat": 6,
      "accuracy": 0.78,
      "proj_speed_mps": 34,
      "crit_chance": 0.08,
      "crit_mult": 1.5,
      "stabilization_ticks": 2,
      "delivery": "lob",
      "fuse_ticks": 5,
      "blast_m": 4.2,
      "apex_m": 6,
      "label": "GRENADE"
    },
    "rotary_mk1": {
      "type": "ranged",
      "range": 30,
      "min_range": 0,
      "damage": 6,
      "cooldown_ticks": 5,
      "heat": 2,
      "accuracy": 0.8,
      "proj_speed_mps": 120,
      "crit_chance": 0.06,
      "crit_mult": 1.35,
      "stabilization_ticks": 1,
      "label": "ROTARY MK1"
    },
    "laser_mk1": {
      "type": "ranged",
      "range": 46,
      "min_range": 0,
      "damage": 13,
      "cooldown_ticks": 12,
      "heat": 8,
      "accuracy": 0.92,
      "proj_speed_mps": 200,
      "crit_chance": 0.12,
      "crit_mult": 1.6,
      "stabilization_ticks": 1,
      "label": "LASER MK1"
    },
    "srm_pack": {
      "type": "ranged",
      "range": 36,
      "min_range": 6,
      "damage": 24,
      "cooldown_ticks": 18,
      "heat": 7,
      "accuracy": 0.8,
      "proj_speed_mps": 80,
      "crit_chance": 0.1,
      "crit_mult": 1.5,
      "stabilization_ticks": 2,
      "delivery": "lob",
      "fuse_ticks": 4,
      "blast_m": 3.4,
      "apex_m": 5,
      "label": "SALVE SRM"
    },
    "maul_mk1": {
      "type": "melee",
      "range": 2.4,
      "damage": 30,
      "windup_ticks": 11,
      "recovery_ticks": 15,
      "heat": 9,
      "accuracy": 0.82,
      "crit_chance": 0.18,
      "crit_mult": 2,
      "stagger": true,
      "impact": 8.6,
      "label": "MASSE DE SIÈGE"
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
      "label": "HOUND PRIME (HEAVY)",
      "radius_m": 1.6
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
      "label": "LONGBOW MK1 (ARTILLERY)",
      "radius_m": 1.3
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
      "label": "WARDEN X1 (ASSAUT)",
      "radius_m": 1.8
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
      "label": "GHOST LT (ÉCLAIREUR)",
      "radius_m": 1.1
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
      "squad": "dogpile",
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
      "squad": "focus",
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
      "squad": "peel",
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
      "squad": "flank",
      "smoke_hp_threshold": 0.85,
      "label": "PHANTOM"
    }
  }
};

export const IRONGRADE_RULESET = {
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

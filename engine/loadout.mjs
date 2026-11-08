// Résolveur de loadout — commun aux coquilles.
// Un catalogue (châssis, slots, armes, modules) entre, des stats de sim sortent.
// Les caisses, les doublons et les niveaux restent dans la coquille qui appelle.

export function bindLoadout(catalog){
  const { slots, chassis, weapons, modules, unarmedId = 'fists' } = catalog;

  function deriveStats(chassisId, bySlot){
    const ch = chassis[chassisId];
    let hp = 0, armorSum = 0, armorN = 0, mob = 0, mobN = 0, accMod = 0, stability = 0, shield = 0, mass = 0;
    for (const slot in bySlot){
      const id = bySlot[slot];
      if (weapons[id]){ mass += weapons[id].mass; continue; }
      const m = modules[id]; if (!m) continue;
      mass += m.mass;
      if (!m.functional) continue;
      if (slot === 'torso') hp += m.durability; else hp += (m.durability || 0) * 0.35;
      if (m.armor){ armorSum += m.armor; armorN++; }
      if (m.mobility_modifier){ mob += m.mobility_modifier; mobN++; }
      accMod += m.accuracy_modifier || 0; stability += m.stability || 0; shield += m.shield_capacity || 0;
    }
    return { hp: Math.round(hp), armor: armorN ? Math.round(armorSum / armorN) : 0,
      speed_mps: Math.round(ch.base_speed * (mobN ? mob / mobN : 1) * 100) / 100,
      shield, accuracy_bonus: Math.round(accMod * 100) / 100, stability, mass: Math.round(mass * 10) / 10 };
  }

  function validateLoadout(chassisId, loadout){
    const errors = [];
    const ch = chassis[chassisId];
    if (!ch) return { ok:false, errors:['CHÂSSIS INCONNU : '+chassisId], stats:null };
    const bySlot = {};
    for (const slot in loadout){
      const id = loadout[slot];
      if (!slots.includes(slot)){ errors.push('SLOT INCONNU : '+slot); continue; }
      if (weapons[id]){
        if (!weapons[id].slots.includes(slot))
          errors.push('SLOT D\'ARME INVALIDE : '+id+' ne se monte que sur '+weapons[id].slots.join(' / ')+' — pas sur '+slot);
        if (bySlot[slot]) errors.push('SLOT DÉJÀ OCCUPÉ : '+slot+' ('+bySlot[slot]+' vs '+id+')');
        bySlot[slot] = id;
        continue;
      }
      const mod = modules[id];
      if (!mod){ errors.push('MODULE INCONNU : '+id+' (slot '+slot+')'); continue; }
      if (mod.slot !== slot){ errors.push('SLOT INVALIDE : '+id+' se monte sur '+mod.slot+', pas sur '+slot); continue; }
      if (!mod.families.includes(ch.family))
        errors.push('INCOMPATIBILITÉ FAMILLE : '+id+' (families '+mod.families.join(',')+') incompatible avec '+chassisId+' ('+ch.family+')');
      bySlot[slot] = id;
    }
    if (!bySlot.weapon_primary) errors.push('ARME PRINCIPALE REQUISE : le slot weapon_primary doit être équipé');
    if (!bySlot.torso) errors.push('TORSE REQUIS : le slot torso doit être équipé');
    if (!bySlot.engine) errors.push('MOTEUR REQUIS : le slot engine doit être équipé');
    if (bySlot.weapon_secondary === undefined) bySlot.weapon_secondary = unarmedId;
    if (bySlot.weapon_primary && bySlot.weapon_primary === bySlot.weapon_secondary)
      errors.push('DOUBLON D\'ARME : weapon_primary et weapon_secondary ne peuvent pas être identiques');

    let mass = 0, draw = 0, powerBudget = 0, heatGen = 0, coolingCap = 0;
    for (const slot in bySlot){
      if (weapons[bySlot[slot]]){ mass += weapons[bySlot[slot]].mass; continue; }
      const m = modules[bySlot[slot]]; if (!m) continue;
      mass += m.mass; draw += m.power_draw || 0; powerBudget += m.power_budget || 0;
      heatGen += m.heat_generation || 0; coolingCap += m.cooling_capacity || 0;
    }
    if (mass > ch.mass_max)
      errors.push('MASSE DÉPASSÉE : '+mass.toFixed(1)+'t / '+ch.mass_max+'t (dépassement +'+(mass-ch.mass_max).toFixed(1)+'t)');
    if (draw > powerBudget)
      errors.push('PUISSANCE INSUFFISANTE : modules '+draw+' PW consommés / moteur '+powerBudget+' PW fournis (déficit -'+(powerBudget-draw)+' PW)');
    if (heatGen > coolingCap)
      errors.push('CHALEUR STRUCTURELLE : émission '+heatGen+' / dissipation '+coolingCap+' — surchauffe au ralenti impossible à tenir');

    return { ok: errors.length === 0, errors, stats: deriveStats(chassisId, bySlot) };
  }

  function buildSimOverrides(ruleset, presets){
    const rs = JSON.parse(JSON.stringify(ruleset));
    for (const id in presets){ const p = presets[id]; const v = validateLoadout(p.mechId, p.loadout);
      if (!v.ok) throw new Error('preset invalide '+id+' : '+v.errors.join(' | '));
      const s = v.stats;
      rs.mechs[id] = { class: rs.mechs[p.mechId].class, speed_mps: s.speed_mps, hp: s.hp, armor: s.armor,
        shield: s.shield, cooling_per_s: rs.mechs[p.mechId].cooling_per_s,
        accuracy_bonus: s.accuracy_bonus, stability: s.stability,
        passive: rs.mechs[p.mechId].passive, label: p.label + ' (' + id + ')' };
    }
    return rs;
  }

  return { validateLoadout, deriveStats, buildSimOverrides };
}

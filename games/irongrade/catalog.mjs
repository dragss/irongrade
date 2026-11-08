// Catalogue atelier de la coquille IRONGRADE. Le résolveur vit dans engine/loadout.mjs.
import { bindLoadout } from '../../engine/loadout.mjs';

// ==== MODULE GARAGE v0.5.1 (presets + stats dérivées) ====
export const SLOTS = ['head','torso','left_arm','right_arm','left_leg','right_leg',
  'left_shoulder','right_shoulder','weapon_primary','weapon_secondary','engine','shield','cooling','utility'];

export const CHASSIS = {
  hound_prime: { family: 'humanoid_alpha', mass_max: 140, base_speed: 3.4, label: 'HOUND PRIME (HEAVY)' },
  longbow_mk1: { family: 'humanoid_alpha', mass_max: 125, base_speed: 4.0, label: 'LONGBOW MK1 (ARTILLERY)' },
  warden_x1:   { family: 'humanoid_alpha', mass_max: 130, base_speed: 3.8, label: 'WARDEN X1 (ASSAUT)' },
  ghost_lt:     { family: 'humanoid_alpha', mass_max: 108, base_speed: 4.6, label: 'GHOST LT (ÉCLAIREUR)' }
};

// Armes existantes (ruleset sim) + slots autorisés + masse (hypothèse D-019)
export const WEAPONS_GARAGE = {
  autocannon_mk1: { slots: ['weapon_primary', 'weapon_secondary'], mass: 8 },
  seraph_lrm_pod:  { slots: ['weapon_primary'], mass: 12 },
  reaver_blade:    { slots: ['weapon_primary', 'weapon_secondary'], mass: 5 },
  impact_ram:      { slots: ['weapon_primary', 'weapon_secondary'], mass: 7 },
  rail_gun_mk1:    { slots: ['weapon_primary'], mass: 13 },
  scatter_gun_mk1: { slots: ['weapon_primary', 'weapon_secondary'], mass: 6 },
  war_pike_mk1:    { slots: ['weapon_primary', 'weapon_secondary'], mass: 6 },
  grinder_mk1:     { slots: ['weapon_primary', 'weapon_secondary'], mass: 4 },
  fists:           { slots: ['weapon_secondary'], mass: 0 },
  pulse_emp:       { slots: ['weapon_primary'], mass: 9 },
  frag_charge:     { slots: ['weapon_primary', 'weapon_secondary'], mass: 7 }
};

// Chaque module : slot unique, familles compatibles, fonctionnel vs cosmétique
// (explicite, assembly_rules #4), attributs issus de module_attributes (spec).
export const MODULES = {
  torso_standard:  { slot:'torso', families:['humanoid_alpha'], functional:true, mass:30, durability:120, armor:10, power_draw:4, heat_generation:2, label:'TORSE STANDARD' },
  torso_fortified: { slot:'torso', families:['humanoid_alpha'], functional:true, mass:38, durability:160, armor:14, power_draw:5, heat_generation:3, mobility_modifier:0.95, label:'TORSE RENFORCÉ' },
  head_sensor_mk1: { slot:'head', families:['humanoid_alpha'], functional:true, mass:4, durability:30, armor:3, power_draw:2, accuracy_modifier:0.02, label:'CAPTEURS MK1' },
  head_targeter:   { slot:'head', families:['humanoid_alpha'], functional:true, mass:5, durability:25, armor:2, power_draw:3, accuracy_modifier:0.05, label:'VISEUR CIBLE' },
  arm_left_standard:  { slot:'left_arm',  families:['humanoid_alpha'], functional:true, mass:8, durability:40, armor:4, stability:5, power_draw:1, label:'BRAS G. STANDARD' },
  arm_right_standard: { slot:'right_arm', families:['humanoid_alpha'], functional:true, mass:8, durability:40, armor:4, stability:5, power_draw:1, label:'BRAS D. STANDARD' },
  leg_left_standard:  { slot:'left_leg',  families:['humanoid_alpha'], functional:true, mass:12, durability:50, armor:5, mobility_modifier:1.0, power_draw:2, label:'JAMBE G. STANDARD' },
  leg_right_standard: { slot:'right_leg', families:['humanoid_alpha'], functional:true, mass:12, durability:50, armor:5, mobility_modifier:1.0, power_draw:2, label:'JAMBE D. STANDARD' },
  leg_left_sprint:    { slot:'left_leg',  families:['humanoid_alpha'], functional:true, mass:10, durability:40, armor:3, mobility_modifier:1.15, power_draw:2, label:'JAMBE G. SPRINT' },
  leg_right_sprint:    { slot:'right_leg', families:['humanoid_alpha'], functional:true, mass:10, durability:40, armor:3, mobility_modifier:1.15, power_draw:2, label:'JAMBE D. SPRINT' },
  shoulder_plate_L: { slot:'left_shoulder',  families:['humanoid_alpha'], functional:true, mass:6, durability:35, armor:6, stability:10, label:'PAULDRON G.' },
  shoulder_plate_R: { slot:'right_shoulder', families:['humanoid_alpha'], functional:true, mass:6, durability:35, armor:6, stability:10, label:'PAULDRON D.' },
  engine_vx4: { slot:'engine', families:['humanoid_alpha'], functional:true, mass:14, power_budget:40, heat_generation:4, mobility_modifier:1.0, label:'MOTEUR VX4' },
  engine_vx6: { slot:'engine', families:['humanoid_alpha'], functional:true, mass:18, power_budget:55, heat_generation:6, mobility_modifier:1.05, label:'MOTEUR VX6' },
  shield_basic: { slot:'shield', families:['humanoid_alpha'], functional:true, mass:6, shield_capacity:40, power_draw:8, heat_generation:2, label:'BOUCLIER BASIQUE' },
  cooling_standard: { slot:'cooling', families:['humanoid_alpha'], functional:true, mass:8, cooling_capacity:6, power_draw:2, label:'DISSIPATION STD' },
  cooling_deluxe:   { slot:'cooling', families:['humanoid_alpha'], functional:true, mass:11, cooling_capacity:11, power_draw:3, label:'DISSIPATION+' },
  utility_gyro:     { slot:'utility', families:['humanoid_alpha'], functional:true, mass:3, stability:15, power_draw:2, label:'GYROSTABILISATEUR' },
  utility_targeting: { slot:'utility', families:['humanoid_alpha'], functional:true, mass:2, accuracy_modifier:0.03, power_draw:2, label:'ASSIST. VISÉE' },
  // module cosmétique — explicite (assembly_rules #4), aucun effet gameplay
  decal_stripes: { slot:'torso', families:['humanoid_alpha'], functional:false, mass:0.5, label:'DECAL RAYURES (COSMÉTIQUE)' }
};

// ---- presets (builds valides par construction) ----
export const PRESETS = {
  bulwark: { label:'BASTION', mechId:'hound_prime', weapon:'impact_ram', loadout:{
    head:'head_sensor_mk1', torso:'torso_fortified', left_arm:'arm_left_standard', right_arm:'arm_right_standard',
    left_leg:'leg_left_standard', right_leg:'leg_right_standard', left_shoulder:'shoulder_plate_L', right_shoulder:'shoulder_plate_R',
    weapon_primary:'impact_ram', engine:'engine_vx4', shield:'shield_basic', cooling:'cooling_deluxe', utility:'utility_gyro' }},
  skirmisher: { label:'ÉCLAIREUR', mechId:'longbow_mk1', weapon:'autocannon_mk1', loadout:{
    head:'head_targeter', torso:'torso_standard', left_arm:'arm_left_standard', right_arm:'arm_right_standard',
    left_leg:'leg_left_sprint', right_leg:'leg_right_sprint',
    weapon_primary:'autocannon_mk1', engine:'engine_vx6', shield:'shield_basic', cooling:'cooling_deluxe', utility:'utility_targeting' }},
  linebreaker: { label:'BRISERIE', mechId:'hound_prime', weapon:'reaver_blade', loadout:{
    head:'head_sensor_mk1', torso:'torso_standard', left_arm:'arm_left_standard', right_arm:'arm_right_standard',
    left_leg:'leg_left_standard', right_leg:'leg_right_standard', left_shoulder:'shoulder_plate_L', right_shoulder:'shoulder_plate_R',
    weapon_primary:'reaver_blade', weapon_secondary:'impact_ram', engine:'engine_vx6', shield:'shield_basic', cooling:'cooling_deluxe', utility:'utility_gyro' }},
  artillery: { label:'ARTILLERIE', mechId:'longbow_mk1', weapon:'seraph_lrm_pod', loadout:{
    head:'head_targeter', torso:'torso_standard', left_arm:'arm_left_standard', right_arm:'arm_right_standard',
    left_leg:'leg_left_standard', right_leg:'leg_right_standard',
    weapon_primary:'seraph_lrm_pod', engine:'engine_vx4', shield:'shield_basic', cooling:'cooling_deluxe', utility:'utility_targeting' }},
  marksman: { label:'CELLULE', mechId:'ghost_lt', weapon:'rail_gun_mk1', loadout:{
    head:'head_targeter', torso:'torso_standard', left_arm:'arm_left_standard', right_arm:'arm_right_standard',
    left_leg:'leg_left_sprint', right_leg:'leg_right_sprint',
    weapon_primary:'rail_gun_mk1', engine:'engine_vx4', cooling:'cooling_standard', utility:'utility_targeting' }},
  sweeper: { label:'NETTOYEUR', mechId:'warden_x1', weapon:'scatter_gun_mk1', loadout:{
    head:'head_sensor_mk1', torso:'torso_fortified', left_arm:'arm_left_standard', right_arm:'arm_right_standard',
    left_leg:'leg_left_standard', right_leg:'leg_right_standard',
    weapon_primary:'scatter_gun_mk1', weapon_secondary:'war_pike_mk1', engine:'engine_vx4', shield:'shield_basic', cooling:'cooling_deluxe', utility:'utility_gyro' }}
};

const api = bindLoadout({
  slots: SLOTS, chassis: CHASSIS, weapons: WEAPONS_GARAGE, modules: MODULES, unarmedId: 'fists',
});
export const validateLoadout = api.validateLoadout;
export const deriveStats = api.deriveStats;
export function buildSimOverrides(ruleset, presets = PRESETS){
  return api.buildSimOverrides(ruleset, presets);
}

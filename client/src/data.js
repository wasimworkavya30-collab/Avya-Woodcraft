// Shared constants and the material / product pictures.
export const TEAMS = [
  { id: 'mgmt', name: 'Management', c: 'var(--t-mgmt)' },
  { id: 'design', name: 'Design studio', c: 'var(--t-design)' },
  { id: 'carp', name: 'Carpentry', c: 'var(--t-carp)' },
  { id: 'polish', name: 'Polish & finishing', c: 'var(--t-polish)' },
  { id: 'house', name: 'Housekeeping', c: 'var(--t-house)' },
];
export const teamOf = (id) => TEAMS.find((t) => t.id === id) || TEAMS[0];
export const INV_CATS = ['Wood', 'Polish & paint', 'Hardware', 'Fabric & foam', 'Consumables', 'Packing', 'Tools'];
export const PC_CATS = ['Tea & food', 'Transport', 'Fuel', 'Hardware & tools', 'Repair & maintenance', 'Stationery', 'Courier', 'Labour advance', 'Other'];
export const UNITS = ['pcs', 'cft', 'sheet', 'litre', 'kg', 'metre', 'box', 'roll', 'set'];
export const DAY_LABEL = { full: 'Full day', half: 'Half day', double: 'Double shift', custom: 'Custom' };
export const STAGE_TEMPLATE = [['Cutting & planing', 2], ['Joinery', 3], ['Carving', 2], ['Sanding', 2], ['Polishing', 3], ['Assembly', 1], ['Packing', 1]];

const ART = {
 wood:['#C68B4E','<g fill="#A8652C"><rect x="8" y="14" width="48" height="10" rx="1.5"/><rect x="8" y="27" width="48" height="10" rx="1.5" fill="#B9763A"/><rect x="8" y="40" width="48" height="10" rx="1.5"/></g><g stroke="#7E4A1E" stroke-width=".9" fill="none" opacity=".7"><path d="M10 19h44M14 17h30M10 32h44M20 30h28M10 45h44M16 43h34"/></g>'],
 veneer:['#EBCB94','<path d="M10 46L22 16h34L44 46z" fill="#D9A862"/><path d="M16 42l9-22M24 42l9-22M32 42l9-22M40 42l9-22" stroke="#B98443" stroke-width=".9"/>'],
 polish:['#2B3556','<rect x="18" y="20" width="28" height="32" rx="3" fill="#D8A93E"/><rect x="16" y="15" width="32" height="8" rx="2" fill="#B78922"/><rect x="22" y="30" width="20" height="13" rx="1.5" fill="#FFF3D1"/><path d="M25 37h14" stroke="#B78922" stroke-width="2"/>'],
 stain:['#D8C3A5','<rect x="25" y="9" width="14" height="9" rx="2" fill="#3b2a1a"/><rect x="20" y="18" width="24" height="38" rx="5" fill="#7A4A22"/><rect x="24" y="31" width="16" height="13" fill="#F3E2C2"/>'],
 paper:['#B9B4AA','<rect x="12" y="16" width="38" height="30" fill="#CDA774" transform="rotate(-7 31 31)"/><rect x="16" y="20" width="38" height="30" fill="#DDBB89"/><g fill="#9B7A4B" opacity=".6"><circle cx="24" cy="30" r="1"/><circle cx="34" cy="26" r="1"/><circle cx="42" cy="36" r="1"/><circle cx="28" cy="42" r="1"/><circle cx="46" cy="28" r="1"/></g>'],
 glue:['#E8E2D6','<path d="M24 12h16l3 10v30a4 4 0 01-4 4H25a4 4 0 01-4-4V22z" fill="#F4F0E8" stroke="#BFB7A5"/><rect x="24" y="32" width="16" height="14" fill="#E39A2B"/><rect x="27" y="7" width="10" height="6" fill="#E39A2B"/>'],
 screw:['#3C4250','<g fill="#C9CED8"><circle cx="18" cy="14" r="5"/><rect x="16.5" y="18" width="3" height="34"/><circle cx="32" cy="14" r="5"/><rect x="30.5" y="18" width="3" height="34"/><circle cx="46" cy="14" r="5"/><rect x="44.5" y="18" width="3" height="34"/></g><g stroke="#3C4250" stroke-width="1"><path d="M15 14h6M29 14h6M43 14h6M16 26h4M16 34h4M30 26h4M30 34h4M44 26h4M44 34h4"/></g>'],
 hinge:['#3A3F4B','<rect x="10" y="20" width="20" height="24" rx="2" fill="#C8A55A"/><rect x="34" y="20" width="20" height="24" rx="2" fill="#D6B96F"/><rect x="29" y="18" width="6" height="28" rx="3" fill="#8F7435"/><g fill="#6D5827"><circle cx="16" cy="27" r="1.6"/><circle cx="16" cy="37" r="1.6"/><circle cx="48" cy="27" r="1.6"/><circle cx="48" cy="37" r="1.6"/></g>'],
 foam:['#E8D9A8','<path d="M10 28l22-10 22 10v14L32 52 10 42z" fill="#F2D35C"/><path d="M10 28l22 10 22-10M32 38v14" stroke="#C9A92F" fill="none"/>'],
 fabric:['#7E2D3F','<rect x="10" y="16" width="44" height="32" rx="3" fill="#A33A4F"/><path d="M10 24h44M10 32h44M10 40h44M18 16v32M26 16v32M34 16v32M42 16v32M50 16v32" stroke="#C25A6F" stroke-width=".8" opacity=".6"/>'],
 wrap:['#CFE3EE','<rect x="12" y="22" width="40" height="22" rx="11" fill="#E8F4FA" stroke="#9CC3D6"/><g fill="none" stroke="#9CC3D6"><circle cx="22" cy="33" r="3"/><circle cx="32" cy="33" r="3"/><circle cx="42" cy="33" r="3"/></g>'],
 blade:['#4A505C','<path d="M8 40l48-12v8L8 48z" fill="#DADFE8"/><path d="M8 48l48-12" stroke="#8A93A3"/>'],
 table:['#E5D3B6','<rect x="8" y="22" width="48" height="6" rx="1.5" fill="#9A5E2A"/><rect x="12" y="28" width="4" height="22" fill="#7E4A1E"/><rect x="48" y="28" width="4" height="22" fill="#7E4A1E"/><rect x="14" y="34" width="36" height="2" fill="#A8652C"/>'],
 chair:['#E5D3B6','<rect x="18" y="10" width="4" height="42" fill="#7E4A1E"/><rect x="42" y="10" width="4" height="42" fill="#7E4A1E"/><rect x="18" y="13" width="28" height="4" fill="#9A5E2A"/><rect x="18" y="21" width="28" height="3" fill="#9A5E2A"/><rect x="16" y="34" width="32" height="6" rx="1.5" fill="#A8652C"/><rect x="17" y="40" width="3" height="14" fill="#7E4A1E"/><rect x="44" y="40" width="3" height="14" fill="#7E4A1E"/>'],
 bed:['#E5D3B6','<rect x="6" y="16" width="6" height="32" fill="#7E4A1E"/><rect x="52" y="26" width="6" height="22" fill="#7E4A1E"/><rect x="12" y="34" width="40" height="10" fill="#A8652C"/><rect x="14" y="27" width="16" height="8" rx="2" fill="#F4EAD8"/><rect x="12" y="44" width="40" height="3" fill="#7E4A1E"/>'],
 labour:['#3A3F4B','<rect x="30" y="20" width="5" height="32" rx="2" fill="#C99A5B" transform="rotate(25 32 36)"/><rect x="17" y="13" width="28" height="10" rx="2" fill="#C9CED8" transform="rotate(25 32 36)"/>'],
 pack:['#CDB690','<path d="M10 24l22-10 22 10v22L32 56 10 46z" fill="#C79A5C"/><path d="M10 24l22 10 22-10M32 34v22" stroke="#9B7338" fill="none"/>'],
 truck:['#DDE3EE','<rect x="6" y="22" width="30" height="22" fill="#3A4C7A"/><path d="M36 28h10l9 9v7H36z" fill="#5A6FA5"/><circle cx="18" cy="46" r="5" fill="#222"/><circle cx="46" cy="46" r="5" fill="#222"/>'],
 power:['#2C2A22','<path d="M36 8L18 36h12l-4 20 20-30H34z" fill="#F2C94C"/>'],
 rent:['#D8DCE6','<rect x="14" y="12" width="36" height="42" fill="#5A6785"/><g fill="#E9EEF8"><rect x="20" y="18" width="6" height="6"/><rect x="29" y="18" width="6" height="6"/><rect x="38" y="18" width="6" height="6"/><rect x="20" y="29" width="6" height="6"/><rect x="29" y="29" width="6" height="6"/><rect x="38" y="29" width="6" height="6"/></g><rect x="28" y="42" width="8" height="12" fill="#E9EEF8"/>']
};
const KEYS = [[/stain/,'stain'],[/glue/,'glue'],[/veneer/,'veneer'],[/polish|paint|melamine|lacquer/,'polish'],[/sandpaper|sand paper/,'paper'],[/screw|nail|bolt/,'screw'],[/hinge|handle|hardware/,'hinge'],[/foam|cushion/,'foam'],[/fabric|cloth/,'fabric'],[/bubble|wrap/,'wrap'],[/blade|cutter/,'blade'],[/plank|timber|plywood|\bwood\b/,'wood'],[/table/,'table'],[/chair/,'chair'],[/\bbed\b/,'bed'],[/pack/,'pack'],[/transport|loading|tempo|truck/,'truck'],[/power|machine|electric/,'power'],[/rent/,'rent']];
export function artKey(name, kind) {
  const n = String(name).toLowerCase();
  if (kind === 'labour') return 'labour';
  for (const [re, k] of KEYS) if (re.test(n)) return k;
  return kind === 'material' ? 'wood' : 'pack';
}
export function artSvg(name, kind) {
  const a = ART[artKey(name, kind)] || ART.pack;
  return `<rect width="64" height="64" fill="${a[0]}"/>${a[1]}`;
}

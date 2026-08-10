const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'svg');
const map = {
  comercial_automatico: ['automatico_icono.svg', 'automatico_diagrama.svg'],
  comercial_esclusa: ['esclusa_icono.svg', 'esclusa_diagrama.svg'],
  horario_extendido: ['extendido_icono.svg', 'extendido__diagrama.svg'],
  horario_autoservicio: ['autoservicio_icono.svg', 'autoservicio_diagrama.svg'],
  oficina_cerrada: ['oficina_cerrada_icono.svg', 'oficina_cerrada_diagrama.svg'],
  carga_cajero: ['carga_cajero_icono.svg', 'carga_cajero_diagrama.svg'],
  manual: ['puertas_bloqueadas_icono.svg', 'bloqueo_oficina_diagrama.svg'],
  emergencia: ['emergencia_icono.svg', null],
};

let out = '/** Auto-generated from assets/svg — do not edit by hand. */\n';
out += 'export const MODE_ICON_SVG: Record<string, string> = {\n';
for (const [id, [icon]] of Object.entries(map)) {
  const xml = fs.readFileSync(path.join(dir, icon), 'utf8');
  out += `  ${JSON.stringify(id)}: ${JSON.stringify(xml)},\n`;
}
out += '};\n\nexport const MODE_DIAGRAM_SVG: Record<string, string> = {\n';
for (const [id, [, diag]] of Object.entries(map)) {
  if (!diag) continue;
  const xml = fs.readFileSync(path.join(dir, diag), 'utf8');
  out += `  ${JSON.stringify(id)}: ${JSON.stringify(xml)},\n`;
}
out += '};\n';

fs.writeFileSync(path.join(__dirname, '..', 'config', 'modeSvgAssets.ts'), out);
console.log('OK', Object.keys(map).length, 'modes');

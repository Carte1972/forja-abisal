// Comprueba si el Node.js con el que se ejecuta cumple "engines.node" de package.json.
// Sale con 0 si vale y con 1 si no. Con --min imprime la versión mínima (p. ej. "22.12").
// Sintaxis antigua a propósito: se ejecuta antes de saber si este Node es moderno.
var fs = require('fs');
var path = require('path');

var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
var match = /(\d+)\.(\d+)/.exec(pkg.engines.node);
var need = [Number(match[1]), Number(match[2])];
var have = process.versions.node.split('.').map(Number);

if (process.argv.indexOf('--min') !== -1) console.log(need.join('.'));
var ok = have[0] > need[0] || (have[0] === need[0] && have[1] >= need[1]);
process.exit(ok ? 0 : 1);

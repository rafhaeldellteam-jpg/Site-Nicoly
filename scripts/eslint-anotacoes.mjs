// Transforma o resultado do ESLint (eslint.json) em anotações do GitHub,
// para cada problema aparecer na linha certa do PR. Usado no CI.
import { readFileSync } from "node:fs";

const resultados = JSON.parse(readFileSync("eslint.json", "utf8"));
let erros = 0;
for (const arquivo of resultados) {
  const caminho = arquivo.filePath.replace(process.cwd() + "/", "");
  for (const m of arquivo.messages) {
    const nivel = m.severity === 2 ? "error" : "warning";
    if (m.severity === 2) erros++;
    const texto = `${m.ruleId ?? "eslint"}: ${m.message}`.replace(/\r?\n/g, " ");
    console.log(`::${nivel} file=${caminho},line=${m.line ?? 1},col=${m.column ?? 1}::${texto}`);
  }
}
console.log(`ESLint: ${erros} erro(s).`);
process.exit(erros ? 1 : 0);

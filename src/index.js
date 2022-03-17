const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const fse = require("fs-extra");
const autoI18nTransform = require("./transform/auto-i18n-transform");
const fs = require("fs");
const path = require("path");
const commander = require("commander");
const glob = require("glob");

commander.option("--out-dir <outDir>", "output directory");
commander.option("--ignore  <ignore>", "ignore files name");
commander.option(
  "--test  <t>",
  "generate sourcecode file with suffix instead of override exist file"
);

commander.parse(process.argv);
const cliOpts = commander.opts();
if (!cliOpts.outDir) {
  console.error("no output directory specified");
  commander.outputHelp();
  process.exit(1);
}

let filenames = glob.sync(commander.args[0]);
let texts = {};
if (cliOpts.ignore) {
  filenames = filenames.filter((f) => !f.includes(cliOpts.ignore));
}
filenames.forEach((fileName) => {
  const sourceCode = fs.readFileSync(fileName, {
    encoding: "utf-8",
  });

  const ast = parser.parse(sourceCode, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    ranges: true,
  });
  try {
    const t_ast = autoI18nTransform(ast, {
      fileName: fileName.split("/").slice(-1)[0],
      texts,
    });
    const { code } = generate(t_ast, { sourceMaps: false });
    const prettier = require("prettier");
    fse.writeFileSync(
      cliOpts.t ? fileName + "_t" : fileName,
      prettier.format(code, { parser: "babel" })
    );
  } catch (e) {
    console.log("error on transform file : ", fileName, e);
  }
});

const content = `export const resource = ${JSON.stringify(texts, null, 4)};\n`;
const messageIdsContent = `
import { resource } from './en-US.js'
function createProxy(obj) {
  const handler = {
    get: function(_, prop) {
      return prop;
    }
  };
  return new Proxy(obj, handler);
}
export const messageIds = createProxy(resource);
`;

if (!fs.existsSync(cliOpts.outDir)) {
  fs.mkdirSync(cliOpts.outDir, { recursive: true });
}
fse.writeFileSync(path.join(cliOpts.outDir, "en-US.js"), content);
fse.writeFileSync(path.join(cliOpts.outDir, "index.js"), messageIdsContent);

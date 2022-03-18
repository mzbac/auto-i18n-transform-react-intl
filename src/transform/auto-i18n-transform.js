const generate = require("@babel/generator").default;
const generateKey = require("./hash.js");
const addFormatMessage = require("./addFormatMessage.js");
const template = require("@babel/template").default;
const traverse = require("@babel/traverse").default;
const babelTypes = require("@babel/types");

function getReplaceExpression(path, key) {
  const expressionParams = path.isTemplateLiteral()
    ? path.node.expressions.map((item) => generate(item).code)
    : null;
  let statement = `formatMessage({
              id: messageIds.${key}
          })`;

  if (expressionParams?.length > 0) {
    statement = `formatMessage({
          id: messageIds.${key}
      },{
          ${expressionParams.reduce((acc, cur, idx) => {
            return acc + `placeholder${idx}:` + cur + ",";
          }, "")}
      })`;
  }
  let replaceExpression = template.ast(statement).expression;

  if (
    (path.findParent((p) => p.isJSXAttribute()) &&
      !path.findParent((p) => p.isJSXExpressionContainer())) ||
    path.isJSXText()
  ) {
    replaceExpression = babelTypes.JSXExpressionContainer(replaceExpression);
  }

  return replaceExpression;
}

const autoI18nTransform = function (ast, { texts, fileName, outDir }) {
  let transformed = false;
  traverse(ast, {
    Program: {
      enter(path) {
        path.traverse({
          "StringLiteral|TemplateLiteral|JSXText"(path) {
            if (path.node.leadingComments) {
              path.node.leadingComments = path.node.leadingComments.filter(
                (comment, index) => {
                  if (comment.value.includes("i18n-disable")) {
                    path.node.skipTransform = true;
                    return false;
                  }
                  return true;
                }
              );
            }
            const attr = path.findParent(
              (p) => p.isJSXAttribute() && p.node.name.name === "className"
            );
            if (attr) {
              path.node.skipTransform = true;
            }
            if (path.findParent((p) => p.isImportDeclaration())) {
              path.node.skipTransform = true;
            }
          },
        });
      },
      exit(path) {
        if (transformed) {
          let imported;
          path.traverse({
            ImportDeclaration(p) {
              const source = p.node.source.value;
              const importedUseIntl = p.node.specifiers.find((s) => {
                return (
                  babelTypes.isImportSpecifier(s) &&
                  s.imported.name === "useIntl"
                );
              });
              if (source === "react-intl" && importedUseIntl) {
                imported = true;
              }
            },
          });
          if (!imported) {
            const importAst = template.ast(
              `import { useIntl } from 'react-intl'`
            );
            const importAst2 = template.ast(
              `import { messageIds } from '${outDir}'`
            );
            path.node.body.unshift(importAst2);
            path.node.body.unshift(importAst);
          }
        }
      },
    },
    StringLiteral(path) {
      if (path.node.skipTransform) {
        return;
      }
      const isJsx = addFormatMessage(path);
      if (isJsx) {
        transformed = true;
        let key = generateKey(path.node.value, fileName);
        texts[key] = path.node.value;
        const replaceExpression = getReplaceExpression(path, key);
        try {
          path.replaceWith(replaceExpression);
        } catch (e) {
          path.replaceWith(
            babelTypes.JSXExpressionContainer(replaceExpression)
          );
        }
        path.skip();
      }
    },
    JSXText(path) {
      if (path.node.skipTransform) {
        return;
      }
      const isJsx = addFormatMessage(path);
      if (isJsx) {
        transformed = true;
        let key = generateKey(path.node.value, fileName);
        texts[key] = path.node.value;
        const replaceExpression = getReplaceExpression(path, key);
        try {
          path.replaceWith(replaceExpression);
        } catch (e) {
          path.replaceWith(
            babelTypes.JSXExpressionContainer(replaceExpression)
          );
        }
        path.skip();
      }
    },
    TemplateLiteral(path) {
      if (path.node.skipTransform) {
        return;
      }

      const guasis = path.get("quasis").map((item) => item.node.value.raw);

      for (let i = 0; i < guasis.length - 1; i++) {
        guasis[i] += `{placeholder${i}}`;
      }
      const value = guasis.join("");
      if (value) {
        const isJsx = addFormatMessage(path);
        if (isJsx) {
          transformed = true;
          let key = generateKey(value, fileName);
          texts[key] = value;
          const replaceExpression = getReplaceExpression(path, key);
          try {
            path.replaceWith(replaceExpression);
          } catch (e) {
            path.replaceWith(
              babelTypes.JSXExpressionContainer(replaceExpression)
            );
          }
          path.skip();
        }
      }
    },
  });

  return ast;
};
module.exports = autoI18nTransform;

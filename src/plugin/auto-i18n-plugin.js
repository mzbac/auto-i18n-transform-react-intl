const { declare } = require("@babel/helper-plugin-utils");
const generate = require("@babel/generator").default;
const generateKey = require("./hash.js");
const addFormatMessage = require("./addFormatMessage.js");

const autoI18nPlugin = declare((api, { texts, fileName }) => {
  api.assertVersion(7);
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
    let replaceExpression = api.template.ast(statement).expression;

    if (
      (path.findParent((p) => p.isJSXAttribute()) &&
        !path.findParent((p) => p.isJSXExpressionContainer())) ||
      path.isJSXText()
    ) {
      replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
    }

    return replaceExpression;
  }
  return {
    visitor: {
      Program: {
        enter(path) {
          let imported;
          path.traverse({
            ImportDeclaration(p) {
              const source = p.node.source.value;
              const importedUseIntl = p.node.specifiers.find((s) => {
                return (
                  s.type === "ImportSpecifier" && s.imported.name === "useIntl"
                );
              });
              if (source === "react-intl" && importedUseIntl) {
                imported = true;
              }
            },
          });
          if (!imported) {
            const importAst = api.template.ast(
              `import { useIntl } from 'react-intl'`
            );
            const importAst2 = api.template.ast(
              `import { messageIds } from 'messages'`
            );
            path.node.body.unshift(importAst2);
            path.node.body.unshift(importAst);
          }

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
      },
      StringLiteral(path) {
        if (path.node.skipTransform) {
          return;
        }
        let key = generateKey(path.node.value, fileName);
        texts[key] = path.node.value;
        addFormatMessage(path);

        const replaceExpression = getReplaceExpression(path, key);
        try {
          path.replaceWith(replaceExpression);
        } catch (e) {
          path.replaceWith(api.types.JSXExpressionContainer(replaceExpression));
          //console.log("error on transform -", fileName, e);
        }
        path.skip();
      },
      JSXText(path) {
        if (path.node.skipTransform) {
          return;
        }
        let key = generateKey(path.node.value, fileName);
        texts[key] = path.node.value;
        addFormatMessage(path);

        const replaceExpression = getReplaceExpression(path, key);
        try {
          path.replaceWith(replaceExpression);
        } catch (e) {
          path.replaceWith(api.types.JSXExpressionContainer(replaceExpression));
          // console.log("error on transform -", fileName, e);
        }
        path.skip();
      },
      TemplateLiteral(path) {
        if (path.node.skipTransform) {
          return;
        }

        const value = path
          .get("quasis")
          .map((item) => item.node.value.raw)
          .reduce((acc, cur, idx) => {
            return acc + cur + `{placeholder${idx}}`;
          }, "");

        if (value) {
          let key = generateKey(value, fileName);

          texts[key] = value;

          addFormatMessage(path);

          const replaceExpression = getReplaceExpression(path, key);
          try {
            path.replaceWith(replaceExpression);
          } catch (e) {
            console.log("error on transform -", fileName, e);
          }
          path.skip();
        }
      },
    },
  };
});
module.exports = autoI18nPlugin;

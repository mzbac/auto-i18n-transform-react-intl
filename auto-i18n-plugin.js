const { declare } = require('@babel/helper-plugin-utils');
const { importSpecifier } = require('@babel/types');
// const fse = require('fs-extra');
// const path = require('path');
const generate = require('@babel/generator').default;
const generateKey = require('./hash.js');
function nextIntlKey(str) {
  return generateKey();
}

const autoTrackPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);
  function getReplaceExpression(path, value, intlUid) {
    const expressionParams = path.isTemplateLiteral()
      ? path.node.expressions.map((item) => generate(item).code)
      : null;
    let statement = `formatMessage({
                id: messageIds.${value}
            })`;
    if (expressionParams) {
      statement = `formatMessage({
            id: messageIds.${value}
        },{
            ${expressionParams.reduce((acc, cur, idx) => {
              return acc + `placeholder${idx}:` + cur + ',';
            }, '')}
        })`;
    }
    let replaceExpression = api.template.ast(statement).expression;

    if (
      path.findParent((p) => p.isJSXAttribute()) &&
      !path.findParent((p) => p.isJSXExpressionContainer())
    ) {
      replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
    }
    return replaceExpression;
  }

  function save(file, key, value) {
    const allText = file.get('allText');
    allText.push({
      key,
      value,
    });
    file.set('allText', allText);
  }

  return {
    pre(file) {
      file.set('allText', []);
    },
    visitor: {
      Program: {
        enter(path) {
          let imported;
          path.traverse({
            ImportDeclaration(p) {
              const source = p.node.source.value;
              const importedUseIntl = p.node.specifiers.find((s) => {
                return s.isImportSpecifier() && s.imported.name === 'useIntl';
              });
              if (source === 'react-intl' && importedUseIntl) {
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
            'StringLiteral|TemplateLiteral'(path) {
              if (path.node.leadingComments) {
                path.node.leadingComments = path.node.leadingComments.filter(
                  (comment, index) => {
                    if (comment.value.includes('i18n-disable')) {
                      path.node.skipTransform = true;
                      return false;
                    }
                    return true;
                  }
                );
              }
              if (path.findParent((p) => p.isImportDeclaration())) {
                path.node.skipTransform = true;
              }
            },
          });
        },
      },
      StringLiteral(path, state) {
        if (path.node.skipTransform) {
          return;
        }
        let key = nextIntlKey(path.node.value);
        save(state.file, key, path.node.value);

        // todo check if any useIntl
        // if not formatMessage then add it in block scope

        if (path.findParent((p) => p.isBlockStatement())) {
          const block = path.findParent((p) => p.isBlockStatement());
          const imported = block.node.body.find((p) => {
            return (
              p.type === 'VariableDeclaration' &&
              p.declarations[0].init.type === 'CallExpression' &&
              p.declarations[0].init.callee.name === 'useIntl'
            );
          });
          if (!imported) {
            const importAst = api.template.ast(
              `const { formatMessage } = useIntl();`
            );
            block.node.body.unshift(importAst);
          }
        }

        const replaceExpression = getReplaceExpression(
          path,
          key,
          state.intlUid
        );
        path.replaceWith(replaceExpression);
        path.skip();
      },
      TemplateLiteral(path, state) {
        if (path.node.skipTransform) {
          return;
        }
        const value = path
          .get('quasis')
          .map((item) => item.node.value.raw)
          .reduce((acc, cur, idx) => {
            return acc + cur + `{placeholder${idx}}`;
          }, '');
        //   .join('{placeholder}');
        if (value) {
          let key = nextIntlKey(value);

          save(state.file, key, value);

          // todo check if any useIntl
          // if not formatMessage then add it in block scope
          const replaceExpression = getReplaceExpression(
            path,
            key,
            state.intlUid
          );
          path.replaceWith(replaceExpression);
          path.skip();
        }
      },
    },
    post(file) {
      const allText = file.get('allText');
      const intlData = allText.reduce((obj, item) => {
        obj[item.key] = item.value;
        return obj;
      }, {});

      const content = `const resource = ${JSON.stringify(
        intlData,
        null,
        4
      )};\nexport default resource;`;
      //   fse.ensureDirSync(options.outputDir);
      //   fse.writeFileSync(path.join(options.outputDir, 'zh_CN.js'), content);
      //   fse.writeFileSync(path.join(options.outputDir, 'en_US.js'), content);
    },
  };
});
module.exports = autoTrackPlugin;

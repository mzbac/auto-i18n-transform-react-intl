const template = require("@babel/template").default;
const babelTypes = require("@babel/types");

module.exports = function (path) {
  const jsxComponentFunction = path.findParent((p) =>
    checkJsxComponentDeclaration(p)
  );
  if (jsxComponentFunction) {
    if (!path.scope.getBinding("formatMessage")) {
      const importAst = template.ast(`const { formatMessage } = useIntl();`);
      try {
        if (jsxComponentFunction.node.body.body) {
          if (
            !jsxComponentFunction.node.body.body.find((elm) => {
              return (
                babelTypes.isVariableDeclaration(elm) &&
                elm.declarations.find((d) => d.init?.callee?.name === "useIntl")
              );
            })
          ) {
            jsxComponentFunction.node.body.body.unshift(importAst);
          }
        } else {
          if (
            !jsxComponentFunction.node.body.children.find((elm) => {
              return (
                babelTypes.isVariableDeclaration(elm) &&
                elm.declarations.find((d) => d.init?.callee?.name === "useIntl")
              );
            })
          ) {
            jsxComponentFunction.node.body.children.unshift(importAst);
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
};

function checkJsxComponentDeclaration(path) {
  if (
    path &&
    (path.isArrowFunctionExpression() || path.isFunctionDeclaration()) &&
    (checkNameFirstCharUpper(path) || checkReturnJsxElement(path))
  ) {
    return true;
  }
  return false;
}

const checkNameFirstCharUpper = (path) => {
  const isFirstCharUpper = (name = "") => {
    const charCodeAt = name[0].charCodeAt(0);
    return charCodeAt >= 65 && charCodeAt <= 90;
  };
  if (
    babelTypes.isFunctionDeclaration(path.node) &&
    path.node.id &&
    isFirstCharUpper(path.node.id?.name)
  ) {
    return true;
  }
  if (
    babelTypes.isFunctionDeclaration(path.node) &&
    babelTypes.isArrowFunctionExpression(path.node) &&
    babelTypes.isAssignmentExpression(path.parent)
  ) {
    if (babelTypes.isIdentifier(path.parent.left)) {
      const left = path.parent.left;
      return isFirstCharUpper(left.name);
    }
  }
  return false;
};

const checkReturnJsxElement = (path) => {
  let hasJSXElement = false;
  path.traverse({
    JSXElement() {
      hasJSXElement = true;
    },
  });
  return hasJSXElement;
};

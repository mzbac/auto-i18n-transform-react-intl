module.exports = function (path, api) {
  if (path.findParent((p) => p.isBlockStatement())) {
    const block = path.findParent((p) => p.isBlockStatement());
    const imported = block.node.body.find((p) => {
      return (
        p.type === 'VariableDeclaration' &&
        p.declarations[0]?.init?.type === 'CallExpression' &&
        p.declarations[0]?.init?.callee.name === 'useIntl'
      );
    });

    if (!imported) {
      const importAst = api.template.ast(
        `const { formatMessage } = useIntl();`
      );
      block.node.body.unshift(importAst);
    }
  }
};

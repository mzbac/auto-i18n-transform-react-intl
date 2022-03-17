# Auto-i18n-transform-react-intl

## Why?
Internationalize your web apps is hard. It needs to support different currencies, date formats and translations on client and server. 

For frontend part, most likely you may have to extract all the string values into locale file and wrap it in your code with kind of wrapper such as `intl.t(key of the string in locale file)`

If you have tons of the hardcoded string values in your code base, the effort of manually doing it will be tremendous.

So this project is my first attempt of automating the tedious and repetitive task.

## Usage (CLI)
```npx
npx auto-i18n-transform-react-intl --help
```



## Example

Transform js file wrapper raw string and inject react-intl and useIntl 
```npx
npx auto-i18n-transform-react-intl 'sourceCode.js' --out-dir output_dir_for_locale_files
```
From 
```js
import React from "react";
export default App = () => {
  const aStr = "something";
  const bStr = 'something else';
  return <div>hello world</div>;
};
```
To
```js
import { useIntl } from "react-intl";
import { messageIds } from "messages";
import React from "react";
export default App = () => {
  const { formatMessage } = useIntl();
  const aStr = formatMessage({
    id: messageIds.sourcecode_3fc9b68,
  });
  const bStr = formatMessage({
    id: messageIds.sourcecode_f41f3fa,
  });
  return (
    <div>
      {formatMessage({
        id: messageIds.sourcecode_df6387f,
      })}
    </div>
  );
};
```
```js
// locale/en-US.js
export const resource = {
    "sourcecode_3fc9b68": "something",
    "sourcecode_f41f3fa": "something else",
    "sourcecode_df6387f": "hello world"
};
```
```js
// locale/index.js
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
```

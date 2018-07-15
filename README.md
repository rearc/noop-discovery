# noop-discovery
Noop application source code discovery library. This library is hosted publicly on NPM.

The library exports a single function with three parameters.
- `rootPath` {string} - path to scan for Noop App
- `watch` {boolean} - whether or not to emit events on file changes
- `done` {callback} - yields {err} and {app}


## Quickstart
```
npm install @rearc/noop-discovery --save
```

```javascript
const discovery = require('@rearc/noop-discovery')

discovery('/project/root', true, (err, app) => {
  if (err) console.log('bort', err)
  app.on('manifestChange', (manifestFile) => {})
  app.on('componentChange', (componentName) => {})
})

```

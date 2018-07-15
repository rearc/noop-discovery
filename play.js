const discovery = require('./index')

discovery('/Users/wintzer/Projects/Rearc/noop-sample/', true, (err, app) => {
  if (err) return console.log(err)
  console.log(`Application discovered at ${app.rootPath}`)
  app.on('manifestChange', (file) => console.log(`Manifest change: ${file}`))
  app.on('componentChange', (componentName, file) => {
    console.log(`Component change: ${componentName}`)
  })
})


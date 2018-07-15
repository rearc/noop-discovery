const App = require('./lib/app')

/**
 * 
 * @param {string} root - root directory to discover
 * @param {boolean} watch - whether or not to watch for changes and emit events
 * @param {function} done - c
 */
module.exports = (root, watch = false, done) => {
  const app = new App(root, watch)
  app.discover((err) => {
    if (err) return done(err)
    done(null, app)
  })
}
/**
 * @callback discoverCallback
 * @param {Error}
 * @param {App}
 */
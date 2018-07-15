const async = require('async')

const Route = require('./route')
const Resource = require('./resource')

class Component {
  constructor (app, directives, rootPath) {
    this.app = app
    this.directives = directives
    this.rootPath = rootPath
    this.name = null
    this.type = null
    this.env = {}
    this.routes = []
    this.resources = []
    if (directives[0].cmd === 'COMPONENT') {
      this.name = directives[0].params.name
      this.type = directives[0].params.type
    }
  }

  validate (done) {
    this.directives.filter((directive) => {
      return (directive.cmd === 'ENV')
    }).forEach((directive) => {
      this.env[directive.params.key] = {
        default: directive.params.defaultValue,
        secret: directive.params.secret
      }
    })
    async.auto({
      routes: (done) => {
        const routeDirectives = this.directives.filter((directive) => {
          return (directive.cmd === 'ROUTE')
        })
        async.map(routeDirectives, (directive, done) => {
          Route.register(this.app, this, directive, done)
        }, done)
      },
      resources: (done) => {
        const resourceDirectives = this.directives.filter((directive) => {
          return (directive.cmd === 'RESOURCE')
        })
        async.map(resourceDirectives, (directive, done) => {
          Resource.register(this, directive, done)
        }, done)
      }
    }, (err, results) => {
      if (err) return done(err)
      this.routes = results.routes
      this.resources = results.resources
      done(null)
    })
  }
}

module.exports = Component

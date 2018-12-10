const async = require('async')

const Route = require('./route')
const Resource = require('./resource')

class ComponentError extends Error {
  constructor (...args) {
    super(...args)
    this.name = 'ComponentError'
  }
}

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
    this.port = 80
    this.dockerfile = generateDockerfile(directives)
    if (directives[0].cmd === 'COMPONENT') {
      this.name = directives[0].params.name
    }
  }

  validate (done) {
    const typeDirective = this.directives.find((directive) => {
      const typeDirectives = ['SERVICE', 'FUNCTION']
      return (typeDirectives.indexOf(directive.cmd) !== -1)
    })
    if (typeDirective) {
      this.type = typeDirective.cmd.toLowerCase()
    } else {
      return done(new ComponentError(`Component ${this.name} must contain either directive SERVICE or FUNCTION`))
    }
    this.directives.filter((directive) => {
      return (directive.cmd === 'ENV')
    }).forEach((directive) => {
      this.env[directive.params.key] = {
        default: directive.params.defaultValue,
        secret: directive.params.secret
      }
    })
    this.directives.forEach((directive) => {
      if (directive.cmd === 'EXPOSE') this.port = directive.params.port
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

function generateDockerfile (directives) {
  let dockerfile = ''
  directives.forEach((directive) => {
    switch (directive.cmd) {
      case 'FROM':
        dockerfile += directive.raw + '\n'
        break
      case 'RUN':
        dockerfile += directive.raw + '\n'
        break
      case 'COPY':
        dockerfile += directive.raw + '\n'
        break
      case 'ENTRYPOINT':
        dockerfile += directive.raw + '\n'
        break
      case 'WORKDIR':
        dockerfile += directive.raw + '\n'
        break
      case 'SERVICE':
        if (/^SERVICE .+/.test(directive.raw)) dockerfile += directive.raw.replace('SERVICE', 'CMD') + '\n'
        break
      case 'FUNCTION':
        if (/^FUNCTION .+/.test(directive.raw)) dockerfile += directive.raw.replace('FUNCTION', 'CMD') + '\n'
        break
    }
  })
  return dockerfile
}
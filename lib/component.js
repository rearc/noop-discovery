const async = require('async')

const Route = require('./route')
const Resource = require('./resource')

const types = {
  service: {
    allowedDirectives: [
      'ROUTE',
      'RESOURCE',
      'ENV',
      'SPECIAL',
      'EXPOSE',
      'FROM',
      'COPY',
      'RUN',
      'WORKDIR',
      'ENTRYPOINT',
      'CMD',
      'USER',
      'CPU',
      'MEMORY'
    ]
  },
  task: {
    allowedDirectives: [
      'LIFECYCLE',
      'CRON',
      'RESOURCE',
      'ENV',
      'FROM',
      'COPY',
      'RUN',
      'WORKDIR',
      'ENTRYPOINT',
      'CMD',
      'USER',
      'CPU',
      'MEMORY'
    ]
  },
  static: {
    allowedDirectives: [
      'ROUTE',
      'FROM',
      'COPY',
      'RUN',
      'WORKDIR',
      'ENTRYPOINT',
      'USER',
      'ASSETS'
    ]
  }
}

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
    this.name = directives[0].params.name
    this.type = directives[0].params.type
    this.env = {}
    this.routes = []
    this.resources = []
    this.port = 80
    this.lifecycles = []
    this.cron = null
    this.cpu = (this.type === 'service' || this.type === 'task') ? 1 : null
    this.memory = (this.type === 'service' || this.type === 'task') ? 1 : null
    this.dockerfile = generateDockerfile(directives)
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
    let errors = []
    this.directives.forEach((directive) => {
      if (directive.cmd === 'EXPOSE') this.port = directive.params.port
      if (directive.cmd === 'LIFECYCLE') this.lifecycles.push(directive.params.lifecycle)
      if (directive.cmd === 'CRON') this.cron = directive.params
      if (directive.cmd === 'CPU') this.cpu = parseFloat(directive.params.units)
      if (directive.cmd === 'MEMORY') this.memory = parseInt(directive.params.units)
      if (directive.cmd === 'STATIC') this.contentDirectory = directive.params.contentDirectory
      if (types[this.type].allowedDirectives.indexOf(directive.cmd) === -1) {
        if (directive.cmd === 'COMPONENT') return false
        errors.push(new ComponentError(`Directive '${directive.cmd}' not supported for ${this.type} components [${directive.file}:${directive.lineNumber}]`))
      }
    })
    if (errors.length) return done(errors[0])
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
      case 'CMD':
        dockerfile += directive.raw + '\n'
        break
      case 'WORKDIR':
        dockerfile += directive.raw + '\n'
        break
      case 'USER':
        dockerfile += directive.raw + '\n'
        break
      case 'TEST':
        if (/^TEST .+/.test(directive.raw)) dockerfile += directive.raw.replace('TEST', 'CMD') + '\n'
        break
    }
  })
  return dockerfile
}
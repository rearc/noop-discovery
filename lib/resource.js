const minimist = require('minimist')

const resourceTypes = {
  s3: {
    params: {
      versioning: {
        boolean: true
      }
    }
  },
  mysql: {
    params: {
      version: {
        match: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/,
        alias: 'v'
      }
    }
  },
  dynamodb: {
    params: {
      hashKey: {
        required: true
      },
      hashKeyType: {
        required: true,
        enum: ['S', 'N']
      },
      rangeKey: {},
      rangeKeyType: {
        enum: ['S', 'N']
      }
    }
  }
}

class ResourceError extends Error {
  constructor (...args) {
    super(...args)
    this.name = 'ResourceError'
  }
}

class Resource {
  constructor (name) {
    this.name = name
    this.type = null
    this.params = {}
    this.componentParams = {}
    this.directives = []
  }

  validate (done) {
    // TODO actually validate params against resourceTypes schemas
    const props = resourceTypes[this.type]
    if (!props) {
      return done(new DirectiveError(`Unknown resource type '${this.type}'`))
    }
    const argOpts = {string: [], boolean: [], alias: {}}
    Object.keys(props.params).forEach((key) => {
      if (props.params[key].boolean) {
        argOpts.boolean.push(key)
      }
      if (props.params[key].alias) {
        argOpts.alias[key] = props.params[key].alias
      }
    })
    this.directives.forEach((directive) => {
      const args = minimist(directive.args, argOpts)
      Object.keys(args).forEach((arg) => {
        if (arg === '_') return false
        if (!props.params[arg]) return false
        if (this.params[arg] === args[arg]) {
          return true
        } else if (this.params[arg] && this.params[arg] !== args[arg]) {
          // TODO handle conflict
        } else {
          this.params[arg] = args[arg]
        }
      })
    })
    if (!this.type) {
      return done(new ResourceError(`Resource '${name} missing type`))
    }
    done(null)
  }
}

Resource.register = (component, directive, done) => {
  const name = directive.params.name
  const app = component.app
  const resource = app.resources[name] || new Resource(name)
  resource.directives.push(directive)
  app.resources[name] = resource
  if (!resource.type && directive.params.type) {
    resource.type = directive.params.type
  } else if (resource.type && directive.params.type && resource.type !== directive.params.type) {
    return done(new ResourceError(`Resource '${name}' already declared as type '${resource.type}'`))
  }
  done(null, resource)
}

module.exports = Resource

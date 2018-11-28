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
      hashKeyName: {
        required: true
      },
      hashKeyType: {
        required: true,
        enum: ['S', 'N']
      },
      rangeKeyName: {},
      rangeKeyType: {
        enum: ['S', 'N']
      }
    }
  },
  mongodb: {
    params: {}
  },
  postgres: {
    params: {
      version: {
        match: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?$/
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
    const errors = []
    if (!props) {
      return done(new ResourceError(`Unknown resource type '${this.type}'`))
    }
    this.directives.forEach((directive) => {
      if (!directive.params.parameter) return false
      const parameters = (typeof directive.params.parameter === 'string') ? [directive.params.parameter] : directive.params.parameter
      parameters.forEach((parameter) => {
        const match = /^(.+)=(.+)$/.exec(parameter)
        if (!match) {
          // TODO surface as a warning on malformed parameter
          return false
        }
        const key = match[1]
        const value = match[2]
        if (!props.params[key]) return false
        if (this.params[key] === value) {
          return true
        } else if (this.params[key] && this.params[key] !== value) {
          console.log('DANGER WILL ROBINSON!')
          // TODO surface warning on parameter declaration conflict
        } else {
          this.params[key] = value
        }
      })
    })
    Object.keys(props.params).forEach((paramName) => {
      const param = props.params[paramName]
      if (param.required && !this.params[paramName]) {
        return errors.push(new ResourceError(`Missing required resource parameter '${paramName}'`))
      }
      if (this.params[paramName] && param.enum && param.enum.indexOf(this.params[paramName]) === -1) {
        return errors.push(new ResourceError(`Invalid resource parameter value '${this.params[paramName]}' for '${paramName}'`))
      }
    })
    if (!this.type) {
      return done(new ResourceError(`Resource '${name} missing type`))
    }
    done((errors.length) ? errors[0] : null)
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

const minimist = require('minimist')
const dockerParser = require('docker-file-parser')

const directives = {
  COMPONENT: {
    name: {
      operand: 0,
      required: true,
      match: /^[a-zA-Z0-9]+$/
    },
    type: {
      operand: 1,
      required: true,
      match: /^[a-zA-Z0-9]+$/
    }
  },
  ROUTE: {
    pattern: {
      operand: 0,
      required: true
    },
    method: {
      option: 'method',
      alias: 'm',
      enum: ['GET', 'PUT', 'POST', 'DELETE', 'ALL', 'OPTIONS'],
      default: 'ALL'
    },
    private: {
      option: 'private',
      alias: 'p',
      default: false,
      boolean: true
    }
  },
  RESOURCE: {
    name: {
      operand: 0,
      match: /[0-9a-zA-Z]+/,
      required: true
    },
    type: {
      operand: 1
    },
    parameter: {
      option: 'parameter',
      alias: 'p'
    }
  },
  ENV: {
    key: {
      operand: 0,
      required: true
    },
    defaultValue: {
      operand: 1,
      required: true
    },
    secret: {
      option: 'secret',
      alias: 's',
      default: false,
      boolean: true
    }
  },
  ASSETS: {
    pattern: {
      operand: 0,
      required: true
    }
  },
  CRON: {
    minute: {
      operand: 0,
      required: true
    },
    hour: {
      operand: 1,
      required: true
    },
    day: {
      operand: 2,
      required: true
    },
    month: {
      operand: 3,
      required: true
    },
    weekday: {
      operand: 4,
      required: true
    }
  },
  LIFECYCLE: {
    lifecycle: {
      operand: 0,
      required: true,
      enum: ['predeploy', 'postdeploy']
    }
  },
  TEST: {
    arguments: {
      passThrough: true
    }
  },
  EXPOSE: {
    port: {
      operand: 0,
      required: true
    }
  },
  CPU: {
    units: {
      operand: 0,
      required: true,
      match: /^(\d|\.)+$/
    }
  },
  MEMORY: {
    units: {
      operand: 0,
      required: true,
      match: /^\d+$/
    }
  },
  FROM: {},
  COPY: {},
  RUN: {},
  WORKDIR: {},
  CMD: {},
  ENTRYPOINT: {},
  USER: {}
}

class DirectiveError extends Error {
  constructor (...args) {
    super(...args)
    this.name = 'DirectiveError'
  }
}

class Directive {
  constructor (raw, file, lineNumber) {
    if (/^ENV /.test(raw)) {
      // hack around docker-file-parser handling ENV
      raw = raw.replace(/^ENV /, 'ENVIRONMENT ')
    }
    const parsed = dockerParser.parse(raw)
    this.raw = raw
    this.file = file
    this.lineNumber = lineNumber
    this.cmd = parsed[0].name
    if (this.cmd === 'ENVIRONMENT') {
      this.cmd = 'ENV' // more hackery
      this.raw = raw.replace(/^ENVIRONMENT /, 'ENV ')
    }
    if (typeof parsed[0].args === 'string') {
      this.args = parsed[0].args.split(' ')
    } else {
      this.args = parsed[0].args
    }
    this.params = {}
  }

  parse (done) {
    const props = directives[this.cmd]
    if (!props) {
      return done(new DirectiveError(`Unknown directive '${this.cmd}' at ${this.file}:${this.lineNumber}`))
    }
    const argOpts = {string: [], boolean: [], alias: {}}
    Object.keys(props).forEach((key) => {
      if (props[key].boolean) {
        argOpts.boolean.push(props[key].option)
      }
      if (props[key].alias) {
        argOpts.alias[props[key].option] = props[key].alias
      }
    })
    const args = minimist(this.args, argOpts)
    const errors = []
    if (!props) {
      return done(new DirectiveError(`Unknown directive ${this.cmd}`))
    }
    Object.keys(props).forEach((key) => {
      let value = null
      if (Number.isInteger(props[key].operand)) {
        value = args._[props[key].operand]
      } else if (props[key].option && args[props[key].option] !== undefined) {
        value = args[props[key].option]
      }
      if (props[key].default !== undefined && value === null) {
        value = props[key].default
      }
      if (props[key].required && (value === null || value === undefined)) {
        return errors.push(`${key} is required`)
      }
      if (props[key].enum && props[key].enum.indexOf(value) === -1) {
        return errors.push(`'${value}' is not a valid value for '${key}'`)
      }
      if (props[key].match && !props[key].match.test(value)) {
        return errors.push(`value for ${key} must match ${props[key].match}`)
      }
      if (props[key].passThrough) {
        value = args._.join(' ')
      }
      this.params[key] = value
    })
    if (errors.length) {
      const error = new DirectiveError(errors.map((err) => {
        return `[${this.file}:${this.lineNumber}] ${err}`
      }).join('\n'))
      done(error)
    } else {
      done(null, this)
    }
  }
}

module.exports = Directive

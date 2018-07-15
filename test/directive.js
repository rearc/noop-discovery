const assert = require('chai').assert
const equal = assert.equal
const Directive = require('../lib/directive')

/* global describe, it */
describe('noop-discovery', () => {
  describe('#Directive', () => {
    describe('COMPONENT', () => {
      it('should parse basic', () => {
        const string = 'COMPONENT foo service'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'COMPONENT')
          equal(directive.params.name, 'foo')
          equal(directive.params.type, 'service')
        })
      })

      it('should yield error if component name invalid', () => {
        const string = 'COMPONENT Foo service'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          equal(err.name, 'DirectiveError')
        })
      })
    })

    describe('ROUTE', () => {
      it('should parse basic', () => {
        const string = 'ROUTE /bar'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'ROUTE')
          equal(directive.params.pattern, '/bar')
          equal(directive.params.method, 'ALL')
          equal(directive.params.internal, false)
        })
      })

      it('should parse complex', () => {
        const string = 'ROUTE --internal --method PUT /bar'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'ROUTE')
          equal(directive.params.pattern, '/bar')
          equal(directive.params.method, 'PUT')
          equal(directive.params.internal, true)
        })
      })

      it('should parse using alias params', () => {
        const string = 'ROUTE -i -m PUT /bar'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'ROUTE')
          equal(directive.params.pattern, '/bar')
          equal(directive.params.method, 'PUT')
          equal(directive.params.internal, true)
        })
      })
    })

    describe('RESOURCE', () => {
      it('should parse basic', () => {
        const string = 'RESOURCE users mysql'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'RESOURCE')
          equal(directive.params.name, 'users')
          equal(directive.params.type, 'mysql')
        })
      })
    })

    describe('ENV', () => {
      it('should parse basic', () => {
        const string = 'ENV LOG_LEVEL info'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'ENV')
          equal(directive.params.key, 'LOG_LEVEL')
          equal(directive.params.defaultValue, 'info')
          equal(directive.params.secret, false)
        })
      })

      it('should parse secret', () => {
        const string = 'ENV -s DB_PASSWORD topsecret'
        new Directive(string, '/tmp/Noopfile', 1).parse((err, directive) => {
          if (err) throw err
          equal(directive.cmd, 'ENV')
          equal(directive.params.key, 'DB_PASSWORD')
          equal(directive.params.defaultValue, 'topsecret')
          equal(directive.params.secret, true)
        })
      })
    })
  })
})

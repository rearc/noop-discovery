const path = require('path')
const fs = require('fs')
const async = require('async')
const parser = require('docker-file-parser')

const Directive = require('./directive')
const Component = require('./component')

class ManifestError extends Error {
  constructor (...args) {
    super(...args)
    this.name = 'ManifestError'
  }
}

class Manifest {
  constructor (filePath, app) {
    this.filePath = filePath
    this.contents = null
    this.directives = []
    this.app = app
    this.components = []
  }

  discover (done) {
    fs.readFile(this.filePath, (err, data) => {
      if (err) return done(err)
      this.contents = data.toString()
      this.parse((err) => {
        if (err) return done(err)
        async.each(this.components, (component, done) => {
          if (this.app.components[component.name]) {
            const err = new ManifestError(`Duplicate component name: ${component.name}`)
            return done(err)
          }
          this.app.components[component.name] = component
          done()
        }, done)
      })
    })
  }

  parse (done) {
    const parsedDirectives = parser.parse(this.contents)
    const sectionCmds = ['COMPONENT']
    let sectionDirectives = []
    const rootPath = path.parse(this.filePath).dir
    const pushSection = () => {
      switch (sectionDirectives[0].cmd) {
        case 'COMPONENT':
          const component = new Component(this.app, sectionDirectives, rootPath)
          this.components.push(component)
          break
      }
      sectionDirectives = []
    }
    async.eachLimit(parsedDirectives, 1, (dir, done) => {
      new Directive(dir.raw, this.filePath, dir.lineno).parse((err, directive) => {
        if (err) return done(err)
        this.directives.push(directive)
        if (sectionCmds.indexOf(directive.cmd) !== -1 && sectionDirectives.length) {
          pushSection()
        }
        sectionDirectives.push(directive)
        done()
      })
    }, (err) => {
      if (sectionDirectives.length) pushSection()
      done(err)
    })
  }
}

module.exports = Manifest

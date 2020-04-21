const recursive = require('recursive-readdir')
const path = require('path')
const async = require('async')
const filewatcher = require('filewatcher')
const crypto = require('crypto')

const Manifest = require('./manifest')
const EventEmitter = require('events').EventEmitter

class Application extends EventEmitter {
  constructor (rootPath, watch) {
    super()
    this.id = crypto.createHash('sha256').update(rootPath).digest('hex').substr(0, 8)
    this.rootPath = rootPath
    this.watch = watch
    this.watcher = filewatcher()
    this.components = {}
    this.resources = {}
    this.routes = []
    this.manifests = []
    this.directories = []
  }

  discover (done) {
    async.auto({
      manifestFiles: (done) => {
        recursive(this.rootPath, (err, files) => {
          if (err) return done(err)
          const manifestFiles = files.filter((file) => {
            const pathInfo = path.parse(file)
            return (pathInfo.base === 'Noopfile')
          })
          files.forEach((file) => {
            const dir = path.parse(file).dir
            if (this.directories.indexOf(dir) === -1) {
              if (dir.indexOf('/.git') === -1) this.directories.push(dir)
            }
          })
          done(null, manifestFiles)
        })
      },
      parseManifests: ['manifestFiles', (results, done) => {
        async.each(results.manifestFiles, (manifestFile, done) => {
          const manifest = new Manifest(manifestFile, this)
          this.manifests.push(manifest)
          manifest.discover(done)
        }, done)
      }],
      validateComponents: ['parseManifests', (results, done) => {
        async.each(this.components, (component, done) => {
          component.validate(done)
        }, done)
      }],
      validateResources: ['validateComponents', (results, done) => {
        async.each(this.resources, (resource, done) => {
          resource.validate(done)
        }, done)
      }],
      watchers: ['validateResources', (results, done) => {
        if (this.watch) {
          this.setupWatch(done)
        } else {
          done()
        }
      }]
    }, done)
  }

  reload (done) {
    this.components = {}
    this.resources = {}
    this.routes = []
    this.manifests = []
    this.directories = []
    this.discover(done)
  }

  setupWatch (done) {
    this.directories.forEach((dir) => this.watcher.add(`${dir}/`))
    this.manifests.forEach((manifest) => this.watcher.add(manifest.filePath))
    this.watcher.on('change', (file, stat) => {
      const pathInfo = path.parse(file)
      const componentsArray = Object.keys(this.components).map((componentName) => {
        return this.components[componentName]
      })
      const modifiedComponents = []
      componentsArray.forEach((component) => {
        if (file.indexOf(component.rootPath) === 0) modifiedComponents.push(component)
      })
      if (pathInfo.base === 'Noopfile') {
        this.emit('manifestChange', file)
      } else if (modifiedComponents.length) {
        modifiedComponents.forEach((component) => {
          this.emit('componentChange', component.name, file)
        })
      }
    })
    done()
  }

  simple () { // deprecated
    return {
      Noopfiles: this.manifests.map((manifest) => {
        return manifest.filePath.substring(this.rootPath.length)
      }),
      Components: Object.keys(this.components).map((componentName) => {
        const component = this.components[componentName]
        return {
          Name: component.name,
          Type: component.type,
          Variables: component.env,
          Port: component.port,
          Root: component.rootPath.substring(this.rootPath.length),
          Resources: component.resources.map((resource) => { return resource.name }),
          Declaration: `${component.directives[0].file}:${component.directives[0].lineNumber}`.substring(this.rootPath.length),
          Dockerfile: component.dockerfile
        }
      }),
      Resources: Object.keys(this.resources).map((resourceName) => {
        const resource = this.resources[resourceName]
        return {
          Name: resource.name,
          Type: resource.type,
          Parameters: resource.params,
          Declarations: resource.directives.map((directive) => {
            return `${directive.file}:${directive.lineNumber}`.substring(this.rootPath.length)
          })
        }
      }),
      Routes: this.routes.map((route) => {
        return {
          Pattern: route.pattern,
          Method: route.method,
          Internal: route.internal,
          Component: route.component.name,
          Declaration: `${route.directive.file}:${route.directive.lineNumber}`.substring(this.rootPath.length)
        }
      })
    }
  }

  toJSON () {
    return {
      noopfiles: this.manifests.map((manifest) => {
        return manifest.filePath.substring(this.rootPath.length)
      }),
      components: Object.keys(this.components).map((componentName) => {
        const component = this.components[componentName]
        return {
          name: component.name,
          type: component.type,
          variables: component.env,
          port: component.port,
          root: component.rootPath.substring(this.rootPath.length),
          resources: component.resources.map((resource) => { return resource.name }),
          declaration: `${component.directives[0].file}:${component.directives[0].lineNumber}`.substring(this.rootPath.length),
          dockerfile: component.dockerfile
        }
      }),
      resources: Object.keys(this.resources).map((resourceName) => {
        const resource = this.resources[resourceName]
        return {
          name: resource.name,
          type: resource.type,
          parameters: resource.params,
          declarations: resource.directives.map((directive) => {
            return `${directive.file}:${directive.lineNumber}`.substring(this.rootPath.length)
          })
        }
      }),
      routes: this.routes.map((route) => {
        return {
          pattern: route.pattern,
          method: route.method,
          internal: route.internal,
          component: route.component.name,
          declaration: `${route.directive.file}:${route.directive.lineNumber}`.substring(this.rootPath.length)
        }
      })
    }
  }
}

module.exports = Application

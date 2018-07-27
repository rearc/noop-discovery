class Route {
  constructor (component, directive) {
    this.component = component
    this.pattern = directive.params.pattern
    this.method = directive.params.method
    this.internal = directive.params.internal
    this.directive = directive
  }
}

class RouteError extends Error {
  constructor (...args) {
    super(...args)
    this.name = 'RouteError'
  }
}

Route.register = (app, component, directive, done) => {
  const route = new Route(component, directive)
  const existing = app.routes.find((existing) => {
    return (existing.pattern === route.pattern && existing.method === route.method)
  })
  if (existing) {
    const err = new RouteError(`Route conflict: ${directive.file}:${directive.lineNumber}`)
    return done(err)
  }
  app.routes.push(route)
  component.routes.push(route)
  app.routes.sort((a, b) => {
    return a.pattern.length < b.pattern.length
  })
  component.routes.sort((a, b) => {
    return a.pattern.length < b.pattern.length
  })
  done(null, route)
}

module.exports = Route

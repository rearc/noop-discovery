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
  sortRoutes(app.routes)
  sortRoutes(component.routes)
  done(null, route)
}

function sortRoutes (routes) {
  routes.sort((route1, route2) => {
    minLength = Math.min(route1.pattern.length, route2.pattern.length)
    for (var i = 0; i < minLength; ++i) {
      if (route1.pattern[i] === '*' && route2.pattern[i] !== '*') return true
      else if (route2.pattern[i] === '*' && route1.pattern[i] !== '*') return false
      else if (route1.pattern[i] !== route2.pattern[i]) return route1.pattern[i] > route2.pattern[i]
    }
    return route1.pattern.length > route2.pattern.length
  })
}

module.exports = Route

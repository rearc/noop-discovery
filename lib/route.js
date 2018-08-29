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
    route1 = route1.pattern.toLowerCase().replace(/\/+$/, '').replace(/^\//, '')
    route2 = route2.pattern.toLowerCase().replace(/\/+$/, '').replace(/^\//, '')
    var r1reg = new RegExp('^' + route1.replace(/\*/g, '.+') + '$', '')
    var r2reg = new RegExp('^' + route2.replace(/\*/g, '.+') + '$', '')
    if (route1.includes('*') && r1reg.test(route2)) return 1
    if (route2.includes('*') && r2reg.test(route1)) return -1
    var segs1 = route1.split('/')
    var segs2 = route2.split('/')
    var seg1len = segs1.length
    var seg2len = segs2.length
    var maxLen = Math.max(seg1len, seg2len)
    for (var i = 0; i < maxLen; ++i) {
      if (segs1[i] === '*' && segs2[i] !== '*') return 1
      if (segs1[i] !== '*' && segs2[i] === '*') return -1
      if (segs1[i] === undefined && segs2[i] !== undefined) return 1
      if (segs1[i] !== undefined && segs2[i] === undefined) return -1
    }
    return 0
  })
}

module.exports = Route

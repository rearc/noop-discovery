const assert = require('chai').assert
const equal = assert.equal
const Application = require('../lib/application')

/* global describe, it */
describe('noop-discovery', () => {
  describe('#Application', () => {
    it('should discover', (done) => {
      const root = '/Users/wintzer/Projects/Rearc/noop-sample/'
      new Application(root).discover(done)
    })
  })
})

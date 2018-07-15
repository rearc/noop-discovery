const assert = require('chai').assert
const equal = assert.equal
const Manifest = require('../lib/manifest')

/* global describe, it */
describe('noop-discovery', () => {
  describe('#Manifest', () => {
    it('should parse basic', (done) => {
      const file = '/Users/wintzer/Projects/Rearc/noop-sample/api/Noopfile'
      new Manifest(file).discover(done)
    })
  })
})


var tape = require('tape')
var level = require('level-test')()
var sub = require('level-sublevel')
var ContentCache = require('../')

/*
Code Paths

key is in cache
key is not in cache
key is in cache but it's expired or fresh explicitly requested
  - retrived but not changed
  - retrived and changed


*/

var data = {
  foo: 'bar.sasas',
  blah: 'bbbbbbbbb'

}

var db = sub(level('test-content-cache', {encoding: 'json'}))
var get = ContentCache(db, 'cache', {
  encoding: 'utf8',
  getter: function (key, meta, cb) {
    //... okay what should I test this with?
    if(data[key]) {
      console.error('GET', key)
      cb(null, data[key])
    } else {
      console.error('GET', key, 'ERROR - Not Found')
      cb(new Error('not found'))
    }
  }
})


tape('simple', function (t) {

  // non cached
  get('foo', function (err, content, meta) {
    console.log('RESULT', content, meta)

    t.equal(content, data.foo)
    t.notOk(meta.cached, 'was cached')
    t.ok(meta.fetched, 'was fetched')
    get('foo', function (err, content, meta) {
      t.equal(content, data.foo)
      t.ok(meta.cached, 'was cached')
      t.notOk(meta.fetched, 'was fetched')

      get('foo', {fetch: true}, function (err, content, meta) {
        t.equal(content, data.foo)
        t.ok(meta.cached, 'was cached')
        t.ok(meta.fetched, 'was fetched')

        t.end()
      })
    })
  })
})

tape('age', function (t) {
  get('blah', function (err, content, meta) {
    t.equal(content, data.blah)
      t.ok(meta.fetched)
      t.notOk(meta.cached)
    get('blah', {age: 0}, function (err, content, meta) {
      t.ok(meta.fetched)
      t.ok(meta.cached)
      t.end()
    })
  })

})

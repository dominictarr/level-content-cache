var request = require('request')
var Cas = require('./level-content-addressable-store')
const ONE_HOUR = 60*60e3

// the getter and the db and the content db should all be separated.
// this means it's possible for the getter to handle cached resources, etc.

function isString (s) {
  return 'string' === typeof s
}

module.exports = function (db, cachedb, opts) {  
  opts = opts || {}
  var getter = opts.getter || function (key, meta, cb) {
    request({url: key}, function (err, response, body) {
      cb(err, body, {ts: Date.now()})
    })
  }

  if(!cachedb || isString(cachedb)) {
    cachedb = Cas(db.sublevel(isString(cachedb) ? cachedb : 'cache'))
  }
  return function get (url, _opts, cb) {
    if(!cb) cb = _opts, _opts = {}
    function opt (name, def) {
      if(_opts && _opts[name] !== undefined) return _opts[name]
      if(opts  && opts[name]  !== undefined) return _opts[name]
      return def
    }
    var age = opt('age', ONE_HOUR)

    db.get(url, function (err, meta) {
      meta = meta || {}
      if(err && err.notFound)
        fetch(meta, cb)
      else if(Date.now() - meta.ts > age || opt('fetch', false) === true)
        fetch(meta, cb)
      else
        cachedb.get(meta.hash, function (err, content) {
          meta.cached = true
          meta.fetched = false
          cb(err, content, meta)
        })
        //value will have 
    })

    function fetch (meta) {
      //have a noop, so fetch can be used to refresh a url.
      if(!cb) cb = function () {}

      //TODO: what if there are two concurrent fetches?
      //make the second one wait, and give the same response to both.

      // in the case that the cache already had that value
      // (depends on implementation details of the source)

      getter(url, meta || {}, function (err, body, meta) {
        meta = meta || {}
        meta.fetched = true
        if(!body && meta.hash)
          cachedb.get(meta.hash, function (err, content) {
            if(err) return cb(err)
            meta.cached = true
            cb(null, content, meta)
          })
        else
          cachedb.add(body, _opts, function (err, hash, cached) {
            if(err) return cb(err)
            //possibly the content was cached correctly already.
            //in which case we could still update the mutable side,
            //but remember to set meta.cached=true so the user knows.
            meta.hash = hash
            meta.ts = meta.ts || Date.now()
            db.put(url, meta, function (err) {
              if(err) return cb(err)
              meta.cached = cached
              cb(null, body, meta)
            })
          })
      })
    }
  }
}

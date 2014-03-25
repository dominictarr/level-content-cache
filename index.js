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
  var inFlight = {}
  var getter = opts.getter || function (key, meta, cb) {
    request({url: key}, function (err, response, body) {
      cb(err, body, {ts: Date.now()})
    })
  }

  if(!cachedb || isString(cachedb)) {
    cachedb = Cas(db.sublevel(isString(cachedb) ? cachedb : 'cache'))
  }

  //if there are two concurrent requests for the same url,
  //then only fetch once, but return the same value to both.

  //also, you should be able to get the value directly by the hash.
  //so if the url is a hash, just return it directly.

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

      // in the case that the cache already had that value
      // (depends on implementation details of the source)

      if(inFlight[url]) return inFlight[url].push(cb)

      inFlight[url] = [cb]

      function done (err, body, meta) {
        var cbs = inFlight[url], err
        delete inFlight[url]
        while(cbs.length)
          cbs.shift().call(null, err, body, meta)
      }
      
      getter(url, meta || {}, function (err, body, meta) {
        meta = meta || {}
        meta.fetched = true
        if(!body && meta.hash)
          cachedb.get(meta.hash, function (err, content) {
            if(err) return done(err)
            meta.cached = true
            done(null, content, meta)
          })
        else
          cachedb.add(body, _opts, function (err, hash, cached) {
            if(err) return done(err)
            //possibly the content was cached correctly already.
            //in which case we could still update the mutable side,
            //but remember to set meta.cached=true so the user knows.
            meta.hash = hash
            meta.ts = meta.ts || Date.now()
            db.put(url, meta, function (err) {
              if(err) return done(err)
              meta.cached = cached
              done(null, body, meta)
            })
          })
      })
    }
  }
}

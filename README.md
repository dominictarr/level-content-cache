# level-content-cache

cache a mutable resource into a content addressable store with leveldb.

## example - with separate Content Addressable Store

``` js
//dependencies
var CAS          = require('content-addressable-store')
var ContentCache = require('level-content-cache')
var levelup      = require('levelup')

//initialize dbs
var db           = levelup(dbPath +'/db')
var cas          = CAS(dbPath + '/cas')

//some method to retrive a value
var request      = require('request')

//pass dbs to content cache + function to update a store
var get = ContentCache(db, cas, {
  //meta can store caching information, see later examples.
  getter: function (key, meta, cb) {
    request(key, function (err, res, body) {
      if(err) return cb(err)
      cb(null, body)
    })
  }
})
```

## License

MIT

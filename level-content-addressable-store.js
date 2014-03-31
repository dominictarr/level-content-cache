var createSha256d  = require('sha256d')
var Stream = require('stream')

module.exports = function (db, alg) {
  var createHash
    = 'string' === typeof alg
    ? require('crypto').createHash.bind(null, alg)
    : alg || createSha256d

  var l = createHash().digest('hex').length

  var rx = new RegExp('^[0-9a-f]{'+l+'}$')

  function shasum (content, enc) {
    return createHash().update(content, enc).digest('hex')
  }

  db.add = function (content, opts, cb) {
    var hash = shasum(content, opts.encoding)
    db.has(hash, function (err) {
      if(!err) return cb(null, hash, true)
      db.put(hash, content, function (err) {
        cb(err, hash, false)
      })
    })
  }

  //db.get will already work correctly.

  db.has = function (hash, cb) {
    return db.get(hash, function (err) {
      cb(err, !err)
    })
  }

  db.isHash = function (hash) {
    return rx.test(hash)
  }

  db.getStream =
  db.createStream = function (hash) {
    var s = new Stream()
    s.readable = true
    db.get(hash, function (err, data) {
      if(err) return s.emit('error', err)
      s.emit('data', data); s.emit('end')
    })
    return s
  }

  return db

}

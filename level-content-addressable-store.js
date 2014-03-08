var createSha256d  = require('sha256d')



module.exports = function (db, alg) {
  var createHash
    = 'string' === typeof alg
    ? require('crypto').createHash.bind(null, alg)
    : alg || createSha256d

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

  return db

}

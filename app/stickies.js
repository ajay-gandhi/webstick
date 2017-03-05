/**
 * Module for reading StickiesDatabase
 */

var fs       = require('fs'),
    Packer   = require('pypacker'),
    parseRTF = require('rtf-parser');

module.exports = function (path, cb) {
  fs.readFile('/Users/Ajay/Library/StickiesDatabase', (err, data) => {
    if (err) console.error(err);

    var p = new Packer('<L');

    var rtfs    = [],
        needle  = '{\\rtf1'
        pos     = data.indexOf(needle, 4),
        running = 0;
    while (pos >= 0) {
      var size = p.unpack_from(data, pos - 4)[0];
      var buf = data.slice(pos, pos + size);

      var str = String.fromCharCode.apply(null, new Uint16Array(buf));
      running++;
      parseRTF.string(str, (err, doc) => {
        rtfs.push(strip_rtf(doc));
        if (--running == 0) cb(rtfs);
      });

      pos += size;
      pos = data.indexOf(needle, pos + 4);
    }
  });
}

/**
 * Strips unnecessary pieces from the RTF
 */
var strip_rtf = function (rtf) {
  return {
    content: rtf.content,
    fonts: rtf.fonts,
    colors: rtf.colors,
    style: rtf.style
  }
}

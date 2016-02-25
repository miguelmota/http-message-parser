'use strict';

var path = require('path');
var fs = require('fs');
var concat = require('concat-stream');
var streamBuffers = require('stream-buffers');
var getProp = require('get-prop');
var httpMessageParser = require('../http-message-parser');

var argv = require('minimist')(process.argv.slice(2));

if (argv._[0]) {
  fs.createReadStream(path.resolve(argv._[0])).pipe(concat(gotData));
} else {
  process.stdin.pipe(concat(gotData));
}

function gotData(buffer) {
  var parsed = httpMessageParser(buffer);
  var result = parsed;

  if (result instanceof Object) {
    if (argv.only) {
      result = getProp(parsed, argv.only);
    }

    if (result instanceof Object && Buffer.isBuffer(result.body)) {
      result = bodyToString(result);
    }

    if (Array.isArray(result)) {
      result = result.map(bodyToString);
    }

    if (result instanceof Object && Array.isArray(result.multipart)) {
      result.multipart = result.multipart.map(bodyToString);
    }

    if (!Buffer.isBuffer(result) && result instanceof Object) {
      result = JSON.stringify(result);
    }
  }

  var outStream = new streamBuffers.ReadableStreamBuffer();
  outStream.put(new Buffer(result||''));
  outStream.stop();

  outStream.pipe(process.stdout);
}

function bodyToString(obj) {
  if (Buffer.isBuffer(obj.body)) {
    obj.body = obj.body.toString();
  }

  return obj;
}

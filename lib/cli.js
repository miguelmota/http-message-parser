'use strict';

const path = require('path');
const fs = require('fs');
const concat = require('concat-stream');
const streamBuffers = require('stream-buffers');
const getProp = require('get-prop');
const httpMessageParser = require('../http-message-parser');

const argv = require('minimist')(process.argv.slice(2));

if (argv._[0]) {
  fs.createReadStream(path.resolve(argv._[0])).pipe(concat(gotData));
} else {
  process.stdin.pipe(concat(gotData));
}

function gotData(buffer) {
  const parsed = httpMessageParser(buffer);
  var result = parsed;

  if (result instanceof Object) {
    const pick = (argv.pick || argv.filter || argv.only);

    if (pick) {
      result = getProp(parsed, pick);
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

  const outStream = new streamBuffers.ReadableStreamBuffer();
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

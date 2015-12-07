(function(root) {
  'use strict';

  /**
   * Code is ugly is fuck cause I quickly rushed this to get it working for my project.
   */

  function isTruthy(v) {
    return !!v;
  }

  function isNumeric(v) {
    if (typeof v === 'number' && !isNaN(v)) return true;
    v = (v||'').toString().trim();
    if (!v) return false;
    return !isNaN(v);
  }

  function isBuffer(string) {
    return (typeof global === 'object' &&
            typeof global.Buffer === 'function' &&
            typeof global.Buffer.isBuffer === 'function' &&
            global.Buffer.isBuffer(string));
  }

  function parseHeaders(body) {
    const headers = {};

    if (typeof body !== 'string') {
      return headers;
    }

    body.split(/[\r\n]/).forEach(function(string) {
      const match = string.match(/([\w-]+):\s*(.*)/i);

      if (Array.isArray(match) && match.length === 3) {
        const key = match[1];
        const value = match[2];

        headers[key] = isNumeric(value) ? Number(value) : value;
      }
    });

    return headers;
  }

  function httpMessageParser(message) {
    var result = {
      method: null,
      url: null,
      statusCode: null,
      statusMessage: null,
      httpVersion: null,
      headers: null,
      body: null,
      boundary: null,
      multipart: null
    };

    var messageString = '';

    if (isBuffer(message)) {
      messageString = message.toString();
    } else if (typeof message === 'string') {
      messageString = message;
      message = new Buffer(messageString);
    } else {
      return result;
    }

    /* Parse request line
     */
    (function() {
      const requestLineRegex = /HTTP\/(1\.0|1\.1|2\.0)\s+(\d+)\s+([\w\s-_]+)/i;
      const possibleRequestLine = messageString.split(/\n|\r\n/)[0];
      const requestLineMatch = possibleRequestLine.match(requestLineRegex);

      if (Array.isArray(requestLineMatch) && requestLineMatch.length > 1) {
        result.httpVersion = Number(requestLineMatch[1]);
        result.statusCode = Number(requestLineMatch[2]);
        result.statusMessage = requestLineMatch[3];
      } else {
        const requestLineRegex2 = /(GET|POST)\s+(.*)\s+HTTP\/(1\.0|1\.1|2\.0)/i;
        const requestLineMatch2 = possibleRequestLine.match(requestLineRegex2);
        if (Array.isArray(requestLineMatch2) && requestLineMatch2.length > 1) {
          result.method = requestLineMatch2[1];
          result.url = requestLineMatch2[2];
          result.httpVersion = Number(requestLineMatch2[3]);
        }
      }
    })();

    /* Parse headers
     */
    const headerNewlineRegex = /^[\r\n]+/gim;
    var headerNewlineIndex = messageString.search(headerNewlineRegex);
    if (headerNewlineIndex > -1) {
      headerNewlineIndex = headerNewlineIndex + 1;
    }

    (function() {
      var headersString = messageString.substr(0, headerNewlineIndex);

      var headers = parseHeaders(headersString);

      if (Object.keys(headers).length > 0) {
        result.headers = headers;
      }
    })();

    /* Try to get boundary if no boundary header
     */
    if (!result.boundary) {
      var boundary = messageString.match(/(\n|\r\n)+--[\w-]+(\n|\r\n)+/g);

      if (Array.isArray(boundary) && boundary.length) {
        boundary = boundary[0].replace(/[\r\n]+/gi, '');
        const trimmedBoundary = boundary.replace(/^--/,'');
        result.boundary = trimmedBoundary;
      }
    }

    /* Parse body
     */
    (function() {
      var start = headerNewlineIndex;
      var end = message.length;
      var boundaryIndex = messageString.search(new RegExp(boundary));

      if (boundaryIndex > -1) {
        start = headerNewlineIndex;
        end = boundaryIndex;
      }

      if (headerNewlineIndex > -1) {
        var body = message.slice(start, end);
        if (body && body.length) {
          result.body = body;
        }
      }
    })();

    /* Parse multipart sections
     */
    if (boundary) {
      const multipartStart = messageString.indexOf(boundary) + boundary.length;
      const multipartEnd = messageString.lastIndexOf(boundary);
      const multipartBody = messageString.substr(multipartStart, multipartEnd);

      const parts = multipartBody.split(boundary);

      result.multipart = parts.filter(isTruthy).map(function(part, j) {
        const newlineRegex = /\n\n|\r\n\r\n/gim;

        //const newlineIndex = part.replace(/^[\r\n]/gi, '').search(newlineRegex);
        //var newlineIndex = part.search(newlineRegex);

        var newlineIndex = 0;
        var match = newlineRegex.exec(part);

        if (match) {
          newlineIndex = match.index;
          if (match.index <= 0) {
            match = newlineRegex.exec(part);
            if (match) {
              newlineIndex = match.index;
            }
          }
        }


        var possibleHeadersString = part.substr(0, newlineIndex);


        var headers = null;
        var body = null;

        if (newlineIndex > -1) {
          var possibleHeaders = parseHeaders(possibleHeadersString);
          if (Object.keys(possibleHeaders).length > 0) {
            headers = possibleHeaders;

            var match = '';
            var matches = [];
            var z =0;
            for (var n =0; n < message.length; n++) {
              match = message.slice(n, n+boundary.length).toString();

              if (match === boundary) {
                z = n+boundary.length+1;
                matches.push(n);
              }
            }

            var newlines = [];
            matches.slice(0,matches.length-1).forEach(function(m, o) {
              var bod = message.slice(matches[o], matches[o+1]).toString();
              var h = bod.search(/\n\n|\r\n\r\n/gim) + 2;
              h = matches[o] + h;
              newlines.push(h);
            });

            var i = newlines[j];
            z = matches[j+1];

            body = message.slice(i, z);

          } else {
            body = part;
          }
        } else {
          body = part;
        }

        return {
          headers: headers,
          body: body
        };
      });
    }

    return result;
  }

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = httpMessageParser;
    }
    exports.httpMessageParser = httpMessageParser;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return httpMessageParser;
    });
  } else {
    root.httpMessageParser = httpMessageParser;
  }

})(this);

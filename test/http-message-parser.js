'use strict';

const fs = require('fs');
const stream = require('stream');
const test = require('tape');
const httpMessageParser = require('../http-message-parser');

test('httpMessageParser', function (t) {
  t.plan(122);

  // Test 0
  (function() {
    var emptyResult = {
      httpVersion: null,
      statusCode: null,
      statusMessage: null,
      method: null,
      url: null,
      headers: null,
      body: null,
      boundary: null,
      multipart: null
    };

    t.deepEqual(httpMessageParser(), emptyResult);
    t.deepEqual(httpMessageParser({foo: 'bar'}), emptyResult);
    t.deepEqual(httpMessageParser(['asdf']), emptyResult);
    t.deepEqual(httpMessageParser(true), emptyResult);
  })();

  // Test 1
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_1/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, null);
    t.equal(parsedMessage.statusMessage, null);
    t.equal(parsedMessage.httpVersion, null);
    t.equal(parsedMessage.boundary, 'fe08dcc5-e670-426c-9f13-679a8f3f623d');
    t.equal(parsedMessage.body, null);

    t.deepEqual(parsedMessage.multipart[0].headers, {
      'Content-Type': 'application/json'
    });

    t.equal(Buffer.isBuffer(parsedMessage.multipart[0].body), true);

    t.deepEqual(JSON.parse(parsedMessage.multipart[0].body.toString('utf8')), require('./data/test_1/part_0_body_expected.json'));

    t.deepEqual(parsedMessage.multipart[1].headers, {
      'Content-ID': '<DailyBriefingPrompt.Introduction:0ea4fffd-bf3b-4d67-8d49-4a3af2d0bd51_210149980>',
      'Content-Type': 'audio/mpeg'
    });

    t.equal(Buffer.isBuffer(parsedMessage.multipart[1].body), true);

    t.deepEqual(parsedMessage.multipart[2].headers, {
      'Content-ID': '<DailyBriefingPrompt.SubCategory:02e5604b-e814-4edb-add9-42bff30f5d3a:8ffe382e1b0d889922f61085f4d57927>',
      'Content-Type': 'audio/mpeg'
    });

    t.equal(Buffer.isBuffer(parsedMessage.multipart[2].body), true);

    /* Test the body output file manually with:
     * `cat file.txt | mpg123 -`
     *
     * You should hear "Here's your flash briefing".
     */
    const part0Output = fs.createWriteStream(`${__dirname}/data/test_1/part_1_body_actual.txt`);
    part0Output.write(parsedMessage.multipart[1].body);

     /* You should hear "in NPR news from TuneIn".
     */
    const part1Output= fs.createWriteStream(`${__dirname}/data/test_1/part_2_body_actual.txt`);
    part1Output.write(parsedMessage.multipart[2].body);

    /*
     * Test body byte offsets
     */
    const startOffset1 = parsedMessage.multipart[1].meta.body.byteOffset.start;
    const endOffset1 = parsedMessage.multipart[1].meta.body.byteOffset.end;

    const slicedBody1 = data.slice(startOffset1, endOffset1);
    t.equal(slicedBody1.toString(), parsedMessage.multipart[1].body.toString());

    const startOffset2 = parsedMessage.multipart[2].meta.body.byteOffset.start;
    const endOffset2 = parsedMessage.multipart[2].meta.body.byteOffset.end;

    const slicedBody2 = data.slice(startOffset2, endOffset2);
    t.equal(slicedBody2.toString(), parsedMessage.multipart[2].body.toString());
  })();

  // Test 2
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_2/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, 200);
    t.equal(parsedMessage.statusMessage, 'OK');
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, null);
    t.deepEqual(parsedMessage.headers, {
      'Date': 'Mon, 23 May 2005 22:38:34 GMT',
      'Server': 'Apache/1.3.3.7 (Unix) (Red-Hat/Linux)',
      'Last-Modified': 'Wed, 08 Jan 2003 23:11:55 GMT',
      'ETag': '"3f80f-1b6-3e1cb03b"',
      'Content-Type': 'text/html; charset=UTF-8',
      'Content-Length': 138,
      'Accept-Ranges': 'bytes',
      'Connection': 'close'
    });
    t.equal(parsedMessage.body && parsedMessage.body.toString('utf8'), `<html>
<head>
  <title>An Example Page</title>
</head>
<body>
  Hello World, this is a very simple HTML document.
</body>
</html>
`);
  })();

  // Test 3
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_3/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, 200);
    t.equal(parsedMessage.statusMessage, 'OK');
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, 'frontier');
    t.deepEqual(parsedMessage.headers, {
      'MIME-Version': 1.0,
      'Content-Type': 'multipart/mixed; boundary=frontier'
    });
    t.equal(parsedMessage.body && parsedMessage.body.toString('utf8'), `This is a message with multiple parts in MIME format.
`);
    t.equal(parsedMessage.multipart.length, 2);
    t.deepEqual(parsedMessage.multipart[0].headers, {
      'Content-Type': 'text/plain'
    });
    t.equal(parsedMessage.multipart[0].body.toString('utf8'), `This is the body of the message.
`);
    t.deepEqual(parsedMessage.multipart[1].headers, {
      'Content-Type': 'application/octet-stream',
      'Content-Transfer-Encoding': 'base64'
    });
    t.equal(parsedMessage.multipart[1].body.toString('utf8'), `PGh0bWw+CiAgPGhlYWQ+CiAgPC9oZWFkPgogIDxib2R5PgogICAgPHA+VGhpcyBpcyB0aGUg
Ym9keSBvZiB0aGUgbWVzc2FnZS48L3A+CiAgPC9ib2R5Pgo8L2h0bWw+Cg==
`);
  })();

  // Test 4
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_4/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, 'POST');
    t.equal(parsedMessage.url, '/');
    t.equal(parsedMessage.statusCode, null);
    t.equal(parsedMessage.statusMessage, null);
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, '---------------------------9051914041544843365972754266');
    t.deepEqual(parsedMessage.headers, {
      'Host': 'localhost:8000',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:29.0) Gecko/20100101 Firefox/29.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Cookie': '__atuvc=34%7C7; permanent=0; _gitlab_session=226ad8a0be43681acf38c2fab9497240; __profilin=p%3Dt; request_method=GET',
      'Connection': 'keep-alive',
      'Content-Type': 'multipart/form-data; boundary=---------------------------9051914041544843365972754266',
      'Content-Length': 554
    });
    t.equal(parsedMessage.body, null);

    t.deepEqual(parsedMessage.multipart[0].headers, {
      'Content-Disposition': 'form-data; name="text"'
    });
    t.equal(parsedMessage.multipart[0].body.toString('utf8'), `text default.
`);
    t.deepEqual(parsedMessage.multipart[1].headers, {
      'Content-Disposition': 'form-data; name="file1"; filename="a.txt"',
      'Content-Type': 'text/plain'
    });
    t.equal(parsedMessage.multipart[1].body.toString('utf8'), `Content of a.txt.

`);
    t.deepEqual(parsedMessage.multipart[2].headers, {
      'Content-Disposition': 'form-data; name="file2"; filename="a.html"',
      'Content-Type': 'text/html'
    });
    t.equal(parsedMessage.multipart[2].body.toString('utf8'), `<!DOCTYPE html><title>Content of a.html.</title>

`);
  })();

  // Test 5
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_5/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, 'GET');
    t.equal(parsedMessage.url, '/hello.htm');
    t.equal(parsedMessage.statusCode, null);
    t.equal(parsedMessage.statusMessage, null);
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, null);
    t.deepEqual(parsedMessage.headers, {
      'User-Agent': 'Mozilla/4.0 (compatible; MSIE5.01; Windows NT)',
      'Host': 'www.example.com',
      'Accept-Language': 'en-us',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'Keep-Alive'
    });
    t.equal(parsedMessage.body, null);
  })();

  // Test 6
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_6/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, 400);
    t.equal(parsedMessage.statusMessage, 'Bad Request');
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, null);
    t.deepEqual(parsedMessage.headers, {
      'Date': 'Sun, 18 Oct 2012 10:36:20 GMT',
      'Server': 'Apache/2.2.14 (Win32)',
      'Content-Length': 230,
      'Content-Type': 'text/html; charset=iso-8859-1',
      'Connection': 'Closed'
    });
    t.equal(parsedMessage.body && parsedMessage.body.toString('utf8'), `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html>

<head>
   <title>400 Bad Request</title>
</head>

<body>
   <h1>Bad Request</h1>
   <p>Your browser sent a request that this server could not understand.<p>
   <p>The request line contained invalid characters following the protocol string.<p>
</body>

</html>
`)
  })();

  // Test 7
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_7/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, 200);
    t.equal(parsedMessage.statusMessage, 'OK');
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, null);
    t.deepEqual(parsedMessage.headers, {
        'Cache-Control': 'max-age=604800',
        'Content-Type': 'text/html',
        'Date': 'Thu, 25 Feb 2016 08:38:00 GMT',
        'Etag': '"359670651+gzip+ident"',
        'Expires': 'Thu, 03 Mar 2016 08:38:00 GMT',
        'Last-Modified': 'Fri, 09 Aug 2013 23:54:35 GMT',
        'Server': 'ECS (mdw/1275)',
        'Vary': 'Accept-Encoding',
        'X-Cache': 'HIT',
        'x-ec-custom-error': 1,
        'Content-Length': 1270
    });
    t.equal(parsedMessage.body.toString().length, 1270);
  })();

  // Test 8
  (function() {
    fs.readFile(`${__dirname}/data/test_7/message.txt`, 'binary', function (error, data) {
      if (error) {
        return console.error(error);
      }

      const parsedMessage = httpMessageParser(data);

      t.equal(parsedMessage.method, null);
      t.equal(parsedMessage.url, null);
      t.equal(parsedMessage.statusCode, 200);
      t.equal(parsedMessage.statusMessage, 'OK');
      t.equal(parsedMessage.httpVersion, 1.1);
      t.equal(parsedMessage.boundary, null);
      t.deepEqual(parsedMessage.headers, {
          'Cache-Control': 'max-age=604800',
          'Content-Type': 'text/html',
          'Date': 'Thu, 25 Feb 2016 08:38:00 GMT',
          'Etag': '"359670651+gzip+ident"',
          'Expires': 'Thu, 03 Mar 2016 08:38:00 GMT',
          'Last-Modified': 'Fri, 09 Aug 2013 23:54:35 GMT',
          'Server': 'ECS (mdw/1275)',
          'Vary': 'Accept-Encoding',
          'X-Cache': 'HIT',
          'x-ec-custom-error': 1,
          'Content-Length': 1270
      });
      t.equal(parsedMessage.body.toString().length, 1270);
    });
  })();

  // Test 9 (buffer module)
  (function() {
    const Buffer = require('buffer').Buffer;
    const data = fs.readFileSync(`${__dirname}/data/test_8/message.txt`);
    const parsedMessage = httpMessageParser(new Buffer(data));

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, null);
    t.equal(parsedMessage.statusMessage, null);
    t.equal(parsedMessage.httpVersion, null);
    t.equal(parsedMessage.boundary, 'fe08dcc5-e670-426c-9f13-679a8f3f623d');
    t.equal(parsedMessage.body, null);

    t.deepEqual(parsedMessage.multipart[0].headers, {
      'Content-Type': 'application/json'
    });

    t.equal(Buffer.isBuffer(parsedMessage.multipart[0].body), true);

    t.deepEqual(JSON.parse(parsedMessage.multipart[0].body.toString('utf8')), require('./data/test_8/part_0_body_expected.json'));

    t.deepEqual(parsedMessage.multipart[1].headers, {
      'Content-ID': '<DailyBriefingPrompt.Introduction:0ea4fffd-bf3b-4d67-8d49-4a3af2d0bd51_210149980>',
      'Content-Type': 'audio/mpeg'
    });

    t.equal(Buffer.isBuffer(parsedMessage.multipart[1].body), true);

    t.deepEqual(parsedMessage.multipart[2].headers, {
      'Content-ID': '<DailyBriefingPrompt.SubCategory:02e5604b-e814-4edb-add9-42bff30f5d3a:8ffe382e1b0d889922f61085f4d57927>',
      'Content-Type': 'audio/mpeg'
    });

    t.equal(Buffer.isBuffer(parsedMessage.multipart[2].body), true);

    /* Test the body output file manually with:
     * `cat file.txt | mpg123 -`
     *
     * You should hear "Here's your flash briefing".
     */
    const part0Output = fs.createWriteStream(`${__dirname}/data/test_8/part_1_body_actual.txt`);
    part0Output.write(parsedMessage.multipart[1].body);

     /* You should hear "in NPR news from TuneIn".
     */
    const part1Output= fs.createWriteStream(`${__dirname}/data/test_8/part_2_body_actual.txt`);
    part1Output.write(parsedMessage.multipart[2].body);
  })();

  // Test 10 (testing junk text after multipart boundary in same line)
  (function() {
    const data = fs.readFileSync(`${__dirname}/data/test_10/message.txt`);
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, 200);
    t.equal(parsedMessage.statusMessage, 'OK');
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, 'frontier');
    t.deepEqual(parsedMessage.headers, {
      'MIME-Version': 1.0,
      'Content-Type': 'multipart/mixed; boundary=frontier'
    });
    t.equal(parsedMessage.body && parsedMessage.body.toString('utf8'), `This is a message with multiple parts in MIME format.
`);

    t.equal(parsedMessage.multipart.length, 2);
    t.deepEqual(parsedMessage.multipart[0].headers, {
      'Content-Type': 'text/plain'
    });
    t.equal(parsedMessage.multipart[0].body.toString('utf8'), `This is the body of the message.
`);
    t.deepEqual(parsedMessage.multipart[1].headers, {
      'Content-Type': 'application/octet-stream',
      'Content-Transfer-Encoding': 'base64'
    });

    t.equal(parsedMessage.multipart[1].body.toString('utf8'), `PGh0bWw+CiAgPGhlYWQ+CiAgPC9oZWFkPgogIDxib2R5PgogICAgPHA+VGhpcyBpcyB0aGUg
Ym9keSBvZiB0aGUgbWVzc2FnZS48L3A+CiAgPC9ib2R5Pgo8L2h0bWw+Cg==
`);
  })();

  // Test 11 (testing '\r' new lines)
  (function() {
    const data = `HTTP/1.1 200 OK\r
Server: nginx/1.6.2\r
Date: Fri, 21 Sep 2018 09:05:11 GMT\r
Expires: Thu, 20 Dec 2018 09:05:11 GMT\r
Access-Control-Allow-Origin: *\r
\r
aaaa`
    const parsedMessage = httpMessageParser(data);

    t.equal(parsedMessage.method, null);
    t.equal(parsedMessage.url, null);
    t.equal(parsedMessage.statusCode, 200);
    t.equal(parsedMessage.statusMessage, 'OK');
    t.equal(parsedMessage.httpVersion, 1.1);
    t.equal(parsedMessage.boundary, null);
    t.deepEqual(parsedMessage.headers, {
      'Server': 'nginx/1.6.2',
      'Date': 'Fri, 21 Sep 2018 09:05:11 GMT',
      'Expires': 'Thu, 20 Dec 2018 09:05:11 GMT',
      'Access-Control-Allow-Origin': '*',
    });
    t.equal(parsedMessage.body.toString('utf8'), `aaaa`);
  })();
});

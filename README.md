<h1 align="center">
  <br />
  <img src="https://user-images.githubusercontent.com/168240/39508728-629e02fa-4d98-11e8-8808-b3b3d5e800f3.png" alt="HTTP Message Parser" width="500" />
  <br />
  <br />
  <br />
</h1>

> HTTP message parser in JavaScript.

# Demo

[https://lab.miguelmota.com/http-message-parser](https://lab.miguelmota.com/http-message-parser)

# Install

```bash
npm install http-message-parser
```

# Docs

The function takes in a string or [Buffer](https://nodejs.org/api/buffer.html) (recommended).

The result message body and multipart bodies will always return back as a [Buffer](https://nodejs.org/api/buffer.html) in Node.js in order to retain it's original encoding, for example when it parses a response containing binary audio data it won't stringify the binary data. The library avoids stringifying the body by performing offset slices on the input buffer.

Use the [buffer](https://github.com/feross/buffer) module if dealing with binary data in the browser.

# Usage

Here's an example.

`multipart_example.txt`

```
HTTP/1.1 200 OK
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary=frontier

This is a message with multiple parts in MIME format.
--frontier
Content-Type: text/plain

This is the body of the message.
--frontier
Content-Type: application/octet-stream
Content-Transfer-Encoding: base64

PGh0bWw+CiAgPGhlYWQ+CiAgPC9oZWFkPgogIDxib2R5PgogICAgPHA+VGhpcyBpcyB0aGUg
Ym9keSBvZiB0aGUgbWVzc2FnZS48L3A+CiAgPC9ib2R5Pgo8L2h0bWw+Cg==
--frontier
```

```javascript
const httpMessageParser = require('http-message-parser');
const fs = require('fs');

fs.readFile('multipart_example.txt', 'binary', (error, messageBuffer) => {
  if (error) {
    return console.error(error);
  }

  const parsedMessage = httpMessageParser(messageBuffer);

  console.log(parsedMessage);
  //
  {
    httpVersion: 1.1,
    statusCode: 200,
    statusMessage: 'OK',
    method: null,
    url: null,
    headers: {
      'MIME-Version': '1.0'
      'Content-Type': 'multipart/mixed; boundary=frontier'
    },
    body: <Buffer>, // "This is a message with multiple parts in MIME format."
    boundary: 'frontier',
    multipart: [
      {
        headers: {
          'Content-Type': 'text/plain'
        },
        body: <Buffer> // "This is the body of the message."
      },
      {
        headers: {
          'Content-Type': 'application/octet-stream'
          'Content-Transfer-Encoding': 'base64'
        },
        body: <Buffer> // "PGh0bWw+CiAgPGhlYWQ+CiAgPC9oZWFkPgogIDxib2R5Pgog..."
      }
    ]
  }
});
```

# Command Line

Parsing input file:

```bash
$ http-message-parser multipart_example.txt
```

Piping input file:

```bash
$ cat multipart_example.txt | http-message-parser
```

Piping input file and only picking specified mulipart body:

```bash
$ cat multipart_example.txt | http-message-parser --pick=multipart[0].body
```

Piping cURL response and picking specified header:

```bash
$ curl -sD - http://www.example.com/ | http-message-parser --pick=headers[Last-Modified]
```

# Test

```bash
npm test
```

# License

MIT

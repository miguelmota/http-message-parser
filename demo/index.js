(function() {
  /* globals httpMessageParser: true */
  'use strict'

  const input = document.getElementById('input')
  const output = document.getElementById('output')
  const parseButton = document.getElementById('parse')

  parseButton.addEventListener('click', parse)

  function parse() {
    const result = httpMessageParser(input.value)
    result.body = result.body.toString()
    result.multipart = result.multipart.map(function(x) {
      x.body = x.body.toString()
      return x
    })
    output.innerHTML = '<pre><code>' + escapeHtml(JSON.stringify(result, null, 2)) + '<code></pre>'
  }

  function escapeHtml(text) {
    return text.replace(/[\"&<>]/g, function (a) {
      return { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a]
    })
  }

  parse()
})();

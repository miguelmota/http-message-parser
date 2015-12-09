(function() {
  /* globals httpMessageParser: true */
  'use strict';

  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const parseButton = document.getElementById('parse');

  parseButton.addEventListener('click', parse);

  function parse() {
    output.innerHTML = '<pre>' + JSON.stringify(httpMessageParser(input.value.trim()), null, 2) + '</pre>';
  }

  parse();
})();

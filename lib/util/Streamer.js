const http = require('http');
const https = require('https');
const { parse } = require('url');

const RETRIABLE_EXCEPTIONS = ['econnreset', 'etimedout'];
const HANDLERS = {
  'https:': https,
  'http:': http
};

/**
 * Opens a stream to the given media resource URL.
 * @param {String} sourceUrl The URL to stream from.
 * @param {require('stream').Writable} pipeable The stream to pipe the data to.
 * @param {Number} start The start range to fetch data, in bytes.
 */
function openStream(sourceUrl, pipeable, start = 0) {
  const opts = parse(sourceUrl);
  const lib = HANDLERS[opts.protocol];

  if (!lib) {
    throw new Error(`Unsupported protocol ${opts.protocol}`);
  }

  opts.headers = {
    'Range': `bytes=${start}-`
  };

  let received = 0;

  const request = lib.request(opts, (res) => {
    const totalBytes = +res.headers['content-length'];
  
    res.on('data', (chunk) => {
      received += chunk.length;
    });

    res.on('end', () => {
      if (received < totalBytes) {
        res.unpipe();
        openStream(sourceUrl, pipeable, start + received);
      } else {
        pipeable.end();
      }
    });

    res.pipe(pipeable, { end: false });
  });
  
  request.on('error', (e) => {
    return;
    /*
    if (RETRIABLE_EXCEPTIONS.some(error => e.message.toLowerCase().includes(error))) {
      console.log('Non-fatal error; retrying connection.');
    }*/
  });

  request.end();
}

module.exports = {
  openStream
};

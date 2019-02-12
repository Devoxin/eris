const { promises: { read, open } } = require('fs');
const { parse } = require('url');
const http = require('http');

function checkBuffer (buf, length) {
  return buf && Buffer.isBuffer(buf) && buf.length >= length;
}

function isWebm (buf) {
  return checkBuffer(buf, 4)
    && buf[0] === 26
    && buf[1] === 69
    && buf[2] === 223
    && buf[3] === 163;
}

function isOggOpus (buf) {
  // Bytes 0 to 3: detect general OGG (OPUS is OGG)
  // Bytes 28 to 35: detect OPUS
  return checkBuffer(buf, 36)
    && buf[0] === 79 &&
    buf[1] === 103 &&
    buf[2] === 103 &&
    buf[3] === 83 &&
    buf[28] === 79 &&
    buf[29] === 112 &&
    buf[30] === 117 &&
    buf[31] === 115 &&
    buf[32] === 72 &&
    buf[33] === 101 &&
    buf[34] === 97 &&
    buf[35] === 100;
}

function fetch (url) {
  return new Promise((resolve, reject) => {
    const opts = parse(url);
    opts.headers = {
      'Range': 'bytes=0-35'
    };

    const req = http.request(opts, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      })
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function readBytes (file, local) {
  let buf;

  if (local) {
    buf = Buffer.alloc(36);
    try {
      await read(await open(file, 'r'), buf, 0, 36, 0);
    } catch(e) {
      return null;
    }
  } else {
    buf = await fetch(file);
  }

  return buf;
}

async function determineFormat (file) {
  let format;
  const bytes = await readBytes(file, !file.startsWith('http'));

  if (isWebm(bytes)) {
    format = 'webm';
  } else if (isOggOpus(bytes)) {
    format = 'ogg';
  } else {
    format = null;
  }

  return format;
}

module.exports = determineFormat;

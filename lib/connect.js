const net = require('net');
const fs = require('fs');
const wrap = require('word-wrap');
const term = require('term-size');
const { parseAddress, createLogger, colorize } = require('./utils');

const log = createLogger();

const connections = [];

const handleError = server => err => {

  const addr = server.address();

  if (typeof addr == 'string') {

    // Reuse unix socket if possible
    if (err.code == 'EADDRINUSE') {

      // Check socket in use.
      const socket = net.connect(addr, () => {
        log.error(`unix socket ${addr} already in use.`);
        process.exit();
      });

      socket.on('error', (e) => {

        if (e.code == 'ECONNREFUSED') {
          fs.unlink(addr);
          server.listen(addr);
        }

        else {
          log.error(e);
          process.exit();
        }

      });

    }
  }

  // TCP socket already in use log and exit.
  else {
    log.error(`tcp address ${addr} already in use.`);
    process.exit();
  }

}

const handleListener = (destination, verbose = false, width = 0) => socket => {

  const [host, port] = parseAddress(destination);
  const isUnixSocket = /\.sock$/.test(destination);
  let client;
  let hasOutput = false;

  const args = [host, () => {
    client.pipe(socket);
    socket.pipe(client);
  }];

  if (!isUnixSocket)
    args.unshift(port);

  client = net.connect(...args);

  // Close the connection on error
  client.on('error', (err) => {
    log.error(err);
    socket.end();
  });

  socket.on('error', (err) => {
    log.error(err);
    client.end();
  });

  if (verbose) {
    const { columns } = term();
    const prefix = colorize('-'.repeat(width || columns - 1), 'dim') + '\n';
    socket.on('data', (chunk) => {
      chunk = chunk.toString();
      if (width) {
        width = parseInt(width, 10);
        chunk = wrap(chunk, { width, cut: true });
      }
      if (hasOutput)
        chunk = prefix + chunk;
      console.log(chunk);
      if (!hasOutput) hasOutput = true;
    });
  }

}

const handleSignal = () => {

  // Remove unix sockets from disk at SIGINT
  process.on('SIGINT', function () {
    log.fill();
    log.writeLn(`disconnected...`, 'dim').fill();
    connections.forEach(server => {
      if (typeof server.address() == 'string')
        fs.unlinkSync(server.address());
    });
    process.exit();
  });

};

const createConnectedStr = (src, dest) => {
  const connStr = colorize('CONNECTED: ', 'greenBright');
  const arrowStr = colorize('-->', 'dim');
  const srcStr = colorize(src, 'magentaBright');
  const destStr = colorize(dest, 'blueBright');
  return `${connStr} ${srcStr} ${arrowStr} ${destStr}`;
};

function connect(options) {

  options = {
    sources: [],
    destinations: [],
    registerSignalHandler: true,
    verbose: false,
    width: 0,
    ...options
  };

  const {
    sources, destinations, registerSignalHandler,
    verbose, width
  } = options;

  sources.forEach((src, i) => {

    const dest = destinations[i];
    const server = net
      .createServer(handleListener(dest, verbose, width));
    server.on('error', handleError(server));

    const [host, port] = parseAddress(src);

    // unix socket
    if (!src.includes(':')) {
      server.listen(host, () => {
        log.writeLn(createConnectedStr(src, dest));
      });
    }

    // tcp socket
    else {
      server.listen(port, host, () => {
        log.writeLn(createConnectedStr(src, dest));
      });
    }

    connections.push(server);

    if (registerSignalHandler)
      handleSignal();

  });

}

module.exports = connect;


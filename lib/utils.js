const colors = require('ansi-colors');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const pkg = require(join(__dirname, '../package.json'));

const isTTY = process.stdout.isTTY;

const hasProto = str => /^.+:\/\//.test(str);

const stripProto = str => str.replace(/^.+:\/\//, '');

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

const mergeObject = (target = {}, source = {}) => {
  for (const k in source) {
    const val = source[k];
    if (typeof val === 'object' && !Array.isArray(val) && val !== null)
      target[k] = mergeObject(target[k], source[k]);
    else if (typeof val !== 'undefined')
      target[k] = source[k];
  }
  return target;
}

const loadConfigs = (paths = [], defaultConfig = {}) => {
  return paths.reduce((result, path) => {
    if (!existsSync(path))
      return result;
    try {
      const strConfig = readFileSync(path, 'utf-8').toString();
      let config = JSON.parse(strConfig);
      config = path.includes('package.json') ? config[pkg.name] : config;
      return mergeObject(result, config);
    }
    catch (err) {
      console.warn(`${colors.yellowBright('WARNING:')} failed to load config path: ${path}`);
      return result;
    }
  }, defaultConfig);
};

const parseAddress = str => {
  str = str.trim();
  let idx = str.indexOf(':');
  if (!~idx)
    return [str]; // if no port it's a unix socket.
  idx = str.lastIndexOf(':');
  let host = stripProto(str.slice(0, idx));
  let port = str.slice(idx + 1);
  if (typeof port !== 'undefined')
    port = parseInt(port, 10);
  return [host, port];
}

// simple Array.flat
const flatten = (arr = []) => arr.reduce((a, b) => a.concat(b), []);

const colorize = (str, styles = []) => {
  if (!isTTY) return str;
  if (!Array.isArray(styles) && typeof styles !== 'undefined')
    styles = [styles];
  styles = flatten(styles);
  if (!styles.length)
    return str;
  return styles.reduce((result, style) => colors[style](result), str);
};

// set lineCount to 0 for all lines.
function formatStack(err, lineCount = 2, ...styles) {
  let stack = err.stack.split('\n').slice(1);
  if (lineCount)
    stack = stack.slice(0, lineCount);
  if (!styles.length)
    styles = ['dim'];
  stack = colorize(stack.join('\n'), styles);
  return stack;
}

function writer(options) {

  options = {
    stream: process.stdout,
    ending: '\n',
    ...options
  };

  const { stream, ending } = options;

  const api = {
    prefix: _prefix,
    write: _write,
    writeLn: _writeLn,
    space: _space,
    fill: _fill,
    done: _done,
    exit: (code = 0) => process.exit(code)
  };

  function _prefix(prefix, ...styles) {
    _write(prefix, ...styles);
    return api;
  }

  // styles - rest or array of colors.
  function _write(val = '', ...styles) {
    if (!val) return api; // nothing to do.
    val = colorize(val, styles);
    stream.write(val);
    return api;
  };

  function _space(qty = 1) {
    Array(qty).fill().forEach(() => _write(' '));
    return api;
  }

  // same as _write but appends line ending.
  // styles - rest or array of colors.
  function _writeLn(val = '', ...styles) {
    if (val)
      val = colorize(val, styles);
    stream.write(val + ending);
    return api;
  }

  // Basically just fills creates empty lines.
  function _fill(qty = 1) {
    Array(qty).fill().forEach(_writeLn);
    return api;
  }

  // simply writes line ending.
  function _done() {
    stream.write(ending);
  }

  return api;

};

function createLogger(options) {

  const logger = writer(options);

  const api = {
    ...logger,
    error,
    warn,
    info
  };

  function error(message, ...styles) {
    if (message instanceof Error) {
      const stack = formatStack(message);
      logger.prefix('ERROR: ', 'redBright').writeLn(message, styles).writeLn(stack);
    }
    else {
      logger.prefix('ERROR: ', 'redBright').writeLn(message, styles);
    }
    return api;
  }

  function warn(message, ...styles) {
    logger.prefix('WARNING: ', 'yellowBright').writeLn(message, styles);
    return api;
  }

  function info(message, ...styles) {
    logger.prefix('INFO: ', 'magentaBright').writeLn(message, styles);
    return api;
  }

  return api;

}

module.exports = {
  pkg,
  capitalize,
  parseAddress,
  hasProto,
  stripProto,
  colorize,
  writer,
  formatStack,
  createLogger,
  mergeObject,
  loadConfigs
};

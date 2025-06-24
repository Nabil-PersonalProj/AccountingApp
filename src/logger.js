const path = require('path');
const { app } = require('electron');
const log = require('electron-log');

// Set log file location
log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs', 'main.log');

//console.log('LOG PATH:', log.transports.file.getFile().path);


// Limit log file size to 5MB
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB

// Control console output (only in development)
if (process.env.NODE_ENV !== 'production') {
  log.transports.console.level = 'silly'; // verbose output
} else {
  log.transports.console.level = false; // disable console logs in prod
}

log.info('[Logger] Initialized');

module.exports = log;

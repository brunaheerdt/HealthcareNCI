const fs = require('fs');
const path = require('path');

// Define the log file path
const logDir = path.join(__dirname, 'logs');
const logFile = path.join(logDir, 'log.txt');

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Function to log messages in the log file
const logMessage = (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    fs.appendFile(logFile, logEntry, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
};

module.exports = { logMessage };
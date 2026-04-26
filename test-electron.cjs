console.log('Testing require("electron") in project');
console.log('process.versions.electron:', process.versions.electron);
const e = require('electron');
console.log('typeof e:', typeof e);
console.log('e.app:', typeof e.app);
console.log('e.BrowserWindow:', typeof e.BrowserWindow);

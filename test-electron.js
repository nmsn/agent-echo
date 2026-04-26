console.log('Testing require("electron") in Electron main process');
console.log('process.versions.electron:', process.versions.electron);

try {
  const e = require('electron');
  console.log('typeof e:', typeof e);
  console.log('e value:', e.substring ? e.substring(0, 50) : e);
  console.log('e.app:', typeof e.app);
  console.log('e.BrowserWindow:', typeof e.BrowserWindow);
} catch(err) {
  console.log('Error:', err);
}

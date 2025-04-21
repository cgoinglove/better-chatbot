// Solution 1: Check for document existence before using it
// This pattern allows the code to run in both Node.js and browser environments

// Debug flags
const VERBOSE_DEBUG = true;

// Check if we're in a browser environment
const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

if (VERBOSE_DEBUG) {
  console.log("Starting script execution...");
  console.log("Environment check - isBrowser:", isBrowser);
}

// Only attach event listeners if in a browser environment
if (isBrowser) {
  if (VERBOSE_DEBUG)
    console.log("Browser environment detected, setting up listeners");

  document.addEventListener("keydown", function (event) {
    console.log("Key pressed:", event.key);
    // Your key handling logic here
  });

  console.log("Running in browser environment, event listeners attached");
} else {
  console.log("Running in Node.js environment, DOM APIs not available");
  // You can provide alternative functionality for Node.js here
  // For example, you might want to handle keyboard input differently
  // or simulate events for testing

  if (VERBOSE_DEBUG) {
    console.log("Node.js details:");
    console.log("- Node version:", process.version);
    console.log("- Platform:", process.platform);
    console.log("- Process ID:", process.pid);
  }
}

// Shared code that works in both environments
console.log("This code runs in both Node.js and browser environments");

// Solution 2: Use JSDOM for Node.js
// To use this approach, you would need to install jsdom:
// npm install jsdom

/*
// Uncomment this section and comment out Solution 1 to use JSDOM approach

let document;
let window;

if (typeof global !== 'undefined' && !global.document) {
  // We're in Node.js, setup JSDOM
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  
  // Get the document and window from JSDOM
  window = dom.window;
  document = dom.window.document;
  
  // Make document global for any other code that needs it
  global.document = document;
  global.window = window;
  
  console.log('Created JSDOM environment for Node.js');
}

// Now we can use document safely in both environments
document.addEventListener('keydown', function(event) {
  console.log('Key pressed:', event.key);
  // Your key handling logic here
});
*/

// End of file - This code should run in both Node.js and browser environments
if (VERBOSE_DEBUG) console.log("Script execution completed successfully");

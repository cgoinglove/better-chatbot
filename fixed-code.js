// =========================================
// Original code (line 83) with fix applied
// =========================================

// Check if running in browser or Node.js environment
const isNode = typeof window === "undefined" || typeof document === "undefined";

// Your original code starts here, but with environment check
if (!isNode) {
  // This code will only run in a browser environment
  document.addEventListener("keydown", function (event) {
    // Original keyboard handling logic
    console.log("Key pressed:", event.key);
    // Other key handling code...
  });
} else {
  // Alternative for Node.js environment
  console.log("Running in Node.js environment - document API not available");
  console.log("Consider using one of these approaches:");
  console.log("1. Use a DOM emulation library like jsdom (npm install jsdom)");
  console.log("2. Implement alternative logic for Node.js");
  console.log("3. Only use this code in a browser environment");
}

// Rest of your code that doesn't depend on browser APIs
console.log("Code execution completed");

/*
HOW TO USE THIS APPROACH:

1. Always check for environment before using browser-specific APIs:
   
   if (typeof document !== 'undefined') {
     // Browser-specific code using document, window, etc.
   } else {
     // Alternative Node.js implementation or graceful degradation
   }

2. Extract shared logic into functions that work in both environments:

   function processData(data) {
     // Logic that doesn't depend on browser or Node.js specifics
   }

3. For testing in Node.js, consider using jsdom:
   
   const { JSDOM } = require('jsdom');
   const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
   global.document = dom.window.document;
   global.window = dom.window;
*/

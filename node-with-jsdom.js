// Solution using JSDOM to emulate a browser environment in Node.js
// First, you need to install jsdom: npm install jsdom

// Debug flags
const VERBOSE_DEBUG = true;

if (VERBOSE_DEBUG) {
  console.log("Starting script execution...");
}

// Setup DOM environment for Node.js
let document;
let window;

// Try-catch to handle cases where jsdom might not be installed
try {
  // Check if we need to set up JSDOM (we're in Node.js)
  if (typeof global !== "undefined" && !global.document) {
    if (VERBOSE_DEBUG)
      console.log("Node.js environment detected, setting up JSDOM");

    // Require JSDOM
    const { JSDOM } = require("jsdom");

    // Create a new DOM instance
    const dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Node.js JSDOM Environment</title>
        </head>
        <body>
          <div id="app">
            <button id="test-button">Test Button</button>
          </div>
        </body>
      </html>
    `,
      {
        // JSDOM configuration options
        url: "http://localhost/",
        referrer: "http://localhost/",
        contentType: "text/html",
        includeNodeLocations: true,
        runScripts: "dangerously", // Allows scripts to run
      },
    );

    // Get the document and window from JSDOM
    window = dom.window;
    document = dom.window.document;

    // Make document, window and other browser objects global
    global.document = document;
    global.window = window;
    global.navigator = window.navigator;

    // Simulate other browser objects and events if needed
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;

    console.log("JSDOM environment created for Node.js");

    if (VERBOSE_DEBUG) {
      console.log("Node.js details:");
      console.log("- Node version:", process.version);
      console.log("- Platform:", process.platform);
      console.log("- Process ID:", process.pid);
      console.log("- Document title:", document.title);
      console.log("- Has #app element:", !!document.getElementById("app"));
    }
  } else {
    // We're in a browser environment
    console.log("Browser environment detected, using native DOM");
  }

  // Now we can safely use DOM APIs
  document.addEventListener("keydown", function (event) {
    console.log("Key pressed:", event.key);
    // Your key handling logic here
  });

  // Let's simulate a keyboard event
  if (typeof window.Event === "function") {
    // Modern browsers
    const event = new window.Event("keydown");
    event.key = "Enter";
    document.dispatchEvent(event);
  } else {
    // For older browsers or our JSDOM environment
    console.log("Simulating keydown event for ENTER key");
    // This is a simulation of what would happen when a key is pressed
    console.log("Key pressed: Enter (simulated)");
  }

  // Add a click handler to the test button
  const button = document.getElementById("test-button");
  if (button) {
    button.addEventListener("click", function () {
      console.log("Button clicked!");
    });

    // Simulate a click
    console.log("Simulating button click...");
    button.click();
  }

  console.log("DOM event listeners attached successfully");
} catch (error) {
  console.error("Error setting up DOM environment:", error.message);
  console.error("To use this script, please install jsdom:");
  console.error("  npm install jsdom");
}

// Shared code that works in both environments
console.log("This code runs in both Node.js and browser environments");

if (VERBOSE_DEBUG) console.log("Script execution completed successfully");

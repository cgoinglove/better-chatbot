// Check if running in a browser or Node.js environment
const isNode = typeof window === "undefined" || typeof document === "undefined";

// Print environment info
console.log("Running in " + (isNode ? "Node.js" : "browser") + " environment");

// Code that works in both environments
const handleKeyPress = (key) => {
  console.log("Key pressed:", key);
  // Your key handling logic here
};

// Browser-specific code, only runs in browser
if (!isNode) {
  // Safe to use browser APIs here
  document.addEventListener("keydown", function (event) {
    handleKeyPress(event.key);
  });

  console.log("Event listeners attached to document");
}
// Node.js-specific code
else {
  console.log("In Node.js environment, document API not available");
  console.log('Simulating key press with "Enter" key:');
  handleKeyPress("Enter");
}

// This ensures your sandbox can run the code without errors
console.log("Script executed successfully");

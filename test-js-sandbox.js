// Test file for JavaScript sandbox
// This includes browser-specific code that would fail in Node.js without sandbox

// Add a keydown event listener
document.addEventListener("keydown", function (event) {
  console.log("Key pressed:", event.key);
});

// Try to interact with DOM elements
const button = document.getElementById("test-button");
if (button) {
  button.addEventListener("click", function () {
    console.log("Button clicked!");
  });
}

// Regular JavaScript code that should work
console.log("Hello from sandbox test!");

// Create an array and manipulate it
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);
console.log("Doubled numbers:", doubled);

// Use setTimeout
setTimeout(() => {
  console.log("This message should appear after a delay");
}, 100);

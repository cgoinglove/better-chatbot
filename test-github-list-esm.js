// Simple script to test the GitHub repository listing functionality
// Using ES modules syntax
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the custom MCP server
const serverPath = join(__dirname, 'custom-mcp-server', 'index.ts');

// Start the server process
const server = spawn('node', ['-r', 'ts-node/register', serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log(`Server output: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

// Send a command to list GitHub repositories
const command = JSON.stringify({
  type: 'tool_call',
  tool: 'github_list_repositories',
  params: {}
});

// Wait for server to start
setTimeout(() => {
  console.log('Sending command to list GitHub repositories...');
  server.stdin.write(command + '\n');
}, 1000);

// Handle process exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Terminate the server after 10 seconds
setTimeout(() => {
  console.log('Terminating server...');
  server.kill();
}, 10000);

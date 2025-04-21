// Example of using the code execution system
import { executeCode } from './custom-mcp-server/dist/code-execution.js';

async function runPythonExample() {
  console.log('Running Python code example...');
  
  // Python code to execute
  const pythonCode = `
# Simple data analysis example
import math
import random

# Generate some random data
data = [random.randint(1, 100) for _ in range(10)]
print(f"Generated data: {data}")

# Calculate statistics
average = sum(data) / len(data)
variance = sum((x - average) ** 2 for x in data) / len(data)
std_dev = math.sqrt(variance)

print(f"Average: {average:.2f}")
print(f"Standard Deviation: {std_dev:.2f}")

# Find min and max
print(f"Minimum value: {min(data)}")
print(f"Maximum value: {max(data)}")

# Sort the data
sorted_data = sorted(data)
print(f"Sorted data: {sorted_data}")

# If the list has an odd number of elements, the median is the middle element
# If the list has an even number of elements, the median is the average of the two middle elements
if len(sorted_data) % 2 == 0:
    median = (sorted_data[len(sorted_data)//2 - 1] + sorted_data[len(sorted_data)//2]) / 2
else:
    median = sorted_data[len(sorted_data)//2]
    
print(f"Median: {median}")
`;

  try {
    console.log('Executing Python code...');
    const result = await executeCode(pythonCode, 'python');
    
    console.log('\nExecution result:');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('\nOutput:');
      console.log(result.output);
      
      if (result.executionTime) {
        console.log(`\nExecution time: ${result.executionTime}ms`);
      }
    } else {
      console.error('\nError:');
      console.error(result.error);
    }
  } catch (error) {
    console.error('Failed to execute code:', error);
  }
}

async function runJavaScriptExample() {
  console.log('\nRunning JavaScript code example...');
  
  // JavaScript code to execute
  const jsCode = `
// Simple data analysis example in JavaScript
const data = Array.from({length: 10}, () => Math.floor(Math.random() * 100) + 1);
console.log("Generated data:", data);

// Calculate statistics
const average = data.reduce((sum, val) => sum + val, 0) / data.length;
const variance = data.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / data.length;
const stdDev = Math.sqrt(variance);

console.log(\`Average: \${average.toFixed(2)}\`);
console.log(\`Standard Deviation: \${stdDev.toFixed(2)}\`);

// Find min and max
console.log(\`Minimum value: \${Math.min(...data)}\`);
console.log(\`Maximum value: \${Math.max(...data)}\`);

// Sort the data
const sortedData = [...data].sort((a, b) => a - b);
console.log("Sorted data:", sortedData);

// Calculate median
let median;
if (sortedData.length % 2 === 0) {
  median = (sortedData[sortedData.length/2 - 1] + sortedData[sortedData.length/2]) / 2;
} else {
  median = sortedData[Math.floor(sortedData.length/2)];
}

console.log(\`Median: \${median}\`);
`;

  try {
    console.log('Executing JavaScript code...');
    const result = await executeCode(jsCode, 'javascript');
    
    console.log('\nExecution result:');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('\nOutput:');
      console.log(result.output);
      
      if (result.executionTime) {
        console.log(`\nExecution time: ${result.executionTime}ms`);
      }
    } else {
      console.error('\nError:');
      console.error(result.error);
    }
  } catch (error) {
    console.error('Failed to execute code:', error);
  }
}

// Run both examples
async function runExamples() {
  await runPythonExample();
  await runJavaScriptExample();
  console.log('\nAll examples completed.');
}

runExamples();

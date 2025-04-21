"""
Simple test script for the enhanced sandbox session.
"""

import os
import sys
import tempfile

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

# Import the DirectSandbox class
from direct_sandbox import DirectSandbox

# Create a sandbox instance
sandbox = DirectSandbox()

# Test code to execute
python_code = """
print("Hello from Python!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")

# Try to import some standard libraries
import math
print(f"The square root of 16 is {math.sqrt(16)}")

import random
print(f"A random number between 1 and 100: {random.randint(1, 100)}")

# Test a simple function
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
"""

# Execute the code
print("Executing Python code...")
result = sandbox.execute(python_code)

# Print the result
print("\nExecution result:")
print(f"Success: {result.success}")
print(f"Exit code: {result.exit_code}")
print(f"Output:\n{result.output}")

if result.stderr:
    print(f"Stderr:\n{result.stderr}")

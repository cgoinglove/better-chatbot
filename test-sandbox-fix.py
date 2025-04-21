"""
Test script to verify that the direct_sandbox.py file is being found correctly.

This script simulates the sandbox runner that's created by the code-execution-sandbox.js file.
"""

import sys
import os

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
print(f"Current directory: {current_dir}")

# Add the llm-sandbox directory to the Python path
sandbox_dir = os.path.join(current_dir, "src", "llm-sandbox")
print(f"Sandbox directory: {sandbox_dir}")
sys.path.insert(0, sandbox_dir)

try:
    # Try to import the DirectSandbox class
    print("Attempting to import DirectSandbox...")
    from direct_sandbox import DirectSandbox
    print("Successfully imported DirectSandbox!")
    
    # Create a sandbox instance
    sandbox = DirectSandbox()
    
    # Test code to execute
    test_code = """
print("Hello from the sandbox!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")
"""
    
    # Execute the code
    print("\nExecuting test code...")
    result = sandbox.execute(test_code)
    
    # Print the result
    print("\nExecution result:")
    print(f"Success: {result.success}")
    print(f"Exit code: {result.exit_code}")
    print(f"Output: {result.output}")
    
    if result.stderr:
        print(f"Stderr: {result.stderr}")
    
except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
    print("\nChecking if direct_sandbox.py exists...")
    direct_sandbox_path = os.path.join(sandbox_dir, "direct_sandbox.py")
    if os.path.exists(direct_sandbox_path):
        print(f"File exists at: {direct_sandbox_path}")
        print(f"File size: {os.path.getsize(direct_sandbox_path)} bytes")
    else:
        print(f"File does not exist at: {direct_sandbox_path}")
except Exception as e:
    print(f"Error: {e}")

"""
Test script for the sandbox runner.

This script simulates the sandbox runner that's created by the code-execution-sandbox.js file.
"""

import sys
import os

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox
    
    # Test code to execute
    test_code = """
print("Hello from the sandbox!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")
"""
    
    # Create a sandbox and execute the code
    sandbox = DirectSandbox()
    result = sandbox.execute(test_code)
    
    # Print the result for capture in the format expected by code-execution-sandbox.js
    print("\n--- SANDBOX EXECUTION RESULT ---")
    print(f"success: {result.success}")
    print(f"exit_code: {result.exit_code}")
    print(f"--- OUTPUT START ---")
    print(result.output)
    print(f"--- OUTPUT END ---")
    print(f"--- ERRORS START ---")
    print(result.stderr)
    print(f"--- ERRORS END ---")
    
except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
except Exception as e:
    print(f"Error: {e}")

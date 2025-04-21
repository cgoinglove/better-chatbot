"""
Simple test for the DirectSandbox.
"""

import sys
import os

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox
    
    # Create a sandbox instance
    sandbox = DirectSandbox()
    
    # Simple code to execute
    code = """
print("Hello from the sandbox!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")
"""
    
    # Execute the code
    print("Executing code...")
    result = sandbox.execute(code)
    
    # Print the result
    print("\nExecution result:")
    print(f"Success: {result.success}")
    print(f"Exit code: {result.exit_code}")
    print(f"Output: {result.output}")
    
    if result.stderr:
        print(f"Stderr: {result.stderr}")
    
except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
except Exception as e:
    print(f"Error: {e}")

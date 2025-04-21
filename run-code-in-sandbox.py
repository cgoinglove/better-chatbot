"""
Run a Python file through the DirectSandbox.
"""

import sys
import os

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox
    
    # Read the code from the file
    with open("test-python-code.py", "r") as f:
        code = f.read()
    
    # Create a sandbox and execute the code
    sandbox = DirectSandbox()
    result = sandbox.execute(code)
    
    # Print the result
    print("\nExecution result:")
    print(f"Success: {result.success}")
    print(f"Exit code: {result.exit_code}")
    print(f"Output:\n{result.output}")
    
    if result.stderr:
        print(f"Stderr:\n{result.stderr}")
    
except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
except Exception as e:
    print(f"Error: {e}")

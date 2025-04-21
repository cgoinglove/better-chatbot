"""
Simple test script for the enhanced sandbox.
"""

import sys
import os

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from enhanced_sandbox import EnhancedSandbox
    from sandbox_config import SandboxConfig
    
    # Create a sandbox with direct execution
    config = SandboxConfig(
        container_type="direct",
        timeout_seconds=10
    )
    
    sandbox = EnhancedSandbox(config)
    
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
    
    # Test one-shot execution
    print("\nTesting one-shot execution:")
    result = sandbox.execute(python_code)
    print(result)
    
except ImportError as e:
    print(f"Error importing sandbox modules: {e}")
except Exception as e:
    print(f"Error: {e}")

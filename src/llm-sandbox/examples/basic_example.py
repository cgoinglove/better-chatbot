#!/usr/bin/env python3
"""
Basic example of using LLM Sandbox to execute code safely.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sandbox import Sandbox

def main():
    """Run a basic example of LLM Sandbox."""
    # Create a sandbox with default configuration
    sandbox = Sandbox()
    
    # Define some example code
    code = """
def hello(name):
    return f"Hello, {name}!"

message = hello("world")
print(f"The message is: {message}")

# Calculate the fibonacci sequence
def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    
    return fib

# Calculate first 10 fibonacci numbers
fib_numbers = fibonacci(10)
print(f"First 10 Fibonacci numbers: {fib_numbers}")
"""
    
    # Execute the code in the sandbox
    print("Executing code in sandbox...")
    result = sandbox.execute(code)
    
    # Print execution results
    print("\n--- Execution Result ---")
    print(f"Success: {result.success}")
    print(f"Exit Code: {result.exit_code}")
    
    print("\n--- Output ---")
    print(result.output)
    
    # If metrics are available, print them
    if result.metrics:
        print("\n--- Metrics ---")
        for key, value in result.metrics.items():
            print(f"{key}: {value}")


if __name__ == "__main__":
    main() 
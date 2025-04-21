#!/usr/bin/env python3
"""
Example demonstrating how to use the CodeValidator for checking
code security before execution.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from security import CodeValidator


def main():
    """Run a code validator example."""
    # Create a code validator with default settings
    validator = CodeValidator()
    
    # Example 1: Safe code
    safe_code = """
def fibonacci(n):
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(10))
"""
    
    print("Example 1: Safe code")
    print("--------------------")
    print(safe_code)
    
    is_valid, warnings = validator.validate(safe_code)
    print(f"\nValid: {is_valid}")
    
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    else:
        print("No warnings")
    
    # Example 2: Code with dangerous imports
    dangerous_imports = """
import os
import sys
import subprocess

def list_files():
    return os.listdir('/')

print(list_files())
"""
    
    print("\n\nExample 2: Code with dangerous imports")
    print("--------------------------------------")
    print(dangerous_imports)
    
    is_valid, warnings = validator.validate(dangerous_imports)
    print(f"\nValid: {is_valid}")
    
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    
    # Example 3: Code with eval/exec
    eval_code = """
user_input = "2 + 2"
result = eval(user_input)
print(f"The result is: {result}")
"""
    
    print("\n\nExample 3: Code with eval")
    print("------------------------")
    print(eval_code)
    
    is_valid, warnings = validator.validate(eval_code)
    print(f"\nValid: {is_valid}")
    
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    
    # Example 4: Code with potential sandbox escape
    escape_attempt = """
# Attempt to escape the sandbox
escape = ().__class__.__base__.__subclasses__()
for i, cls in enumerate(escape):
    print(f"{i}: {cls.__name__}")
"""
    
    print("\n\nExample 4: Code with potential sandbox escape")
    print("--------------------------------------------")
    print(escape_attempt)
    
    is_valid, warnings = validator.validate(escape_attempt)
    print(f"\nValid: {is_valid}")
    
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")


if __name__ == "__main__":
    main() 
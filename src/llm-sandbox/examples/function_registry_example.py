#!/usr/bin/env python3
"""
Example demonstrating how to use the FunctionRegistry for executing 
LLM-generated function calls safely.
"""

import sys
import os
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from function_registry import FunctionRegistry
from exceptions import SandboxSecurityError


def add(a: int, b: int) -> int:
    """Add two numbers together."""
    return a + b


def multiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    return a * b


def greet(name: str, greeting: str = "Hello") -> str:
    """Generate a greeting message."""
    return f"{greeting}, {name}!"


def main():
    """Run a function registry example."""
    # Create a function registry
    registry = FunctionRegistry()
    
    # Register functions
    registry.register(add)
    registry.register(multiply)
    registry.register(greet)
    
    # Print registered function schemas
    print("Registered functions:")
    for schema in registry.get_schemas():
        print(f"  - {schema['name']}")
    
    # Example LLM-generated function calls
    function_calls = [
        {
            "name": "add",
            "parameters": {
                "a": 5,
                "b": 7
            }
        },
        {
            "name": "multiply",
            "parameters": {
                "a": 6,
                "b": 8
            }
        },
        {
            "name": "greet",
            "parameters": {
                "name": "World"
            }
        },
        {
            "name": "greet",
            "parameters": {
                "name": "Developer",
                "greeting": "Hi there"
            }
        }
    ]
    
    # Execute each function call
    for i, function_call in enumerate(function_calls):
        print(f"\nExecuting function call {i+1}:")
        print(f"  {json.dumps(function_call)}")
        
        try:
            result = registry.execute(function_call)
            print(f"  Result: {result}")
        except SandboxSecurityError as e:
            print(f"  Error: {str(e)}")
    
    # Example of an invalid function call
    print("\nAttempting to call unregistered function:")
    invalid_call = {
        "name": "delete_all_files",
        "parameters": {}
    }
    print(f"  {json.dumps(invalid_call)}")
    
    try:
        registry.execute(invalid_call)
    except SandboxSecurityError as e:
        print(f"  Error: {str(e)}")


if __name__ == "__main__":
    main() 
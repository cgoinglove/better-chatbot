"""
Sandbox Examples - Demonstrating different uses of the DirectSandbox.
"""

import sys
import os
import time

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox
    
    def run_example(title, code):
        """Run an example code snippet and display the results."""
        print("\n" + "="*60)
        print(f"EXAMPLE: {title}")
        print("="*60)
        
        print("Code:")
        print("-"*60)
        print(code)
        print("-"*60)
        
        # Create sandbox and measure execution time
        sandbox = DirectSandbox()
        start_time = time.time()
        result = sandbox.execute(code)
        execution_time = time.time() - start_time
        
        print("\nExecution Result:")
        print("-"*60)
        print(f"Success: {result.success}")
        print(f"Exit Code: {result.exit_code}")
        print(f"Execution Time: {execution_time:.4f} seconds")
        
        if result.output:
            print("\nOutput:")
            print("-"*60)
            print(result.output)
        
        if result.stderr:
            print("\nErrors:")
            print("-"*60)
            print(result.stderr)
    
    # Example 1: Basic Calculation
    basic_calculation = """
# Basic calculation example
a = 10
b = 20
c = a + b
print(f"{a} + {b} = {c}")

# Calculate factorial
def factorial(n):
    if n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n-1)

print(f"Factorial of 5 is {factorial(5)}")
"""
    
    # Example 2: Working with Data Structures
    data_structures = """
# Working with data structures
# Lists
numbers = [1, 2, 3, 4, 5]
print(f"List: {numbers}")
print(f"First element: {numbers[0]}")
print(f"Last element: {numbers[-1]}")
print(f"Sliced list: {numbers[1:3]}")

# Dictionaries
person = {
    "name": "John Doe",
    "age": 30,
    "city": "New York"
}
print(f"Dictionary: {person}")
print(f"Name: {person['name']}")
print(f"Age: {person['age']}")

# Sets
fruits = {"apple", "banana", "cherry", "apple"}
print(f"Set: {fruits}")  # Note: duplicates are removed

# Tuples
coordinates = (10, 20)
print(f"Tuple: {coordinates}")
"""
    
    # Example 3: File Operations (should be restricted in sandbox)
    file_operations = """
# File operations
try:
    # Try to write to a file
    with open("test_file.txt", "w") as f:
        f.write("This is a test file.")
    print("Successfully wrote to file.")
    
    # Try to read from the file
    with open("test_file.txt", "r") as f:
        content = f.read()
    print(f"File content: {content}")
    
    # Try to delete the file
    import os
    os.remove("test_file.txt")
    print("Successfully deleted the file.")
except Exception as e:
    print(f"Error: {e}")
"""
    
    # Example 4: Error Handling
    error_handling = """
# Error handling example
def divide(a, b):
    try:
        result = a / b
        return result
    except ZeroDivisionError:
        return "Cannot divide by zero"
    except TypeError:
        return "Invalid types for division"
    except Exception as e:
        return f"Unexpected error: {e}"

print(f"10 / 2 = {divide(10, 2)}")
print(f"10 / 0 = {divide(10, 0)}")
print(f"'10' / 2 = {divide('10', 2)}")
"""
    
    # Example 5: Code with Syntax Error
    syntax_error = """
# Code with syntax error
print("This line is fine")
if True
    print("This line has a syntax error - missing colon")
print("This line won't be reached due to the syntax error")
"""
    
    # Run all examples
    run_example("Basic Calculation", basic_calculation)
    run_example("Data Structures", data_structures)
    run_example("File Operations", file_operations)
    run_example("Error Handling", error_handling)
    run_example("Syntax Error", syntax_error)

except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
    print("Make sure you've created the direct_sandbox.py file in the src/llm-sandbox directory.")
except Exception as e:
    print(f"Error: {e}")

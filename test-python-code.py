"""
Test Python code for the code execution system.
"""

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

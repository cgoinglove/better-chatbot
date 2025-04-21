"""
Interactive Code Runner using DirectSandbox.

This script provides a simple interactive interface for executing Python code
using the DirectSandbox implementation.
"""

import sys
import os

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox
    
    def run_code(code):
        """Run Python code in the sandbox and display the results."""
        sandbox = DirectSandbox()
        result = sandbox.execute(code)
        
        print("\n" + "="*50)
        print("EXECUTION RESULT:")
        print("="*50)
        
        if result.success:
            print(f"Status: Success (Exit code: {result.exit_code})")
            print("\nOutput:")
            print("-"*50)
            print(result.output)
            print("-"*50)
        else:
            print(f"Status: Failed (Exit code: {result.exit_code})")
            if result.output:
                print("\nOutput:")
                print("-"*50)
                print(result.output)
                print("-"*50)
            
            if result.stderr:
                print("\nErrors:")
                print("-"*50)
                print(result.stderr)
                print("-"*50)
    
    def interactive_mode():
        """Run the interactive code execution mode."""
        print("="*60)
        print("INTERACTIVE PYTHON CODE RUNNER")
        print("="*60)
        print("Type your Python code. Enter 'run' on a new line to execute.")
        print("Enter 'clear' to clear the current code buffer.")
        print("Enter 'exit' or 'quit' to exit the program.")
        print("="*60)
        
        code_buffer = []
        
        while True:
            try:
                if not code_buffer:
                    line = input(">>> ")
                else:
                    line = input("... ")
                
                if line.strip().lower() == "run":
                    if code_buffer:
                        code = "\n".join(code_buffer)
                        run_code(code)
                        code_buffer = []
                    else:
                        print("No code to run. Enter some code first.")
                
                elif line.strip().lower() == "clear":
                    code_buffer = []
                    print("Code buffer cleared.")
                
                elif line.strip().lower() in ["exit", "quit"]:
                    print("Exiting interactive mode.")
                    break
                
                else:
                    code_buffer.append(line)
            
            except KeyboardInterrupt:
                print("\nKeyboard interrupt detected. Exiting.")
                break
            except Exception as e:
                print(f"Error: {e}")
    
    def example_mode():
        """Run some example code to demonstrate the sandbox."""
        print("="*60)
        print("RUNNING EXAMPLE CODE")
        print("="*60)
        
        example_code = """
# Data analysis example
import math
import random

# Generate some random data
data = [random.randint(1, 100) for _ in range(10)]
print(f"Generated data: {data}")

# Calculate statistics
average = sum(data) / len(data)
variance = sum((x - average) ** 2 for x in data) / len(data)
std_dev = math.sqrt(variance)

print(f"Average: {average:.2f}")
print(f"Standard Deviation: {std_dev:.2f}")

# Find min and max
print(f"Minimum value: {min(data)}")
print(f"Maximum value: {max(data)}")

# Sort the data
sorted_data = sorted(data)
print(f"Sorted data: {sorted_data}")

# Calculate median
if len(sorted_data) % 2 == 0:
    median = (sorted_data[len(sorted_data)//2 - 1] + sorted_data[len(sorted_data)//2]) / 2
else:
    median = sorted_data[len(sorted_data)//2]
    
print(f"Median: {median}")
"""
        
        print("Example code:")
        print("-"*60)
        print(example_code)
        print("-"*60)
        
        run_code(example_code)
    
    if __name__ == "__main__":
        if len(sys.argv) > 1 and sys.argv[1] == "--example":
            example_mode()
        else:
            interactive_mode()

except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
    print("Make sure you've created the direct_sandbox.py file in the src/llm-sandbox directory.")
except Exception as e:
    print(f"Error: {e}")

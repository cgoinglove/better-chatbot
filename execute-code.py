"""
Execute Python code using the DirectSandbox.

Usage:
  python execute-code.py <code_file>
  python execute-code.py --code "<code_string>"
"""

import sys
import os
import argparse

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox
    
    def execute_code(code):
        """Execute Python code using the DirectSandbox."""
        sandbox = DirectSandbox()
        result = sandbox.execute(code)
        
        print("\nExecution result:")
        print(f"Success: {result.success}")
        print(f"Exit code: {result.exit_code}")
        
        if result.output:
            print("\nOutput:")
            print("-" * 50)
            print(result.output)
            print("-" * 50)
        
        if result.stderr:
            print("\nErrors:")
            print("-" * 50)
            print(result.stderr)
            print("-" * 50)
        
        return result.success
    
    def main():
        """Parse arguments and execute code."""
        parser = argparse.ArgumentParser(description="Execute Python code using DirectSandbox")
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--code", help="Python code to execute")
        group.add_argument("file", nargs="?", help="Python file to execute")
        
        args = parser.parse_args()
        
        if args.code:
            code = args.code
        else:
            with open(args.file, "r") as f:
                code = f.read()
        
        success = execute_code(code)
        sys.exit(0 if success else 1)
    
    if __name__ == "__main__":
        main()
        
except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

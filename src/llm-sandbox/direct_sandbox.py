"""
Direct Sandbox for Python code execution.

This module provides a simplified sandbox for executing Python code directly
without using Docker containers. It's less secure than the container-based
approach but useful for development and testing.
"""

import os
import sys
import tempfile
import subprocess
import traceback
from io import StringIO
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class ExecutionResult:
    """Result of code execution in the sandbox."""
    success: bool
    exit_code: int
    output: str
    stdout: str
    stderr: str
    error: Optional[str] = None


class DirectSandbox:
    """
    A simplified sandbox that executes Python code directly in a subprocess.
    
    This is less secure than container-based sandboxes but useful for
    development and testing when Docker is not available.
    """
    
    def __init__(self, timeout_seconds: int = 30):
        """
        Initialize a new direct sandbox.
        
        Args:
            timeout_seconds: Maximum execution time in seconds
        """
        self.timeout_seconds = timeout_seconds
    
    def execute(self, code: str) -> ExecutionResult:
        """
        Execute Python code in a subprocess.
        
        Args:
            code: The Python code to execute
            
        Returns:
            ExecutionResult containing execution output and status
        """
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(suffix='.py', delete=False, mode='w') as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Execute the code in a subprocess
            process = subprocess.Popen(
                [sys.executable, temp_file],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            try:
                # Wait for the process to complete with timeout
                stdout, stderr = process.communicate(timeout=self.timeout_seconds)
                exit_code = process.returncode
                success = exit_code == 0
                
                # Combine stdout and stderr for the output
                output = stdout
                if stderr:
                    if output:
                        output += "\n" + stderr
                    else:
                        output = stderr
                
                return ExecutionResult(
                    success=success,
                    exit_code=exit_code,
                    output=output,
                    stdout=stdout,
                    stderr=stderr
                )
                
            except subprocess.TimeoutExpired:
                # Kill the process if it times out
                process.kill()
                stdout, stderr = process.communicate()
                
                return ExecutionResult(
                    success=False,
                    exit_code=-1,
                    output=f"Execution timed out after {self.timeout_seconds} seconds",
                    stdout=stdout,
                    stderr=stderr,
                    error=f"Timeout after {self.timeout_seconds} seconds"
                )
                
        except Exception as e:
            # Handle any other exceptions
            error_msg = str(e)
            tb = traceback.format_exc()
            
            return ExecutionResult(
                success=False,
                exit_code=-1,
                output=f"Error executing code: {error_msg}\n{tb}",
                stdout="",
                stderr=tb,
                error=error_msg
            )
            
        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_file)
            except:
                pass


if __name__ == "__main__":
    # Example usage
    sandbox = DirectSandbox()
    code = """
print("Hello from the sandbox!")
import sys
print(f"Python version: {sys.version}")
"""
    result = sandbox.execute(code)
    print(f"Success: {result.success}")
    print(f"Output:\n{result.output}")

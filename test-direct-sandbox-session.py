"""
Test script for the DirectSandboxSession class.

This script demonstrates the use of the DirectSandboxSession class
without relying on imports from the llm-sandbox package.
"""

import os
import tempfile
import time
import uuid
import subprocess
import sys
from dataclasses import dataclass
from typing import Optional


@dataclass
class ExecutionResult:
    """Result of code execution in a sandbox environment."""
    success: bool
    exit_code: int
    output: str = ""
    stdout: str = ""
    stderr: str = ""
    error: Optional[str] = None
    execution_time_ms: Optional[int] = None
    
    def __str__(self) -> str:
        """Return a string representation of the execution result."""
        result = []
        result.append(f"Success: {self.success}")
        result.append(f"Exit code: {self.exit_code}")
        
        if self.execution_time_ms is not None:
            result.append(f"Execution time: {self.execution_time_ms} ms")
        
        if self.output:
            result.append(f"\nOutput:\n{self.output}")
        
        if self.error:
            result.append(f"\nError:\n{self.error}")
        
        return "\n".join(result)


class SandboxConfig:
    """Configuration for a sandbox environment."""
    def __init__(self, timeout_seconds=30):
        self.timeout_seconds = timeout_seconds


class DirectSandboxSession:
    """
    A sandbox session that executes code directly in a subprocess.
    """
    
    def __init__(self, config=None):
        """Initialize a new sandbox session."""
        self.config = config or SandboxConfig()
        self.session_id = str(uuid.uuid4())
        self.temp_dir = None
        self._is_open = False
    
    def open(self):
        """Open the sandbox session."""
        self._create_temp_dir()
        self._is_open = True
        return self
    
    def run(self, code, language="python"):
        """Run code in the sandbox."""
        if not self._is_open:
            raise RuntimeError("Session is not open")
        
        if language.lower() != "python":
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}. DirectSandboxSession only supports Python."
            )
        
        # Create a temporary file for the code
        code_file = os.path.join(self.temp_dir, "code.py")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        
        # Start timing execution
        start_time = time.time()
        
        try:
            # Execute the code in a subprocess
            process = subprocess.Popen(
                [sys.executable, code_file],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            try:
                # Wait for the process to complete with timeout
                stdout, stderr = process.communicate(timeout=self.config.timeout_seconds)
                exit_code = process.returncode
                success = exit_code == 0
                
                # Calculate execution time
                execution_time_ms = int((time.time() - start_time) * 1000)
                
                # Combine stdout and stderr for the output
                output = stdout
                if stderr and not success:
                    if output:
                        output += "\n" + stderr
                    else:
                        output = stderr
                
                return ExecutionResult(
                    success=success,
                    exit_code=exit_code,
                    output=output,
                    stdout=stdout,
                    stderr=stderr,
                    execution_time_ms=execution_time_ms
                )
                
            except subprocess.TimeoutExpired:
                # Kill the process if it times out
                process.kill()
                stdout, stderr = process.communicate()
                
                return ExecutionResult(
                    success=False,
                    exit_code=-1,
                    output=f"Execution timed out after {self.config.timeout_seconds} seconds",
                    stdout=stdout,
                    stderr=stderr,
                    error=f"Timeout after {self.config.timeout_seconds} seconds",
                    execution_time_ms=int((time.time() - start_time) * 1000)
                )
                
        except Exception as e:
            # Handle any other exceptions
            import traceback
            error_msg = str(e)
            tb = traceback.format_exc()
            
            return ExecutionResult(
                success=False,
                exit_code=-1,
                output=f"Error executing code: {error_msg}",
                stdout="",
                stderr=tb,
                error=error_msg,
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
    
    def close(self):
        """Close the sandbox session."""
        self._cleanup_temp_dir()
        self._is_open = False
    
    def _create_temp_dir(self):
        """Create a temporary directory for the session."""
        if self.temp_dir is None:
            self.temp_dir = tempfile.mkdtemp(prefix=f"sandbox-{self.session_id}-")
    
    def _cleanup_temp_dir(self):
        """Clean up the temporary directory."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                for filename in os.listdir(self.temp_dir):
                    file_path = os.path.join(self.temp_dir, filename)
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                os.rmdir(self.temp_dir)
                self.temp_dir = None
            except Exception as e:
                print(f"Error cleaning up temporary directory: {e}")


class EnhancedSandbox:
    """
    Enhanced sandbox for code execution.
    """
    
    def __init__(self, config=None):
        """Initialize a new sandbox."""
        self.config = config or SandboxConfig()
        self.session = None
    
    def open(self):
        """Open a sandbox session."""
        if self.session is None:
            self.session = DirectSandboxSession(self.config)
            self.session.open()
        return self
    
    def run(self, code, language="python"):
        """Run code in the sandbox."""
        if self.session is None:
            self.open()
        
        return self.session.run(code, language)
    
    def close(self):
        """Close the sandbox session."""
        if self.session is not None:
            self.session.close()
            self.session = None
    
    def execute(self, code, language="python"):
        """One-shot execution."""
        try:
            self.open()
            return self.run(code, language)
        finally:
            self.close()
    
    def __enter__(self):
        """Support for context manager."""
        return self.open()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Support for context manager."""
        self.close()


def test_direct_sandbox():
    """Test the direct sandbox implementation."""
    print("\n" + "="*60)
    print("TESTING DIRECT SANDBOX")
    print("="*60)
    
    # Create a sandbox with direct execution
    config = SandboxConfig(timeout_seconds=10)
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
    
    # Test lifecycle methods
    print("\nTesting lifecycle methods:")
    sandbox.open()
    result = sandbox.run(python_code)
    print(result)
    sandbox.close()
    
    # Test context manager
    print("\nTesting context manager:")
    with EnhancedSandbox(config) as sandbox:
        result = sandbox.run(python_code)
        print(result)


if __name__ == "__main__":
    test_direct_sandbox()

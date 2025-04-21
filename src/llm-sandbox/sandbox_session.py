"""
Session management for sandbox environments.

This module provides classes for managing the lifecycle of sandbox environments,
including creation, execution, and cleanup.
"""

import os
import tempfile
import time
import uuid
from abc import ABC, abstractmethod
from typing import Optional

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult


class SandboxSession(ABC):
    """
    Base class for sandbox sessions.
    
    A sandbox session manages the lifecycle of a sandbox environment,
    including creation, execution, and cleanup.
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None):
        """
        Initialize a new sandbox session.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
        """
        self.config = config or SandboxConfig()
        self.session_id = str(uuid.uuid4())
        self.temp_dir = None
        self._is_open = False
    
    def __enter__(self):
        """Enter context manager - open the session."""
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager - close the session."""
        self.close()
    
    @abstractmethod
    def open(self):
        """
        Open the sandbox session.
        
        This method should create any necessary resources for the sandbox,
        such as temporary directories or containers.
        
        Returns:
            self for method chaining
        """
        pass
    
    @abstractmethod
    def run(self, code: str, language: str = "python") -> ExecutionResult:
        """
        Run code in the sandbox.
        
        Args:
            code: The code to execute
            language: The programming language (default: "python")
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        pass
    
    @abstractmethod
    def close(self, keep_template: bool = False):
        """
        Close the sandbox session.
        
        This method should clean up any resources created by the sandbox,
        such as temporary directories or containers.
        
        Args:
            keep_template: If True, keep the container template (image) for future use
        """
        pass
    
    def is_open(self) -> bool:
        """Check if the session is open."""
        return self._is_open
    
    def _create_temp_dir(self):
        """Create a temporary directory for the session."""
        if self.temp_dir is None:
            self.temp_dir = tempfile.mkdtemp(prefix=f"llm-sandbox-{self.session_id}-")
    
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


class DirectSandboxSession(SandboxSession):
    """
    A sandbox session that executes code directly in a subprocess.
    
    This is less secure than container-based sandboxes but useful for
    development and testing when Docker is not available.
    """
    
    def open(self):
        """Open the sandbox session."""
        self._create_temp_dir()
        self._is_open = True
        return self
    
    def run(self, code: str, language: str = "python") -> ExecutionResult:
        """
        Run code in the sandbox.
        
        Args:
            code: The code to execute
            language: The programming language (currently only "python" is supported)
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")
        
        if language.lower() != "python":
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}. DirectSandboxSession only supports Python."
            )
        
        import subprocess
        import sys
        
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
    
    def close(self, keep_template: bool = False):
        """Close the sandbox session."""
        self._cleanup_temp_dir()
        self._is_open = False

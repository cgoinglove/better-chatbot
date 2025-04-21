"""
Enhanced sandbox session implementation.

This module provides an enhanced sandbox session implementation that supports
file copying, multiple backends, and other advanced features.
"""

import os
import shutil
import tempfile
import time
import uuid
import subprocess
from abc import ABC, abstractmethod
from typing import Optional, Dict, List, Any, Union, Tuple

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult, ResourceUsageInfo
from .language_config import get_language_config, detect_language_from_file, detect_language_from_code
from .resource_monitor import ResourceMonitor, ProcessResourceMonitor, create_resource_monitor


class EnhancedSandboxSession(ABC):
    """
    Base class for enhanced sandbox sessions.

    An enhanced sandbox session manages the lifecycle of a sandbox environment,
    including creation, execution, file copying, and cleanup.
    """

    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new sandbox session.

        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        # Create config from kwargs if not provided
        if config is None:
            config = SandboxConfig()

        # Override config with kwargs
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)

        self.config = config
        self.session_id = str(uuid.uuid4())
        self.temp_dir = None
        self._is_open = False

        # Initialize logging
        self._log(f"Initializing {self.__class__.__name__} with session ID {self.session_id}")

    def __enter__(self):
        """Enter context manager - open the session."""
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager - close the session."""
        self.close(keep_template=self.config.keep_template)

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
    def run(self, code: str, language: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the sandbox.

        Args:
            code: The code to execute
            language: The programming language (default: config.lang)

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

    @abstractmethod
    def copy_to_runtime(self, local_path: str, runtime_path: str) -> bool:
        """
        Copy a file from the host to the sandbox.

        Args:
            local_path: Path to the file on the host
            runtime_path: Path to the file in the sandbox

        Returns:
            True if the file was copied successfully, False otherwise
        """
        pass

    @abstractmethod
    def copy_from_runtime(self, runtime_path: str, local_path: str) -> bool:
        """
        Copy a file from the sandbox to the host.

        Args:
            runtime_path: Path to the file in the sandbox
            local_path: Path to the file on the host

        Returns:
            True if the file was copied successfully, False otherwise
        """
        pass

    @abstractmethod
    def execute_command(self, command: Union[str, List[str]],
                       timeout: Optional[int] = None) -> ExecutionResult:
        """
        Execute a command in the sandbox.

        Args:
            command: The command to execute (string or list of arguments)
            timeout: Timeout in seconds (default: config.timeout_seconds)

        Returns:
            ExecutionResult containing the execution output and status
        """
        pass

    def is_open(self) -> bool:
        """Check if the session is open."""
        return self._is_open

    def _create_temp_dir(self):
        """Create a temporary directory for the session."""
        if self.temp_dir is None:
            self.temp_dir = tempfile.mkdtemp(prefix=f"llm-sandbox-{self.session_id}-")
            self._log(f"Created temporary directory: {self.temp_dir}")

    def _cleanup_temp_dir(self):
        """Clean up the temporary directory."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                self._log(f"Cleaning up temporary directory: {self.temp_dir}")
                shutil.rmtree(self.temp_dir)
                self.temp_dir = None
            except Exception as e:
                self._log(f"Error cleaning up temporary directory: {e}", level="ERROR")

    def _log(self, message: str, level: str = "INFO"):
        """Log a message if verbose logging is enabled."""
        if self.config.verbose:
            print(f"[{level}] [{self.session_id}] {message}")


class DirectEnhancedSession(EnhancedSandboxSession):
    """
    A sandbox session that executes code directly in a subprocess.

    This is less secure than container-based sandboxes but useful for
    development and testing when Docker is not available.
    """

    def open(self):
        """Open the sandbox session."""
        if self._is_open:
            return self

        self._create_temp_dir()
        self._runtime_dir = os.path.join(self.temp_dir, "runtime")
        os.makedirs(self._runtime_dir, exist_ok=True)

        self._is_open = True
        self._log("Direct sandbox session opened")
        return self

    def run(self, code: str, language: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the sandbox.

        Args:
            code: The code to execute
            language: The programming language (default: auto-detect or config.lang)

        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")

        # Try to detect language from code if not specified
        if language is None:
            detected_language = detect_language_from_code(code)
            language = detected_language or self.config.lang
            if detected_language:
                self._log(f"Detected language: {detected_language}")

        # Get language configuration
        lang_config = self._get_language_config(language)
        if not lang_config:
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}"
            )

        # Create a temporary file for the code
        file_extension = lang_config["extension"]
        code_file = os.path.join(self._runtime_dir, f"code.{file_extension}")

        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        # Execute the command
        command = [lang_config["command"]] + lang_config["args"] + [code_file]
        return self.execute_command(command)

    def close(self, keep_template: bool = False):
        """Close the sandbox session."""
        if not self._is_open:
            return

        self._cleanup_temp_dir()
        self._is_open = False
        self._log("Direct sandbox session closed")

    def copy_to_runtime(self, local_path: str, runtime_path: str) -> bool:
        """
        Copy a file from the host to the sandbox.

        Args:
            local_path: Path to the file on the host
            runtime_path: Path to the file in the sandbox

        Returns:
            True if the file was copied successfully, False otherwise
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")

        try:
            # Convert runtime path to absolute path in the runtime directory
            if runtime_path.startswith("/"):
                runtime_path = runtime_path[1:]

            dest_path = os.path.join(self._runtime_dir, runtime_path)

            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)

            # Copy the file
            shutil.copy2(local_path, dest_path)
            self._log(f"Copied {local_path} to {dest_path}")
            return True

        except Exception as e:
            self._log(f"Error copying file to runtime: {e}", level="ERROR")
            return False

    def copy_from_runtime(self, runtime_path: str, local_path: str) -> bool:
        """
        Copy a file from the sandbox to the host.

        Args:
            runtime_path: Path to the file in the sandbox
            local_path: Path to the file on the host

        Returns:
            True if the file was copied successfully, False otherwise
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")

        try:
            # Convert runtime path to absolute path in the runtime directory
            if runtime_path.startswith("/"):
                runtime_path = runtime_path[1:]

            src_path = os.path.join(self._runtime_dir, runtime_path)

            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            # Copy the file
            shutil.copy2(src_path, local_path)
            self._log(f"Copied {src_path} to {local_path}")
            return True

        except Exception as e:
            self._log(f"Error copying file from runtime: {e}", level="ERROR")
            return False

    def execute_command(self, command: Union[str, List[str]],
                       timeout: Optional[int] = None) -> ExecutionResult:
        """
        Execute a command in the sandbox.

        Args:
            command: The command to execute (string or list of arguments)
            timeout: Timeout in seconds (default: config.timeout_seconds)

        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")

        # Use default timeout if not specified
        if timeout is None:
            timeout = self.config.timeout_seconds

        # Convert string command to list
        if isinstance(command, str):
            command = command.split()

        # Start timing execution
        start_time = time.time()
        resource_monitor = None

        try:
            # Execute the command in a subprocess
            self._log(f"Executing command: {' '.join(command)}")

            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=self._runtime_dir
            )

            # Start monitoring resources
            if self.config.verbose:
                resource_monitor = ProcessResourceMonitor(process.pid)
                resource_monitor.start()

            try:
                # Wait for the process to complete with timeout
                stdout, stderr = process.communicate(timeout=timeout)
                exit_code = process.returncode
                success = exit_code == 0

                # Stop resource monitoring
                resource_usage = None
                if resource_monitor:
                    resource_usage = resource_monitor.stop()

                # Calculate execution time
                execution_time_ms = int((time.time() - start_time) * 1000)

                # Combine stdout and stderr for the output
                output = stdout
                if stderr and not success:
                    if output:
                        output += "\n" + stderr
                    else:
                        output = stderr

                # Create result with resource usage
                result = ExecutionResult(
                    success=success,
                    exit_code=exit_code,
                    output=output,
                    stdout=stdout,
                    stderr=stderr
                )

                # Update resource usage
                if resource_usage:
                    result.resource_usage.cpu_percent = resource_usage.cpu_percent
                    result.resource_usage.peak_cpu_percent = resource_usage.peak_cpu_percent
                    result.resource_usage.memory_bytes = resource_usage.memory_bytes
                    result.resource_usage.peak_memory_bytes = resource_usage.peak_memory_bytes
                    result.resource_usage.memory_percent = resource_usage.memory_percent
                    result.resource_usage.disk_read_bytes = resource_usage.disk_read_bytes
                    result.resource_usage.disk_write_bytes = resource_usage.disk_write_bytes
                    result.resource_usage.samples = resource_usage.samples

                # Always update execution time
                result.resource_usage.execution_time_ms = execution_time_ms

                return result

            except subprocess.TimeoutExpired:
                # Kill the process if it times out
                process.kill()
                stdout, stderr = process.communicate()

                # Stop resource monitoring
                if resource_monitor:
                    resource_monitor.stop()

                # Create result for timeout
                result = ExecutionResult(
                    success=False,
                    exit_code=-1,
                    output=f"Execution timed out after {timeout} seconds",
                    stdout=stdout,
                    stderr=stderr,
                    error=f"Timeout after {timeout} seconds"
                )

                # Update execution time
                result.resource_usage.execution_time_ms = int((time.time() - start_time) * 1000)

                return result

        except Exception as e:
            # Handle any other exceptions
            import traceback
            error_msg = str(e)
            tb = traceback.format_exc()

            # Stop resource monitoring
            if resource_monitor:
                resource_monitor.stop()

            # Create result for error
            result = ExecutionResult(
                success=False,
                exit_code=-1,
                output=f"Error executing command: {error_msg}",
                stdout="",
                stderr=tb,
                error=error_msg
            )

            # Update execution time
            result.resource_usage.execution_time_ms = int((time.time() - start_time) * 1000)

            return result

    def _get_language_config(self, language: str) -> Optional[Dict[str, Any]]:
        """
        Get the configuration for a programming language.

        Args:
            language: The programming language

        Returns:
            A dictionary with language configuration, or None if the language is not supported
        """
        # Use the language_config module to get the configuration
        return get_language_config(language)

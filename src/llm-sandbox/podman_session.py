"""
Podman-based enhanced sandbox session implementation.

This module provides a sandbox session implementation that uses Podman
containers for isolation.
"""

import os
import subprocess
import time
import shutil
from typing import Optional, Dict, List, Any, Union

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .enhanced_session import EnhancedSandboxSession


class PodmanEnhancedSession(EnhancedSandboxSession):
    """
    A sandbox session that executes code in Podman containers.
    
    This provides similar isolation to Docker but uses Podman, which can
    run in rootless mode and doesn't require a daemon.
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new Podman sandbox session.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.container_id = None
        
        # Override backend to ensure Podman is used
        self.config.backend = "podman"
    
    def open(self):
        """
        Open the sandbox session.
        
        This creates a Podman container for code execution.
        
        Returns:
            self for method chaining
        """
        if self._is_open:
            return self
        
        self._create_temp_dir()
        
        try:
            # Check if Podman is available
            self._check_podman_available()
            
            # Build or pull the Podman image
            self._prepare_podman_image()
            
            # Create and start the container
            self._create_podman_container()
            
            self._is_open = True
            self._log("Podman sandbox session opened")
            return self
            
        except Exception as e:
            self.close()
            raise RuntimeError(f"Failed to open Podman sandbox session: {str(e)}")
    
    def run(self, code: str, language: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the Podman container.
        
        Args:
            code: The code to execute
            language: The programming language (default: config.lang)
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")
        
        # Use default language if not specified
        if language is None:
            language = self.config.lang
        
        # Map language to file extension and command
        lang_config = self._get_language_config(language)
        if not lang_config:
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}"
            )
        
        # Create a temporary file for the code
        file_extension = lang_config["extension"]
        code_file = os.path.join(self.temp_dir, f"code.{file_extension}")
        container_code_file = f"/workspace/code.{file_extension}"
        
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        
        # Execute the code in the container
        command = lang_config["command"]
        args = lang_config["args"] + [container_code_file]
        
        # Construct the full command
        full_command = [command] + args
        
        return self.execute_command(full_command)
    
    def close(self, keep_template: bool = False):
        """
        Close the sandbox session.
        
        This stops and removes the Podman container.
        
        Args:
            keep_template: If True, keep the Podman image for future use
        """
        if not self._is_open:
            return
        
        # Stop and remove the container
        if self.container_id:
            try:
                self._log(f"Stopping container: {self.container_id}")
                subprocess.run(["podman", "stop", self.container_id], 
                              capture_output=True, check=False)
                
                self._log(f"Removing container: {self.container_id}")
                subprocess.run(["podman", "rm", self.container_id], 
                              capture_output=True, check=False)
            except Exception as e:
                self._log(f"Error stopping/removing Podman container: {e}", level="ERROR")
            
            self.container_id = None
        
        # Remove the Podman image if not keeping the template
        if not keep_template and hasattr(self, "_image_id"):
            try:
                self._log(f"Removing image: {self._image_id}")
                subprocess.run(["podman", "rmi", self._image_id],
                              capture_output=True, check=False)
            except Exception as e:
                self._log(f"Error removing Podman image: {e}", level="ERROR")
        
        # Clean up temporary directory
        self._cleanup_temp_dir()
        
        self._is_open = False
        self._log("Podman sandbox session closed")
    
    def copy_to_runtime(self, local_path: str, runtime_path: str) -> bool:
        """
        Copy a file from the host to the sandbox.
        
        Args:
            local_path: Path to the file on the host
            runtime_path: Path to the file in the sandbox
            
        Returns:
            True if the file was copied successfully, False otherwise
        """
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")
        
        try:
            # Create parent directory in container if it doesn't exist
            parent_dir = os.path.dirname(runtime_path)
            if parent_dir:
                mkdir_cmd = ["podman", "exec", self.container_id, "mkdir", "-p", parent_dir]
                subprocess.run(mkdir_cmd, capture_output=True, check=True)
            
            # Copy the file to the container
            cp_cmd = ["podman", "cp", local_path, f"{self.container_id}:{runtime_path}"]
            result = subprocess.run(cp_cmd, capture_output=True, text=True, check=False)
            
            if result.returncode != 0:
                self._log(f"Error copying file to container: {result.stderr}", level="ERROR")
                return False
            
            self._log(f"Copied {local_path} to container:{runtime_path}")
            return True
            
        except Exception as e:
            self._log(f"Error copying file to container: {e}", level="ERROR")
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
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")
        
        try:
            # Create parent directory on host if it doesn't exist
            parent_dir = os.path.dirname(local_path)
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)
            
            # Copy the file from the container
            cp_cmd = ["podman", "cp", f"{self.container_id}:{runtime_path}", local_path]
            result = subprocess.run(cp_cmd, capture_output=True, text=True, check=False)
            
            if result.returncode != 0:
                self._log(f"Error copying file from container: {result.stderr}", level="ERROR")
                return False
            
            self._log(f"Copied container:{runtime_path} to {local_path}")
            return True
            
        except Exception as e:
            self._log(f"Error copying file from container: {e}", level="ERROR")
            return False
    
    def execute_command(self, command: Union[str, List[str]], 
                       timeout: Optional[int] = None) -> ExecutionResult:
        """
        Execute a command in the Podman container.
        
        Args:
            command: The command to execute (string or list of arguments)
            timeout: Timeout in seconds (default: config.timeout_seconds)
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")
        
        # Use default timeout if not specified
        if timeout is None:
            timeout = self.config.timeout_seconds
        
        # Convert string command to list
        if isinstance(command, str):
            command = command.split()
        
        # Start timing execution
        start_time = time.time()
        
        try:
            # Construct the podman exec command
            podman_cmd = ["podman", "exec", self.container_id] + command
            self._log(f"Executing command in container: {' '.join(podman_cmd)}")
            
            # Execute the command
            process = subprocess.Popen(
                podman_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            try:
                # Wait for the process to complete with timeout
                stdout, stderr = process.communicate(timeout=timeout)
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
                    output=f"Execution timed out after {timeout} seconds",
                    stdout=stdout,
                    stderr=stderr,
                    error=f"Timeout after {timeout} seconds",
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
                output=f"Error executing command: {error_msg}",
                stdout="",
                stderr=tb,
                error=error_msg,
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
    
    def _check_podman_available(self):
        """Check if Podman is available on the system."""
        try:
            result = subprocess.run(
                ["podman", "version"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                raise RuntimeError(
                    "Podman is not available. Make sure Podman is installed and running."
                )
        except FileNotFoundError:
            raise RuntimeError(
                "Podman command not found. Make sure Podman is installed and in your PATH."
            )
    
    def _prepare_podman_image(self):
        """Prepare the Podman image for the sandbox."""
        # If a Dockerfile is provided, build the image
        if self.config.dockerfile and os.path.exists(self.config.dockerfile):
            self._build_podman_image()
        else:
            # Otherwise, pull the image
            self._pull_podman_image()
    
    def _build_podman_image(self):
        """Build a Podman image from a Dockerfile."""
        try:
            # Create a unique tag for the image
            image_tag = f"llm-sandbox-{self.session_id}"
            
            self._log(f"Building Podman image from {self.config.dockerfile} with tag {image_tag}")
            
            # Build the image
            build_cmd = [
                "podman", "build",
                "-t", image_tag,
                "-f", self.config.dockerfile,
                os.path.dirname(self.config.dockerfile)
            ]
            
            result = subprocess.run(
                build_cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            self._image_id = image_tag
            self._log(f"Built Podman image: {image_tag}")
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to build Podman image: {e.stderr}"
            )
    
    def _pull_podman_image(self):
        """Pull the Podman image specified in the configuration."""
        try:
            self._log(f"Pulling Podman image: {self.config.image}")
            
            result = subprocess.run(
                ["podman", "pull", self.config.image],
                capture_output=True,
                text=True,
                check=True
            )
            
            self._image_id = self.config.image
            self._log(f"Pulled Podman image: {self.config.image}")
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to pull Podman image: {e.stderr}"
            )
    
    def _create_podman_container(self):
        """Create and start a Podman container for code execution."""
        # Prepare container creation command
        cmd = [
            "podman", "run", "-d",
            "--name", f"llm-sandbox-{self.session_id}",
            "--memory", self.config.memory_limit,
            "--cpus", str(self.config.cpu_limit),
        ]
        
        # Add network configuration
        if not self.config.network_enabled:
            cmd.append("--network=none")
        
        # Add read-only flag if file writes are not allowed
        if not self.config.allow_file_writes:
            cmd.append("--read-only")
        
        # Add environment variables
        for key, value in self.config.env_vars.items():
            cmd.extend(["-e", f"{key}={value}"])
        
        # Add volume mounts
        cmd.extend(["-v", f"{self.temp_dir}:/workspace"])
        for volume in self.config.volumes:
            cmd.extend(["-v", volume])
        
        # Add extra arguments
        cmd.extend(self.config.extra_args)
        
        # Add the image
        cmd.append(self._image_id)
        
        # Add the entrypoint command - keep container running
        cmd.extend(["tail", "-f", "/dev/null"])
        
        # Filter out empty strings from the command
        cmd = [arg for arg in cmd if arg]
        
        # Create and start the container
        try:
            self._log(f"Creating Podman container with command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Get the container ID
            self.container_id = result.stdout.strip()
            self._log(f"Created Podman container: {self.container_id}")
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to create Podman container: {e.stderr}"
            )
    
    def _get_language_config(self, language: str) -> Optional[Dict[str, Any]]:
        """
        Get the configuration for a programming language.
        
        Args:
            language: The programming language
            
        Returns:
            A dictionary with language configuration, or None if the language is not supported
        """
        # Map of supported languages to their configurations
        language_configs = {
            "python": {
                "extension": "py",
                "command": "python",
                "args": []
            },
            "javascript": {
                "extension": "js",
                "command": "node",
                "args": []
            },
            "java": {
                "extension": "java",
                "command": "java",
                "args": []
            },
            "cpp": {
                "extension": "cpp",
                "command": "g++",
                "args": ["-o", "/tmp/program", "/workspace/code.cpp", "&&", "/tmp/program"]
            },
            "go": {
                "extension": "go",
                "command": "go",
                "args": ["run"]
            },
            "ruby": {
                "extension": "rb",
                "command": "ruby",
                "args": []
            }
        }
        
        return language_configs.get(language.lower())

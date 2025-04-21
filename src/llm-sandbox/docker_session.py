"""
Docker-based sandbox session implementation.

This module provides a sandbox session implementation that uses Docker
containers for isolation.
"""

import os
import subprocess
import time
from typing import Optional, Dict, List, Any

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .sandbox_session import SandboxSession


class DockerSandboxSession(SandboxSession):
    """
    A sandbox session that executes code in Docker containers.
    
    This provides better isolation than the direct sandbox but requires
    Docker to be installed and running on the host system.
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None):
        """
        Initialize a new Docker sandbox session.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
        """
        super().__init__(config)
        self.container_id = None
        
        # Override container type to ensure Docker is used
        self.config.container_type = "docker"
    
    def open(self):
        """
        Open the sandbox session.
        
        This creates a Docker container for code execution.
        
        Returns:
            self for method chaining
        """
        if self._is_open:
            return self
        
        self._create_temp_dir()
        
        try:
            # Check if Docker is available
            self._check_docker_available()
            
            # Pull the Docker image
            self._pull_docker_image()
            
            # Create and start the container
            self._create_docker_container()
            
            self._is_open = True
            return self
            
        except Exception as e:
            self.close()
            raise RuntimeError(f"Failed to open Docker sandbox session: {str(e)}")
    
    def run(self, code: str, language: str = "python") -> ExecutionResult:
        """
        Run code in the Docker container.
        
        Args:
            code: The code to execute
            language: The programming language
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")
        
        # Map language to file extension and command
        language_config = self._get_language_config(language)
        if not language_config:
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}"
            )
        
        # Create a temporary file for the code
        file_extension = language_config["extension"]
        code_file = os.path.join(self.temp_dir, f"code.{file_extension}")
        container_code_file = f"/workspace/code.{file_extension}"
        
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        
        # Start timing execution
        start_time = time.time()
        
        try:
            # Execute the code in the container
            command = language_config["command"]
            args = language_config["args"] + [container_code_file]
            
            # Construct the full command
            full_command = [command] + args
            exec_command = ["docker", "exec", self.container_id] + full_command
            
            # Execute the command
            process = subprocess.Popen(
                exec_command,
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
        """
        Close the sandbox session.
        
        This stops and removes the Docker container.
        
        Args:
            keep_template: If True, keep the Docker image for future use
        """
        # Stop and remove the container
        if self.container_id:
            try:
                subprocess.run(["docker", "stop", self.container_id], 
                              capture_output=True, check=False)
                subprocess.run(["docker", "rm", self.container_id], 
                              capture_output=True, check=False)
            except Exception as e:
                print(f"Error stopping/removing Docker container: {e}")
            
            self.container_id = None
        
        # Remove the Docker image if not keeping the template
        if not keep_template:
            try:
                subprocess.run(["docker", "rmi", self.config.base_image],
                              capture_output=True, check=False)
            except Exception as e:
                print(f"Error removing Docker image: {e}")
        
        # Clean up temporary directory
        self._cleanup_temp_dir()
        
        self._is_open = False
    
    def _check_docker_available(self):
        """Check if Docker is available on the system."""
        try:
            result = subprocess.run(
                ["docker", "version"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                raise RuntimeError(
                    "Docker is not available. Make sure Docker is installed and running."
                )
        except FileNotFoundError:
            raise RuntimeError(
                "Docker command not found. Make sure Docker is installed and in your PATH."
            )
    
    def _pull_docker_image(self):
        """Pull the Docker image specified in the configuration."""
        try:
            subprocess.run(
                ["docker", "pull", self.config.base_image],
                capture_output=True,
                check=True
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to pull Docker image: {e.stderr}"
            )
    
    def _create_docker_container(self):
        """Create and start a Docker container for code execution."""
        # Prepare container creation command
        cmd = [
            "docker", "run", "-d",
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
        cmd.append(self.config.base_image)
        
        # Add the entrypoint command - keep container running
        cmd.extend(["tail", "-f", "/dev/null"])
        
        # Filter out empty strings from the command
        cmd = [arg for arg in cmd if arg]
        
        # Create and start the container
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Get the container ID
            self.container_id = result.stdout.strip()
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to create Docker container: {e.stderr}"
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

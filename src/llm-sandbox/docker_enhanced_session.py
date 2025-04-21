"""
Docker-based enhanced sandbox session implementation.

This module provides a sandbox session implementation that uses Docker
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
from .resource_monitor import DockerResourceMonitor
from .security_profiles import create_default_security_enhancer


class DockerEnhancedSession(EnhancedSandboxSession):
    """
    A sandbox session that executes code in Docker containers.

    This provides better isolation than the direct sandbox but requires
    Docker to be installed and running on the host system.
    """

    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new Docker sandbox session.

        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.container_id = None

        # Override backend to ensure Docker is used
        self.config.backend = "docker"

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

            # Build or pull the Docker image
            self._prepare_docker_image()

            # Create and start the container
            self._create_docker_container()

            self._is_open = True
            self._log("Docker sandbox session opened")
            return self

        except Exception as e:
            self.close()
            raise RuntimeError(f"Failed to open Docker sandbox session: {str(e)}")

    def run(self, code: str, language: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the Docker container.

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

        This stops and removes the Docker container.

        Args:
            keep_template: If True, keep the Docker image for future use
        """
        if not self._is_open:
            return

        # Stop and remove the container
        if self.container_id:
            try:
                self._log(f"Stopping container: {self.container_id}")
                subprocess.run(["docker", "stop", self.container_id],
                              capture_output=True, check=False)

                self._log(f"Removing container: {self.container_id}")
                subprocess.run(["docker", "rm", self.container_id],
                              capture_output=True, check=False)
            except Exception as e:
                self._log(f"Error stopping/removing Docker container: {e}", level="ERROR")

            self.container_id = None

        # Remove the Docker image if not keeping the template
        if not keep_template and hasattr(self, "_image_id"):
            try:
                self._log(f"Removing image: {self._image_id}")
                subprocess.run(["docker", "rmi", self._image_id],
                              capture_output=True, check=False)
            except Exception as e:
                self._log(f"Error removing Docker image: {e}", level="ERROR")

        # Clean up temporary directory
        self._cleanup_temp_dir()

        self._is_open = False
        self._log("Docker sandbox session closed")

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
                mkdir_cmd = ["docker", "exec", self.container_id, "mkdir", "-p", parent_dir]
                subprocess.run(mkdir_cmd, capture_output=True, check=True)

            # Copy the file to the container
            cp_cmd = ["docker", "cp", local_path, f"{self.container_id}:{runtime_path}"]
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
            cp_cmd = ["docker", "cp", f"{self.container_id}:{runtime_path}", local_path]
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
        Execute a command in the Docker container.

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
        resource_monitor = None

        try:
            # Construct the docker exec command
            docker_cmd = ["docker", "exec", self.container_id] + command
            self._log(f"Executing command in container: {' '.join(docker_cmd)}")

            # Start resource monitoring
            if self.config.verbose:
                resource_monitor = DockerResourceMonitor(self.container_id)
                resource_monitor.start()

            # Execute the command
            process = subprocess.Popen(
                docker_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

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

    def _prepare_docker_image(self):
        """Prepare the Docker image for the sandbox."""
        # If a Dockerfile is provided, build the image
        if self.config.dockerfile and os.path.exists(self.config.dockerfile):
            self._build_docker_image()
        else:
            # Otherwise, pull the image
            self._pull_docker_image()

    def _build_docker_image(self):
        """Build a Docker image from a Dockerfile."""
        try:
            # Create a unique tag for the image
            image_tag = f"llm-sandbox-{self.session_id}"

            self._log(f"Building Docker image from {self.config.dockerfile} with tag {image_tag}")

            # Build the image
            build_cmd = [
                "docker", "build",
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
            self._log(f"Built Docker image: {image_tag}")

        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to build Docker image: {e.stderr}"
            )

    def _pull_docker_image(self):
        """Pull the Docker image specified in the configuration."""
        try:
            self._log(f"Pulling Docker image: {self.config.image}")

            result = subprocess.run(
                ["docker", "pull", self.config.image],
                capture_output=True,
                text=True,
                check=True
            )

            self._image_id = self.config.image
            self._log(f"Pulled Docker image: {self.config.image}")

        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Failed to pull Docker image: {e.stderr}"
            )

    def _create_docker_container(self):
        """Create and start a Docker container for code execution."""
        # Create security enhancer
        security_enhancer = create_default_security_enhancer(
            cpu_limit=self.config.cpu_limit,
            memory_limit=self.config.memory_limit,
            network_enabled=self.config.network_enabled,
            seccomp_profile="default"
        )

        # Prepare container creation command
        cmd = [
            "docker", "run", "-d",
            "--name", f"llm-sandbox-{self.session_id}",
        ]

        # Add security arguments
        cmd.extend(security_enhancer.get_docker_args())

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
            self._log(f"Creating Docker container with command: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            # Get the container ID
            self.container_id = result.stdout.strip()
            self._log(f"Created Docker container: {self.container_id}")

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

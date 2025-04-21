import os
import tempfile
import uuid
from typing import Dict, List, Optional, Union

from .config import SandboxConfig
from .exceptions import SandboxExecutionError, SandboxConfigurationError
from .results import ExecutionResult


class SandboxSession:
    """
    Manages the lifecycle of a sandbox environment.
    
    The SandboxSession class handles creating, using, and destroying Docker 
    containers in which LLM-generated code is executed.
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None):
        """
        Initialize a new sandbox session.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
        """
        self.config = config or SandboxConfig()
        self.session_id = str(uuid.uuid4())
        self.container_id = None
        self.temp_dir = None
        self._is_open = False
    
    def __enter__(self):
        """Enter context manager - open the session."""
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager - close the session."""
        self.close()
    
    def open(self):
        """
        Open the sandbox session by creating and starting the container.
        
        This method:
        1. Creates a temporary directory for files
        2. Builds or pulls the required Docker image
        3. Creates and starts a new container
        
        Raises:
            SandboxConfigurationError: If there's an issue with the configuration
            SandboxExecutionError: If container creation fails
        """
        if self._is_open:
            return
        
        try:
            # Create temporary directory for files
            self.temp_dir = tempfile.mkdtemp(prefix=f"llm-sandbox-{self.session_id}-")
            
            # Create and start container based on container_type
            if self.config.container_type == "docker":
                self._setup_docker_container()
            elif self.config.container_type == "kubernetes":
                self._setup_kubernetes_pod()
            elif self.config.container_type == "podman":
                self._setup_podman_container()
            else:
                # This should never happen due to validation in SandboxConfig
                raise SandboxConfigurationError(f"Unsupported container type: {self.config.container_type}")
            
            self._is_open = True
        except Exception as e:
            self.close()  # Clean up any resources if setup fails
            raise SandboxExecutionError(f"Failed to open sandbox session: {str(e)}")
    
    def close(self):
        """
        Close the sandbox session, cleaning up all resources.
        
        This method:
        1. Stops and removes the container
        2. Deletes the temporary directory
        """
        # Clean up container based on container_type
        if self.container_id:
            try:
                if self.config.container_type == "docker":
                    self._cleanup_docker_container()
                elif self.config.container_type == "kubernetes":
                    self._cleanup_kubernetes_pod()
                elif self.config.container_type == "podman":
                    self._cleanup_podman_container()
            except Exception as e:
                # Log but don't propagate errors during cleanup
                print(f"Error during sandbox cleanup: {str(e)}")
            
            self.container_id = None
        
        # Remove temporary directory
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                import shutil
                shutil.rmtree(self.temp_dir)
            except Exception as e:
                # Log but don't propagate errors during cleanup
                print(f"Error cleaning up temporary directory: {str(e)}")
            
            self.temp_dir = None
        
        self._is_open = False
    
    def run(self, code: str) -> ExecutionResult:
        """
        Execute the provided code in the sandbox environment.
        
        Args:
            code: The Python code to execute
            
        Returns:
            ExecutionResult containing execution output and status
            
        Raises:
            SandboxExecutionError: If execution fails
        """
        if not self._is_open:
            self.open()
        
        try:
            # Write code to a temporary file
            code_file = os.path.join(self.temp_dir, "code.py")
            with open(code_file, "w", encoding="utf-8") as f:
                f.write(code)
            
            # Execute the code in the container
            if self.config.container_type == "docker":
                return self._run_in_docker(code_file)
            elif self.config.container_type == "kubernetes":
                return self._run_in_kubernetes(code_file)
            elif self.config.container_type == "podman":
                return self._run_in_podman(code_file)
            else:
                raise SandboxConfigurationError(f"Unsupported container type: {self.config.container_type}")
        except Exception as e:
            error_msg = f"Error executing code in sandbox: {str(e)}"
            return ExecutionResult(
                success=False,
                exit_code=-1,
                output=error_msg,
                stdout="",
                stderr=error_msg,
                error=str(e)
            )
    
    def _setup_docker_container(self):
        """Set up a Docker container for the sandbox."""
        import subprocess
        import json
        
        # Pull or build the Docker image if needed
        subprocess.run(["docker", "pull", self.config.base_image], check=True)
        
        # Prepare container creation command
        cmd = [
            "docker", "run", "-d",
            "--name", f"llm-sandbox-{self.session_id}",
            "--memory", self.config.memory_limit,
            "--cpus", str(self.config.cpu_limit),
            "--network", "none" if not self.config.network_enabled else "bridge",
            "--read-only" if not self.config.allow_file_writes else "",
        ]
        
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
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise SandboxExecutionError(
                f"Failed to create Docker container: {result.stderr}",
                result.returncode,
                result.stdout + result.stderr
            )
        
        # Get the container ID
        self.container_id = result.stdout.strip()
    
    def _cleanup_docker_container(self):
        """Clean up the Docker container."""
        import subprocess
        
        if self.container_id:
            # Stop the container
            subprocess.run(["docker", "stop", self.container_id], 
                          capture_output=True)
            
            # Remove the container
            subprocess.run(["docker", "rm", self.container_id], 
                          capture_output=True)
    
    def _run_in_docker(self, code_file: str) -> ExecutionResult:
        """Execute code in the Docker container."""
        import subprocess
        import time
        
        # Start execution time tracking
        start_time = time.time()
        
        # Prepare the execution command
        cmd = [
            "docker", "exec", 
            self.container_id,
            "python", "/workspace/code.py"
        ]
        
        # Run the command with a timeout
        try:
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=self.config.timeout_seconds
            )
            success = result.returncode == 0
            
            # Calculate execution time
            execution_time = time.time() - start_time
            metrics = {"execution_time": execution_time}
            
            return ExecutionResult(
                success=success,
                exit_code=result.returncode,
                output=result.stdout + result.stderr,
                stdout=result.stdout,
                stderr=result.stderr,
                metrics=metrics
            )
        except subprocess.TimeoutExpired as e:
            # Handle timeout case
            error_msg = f"Execution timed out after {self.config.timeout_seconds} seconds"
            return ExecutionResult(
                success=False,
                exit_code=-1,
                output=error_msg,
                stdout="",
                stderr=error_msg,
                error=error_msg
            )
    
    # Placeholder methods for Kubernetes and Podman
    def _setup_kubernetes_pod(self):
        """Set up a Kubernetes pod for the sandbox."""
        raise NotImplementedError("Kubernetes support not implemented yet")
    
    def _cleanup_kubernetes_pod(self):
        """Clean up the Kubernetes pod."""
        raise NotImplementedError("Kubernetes support not implemented yet")
    
    def _run_in_kubernetes(self, code_file: str) -> ExecutionResult:
        """Execute code in the Kubernetes pod."""
        raise NotImplementedError("Kubernetes support not implemented yet")
    
    def _setup_podman_container(self):
        """Set up a Podman container for the sandbox."""
        raise NotImplementedError("Podman support not implemented yet")
    
    def _cleanup_podman_container(self):
        """Clean up the Podman container."""
        raise NotImplementedError("Podman support not implemented yet")
    
    def _run_in_podman(self, code_file: str) -> ExecutionResult:
        """Execute code in the Podman container."""
        raise NotImplementedError("Podman support not implemented yet") 
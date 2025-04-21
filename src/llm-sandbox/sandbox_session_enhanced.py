"""
Enhanced SandboxSession implementation.

This module provides the main SandboxSession class that supports different
backends (direct, Docker, Kubernetes, Podman) and a structured lifecycle.
"""

from typing import Optional, Dict, List, Any, Union

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .enhanced_session import EnhancedSandboxSession, DirectEnhancedSession
from .docker_enhanced_session import DockerEnhancedSession


class SandboxSession:
    """
    Enhanced sandbox session for code execution.
    
    This class provides a high-level interface for executing code in
    different types of sandbox environments (direct, Docker, Kubernetes, Podman).
    """
    
    def __init__(self, **kwargs):
        """
        Initialize a new sandbox session.
        
        Args:
            **kwargs: Configuration options for the sandbox.
                      See SandboxConfig for available options.
        """
        # Create config from kwargs
        config = SandboxConfig()
        
        # Override config with kwargs
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        self.config = config
        self.session = None
    
    def __enter__(self):
        """Enter context manager - open the session."""
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager - close the session."""
        self.close(keep_template=self.config.keep_template)
    
    def open(self):
        """
        Open a sandbox session.
        
        Returns:
            self for method chaining
        """
        if self.session is None:
            self.session = self._create_session()
            self.session.open()
        return self
    
    def run(self, code: str, language: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the sandbox.
        
        Args:
            code: The code to execute
            language: The programming language (default: config.lang)
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if self.session is None:
            self.open()
        
        return self.session.run(code, language or self.config.lang)
    
    def close(self, keep_template: bool = False):
        """
        Close the sandbox session.
        
        Args:
            keep_template: If True, keep the container template (image) for future use
        """
        if self.session is not None:
            self.session.close(keep_template)
            self.session = None
    
    def copy_to_runtime(self, local_path: str, runtime_path: str) -> bool:
        """
        Copy a file from the host to the sandbox.
        
        Args:
            local_path: Path to the file on the host
            runtime_path: Path to the file in the sandbox
            
        Returns:
            True if the file was copied successfully, False otherwise
        """
        if self.session is None:
            self.open()
        
        return self.session.copy_to_runtime(local_path, runtime_path)
    
    def copy_from_runtime(self, runtime_path: str, local_path: str) -> bool:
        """
        Copy a file from the sandbox to the host.
        
        Args:
            runtime_path: Path to the file in the sandbox
            local_path: Path to the file on the host
            
        Returns:
            True if the file was copied successfully, False otherwise
        """
        if self.session is None:
            self.open()
        
        return self.session.copy_from_runtime(runtime_path, local_path)
    
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
        if self.session is None:
            self.open()
        
        return self.session.execute_command(command, timeout)
    
    def _create_session(self) -> EnhancedSandboxSession:
        """
        Create a new sandbox session based on the configuration.
        
        Returns:
            A new EnhancedSandboxSession instance
        """
        if self.config.backend == "docker":
            try:
                return DockerEnhancedSession(self.config)
            except ImportError:
                if self.config.verbose:
                    print("Docker backend not available, falling back to direct execution")
                return DirectEnhancedSession(self.config)
        elif self.config.backend == "kubernetes":
            try:
                # Import here to avoid dependency if not used
                from .kubernetes_session import KubernetesEnhancedSession
                return KubernetesEnhancedSession(self.config)
            except ImportError:
                if self.config.verbose:
                    print("Kubernetes backend not available, falling back to direct execution")
                return DirectEnhancedSession(self.config)
        elif self.config.backend == "podman":
            try:
                # Import here to avoid dependency if not used
                from .podman_session import PodmanEnhancedSession
                return PodmanEnhancedSession(self.config)
            except ImportError:
                if self.config.verbose:
                    print("Podman backend not available, falling back to direct execution")
                return DirectEnhancedSession(self.config)
        else:
            return DirectEnhancedSession(self.config)

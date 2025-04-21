"""
Enhanced sandbox for code execution.

This module provides an enhanced sandbox implementation that supports
different session types (direct, Docker) and a structured lifecycle.
"""

from typing import Optional, Union

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .sandbox_session import SandboxSession, DirectSandboxSession
from .docker_session import DockerSandboxSession


class EnhancedSandbox:
    """
    Enhanced sandbox for code execution.
    
    This class provides a high-level interface for executing code in
    different types of sandbox environments (direct, Docker).
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None, container_type: Optional[str] = None):
        """
        Initialize a new sandbox.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
            container_type: Override the container type. This is a shorthand for 
                            setting config.container_type.
        """
        self.config = config or SandboxConfig()
        
        # Override container_type if provided
        if container_type:
            self.config.container_type = container_type
            self.config._validate_container_type()
        
        self.session = None
    
    def open(self) -> 'EnhancedSandbox':
        """
        Open a sandbox session.
        
        Returns:
            self for method chaining
        """
        if self.session is None:
            self.session = self._create_session()
            self.session.open()
        return self
    
    def run(self, code: str, language: str = "python") -> ExecutionResult:
        """
        Run code in the sandbox.
        
        Args:
            code: The code to execute
            language: The programming language
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if self.session is None:
            self.open()
        
        return self.session.run(code, language)
    
    def close(self, keep_template: bool = False):
        """
        Close the sandbox session.
        
        Args:
            keep_template: If True, keep the container template (image) for future use
        """
        if self.session is not None:
            self.session.close(keep_template)
            self.session = None
    
    def execute(self, code: str, language: str = "python") -> ExecutionResult:
        """
        One-shot execution (for backward compatibility).
        
        This method creates a new sandbox session, executes the code, and then
        cleans up the session automatically.
        
        Args:
            code: The code to execute
            language: The programming language
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        try:
            self.open()
            return self.run(code, language)
        finally:
            self.close()
    
    def __enter__(self) -> 'EnhancedSandbox':
        """Support for context manager."""
        return self.open()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Support for context manager."""
        self.close()
    
    def _create_session(self) -> SandboxSession:
        """
        Create a new sandbox session based on the configuration.
        
        Returns:
            A new SandboxSession instance
        """
        if self.config.container_type == "docker":
            return DockerSandboxSession(self.config)
        else:
            return DirectSandboxSession(self.config)

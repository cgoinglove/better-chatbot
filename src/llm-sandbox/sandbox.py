from typing import Dict, Optional

from .config import SandboxConfig
from .exceptions import SandboxExecutionError
from .results import ExecutionResult
from .session import SandboxSession


class Sandbox:
    """
    Main interface for executing code in a sandbox environment.
    
    The Sandbox class provides a simplified API for executing code in isolated
    containers, managing the container lifecycle automatically.
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
    
    def execute(self, code: str) -> ExecutionResult:
        """
        Execute code in a sandbox environment.
        
        This method creates a new sandbox session, executes the code, and then
        cleans up the session automatically.
        
        Args:
            code: The Python code to execute
            
        Returns:
            ExecutionResult containing execution output and status
            
        Raises:
            SandboxExecutionError: If execution fails
        """
        # Create and use a session with context manager to ensure cleanup
        with SandboxSession(self.config) as session:
            return session.run(code)
    
    def create_session(self) -> SandboxSession:
        """
        Create a new sandbox session for multiple code executions.
        
        Returns:
            A new SandboxSession instance
        """
        return SandboxSession(self.config) 
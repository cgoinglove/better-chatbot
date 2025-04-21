from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class ExecutionResult:
    """Represents the result of code execution in a sandbox."""
    
    # Whether the execution completed successfully
    success: bool
    
    # The exit code from the execution (0 for success)
    exit_code: int
    
    # The combined output (stdout and stderr)
    output: str
    
    # The stdout captured during execution
    stdout: str
    
    # The stderr captured during execution
    stderr: str
    
    # Execution metrics (if available)
    metrics: Optional[Dict[str, float]] = None
    
    # Execution error details (if any)
    error: Optional[str] = None
    
    @property
    def has_error(self) -> bool:
        """Return True if this result represents an error."""
        return not self.success or self.exit_code != 0 or self.error is not None
    
    def __str__(self) -> str:
        """String representation of the execution result."""
        status = "SUCCESS" if not self.has_error else "ERROR"
        return f"ExecutionResult[{status}] (exit_code={self.exit_code})" 
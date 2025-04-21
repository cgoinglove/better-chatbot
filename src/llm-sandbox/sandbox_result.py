"""
Result classes for sandbox execution.

This module provides classes for representing the results of code execution
in sandbox environments.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class ResourceUsageInfo:
    """Resource usage information for code execution."""

    # CPU usage
    cpu_percent: float = 0.0
    peak_cpu_percent: float = 0.0

    # Memory usage
    memory_bytes: int = 0
    peak_memory_bytes: int = 0
    memory_percent: float = 0.0

    # Disk usage
    disk_read_bytes: int = 0
    disk_write_bytes: int = 0

    # Execution time
    execution_time_ms: int = 0

    # Monitoring information
    samples: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert resource usage to a dictionary."""
        return {
            "cpu_percent": self.cpu_percent,
            "peak_cpu_percent": self.peak_cpu_percent,
            "memory_bytes": self.memory_bytes,
            "memory_mb": self.memory_bytes / (1024 * 1024),
            "peak_memory_bytes": self.peak_memory_bytes,
            "peak_memory_mb": self.peak_memory_bytes / (1024 * 1024),
            "memory_percent": self.memory_percent,
            "disk_read_bytes": self.disk_read_bytes,
            "disk_write_bytes": self.disk_write_bytes,
            "execution_time_ms": self.execution_time_ms,
            "samples": self.samples
        }

    def __str__(self) -> str:
        """Return a string representation of resource usage."""
        return (
            f"CPU: {self.cpu_percent:.1f}% (peak: {self.peak_cpu_percent:.1f}%), "
            f"Memory: {self.memory_bytes / (1024 * 1024):.1f} MB "
            f"(peak: {self.peak_memory_bytes / (1024 * 1024):.1f} MB), "
            f"Disk: {self.disk_read_bytes / 1024:.1f} KB read, "
            f"{self.disk_write_bytes / 1024:.1f} KB write, "
            f"Time: {self.execution_time_ms / 1000:.2f} s"
        )


@dataclass
class ExecutionResult:
    """Result of code execution in a sandbox environment."""

    # Execution status
    success: bool
    exit_code: int

    # Output streams
    output: str = ""  # Combined output for simple use
    stdout: str = ""  # Standard output
    stderr: str = ""  # Standard error

    # Error information
    error: Optional[str] = None  # Error message if execution failed

    # Resource usage
    resource_usage: ResourceUsageInfo = field(default_factory=ResourceUsageInfo)

    # Legacy performance metrics (for backward compatibility)
    @property
    def execution_time_ms(self) -> Optional[int]:
        return self.resource_usage.execution_time_ms

    @property
    def memory_usage_kb(self) -> Optional[int]:
        return self.resource_usage.memory_bytes // 1024 if self.resource_usage.memory_bytes > 0 else None

    def to_dict(self) -> Dict[str, Any]:
        """Convert execution result to a dictionary."""
        return {
            "success": self.success,
            "exit_code": self.exit_code,
            "output": self.output,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "error": self.error,
            "resource_usage": self.resource_usage.to_dict() if self.resource_usage else None
        }

    def __str__(self) -> str:
        """Return a string representation of the execution result."""
        result = []
        result.append(f"Success: {self.success}")
        result.append(f"Exit code: {self.exit_code}")

        # Add resource usage information
        if self.resource_usage and self.resource_usage.execution_time_ms > 0:
            result.append(f"Resource usage: {self.resource_usage}")

        if self.output:
            result.append(f"\nOutput:\n{self.output}")

        if self.error:
            result.append(f"\nError:\n{self.error}")

        return "\n".join(result)

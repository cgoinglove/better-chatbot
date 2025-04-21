"""
Configuration for sandbox environments.

This module provides classes for configuring sandbox environments,
including resource limits, container settings, and security options.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union, Any


@dataclass
class SandboxConfig:
    """Configuration for a sandbox environment."""

    # Resource limits
    memory_limit: str = "256m"
    cpu_limit: float = 1.0
    timeout_seconds: int = 30

    # Container configuration
    image: str = "python:3.9-slim"  # Docker image to use
    dockerfile: Optional[str] = None  # Path to Dockerfile for custom image
    backend: str = "direct"  # Options: "direct", "docker", "kubernetes", "podman"
    namespace: Optional[str] = None  # Kubernetes namespace
    lang: str = "python"  # Default language for code execution
    keep_template: bool = False  # Whether to keep the container image after session closes

    # Security settings
    network_enabled: bool = False
    allow_file_writes: bool = True  # Allow writing files in the sandbox

    # Environment variables to pass to the container
    env_vars: Dict[str, str] = field(default_factory=dict)

    # Additional volume mounts (for Docker/Podman)
    volumes: List[str] = field(default_factory=list)

    # Additional arguments for container creation
    extra_args: List[str] = field(default_factory=list)

    # Kubernetes-specific configuration
    pod_manifest: Optional[Dict[str, Any]] = None

    # Client configuration
    client: Optional[Any] = None  # Docker/Kubernetes client

    # Debugging
    verbose: bool = False  # Enable verbose logging

    def __post_init__(self):
        """Validate configuration after initialization."""
        self._validate_backend()
        self._validate_memory_limit()
        self._validate_cpu_limit()
        self._validate_timeout()

    def _validate_backend(self):
        """Validate the backend type."""
        valid_backends = ["direct", "docker", "kubernetes", "podman"]
        if self.backend not in valid_backends:
            raise ValueError(
                f"Invalid backend: {self.backend}. "
                f"Valid backends are: {', '.join(valid_backends)}"
            )

    def _validate_memory_limit(self):
        """Validate the memory limit format."""
        if not isinstance(self.memory_limit, str):
            raise ValueError("Memory limit must be a string (e.g., '256m', '1g')")

        # Check format: number followed by unit (b, k, m, g)
        import re
        if not re.match(r'^\d+[bkmg]?$', self.memory_limit.lower()):
            raise ValueError(
                f"Invalid memory limit format: {self.memory_limit}. "
                "Expected format: number followed by optional unit (b, k, m, g)"
            )

    def _validate_cpu_limit(self):
        """Validate the CPU limit."""
        if not isinstance(self.cpu_limit, (int, float)):
            raise ValueError("CPU limit must be a number")

        if self.cpu_limit <= 0:
            raise ValueError("CPU limit must be positive")

    def _validate_timeout(self):
        """Validate the timeout."""
        if not isinstance(self.timeout_seconds, int):
            raise ValueError("Timeout must be an integer")

        if self.timeout_seconds <= 0:
            raise ValueError("Timeout must be positive")

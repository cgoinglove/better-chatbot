from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union


@dataclass
class SandboxConfig:
    """Configuration for a sandbox environment."""
    
    # Resource limits
    memory_limit: str = "256m"
    cpu_limit: float = 1.0
    timeout_seconds: int = 30
    
    # Container configuration
    base_image: str = "python:3.9-slim"
    container_type: str = "docker"
    namespace: Optional[str] = None
    
    # Security settings
    network_enabled: bool = False
    allow_file_writes: bool = False
    
    # Environment variables to pass to the container
    env_vars: Dict[str, str] = field(default_factory=dict)
    
    # Volumes to mount (host_path:container_path)
    volumes: List[str] = field(default_factory=list)
    
    # Additional Docker run arguments
    extra_args: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        self._validate_container_type()
        self._validate_resource_limits()
    
    def _validate_container_type(self):
        """Ensure container_type is one of the supported types."""
        valid_types = ["docker", "kubernetes", "podman"]
        if self.container_type not in valid_types:
            raise ValueError(
                f"Invalid container_type: {self.container_type}. "
                f"Must be one of: {', '.join(valid_types)}"
            )
    
    def _validate_resource_limits(self):
        """Validate resource limit values."""
        if self.cpu_limit <= 0:
            raise ValueError(f"CPU limit must be positive, got: {self.cpu_limit}")
        
        if self.timeout_seconds <= 0:
            raise ValueError(
                f"Timeout must be positive, got: {self.timeout_seconds}"
            )
        
        # Validate memory format (e.g., "256m", "1g")
        if not isinstance(self.memory_limit, str):
            raise ValueError(
                f"Memory limit must be a string (e.g., '256m'), got: {self.memory_limit}"
            )
        
        # Simple regex-like check for memory format
        memory_value = self.memory_limit[:-1]
        memory_unit = self.memory_limit[-1].lower()
        
        try:
            float(memory_value)
        except ValueError:
            raise ValueError(
                f"Invalid memory limit format: {self.memory_limit}. "
                "Expected format like '256m' or '1g'."
            )
        
        if memory_unit not in ["k", "m", "g"]:
            raise ValueError(
                f"Invalid memory unit: {memory_unit}. Must be k, m, or g."
            ) 
# Import original classes for backward compatibility
from .sandbox import Sandbox
from .session import SandboxSession as OriginalSandboxSession
from .exceptions import SandboxExecutionError

# Import enhanced sandbox classes
from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .direct_sandbox import DirectSandbox
from .language_config import get_language_config

# Import language detection
from .language_detection import (
    detect_language_from_code, detect_language_from_file, detect_language_from_project,
    detect_language_from_content_type, get_language_info, list_supported_languages
)

# Import error handling classes
from .error_handling import (
    SandboxError, ExecutionError, ConfigurationError, ResourceError, SecurityError,
    ErrorAnalyzer, StackTraceAnalyzer, Debugger, create_debugger
)

# Import security modules
from .security_profiles import (
    SecurityProfile, ResourceLimits, SeccompProfile, NetworkIsolation,
    SecurityEnhancer, create_default_security_enhancer
)
from .security_quotas import (
    ResourceQuota, CPUQuota, MemoryQuota, DiskQuota, TimeQuota, ProcessQuota,
    NetworkQuota, FileQuota, ResourceQuotaManager, ResourceQuotaProfile,
    ProcessLimiter, create_default_resource_quotas
)
from .security_advanced import (
    SystemCallFilter, CapabilityRestriction, NamespaceIsolation,
    PrivilegeRestriction, ReadOnlyFilesystem, create_default_security_profiles
)

# Import new enhanced session classes
from .sandbox_session_enhanced import SandboxSession
from .enhanced_session import EnhancedSandboxSession, DirectEnhancedSession
from .docker_enhanced_session import DockerEnhancedSession
from .kubernetes_session import KubernetesEnhancedSession
from .podman_session import PodmanEnhancedSession

# Import interactive session classes
from .interactive_session import (
    InteractiveSession, InteractiveDockerSession, InteractiveKubernetesSession,
    InteractiveEnhancedSession, InteractiveDockerEnhancedSession, InteractiveKubernetesEnhancedSession
)

# Import enhanced interactive session classes
from .terminal_emulation import (
    TerminalState, TerminalEmulator, PtyTerminalEmulator, TerminalRenderer
)
from .enhanced_interactive import (
    EnhancedInteractiveSession, EnhancedInteractiveDockerSession, SessionRecordingPlayer
)

# Import project support classes
from .project_support import Project, ProjectFile, ProjectSession

__all__ = [
    # Original classes
    'Sandbox',
    'OriginalSandboxSession',
    'SandboxExecutionError',

    # Basic sandbox classes
    'DirectSandbox',

    # Configuration and result classes
    'SandboxConfig',
    'ExecutionResult',

    # Language utilities
    'get_language_config',
    'detect_language_from_file',
    'detect_language_from_code',
    'detect_language_from_project',
    'detect_language_from_content_type',
    'get_language_info',
    'list_supported_languages',

    # Error handling classes
    'SandboxError',
    'ExecutionError',
    'ConfigurationError',
    'ResourceError',
    'SecurityError',
    'ErrorAnalyzer',
    'StackTraceAnalyzer',
    'Debugger',
    'create_debugger',

    # Security classes
    'SecurityProfile',
    'ResourceLimits',
    'SeccompProfile',
    'NetworkIsolation',
    'SecurityEnhancer',
    'create_default_security_enhancer',
    'ResourceQuota',
    'CPUQuota',
    'MemoryQuota',
    'DiskQuota',
    'TimeQuota',
    'ProcessQuota',
    'NetworkQuota',
    'FileQuota',
    'ResourceQuotaManager',
    'ResourceQuotaProfile',
    'ProcessLimiter',
    'create_default_resource_quotas',
    'SystemCallFilter',
    'CapabilityRestriction',
    'NamespaceIsolation',
    'PrivilegeRestriction',
    'ReadOnlyFilesystem',
    'create_default_security_profiles',

    # Enhanced session classes
    'SandboxSession',
    'EnhancedSandboxSession',
    'DirectEnhancedSession',
    'DockerEnhancedSession',
    'KubernetesEnhancedSession',
    'PodmanEnhancedSession',

    # Interactive session classes
    'InteractiveSession',
    'InteractiveDockerSession',
    'InteractiveKubernetesSession',
    'InteractiveEnhancedSession',
    'InteractiveDockerEnhancedSession',
    'InteractiveKubernetesEnhancedSession',

    # Enhanced interactive session classes
    'TerminalState',
    'TerminalEmulator',
    'PtyTerminalEmulator',
    'TerminalRenderer',
    'EnhancedInteractiveSession',
    'EnhancedInteractiveDockerSession',
    'SessionRecordingPlayer',

    # Project support classes
    'Project',
    'ProjectFile',
    'ProjectSession'
]
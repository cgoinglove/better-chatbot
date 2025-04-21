class SandboxExecutionError(Exception):
    """Exception raised when code execution in the sandbox fails."""
    def __init__(self, message, exit_code=None, output=None):
        self.exit_code = exit_code
        self.output = output
        super().__init__(message)


class SandboxConfigurationError(Exception):
    """Exception raised when there's an issue with sandbox configuration."""
    pass


class SandboxSecurityError(Exception):
    """Exception raised when a security violation is detected."""
    pass 
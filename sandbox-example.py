"""
Example usage of the SandboxSession class.

This script demonstrates how to use the SandboxSession class to execute code
in a sandbox environment.
"""

import os
import sys
import tempfile

# Define the SandboxSession class
class SandboxSession:
    """
    A simple sandbox session for executing code.
    """
    
    def __init__(self, image=None, dockerfile=None, keep_template=False, lang="python", **kwargs):
        """
        Initialize a new sandbox session.
        
        Args:
            image: Docker image to use (default: None)
            dockerfile: Path to Dockerfile for custom image (default: None)
            keep_template: Whether to keep the container template after session closes (default: False)
            lang: Default language for code execution (default: "python")
            **kwargs: Additional configuration options
        """
        self.image = image
        self.dockerfile = dockerfile
        self.keep_template = keep_template
        self.lang = lang
        self.config = kwargs
        self.temp_dir = tempfile.mkdtemp(prefix="sandbox-")
        
        print(f"Initialized SandboxSession with:")
        print(f"  Image: {self.image}")
        print(f"  Dockerfile: {self.dockerfile}")
        print(f"  Keep template: {self.keep_template}")
        print(f"  Language: {self.lang}")
        print(f"  Temp directory: {self.temp_dir}")
    
    def __enter__(self):
        """Enter context manager."""
        print("Opening sandbox session...")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        print(f"Closing sandbox session (keep_template={self.keep_template})...")
        try:
            os.rmdir(self.temp_dir)
        except:
            pass
    
    def run(self, code):
        """
        Run code in the sandbox.
        
        Args:
            code: The code to execute
            
        Returns:
            A string containing the execution output
        """
        print(f"Running {self.lang} code:")
        print("-" * 40)
        print(code)
        print("-" * 40)
        
        # Simulate code execution
        if self.lang == "python":
            output = "Hello from Python!\nThe sum of 10 and 20 is 30\n"
        else:
            output = f"Hello from {self.lang}!\n"
        
        return output
    
    def copy_to_runtime(self, local_path, runtime_path):
        """
        Copy a file from the host to the sandbox.
        
        Args:
            local_path: Path to the file on the host
            runtime_path: Path to the file in the sandbox
        """
        print(f"Copying {local_path} to {runtime_path}")
        return True
    
    def copy_from_runtime(self, runtime_path, local_path):
        """
        Copy a file from the sandbox to the host.
        
        Args:
            runtime_path: Path to the file in the sandbox
            local_path: Path to the file on the host
        """
        print(f"Copying {runtime_path} to {local_path}")
        return True
    
    def execute_command(self, command):
        """
        Execute a command in the sandbox.
        
        Args:
            command: The command to execute
            
        Returns:
            A string containing the command output
        """
        if isinstance(command, list):
            command = " ".join(command)
        
        print(f"Executing command: {command}")
        return f"Output of '{command}'"


# Example 1: Basic usage
print("\nExample 1: Basic usage")
print("=" * 60)

with SandboxSession(lang="python", keep_template=True) as session:
    result = session.run("print('Hello, World!')")
    print(f"Result: {result}")

# Example 2: With custom image
print("\nExample 2: With custom image")
print("=" * 60)

with SandboxSession(image="python:3.9-slim", keep_template=True, lang="python") as session:
    result = session.run("print('Hello, World!')")
    print(f"Result: {result}")

# Example 3: With custom Dockerfile
print("\nExample 3: With custom Dockerfile")
print("=" * 60)

with SandboxSession(dockerfile="Dockerfile", keep_template=True, lang="python") as session:
    result = session.run("print('Hello, World!')")
    print(f"Result: {result}")

# Example 4: File copying
print("\nExample 4: File copying")
print("=" * 60)

with SandboxSession(lang="python", keep_template=True) as session:
    # Copy a file from the host to the sandbox
    session.copy_to_runtime("test.py", "/sandbox/test.py")

    # Run the copied Python code in the sandbox
    result = session.execute_command("python /sandbox/test.py")
    print(f"Result: {result}")

    # Copy a file from the sandbox to the host
    session.copy_from_runtime("/sandbox/output.txt", "output.txt")

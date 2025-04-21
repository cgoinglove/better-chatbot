"""
Test script for the enhanced sandbox implementation.

This script demonstrates the use of the enhanced sandbox with different
session types (direct, Docker) and lifecycle methods.
"""

import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

from src.llm_sandbox.enhanced_sandbox import EnhancedSandbox
from src.llm_sandbox.sandbox_config import SandboxConfig


def test_direct_sandbox():
    """Test the direct sandbox implementation."""
    print("\n" + "="*60)
    print("TESTING DIRECT SANDBOX")
    print("="*60)

    # Create a sandbox with direct execution
    config = SandboxConfig(
        container_type="direct",
        timeout_seconds=10
    )

    sandbox = EnhancedSandbox(config)

    # Test code to execute
    python_code = """
print("Hello from Python!")
x = 10
y = 20
print(f"The sum of {x} and {y} is {x + y}")

# Try to import some standard libraries
import math
print(f"The square root of 16 is {math.sqrt(16)}")

import random
print(f"A random number between 1 and 100: {random.randint(1, 100)}")

# Test a simple function
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
"""

    # Test one-shot execution
    print("\nTesting one-shot execution:")
    result = sandbox.execute(python_code)
    print(result)

    # Test lifecycle methods
    print("\nTesting lifecycle methods:")
    sandbox.open()
    result = sandbox.run(python_code)
    print(result)
    sandbox.close()

    # Test context manager
    print("\nTesting context manager:")
    with EnhancedSandbox(config) as sandbox:
        result = sandbox.run(python_code)
        print(result)


def test_docker_sandbox():
    """Test the Docker sandbox implementation."""
    print("\n" + "="*60)
    print("TESTING DOCKER SANDBOX")
    print("="*60)

    # Create a sandbox with Docker execution
    config = SandboxConfig(
        container_type="docker",
        base_image="python:3.9-slim",
        memory_limit="256m",
        cpu_limit=0.5,
        timeout_seconds=10,
        network_enabled=False,
        allow_file_writes=True
    )

    try:
        # Test one-shot execution
        print("\nTesting one-shot execution:")
        sandbox = EnhancedSandbox(config)
        result = sandbox.execute("""
print("Hello from Docker!")
import platform
print(f"Python version: {platform.python_version()}")
print(f"Platform: {platform.platform()}")
""")
        print(result)

        # Test multiple languages
        print("\nTesting multiple languages:")
        with EnhancedSandbox(config) as sandbox:
            # Python
            result = sandbox.run("""
print("Hello from Python in Docker!")
""", "python")
            print("\nPython result:")
            print(result)

            # JavaScript (if Node.js is available in the container)
            result = sandbox.run("""
console.log("Hello from JavaScript in Docker!");
""", "javascript")
            print("\nJavaScript result:")
            print(result)

    except Exception as e:
        print(f"\nError testing Docker sandbox: {e}")
        print("Make sure Docker is installed and running.")


if __name__ == "__main__":
    # Test direct sandbox
    test_direct_sandbox()

    # Test Docker sandbox (if Docker is available)
    try:
        import subprocess
        result = subprocess.run(
            ["docker", "version"],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0:
            test_docker_sandbox()
        else:
            print("\nSkipping Docker tests: Docker is not available")
    except:
        print("\nSkipping Docker tests: Docker is not available")

"""
Test script for the enhanced sandbox session implementation.

This script demonstrates the use of the enhanced sandbox session with different
backends (direct, Docker) and features (file copying, command execution).
"""

import os
import sys
import tempfile

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

from sandbox_session_enhanced import SandboxSession


def test_direct_session():
    """Test the direct sandbox session."""
    print("\n" + "="*60)
    print("TESTING DIRECT SANDBOX SESSION")
    print("="*60)

    # Create a session with direct execution
    with SandboxSession(backend="direct", verbose=True) as session:
        # Test running Python code
        print("\nRunning Python code:")
        result = session.run("""
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
""")
        print(result)

        # Test file copying
        print("\nTesting file copying:")

        # Create a test file
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("This is a test file.\n")
            f.write("It contains some text.\n")
            test_file = f.name

        # Copy the file to the sandbox
        print("Copying file to sandbox...")
        session.copy_to_runtime(test_file, "/test.txt")

        # Run a command to read the file
        print("Reading file in sandbox...")
        result = session.execute_command(["cat", "/test.txt"])
        print(result)

        # Write a new file in the sandbox
        print("Writing file in sandbox...")
        result = session.run("""
with open("/output.txt", "w") as f:
    f.write("This file was created in the sandbox.\\n")
    f.write("It contains some generated text.\\n")
    f.write(f"The current working directory is: {__import__('os').getcwd()}\\n")
""")
        print(result)

        # Copy the file from the sandbox
        print("Copying file from sandbox...")
        output_file = os.path.join(tempfile.gettempdir(), "sandbox_output.txt")
        session.copy_from_runtime("/output.txt", output_file)

        # Read the copied file
        print("Reading copied file:")
        with open(output_file, "r") as f:
            print(f.read())

        # Clean up
        os.unlink(test_file)
        os.unlink(output_file)


def test_docker_session():
    """Test the Docker sandbox session."""
    print("\n" + "="*60)
    print("TESTING DOCKER SANDBOX SESSION")
    print("="*60)

    try:
        # Create a session with Docker execution
        with SandboxSession(
            backend="docker",
            image="python:3.9-slim",
            verbose=True,
            keep_template=True
        ) as session:
            # Test running Python code
            print("\nRunning Python code:")
            result = session.run("""
print("Hello from Docker!")
import platform
print(f"Python version: {platform.python_version()}")
print(f"Platform: {platform.platform()}")
""")
            print(result)

            # Test file copying
            print("\nTesting file copying:")

            # Create a test file
            with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
                f.write("This is a test file for Docker.\n")
                f.write("It contains some text.\n")
                test_file = f.name

            # Copy the file to the sandbox
            print("Copying file to Docker container...")
            session.copy_to_runtime(test_file, "/workspace/test.txt")

            # Run a command to read the file
            print("Reading file in Docker container...")
            result = session.execute_command(["cat", "/workspace/test.txt"])
            print(result)

            # Write a new file in the sandbox
            print("Writing file in Docker container...")
            result = session.run("""
with open("/workspace/output.txt", "w") as f:
    f.write("This file was created in the Docker container.\\n")
    f.write("It contains some generated text.\\n")
    f.write(f"The current working directory is: {__import__('os').getcwd()}\\n")
""")
            print(result)

            # Copy the file from the sandbox
            print("Copying file from Docker container...")
            output_file = os.path.join(tempfile.gettempdir(), "docker_output.txt")
            session.copy_from_runtime("/workspace/output.txt", output_file)

            # Read the copied file
            print("Reading copied file:")
            with open(output_file, "r") as f:
                print(f.read())

            # Clean up
            os.unlink(test_file)
            os.unlink(output_file)

    except Exception as e:
        print(f"\nError testing Docker session: {e}")
        print("Make sure Docker is installed and running.")


if __name__ == "__main__":
    # Test direct session
    test_direct_session()

    # Test Docker session (if Docker is available)
    try:
        import subprocess
        result = subprocess.run(
            ["docker", "version"],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0:
            test_docker_session()
        else:
            print("\nSkipping Docker tests: Docker is not available")
    except:
        print("\nSkipping Docker tests: Docker is not available")

"""
Test script for the enhanced sandbox features.

This script demonstrates the enhanced features of the sandbox, including:
- Multiple backends (direct, Docker, Kubernetes, Podman)
- Language detection and support
- File operations
"""

import os
import sys
import tempfile

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

# Import the sandbox classes
from sandbox_session_enhanced import SandboxSession
from language_config import get_language_config, detect_language_from_code


def test_language_detection():
    """Test language detection from code."""
    print("\n" + "="*60)
    print("TESTING LANGUAGE DETECTION")
    print("="*60)
    
    # Test Python detection
    python_code = """
def hello(name):
    return f"Hello, {name}!"

print(hello("World"))
"""
    
    # Test JavaScript detection
    javascript_code = """
function hello(name) {
    return `Hello, ${name}!`;
}

console.log(hello("World"));
"""
    
    # Test Java detection
    java_code = """
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
"""
    
    # Test Go detection
    go_code = """
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
"""
    
    # Test Ruby detection
    ruby_code = """
def hello(name)
    "Hello, #{name}!"
end

puts hello("World")
"""
    
    # Test C++ detection
    cpp_code = """
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
"""
    
    # Test language detection
    print("Python detection:", detect_language_from_code(python_code))
    print("JavaScript detection:", detect_language_from_code(javascript_code))
    print("Java detection:", detect_language_from_code(java_code))
    print("Go detection:", detect_language_from_code(go_code))
    print("Ruby detection:", detect_language_from_code(ruby_code))
    print("C++ detection:", detect_language_from_code(cpp_code))
    
    # Test language configuration
    print("\nLanguage configurations:")
    for lang in ["python", "javascript", "java", "go", "ruby", "cpp", "typescript", "rust", "php"]:
        config = get_language_config(lang)
        if config:
            print(f"{lang}: extension={config['extension']}, command={config['command']}")
        else:
            print(f"{lang}: Not supported")
    
    # Test language aliases
    print("\nLanguage aliases:")
    for alias in ["py", "js", "ts", "c++", "golang", "rb"]:
        config = get_language_config(alias)
        if config:
            print(f"{alias}: maps to extension={config['extension']}, command={config['command']}")
        else:
            print(f"{alias}: Not supported")


def test_direct_session_with_language_detection():
    """Test the direct sandbox session with language detection."""
    print("\n" + "="*60)
    print("TESTING DIRECT SESSION WITH LANGUAGE DETECTION")
    print("="*60)
    
    # Create a session with direct execution
    with SandboxSession(backend="direct", verbose=True) as session:
        # Test running Python code with auto-detection
        print("\nRunning Python code with auto-detection:")
        result = session.run("""
def hello(name):
    return f"Hello, {name}!"

print(hello("World"))
""")
        print(result)
        
        # Test running JavaScript code with auto-detection
        print("\nRunning JavaScript code with auto-detection:")
        result = session.run("""
function hello(name) {
    return `Hello, ${name}!`;
}

console.log(hello("World"));
""")
        print(result)
        
        # Test running Ruby code with auto-detection
        print("\nRunning Ruby code with auto-detection:")
        result = session.run("""
def hello(name)
    "Hello, #{name}!"
end

puts hello("World")
""")
        print(result)


def test_docker_session_with_multiple_languages():
    """Test the Docker sandbox session with multiple languages."""
    print("\n" + "="*60)
    print("TESTING DOCKER SESSION WITH MULTIPLE LANGUAGES")
    print("="*60)
    
    try:
        # Check if Docker is available
        import subprocess
        result = subprocess.run(
            ["docker", "version"],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode != 0:
            print("Skipping Docker tests: Docker is not available")
            return
        
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
print("Hello from Python in Docker!")
import platform
print(f"Python version: {platform.python_version()}")
""", "python")
            print(result)
            
            # Test running JavaScript code (will likely fail without Node.js)
            print("\nRunning JavaScript code (may fail without Node.js):")
            result = session.run("""
console.log("Hello from JavaScript in Docker!");
""", "javascript")
            print(result)
            
            # Test running Bash script
            print("\nRunning Bash script:")
            result = session.run("""
#!/bin/bash
echo "Hello from Bash in Docker!"
echo "Current directory: $(pwd)"
echo "Files: $(ls -la)"
""", "bash")
            print(result)
            
    except Exception as e:
        print(f"\nError testing Docker session: {e}")
        print("Make sure Docker is installed and running.")


if __name__ == "__main__":
    # Test language detection
    test_language_detection()
    
    # Test direct session with language detection
    test_direct_session_with_language_detection()
    
    # Test Docker session with multiple languages
    test_docker_session_with_multiple_languages()

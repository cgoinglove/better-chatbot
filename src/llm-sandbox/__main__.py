#!/usr/bin/env python3
"""
LLM Sandbox - Command line tool for executing code in a sandbox.

This module allows the sandbox to be run from the command line.
"""

import argparse
import sys

from .sandbox import Sandbox, SandboxConfig
from .exceptions import SandboxExecutionError


def main():
    """Run the LLM Sandbox from the command line."""
    parser = argparse.ArgumentParser(
        description="Execute Python code in a secure sandbox"
    )
    
    parser.add_argument(
        "file", nargs="?", 
        help="Python file to execute in the sandbox"
    )
    
    parser.add_argument(
        "--code", "-c", 
        help="Python code to execute in the sandbox"
    )
    
    parser.add_argument(
        "--memory", "-m", default="256m",
        help="Memory limit (e.g. '256m', '1g')"
    )
    
    parser.add_argument(
        "--cpu", default=1.0, type=float,
        help="CPU limit (e.g. 0.5, 1.0)"
    )
    
    parser.add_argument(
        "--timeout", "-t", default=30, type=int,
        help="Execution timeout in seconds"
    )
    
    parser.add_argument(
        "--network", "-n", action="store_true",
        help="Enable network access"
    )
    
    parser.add_argument(
        "--allow-writes", "-w", action="store_true",
        help="Allow file writes"
    )
    
    parser.add_argument(
        "--container", default="docker",
        choices=["docker", "kubernetes", "podman"],
        help="Container technology to use"
    )
    
    args = parser.parse_args()
    
    # Check that either --code or a file was provided
    if not args.code and not args.file:
        parser.error("Either a file or --code must be provided")
    
    try:
        # Create sandbox configuration
        config = SandboxConfig(
            memory_limit=args.memory,
            cpu_limit=args.cpu,
            timeout_seconds=args.timeout,
            network_enabled=args.network,
            allow_file_writes=args.allow_writes,
            container_type=args.container
        )
        
        # Create sandbox
        sandbox = Sandbox(config)
        
        # Get code to execute
        code = args.code
        if args.file:
            with open(args.file, "r", encoding="utf-8") as f:
                code = f.read()
        
        # Execute code
        result = sandbox.execute(code)
        
        # Print output
        print(result.output)
        
        # Return appropriate exit code
        return 0 if result.success else 1
        
    except SandboxExecutionError as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main()) 
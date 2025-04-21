"""
Kubernetes-based enhanced sandbox session implementation.

This module provides a sandbox session implementation that uses Kubernetes
pods for isolation.
"""

import os
import time
import tempfile
import json
import base64
import subprocess
from typing import Optional, Dict, List, Any, Union

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .enhanced_session import EnhancedSandboxSession
from .security_profiles import create_default_security_enhancer


class KubernetesEnhancedSession(EnhancedSandboxSession):
    """
    A sandbox session that executes code in Kubernetes pods.

    This provides better isolation and scalability than Docker but requires
    a Kubernetes cluster to be available.
    """

    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new Kubernetes sandbox session.

        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.pod_name = None
        self.namespace = self.config.namespace or "default"

        # Override backend to ensure Kubernetes is used
        self.config.backend = "kubernetes"

        # Try to import kubernetes module
        try:
            import kubernetes
            self.k8s_client = self.config.client or self._create_k8s_client()
        except ImportError:
            raise ImportError(
                "Kubernetes client not found. Install it with: pip install kubernetes"
            )

    def open(self):
        """
        Open the sandbox session.

        This creates a Kubernetes pod for code execution.

        Returns:
            self for method chaining
        """
        if self._is_open:
            return self

        self._create_temp_dir()

        try:
            # Check if Kubernetes is available
            self._check_kubernetes_available()

            # Create the pod
            self._create_kubernetes_pod()

            # Wait for the pod to be ready
            self._wait_for_pod_ready()

            self._is_open = True
            self._log("Kubernetes sandbox session opened")
            return self

        except Exception as e:
            self.close()
            raise RuntimeError(f"Failed to open Kubernetes sandbox session: {str(e)}")

    def run(self, code: str, language: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the Kubernetes pod.

        Args:
            code: The code to execute
            language: The programming language (default: config.lang)

        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open or not self.pod_name:
            raise RuntimeError("Session is not open")

        # Use default language if not specified
        if language is None:
            language = self.config.lang

        # Map language to file extension and command
        lang_config = self._get_language_config(language)
        if not lang_config:
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}"
            )

        # Create a temporary file for the code
        file_extension = lang_config["extension"]
        code_file = os.path.join(self.temp_dir, f"code.{file_extension}")
        pod_code_file = f"/workspace/code.{file_extension}"

        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        # Copy the code file to the pod
        self.copy_to_runtime(code_file, pod_code_file)

        # Execute the code in the pod
        command = lang_config["command"]
        args = lang_config["args"] + [pod_code_file]

        # Construct the full command
        full_command = [command] + args

        return self.execute_command(full_command)

    def close(self, keep_template: bool = False):
        """
        Close the sandbox session.

        This deletes the Kubernetes pod.

        Args:
            keep_template: If True, keep the pod template for future use
        """
        if not self._is_open:
            return

        # Delete the pod
        if self.pod_name:
            try:
                self._log(f"Deleting pod: {self.pod_name}")
                self.k8s_client.delete_namespaced_pod(
                    name=self.pod_name,
                    namespace=self.namespace,
                    body={}
                )
            except Exception as e:
                self._log(f"Error deleting Kubernetes pod: {e}", level="ERROR")

            self.pod_name = None

        # Clean up temporary directory
        self._cleanup_temp_dir()

        self._is_open = False
        self._log("Kubernetes sandbox session closed")

    def copy_to_runtime(self, local_path: str, runtime_path: str) -> bool:
        """
        Copy a file from the host to the sandbox.

        Args:
            local_path: Path to the file on the host
            runtime_path: Path to the file in the sandbox

        Returns:
            True if the file was copied successfully, False otherwise
        """
        if not self._is_open or not self.pod_name:
            raise RuntimeError("Session is not open")

        try:
            # Create parent directory in pod if it doesn't exist
            parent_dir = os.path.dirname(runtime_path)
            if parent_dir:
                mkdir_cmd = ["mkdir", "-p", parent_dir]
                self.execute_command(mkdir_cmd)

            # Use kubectl cp to copy the file to the pod
            cp_cmd = [
                "kubectl", "cp",
                local_path,
                f"{self.namespace}/{self.pod_name}:{runtime_path}"
            ]

            result = subprocess.run(
                cp_cmd,
                capture_output=True,
                text=True,
                check=False
            )

            if result.returncode != 0:
                self._log(f"Error copying file to pod: {result.stderr}", level="ERROR")
                return False

            self._log(f"Copied {local_path} to pod:{runtime_path}")
            return True

        except Exception as e:
            self._log(f"Error copying file to pod: {e}", level="ERROR")
            return False

    def copy_from_runtime(self, runtime_path: str, local_path: str) -> bool:
        """
        Copy a file from the sandbox to the host.

        Args:
            runtime_path: Path to the file in the sandbox
            local_path: Path to the file on the host

        Returns:
            True if the file was copied successfully, False otherwise
        """
        if not self._is_open or not self.pod_name:
            raise RuntimeError("Session is not open")

        try:
            # Create parent directory on host if it doesn't exist
            parent_dir = os.path.dirname(local_path)
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)

            # Use kubectl cp to copy the file from the pod
            cp_cmd = [
                "kubectl", "cp",
                f"{self.namespace}/{self.pod_name}:{runtime_path}",
                local_path
            ]

            result = subprocess.run(
                cp_cmd,
                capture_output=True,
                text=True,
                check=False
            )

            if result.returncode != 0:
                self._log(f"Error copying file from pod: {result.stderr}", level="ERROR")
                return False

            self._log(f"Copied pod:{runtime_path} to {local_path}")
            return True

        except Exception as e:
            self._log(f"Error copying file from pod: {e}", level="ERROR")
            return False

    def execute_command(self, command: Union[str, List[str]],
                       timeout: Optional[int] = None) -> ExecutionResult:
        """
        Execute a command in the Kubernetes pod.

        Args:
            command: The command to execute (string or list of arguments)
            timeout: Timeout in seconds (default: config.timeout_seconds)

        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open or not self.pod_name:
            raise RuntimeError("Session is not open")

        # Use default timeout if not specified
        if timeout is None:
            timeout = self.config.timeout_seconds

        # Convert string command to list
        if isinstance(command, str):
            command = command.split()

        # Start timing execution
        start_time = time.time()

        try:
            # Construct the kubectl exec command
            kubectl_cmd = [
                "kubectl", "exec",
                "-n", self.namespace,
                self.pod_name,
                "--"
            ] + command

            self._log(f"Executing command in pod: {' '.join(kubectl_cmd)}")

            # Execute the command
            process = subprocess.Popen(
                kubectl_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            try:
                # Wait for the process to complete with timeout
                stdout, stderr = process.communicate(timeout=timeout)
                exit_code = process.returncode
                success = exit_code == 0

                # Calculate execution time
                execution_time_ms = int((time.time() - start_time) * 1000)

                # Combine stdout and stderr for the output
                output = stdout
                if stderr and not success:
                    if output:
                        output += "\n" + stderr
                    else:
                        output = stderr

                return ExecutionResult(
                    success=success,
                    exit_code=exit_code,
                    output=output,
                    stdout=stdout,
                    stderr=stderr,
                    execution_time_ms=execution_time_ms
                )

            except subprocess.TimeoutExpired:
                # Kill the process if it times out
                process.kill()
                stdout, stderr = process.communicate()

                return ExecutionResult(
                    success=False,
                    exit_code=-1,
                    output=f"Execution timed out after {timeout} seconds",
                    stdout=stdout,
                    stderr=stderr,
                    error=f"Timeout after {timeout} seconds",
                    execution_time_ms=int((time.time() - start_time) * 1000)
                )

        except Exception as e:
            # Handle any other exceptions
            import traceback
            error_msg = str(e)
            tb = traceback.format_exc()

            return ExecutionResult(
                success=False,
                exit_code=-1,
                output=f"Error executing command: {error_msg}",
                stdout="",
                stderr=tb,
                error=error_msg,
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    def _create_k8s_client(self):
        """Create a Kubernetes client."""
        import kubernetes
        from kubernetes import client, config

        try:
            # Try to load from kubeconfig
            config.load_kube_config()
        except:
            # Try to load from service account
            config.load_incluster_config()

        return client.CoreV1Api()

    def _check_kubernetes_available(self):
        """Check if Kubernetes is available."""
        try:
            # Try to list pods to check if Kubernetes is available
            self.k8s_client.list_namespaced_pod(namespace=self.namespace, limit=1)
        except Exception as e:
            raise RuntimeError(
                f"Kubernetes is not available: {str(e)}"
            )

    def _create_kubernetes_pod(self):
        """Create a Kubernetes pod for code execution."""
        from kubernetes import client

        # Generate a unique name for the pod
        self.pod_name = f"llm-sandbox-{self.session_id}"

        # Create security enhancer
        security_enhancer = create_default_security_enhancer(
            cpu_limit=self.config.cpu_limit,
            memory_limit=self.config.memory_limit,
            network_enabled=self.config.network_enabled,
            seccomp_profile="default"
        )

        # Use custom pod manifest if provided
        if self.config.pod_manifest:
            pod_manifest = self.config.pod_manifest.copy()

            # Update the pod name and namespace
            pod_manifest["metadata"]["name"] = self.pod_name
            pod_manifest["metadata"]["namespace"] = self.namespace

            # Update the container image if not specified
            if "spec" in pod_manifest and "containers" in pod_manifest["spec"]:
                for container in pod_manifest["spec"]["containers"]:
                    if "image" not in container:
                        container["image"] = self.config.image

        else:
            # Create a default pod manifest
            pod_manifest = {
                "apiVersion": "v1",
                "kind": "Pod",
                "metadata": {
                    "name": self.pod_name,
                    "namespace": self.namespace,
                    "labels": {
                        "app": "llm-sandbox",
                        "session-id": self.session_id
                    }
                },
                "spec": {
                    "containers": [
                        {
                            "name": "sandbox",
                            "image": self.config.image,
                            "command": ["tail", "-f", "/dev/null"],  # Keep the container running
                            "resources": {
                                "limits": {
                                    "memory": self.config.memory_limit,
                                    "cpu": str(self.config.cpu_limit)
                                }
                            },
                            "volumeMounts": [
                                {
                                    "name": "workspace",
                                    "mountPath": "/workspace"
                                }
                            ]
                        }
                    ],
                    "volumes": [
                        {
                            "name": "workspace",
                            "emptyDir": {}
                        }
                    ],
                    "restartPolicy": "Never"
                }
            }

            # Add environment variables
            if self.config.env_vars:
                pod_manifest["spec"]["containers"][0]["env"] = [
                    {"name": key, "value": value}
                    for key, value in self.config.env_vars.items()
                ]

            # Apply security profiles
            security_args = security_enhancer.get_kubernetes_args()
            for key, value in security_args.items():
                if key == "resources":
                    # Merge resources
                    pod_manifest["spec"]["containers"][0]["resources"].update(value)
                elif key == "securityContext":
                    # Add security context to container
                    pod_manifest["spec"]["containers"][0]["securityContext"] = value
                else:
                    # Add to pod spec
                    pod_manifest["spec"][key] = value

        # Create the pod
        self._log(f"Creating Kubernetes pod: {self.pod_name}")
        self.k8s_client.create_namespaced_pod(
            namespace=self.namespace,
            body=pod_manifest
        )

    def _wait_for_pod_ready(self, timeout: int = 60):
        """
        Wait for the pod to be ready.

        Args:
            timeout: Timeout in seconds (default: 60)
        """
        self._log(f"Waiting for pod to be ready: {self.pod_name}")

        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                pod = self.k8s_client.read_namespaced_pod(
                    name=self.pod_name,
                    namespace=self.namespace
                )

                if pod.status.phase == "Running":
                    self._log(f"Pod is ready: {self.pod_name}")
                    return

                if pod.status.phase in ["Failed", "Unknown"]:
                    raise RuntimeError(
                        f"Pod failed to start: {pod.status.phase}"
                    )

                time.sleep(1)

            except Exception as e:
                self._log(f"Error checking pod status: {e}", level="ERROR")
                time.sleep(1)

        raise RuntimeError(
            f"Timed out waiting for pod to be ready: {self.pod_name}"
        )

    def _get_language_config(self, language: str) -> Optional[Dict[str, Any]]:
        """
        Get the configuration for a programming language.

        Args:
            language: The programming language

        Returns:
            A dictionary with language configuration, or None if the language is not supported
        """
        # Map of supported languages to their configurations
        language_configs = {
            "python": {
                "extension": "py",
                "command": "python",
                "args": []
            },
            "javascript": {
                "extension": "js",
                "command": "node",
                "args": []
            },
            "java": {
                "extension": "java",
                "command": "java",
                "args": []
            },
            "cpp": {
                "extension": "cpp",
                "command": "g++",
                "args": ["-o", "/tmp/program", "/workspace/code.cpp", "&&", "/tmp/program"]
            },
            "go": {
                "extension": "go",
                "command": "go",
                "args": ["run"]
            },
            "ruby": {
                "extension": "rb",
                "command": "ruby",
                "args": []
            }
        }

        return language_configs.get(language.lower())

"""
Interactive sandbox session implementation.

This module provides classes for interactive sandbox sessions, which allow
for real-time input and output.
"""

import os
import time
import threading
import queue
import subprocess
import pty
import select
import fcntl
import termios
import struct
import signal
import json
from typing import Optional, Dict, List, Any, Union, Callable, Tuple

from .terminal_emulation import TerminalState, TerminalEmulator, PtyTerminalEmulator, TerminalRenderer

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .enhanced_session import EnhancedSandboxSession


class InteractiveSession:
    """
    Interactive session for real-time input and output.

    This class provides a way to interact with a running process in real-time,
    sending input and receiving output.
    """

    def __init__(self, command: Union[str, List[str]], cwd: Optional[str] = None,
                terminal_size: Optional[Tuple[int, int]] = None):
        """
        Initialize an interactive session.

        Args:
            command: The command to execute (string or list of arguments)
            cwd: Working directory for the command
            terminal_size: Terminal size as (rows, cols)
        """
        self.command = command if isinstance(command, list) else command.split()
        self.cwd = cwd
        self.terminal_size = terminal_size or (24, 80)

        # Process state
        self.master_fd = None
        self.slave_fd = None
        self.process = None
        self.pid = None
        self.running = False

        # I/O queues
        self.output_queue = queue.Queue()
        self.input_queue = queue.Queue()

        # Threads
        self.output_thread = None
        self.input_thread = None

    def start(self) -> bool:
        """
        Start the interactive session.

        Returns:
            True if the session was started successfully, False otherwise
        """
        if self.running:
            return True

        try:
            # Create a pseudo-terminal
            self.master_fd, self.slave_fd = pty.openpty()

            # Set terminal size
            rows, cols = self.terminal_size
            term_size = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.slave_fd, termios.TIOCSWINSZ, term_size)

            # Start the process
            self.process = subprocess.Popen(
                self.command,
                stdin=self.slave_fd,
                stdout=self.slave_fd,
                stderr=self.slave_fd,
                cwd=self.cwd,
                preexec_fn=os.setsid,
                start_new_session=True
            )

            self.pid = self.process.pid
            self.running = True

            # Start I/O threads
            self.output_thread = threading.Thread(target=self._read_output)
            self.output_thread.daemon = True
            self.output_thread.start()

            self.input_thread = threading.Thread(target=self._write_input)
            self.input_thread.daemon = True
            self.input_thread.start()

            return True

        except Exception as e:
            print(f"Error starting interactive session: {e}")
            self.stop()
            return False

    def stop(self) -> None:
        """Stop the interactive session."""
        self.running = False

        # Close file descriptors
        if self.master_fd:
            try:
                os.close(self.master_fd)
            except OSError:
                pass
            self.master_fd = None

        if self.slave_fd:
            try:
                os.close(self.slave_fd)
            except OSError:
                pass
            self.slave_fd = None

        # Terminate the process
        if self.process:
            try:
                # Try to terminate gracefully
                self.process.terminate()
                self.process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                except OSError:
                    pass

            self.process = None
            self.pid = None

    def send_input(self, data: str) -> None:
        """
        Send input to the process.

        Args:
            data: The input data to send
        """
        if not self.running:
            return

        self.input_queue.put(data)

    def read_output(self, timeout: Optional[float] = None) -> str:
        """
        Read output from the process.

        Args:
            timeout: Timeout in seconds (None for no timeout)

        Returns:
            The output data as a string
        """
        if not self.running:
            return ""

        try:
            return self.output_queue.get(timeout=timeout)
        except queue.Empty:
            return ""

    def read_all_output(self) -> str:
        """
        Read all available output from the process.

        Returns:
            All available output as a string
        """
        if not self.running:
            return ""

        output = []

        # Get all available output
        while not self.output_queue.empty():
            try:
                output.append(self.output_queue.get_nowait())
            except queue.Empty:
                break

        return "".join(output)

    def is_running(self) -> bool:
        """
        Check if the session is running.

        Returns:
            True if the session is running, False otherwise
        """
        if not self.running or not self.process:
            return False

        # Check if the process is still running
        return self.process.poll() is None

    def _read_output(self) -> None:
        """Read output from the process and put it in the output queue."""
        buffer_size = 1024

        while self.running and self.master_fd:
            try:
                # Check if there's data to read
                r, _, _ = select.select([self.master_fd], [], [], 0.1)

                if self.master_fd in r:
                    # Read data from the master fd
                    data = os.read(self.master_fd, buffer_size)

                    if data:
                        # Put the data in the output queue
                        self.output_queue.put(data.decode("utf-8", errors="replace"))
                    else:
                        # End of file
                        break

            except (OSError, IOError) as e:
                print(f"Error reading output: {e}")
                break
            except Exception as e:
                print(f"Unexpected error reading output: {e}")
                break

    def _write_input(self) -> None:
        """Write input from the input queue to the process."""
        while self.running and self.master_fd:
            try:
                # Get input from the queue
                data = self.input_queue.get(timeout=0.1)

                if data:
                    # Write data to the master fd
                    os.write(self.master_fd, data.encode("utf-8"))

            except queue.Empty:
                # No input available
                pass
            except (OSError, IOError) as e:
                print(f"Error writing input: {e}")
                break
            except Exception as e:
                print(f"Unexpected error writing input: {e}")
                break


class InteractiveDockerSession(InteractiveSession):
    """Interactive session for Docker containers."""

    def __init__(self, container_id: str, command: Union[str, List[str]],
                terminal_size: Optional[Tuple[int, int]] = None):
        """
        Initialize an interactive Docker session.

        Args:
            container_id: Docker container ID
            command: The command to execute in the container
            terminal_size: Terminal size as (rows, cols)
        """
        self.container_id = container_id

        # Construct the docker exec command
        docker_cmd = ["docker", "exec", "-it", container_id]
        if isinstance(command, list):
            docker_cmd.extend(command)
        else:
            docker_cmd.extend(command.split())

        super().__init__(docker_cmd, terminal_size=terminal_size)


class InteractiveKubernetesSession(InteractiveSession):
    """Interactive session for Kubernetes pods."""

    def __init__(self, pod_name: str, container_name: Optional[str] = None,
                namespace: str = "default", command: Union[str, List[str]] = "/bin/sh",
                terminal_size: Optional[Tuple[int, int]] = None):
        """
        Initialize an interactive Kubernetes session.

        Args:
            pod_name: Kubernetes pod name
            container_name: Container name (if not specified, the first container is used)
            namespace: Kubernetes namespace
            command: The command to execute in the pod
            terminal_size: Terminal size as (rows, cols)
        """
        self.pod_name = pod_name
        self.container_name = container_name
        self.namespace = namespace

        # Construct the kubectl exec command
        kubectl_cmd = ["kubectl", "exec", "-it", "-n", namespace, pod_name]

        if container_name:
            kubectl_cmd.extend(["-c", container_name])

        kubectl_cmd.append("--")

        if isinstance(command, list):
            kubectl_cmd.extend(command)
        else:
            kubectl_cmd.extend(command.split())

        super().__init__(kubectl_cmd, terminal_size=terminal_size)


class InteractiveEnhancedSession(EnhancedSandboxSession):
    """
    Enhanced sandbox session with interactive capabilities.

    This class extends the EnhancedSandboxSession class to add support for
    interactive sessions.
    """

    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new interactive enhanced sandbox session.

        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.interactive_session = None

    def start_interactive_session(self, command: Union[str, List[str]],
                                 terminal_size: Optional[Tuple[int, int]] = None) -> bool:
        """
        Start an interactive session.

        Args:
            command: The command to execute
            terminal_size: Terminal size as (rows, cols)

        Returns:
            True if the session was started successfully, False otherwise
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")

        # Create an interactive session
        self.interactive_session = InteractiveSession(
            command=command,
            cwd=self._runtime_dir,
            terminal_size=terminal_size
        )

        # Start the session
        return self.interactive_session.start()

    def stop_interactive_session(self) -> None:
        """Stop the interactive session."""
        if self.interactive_session:
            self.interactive_session.stop()
            self.interactive_session = None

    def send_input(self, data: str) -> None:
        """
        Send input to the interactive session.

        Args:
            data: The input data to send
        """
        if self.interactive_session:
            self.interactive_session.send_input(data)

    def read_output(self, timeout: Optional[float] = None) -> str:
        """
        Read output from the interactive session.

        Args:
            timeout: Timeout in seconds (None for no timeout)

        Returns:
            The output data as a string
        """
        if self.interactive_session:
            return self.interactive_session.read_output(timeout)
        return ""

    def read_all_output(self) -> str:
        """
        Read all available output from the interactive session.

        Returns:
            All available output as a string
        """
        if self.interactive_session:
            return self.interactive_session.read_all_output()
        return ""

    def is_interactive_session_running(self) -> bool:
        """
        Check if the interactive session is running.

        Returns:
            True if the interactive session is running, False otherwise
        """
        if self.interactive_session:
            return self.interactive_session.is_running()
        return False

    def close(self, keep_template: bool = False):
        """
        Close the sandbox session.

        This stops any interactive session and closes the sandbox.

        Args:
            keep_template: If True, keep the template for future use
        """
        # Stop the interactive session
        self.stop_interactive_session()

        # Close the sandbox
        super().close(keep_template=keep_template)


class InteractiveDockerEnhancedSession(InteractiveEnhancedSession):
    """
    Enhanced Docker sandbox session with interactive capabilities.

    This class extends the InteractiveEnhancedSession class to add support for
    interactive Docker sessions.
    """

    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new interactive Docker enhanced sandbox session.

        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.container_id = None

    def start_interactive_session(self, command: Union[str, List[str]],
                                 terminal_size: Optional[Tuple[int, int]] = None) -> bool:
        """
        Start an interactive Docker session.

        Args:
            command: The command to execute in the container
            terminal_size: Terminal size as (rows, cols)

        Returns:
            True if the session was started successfully, False otherwise
        """
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")

        # Create an interactive Docker session
        self.interactive_session = InteractiveDockerSession(
            container_id=self.container_id,
            command=command,
            terminal_size=terminal_size
        )

        # Start the session
        return self.interactive_session.start()


class InteractiveKubernetesEnhancedSession(InteractiveEnhancedSession):
    """
    Enhanced Kubernetes sandbox session with interactive capabilities.

    This class extends the InteractiveEnhancedSession class to add support for
    interactive Kubernetes sessions.
    """

    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new interactive Kubernetes enhanced sandbox session.

        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.pod_name = None
        self.namespace = kwargs.get("namespace", "default")

    def start_interactive_session(self, command: Union[str, List[str]],
                                 container_name: Optional[str] = None,
                                 terminal_size: Optional[Tuple[int, int]] = None) -> bool:
        """
        Start an interactive Kubernetes session.

        Args:
            command: The command to execute in the pod
            container_name: Container name (if not specified, the first container is used)
            terminal_size: Terminal size as (rows, cols)

        Returns:
            True if the session was started successfully, False otherwise
        """
        if not self._is_open or not self.pod_name:
            raise RuntimeError("Session is not open")

        # Create an interactive Kubernetes session
        self.interactive_session = InteractiveKubernetesSession(
            pod_name=self.pod_name,
            container_name=container_name,
            namespace=self.namespace,
            command=command,
            terminal_size=terminal_size
        )

        # Start the session
        return self.interactive_session.start()

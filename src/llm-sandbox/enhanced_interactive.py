"""
Enhanced interactive sessions for sandbox environments.

This module provides enhanced interactive sessions for sandbox environments,
including terminal emulation, input/output redirection, and session recording.
"""

import os
import time
import threading
import queue
import subprocess
import json
import base64
from typing import Optional, Dict, List, Any, Union, Callable, Tuple

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .enhanced_session import EnhancedSandboxSession
from .terminal_emulation import TerminalState, TerminalEmulator, PtyTerminalEmulator, TerminalRenderer


class EnhancedInteractiveSession:
    """
    Enhanced interactive session for sandbox environments.
    
    This class provides an interactive session with terminal emulation,
    input/output redirection, and session recording.
    """
    
    def __init__(self, rows: int = 24, cols: int = 80, record: bool = False):
        """
        Initialize an enhanced interactive session.
        
        Args:
            rows: Number of rows in the terminal
            cols: Number of columns in the terminal
            record: Whether to record the session
        """
        self.rows = rows
        self.cols = cols
        self.record = record
        self.terminal = PtyTerminalEmulator(rows, cols)
        self.renderer = TerminalRenderer(self.terminal.state)
        self.recording = []
        self.recording_start_time = None
        self.running = False
        self.process = None
    
    def start(self, command: List[str], env: Optional[Dict[str, str]] = None) -> bool:
        """
        Start an interactive session.
        
        Args:
            command: Command to run
            env: Environment variables
            
        Returns:
            True if the session was started successfully, False otherwise
        """
        if self.running:
            return True
        
        try:
            # Start the terminal emulator with the process
            self.terminal.start_process(command, env)
            
            # Start recording if enabled
            if self.record:
                self.recording_start_time = time.time()
                self.recording = []
                
                # Add recording callbacks
                self.terminal.add_input_callback(self._record_input)
                self.terminal.add_output_callback(self._record_output)
            
            self.running = True
            return True
            
        except Exception as e:
            print(f"Error starting interactive session: {e}")
            self.stop()
            return False
    
    def stop(self) -> None:
        """Stop the interactive session."""
        if not self.running:
            return
        
        # Stop the terminal emulator
        self.terminal.stop()
        
        # Stop recording
        if self.record and self.recording_start_time:
            self.recording_start_time = None
        
        self.running = False
    
    def send_input(self, data: str) -> None:
        """
        Send input to the session.
        
        Args:
            data: The input data to send
        """
        if not self.running:
            return
        
        self.terminal.send_input(data)
    
    def read_output(self, timeout: Optional[float] = None) -> str:
        """
        Read output from the session.
        
        Args:
            timeout: Timeout in seconds (None for no timeout)
            
        Returns:
            The output data as a string
        """
        if not self.running:
            return ""
        
        return self.terminal.get_output(timeout)
    
    def get_html_display(self) -> str:
        """
        Get the current display as HTML.
        
        Returns:
            HTML representation of the current display
        """
        return self.renderer.render_html()
    
    def resize(self, rows: int, cols: int) -> None:
        """
        Resize the terminal.
        
        Args:
            rows: New number of rows
            cols: New number of columns
        """
        self.rows = rows
        self.cols = cols
        self.terminal.resize(rows, cols)
    
    def is_running(self) -> bool:
        """
        Check if the session is running.
        
        Returns:
            True if the session is running, False otherwise
        """
        return self.running
    
    def get_recording(self) -> Dict[str, Any]:
        """
        Get the session recording.
        
        Returns:
            Dictionary with session recording data
        """
        if not self.record:
            return {"events": []}
        
        return {
            "events": self.recording,
            "duration": time.time() - (self.recording_start_time or time.time()),
            "rows": self.rows,
            "cols": self.cols
        }
    
    def save_recording(self, file_path: str) -> bool:
        """
        Save the session recording to a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if the recording was saved successfully, False otherwise
        """
        if not self.record:
            return False
        
        try:
            with open(file_path, "w") as f:
                json.dump(self.get_recording(), f)
            return True
        except Exception as e:
            print(f"Error saving recording: {e}")
            return False
    
    def _record_input(self, data: str) -> None:
        """
        Record input data.
        
        Args:
            data: Input data
        """
        if not self.record or not self.recording_start_time:
            return
        
        self.recording.append({
            "type": "input",
            "data": data,
            "time": time.time() - self.recording_start_time
        })
    
    def _record_output(self, data: str) -> None:
        """
        Record output data.
        
        Args:
            data: Output data
        """
        if not self.record or not self.recording_start_time:
            return
        
        self.recording.append({
            "type": "output",
            "data": data,
            "time": time.time() - self.recording_start_time
        })


class EnhancedInteractiveDockerSession(EnhancedSandboxSession):
    """
    Enhanced interactive Docker session.
    
    This class provides an interactive session with terminal emulation,
    input/output redirection, and session recording for Docker containers.
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize an enhanced interactive Docker session.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.interactive_session = None
        self.rows = kwargs.get("rows", 24)
        self.cols = kwargs.get("cols", 80)
        self.record = kwargs.get("record", False)
    
    def start_interactive_session(self, command: Union[str, List[str]],
                                 terminal_size: Optional[Tuple[int, int]] = None) -> bool:
        """
        Start an interactive session.
        
        Args:
            command: The command to execute in the container
            terminal_size: Terminal size as (rows, cols)
            
        Returns:
            True if the session was started successfully, False otherwise
        """
        if not self._is_open or not self.container_id:
            raise RuntimeError("Session is not open")
        
        # Use provided terminal size or default
        if terminal_size:
            self.rows, self.cols = terminal_size
        
        # Create an enhanced interactive session
        self.interactive_session = EnhancedInteractiveSession(
            rows=self.rows,
            cols=self.cols,
            record=self.record
        )
        
        # Construct the docker exec command
        docker_cmd = ["docker", "exec", "-it", self.container_id]
        if isinstance(command, list):
            docker_cmd.extend(command)
        else:
            docker_cmd.extend(command.split())
        
        # Start the session
        return self.interactive_session.start(docker_cmd)
    
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
    
    def get_html_display(self) -> str:
        """
        Get the current display as HTML.
        
        Returns:
            HTML representation of the current display
        """
        if self.interactive_session:
            return self.interactive_session.get_html_display()
        return ""
    
    def resize_terminal(self, rows: int, cols: int) -> None:
        """
        Resize the terminal.
        
        Args:
            rows: New number of rows
            cols: New number of columns
        """
        if self.interactive_session:
            self.interactive_session.resize(rows, cols)
    
    def is_interactive_session_running(self) -> bool:
        """
        Check if the interactive session is running.
        
        Returns:
            True if the interactive session is running, False otherwise
        """
        if self.interactive_session:
            return self.interactive_session.is_running()
        return False
    
    def get_recording(self) -> Dict[str, Any]:
        """
        Get the session recording.
        
        Returns:
            Dictionary with session recording data
        """
        if self.interactive_session and self.record:
            return self.interactive_session.get_recording()
        return {"events": []}
    
    def save_recording(self, file_path: str) -> bool:
        """
        Save the session recording to a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if the recording was saved successfully, False otherwise
        """
        if self.interactive_session and self.record:
            return self.interactive_session.save_recording(file_path)
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


class SessionRecordingPlayer:
    """
    Player for session recordings.
    
    This class provides a player for session recordings, which can be used
    to replay recorded sessions.
    """
    
    def __init__(self, recording: Dict[str, Any]):
        """
        Initialize a session recording player.
        
        Args:
            recording: Session recording data
        """
        self.recording = recording
        self.events = recording.get("events", [])
        self.rows = recording.get("rows", 24)
        self.cols = recording.get("cols", 80)
        self.duration = recording.get("duration", 0)
        self.terminal = TerminalEmulator(self.rows, self.cols)
        self.renderer = TerminalRenderer(self.terminal.state)
        self.current_time = 0
        self.playing = False
        self.play_thread = None
        self.speed = 1.0
        self.callbacks = []
    
    def play(self, speed: float = 1.0) -> None:
        """
        Play the recording.
        
        Args:
            speed: Playback speed (1.0 = normal speed)
        """
        if self.playing:
            return
        
        self.speed = speed
        self.playing = True
        self.play_thread = threading.Thread(target=self._play_loop)
        self.play_thread.daemon = True
        self.play_thread.start()
    
    def pause(self) -> None:
        """Pause the playback."""
        self.playing = False
        if self.play_thread:
            self.play_thread.join(timeout=1.0)
            self.play_thread = None
    
    def stop(self) -> None:
        """Stop the playback and reset."""
        self.pause()
        self.current_time = 0
        self.terminal = TerminalEmulator(self.rows, self.cols)
        self.renderer = TerminalRenderer(self.terminal.state)
    
    def seek(self, time_pos: float) -> None:
        """
        Seek to a specific time position.
        
        Args:
            time_pos: Time position in seconds
        """
        # Pause playback
        was_playing = self.playing
        self.pause()
        
        # Reset terminal
        self.terminal = TerminalEmulator(self.rows, self.cols)
        self.renderer = TerminalRenderer(self.terminal.state)
        
        # Play events up to the specified time
        for event in self.events:
            if event["time"] <= time_pos:
                if event["type"] == "output":
                    self.terminal.write(event["data"])
                elif event["type"] == "input":
                    self.terminal.send_input(event["data"])
        
        # Update current time
        self.current_time = time_pos
        
        # Notify callbacks
        for callback in self.callbacks:
            callback(self.current_time, self.get_html_display())
        
        # Resume playback if it was playing
        if was_playing:
            self.play(self.speed)
    
    def get_html_display(self) -> str:
        """
        Get the current display as HTML.
        
        Returns:
            HTML representation of the current display
        """
        return self.renderer.render_html()
    
    def add_callback(self, callback: Callable[[float, str], None]) -> None:
        """
        Add a callback function.
        
        Args:
            callback: Callback function that takes time position and HTML display
        """
        self.callbacks.append(callback)
    
    def _play_loop(self) -> None:
        """Playback loop."""
        # Find the next event to play
        next_event_index = 0
        for i, event in enumerate(self.events):
            if event["time"] > self.current_time:
                next_event_index = i
                break
        
        # Play events
        start_time = time.time()
        start_pos = self.current_time
        
        while self.playing and next_event_index < len(self.events):
            # Get the next event
            event = self.events[next_event_index]
            
            # Calculate the time to wait
            wait_time = (event["time"] - start_pos) / self.speed - (time.time() - start_time)
            
            if wait_time > 0:
                # Wait for the event
                time.sleep(wait_time)
            
            # Process the event
            if event["type"] == "output":
                self.terminal.write(event["data"])
            elif event["type"] == "input":
                self.terminal.send_input(event["data"])
            
            # Update current time
            self.current_time = event["time"]
            
            # Notify callbacks
            for callback in self.callbacks:
                callback(self.current_time, self.get_html_display())
            
            # Move to the next event
            next_event_index += 1
        
        # End of playback
        if next_event_index >= len(self.events):
            self.playing = False
            
            # Notify callbacks
            for callback in self.callbacks:
                callback(self.duration, self.get_html_display())

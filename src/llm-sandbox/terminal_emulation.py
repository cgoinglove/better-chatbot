"""
Terminal emulation for sandbox environments.

This module provides classes and functions for terminal emulation in
sandbox environments, including ANSI escape sequence handling, terminal
size management, and input/output processing.
"""

import os
import re
import struct
import fcntl
import termios
import select
import signal
import threading
import queue
import time
from typing import Dict, Any, Optional, List, Tuple, Callable, Union

# ANSI escape sequences
ANSI_ESCAPE_PATTERN = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
ANSI_COLORS = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "dim": "\033[2m",
    "italic": "\033[3m",
    "underline": "\033[4m",
    "blink": "\033[5m",
    "reverse": "\033[7m",
    "hidden": "\033[8m",
    "black": "\033[30m",
    "red": "\033[31m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "blue": "\033[34m",
    "magenta": "\033[35m",
    "cyan": "\033[36m",
    "white": "\033[37m",
    "bg_black": "\033[40m",
    "bg_red": "\033[41m",
    "bg_green": "\033[42m",
    "bg_yellow": "\033[43m",
    "bg_blue": "\033[44m",
    "bg_magenta": "\033[45m",
    "bg_cyan": "\033[46m",
    "bg_white": "\033[47m"
}


class TerminalState:
    """Represents the state of a terminal."""
    
    def __init__(self, rows: int = 24, cols: int = 80):
        """
        Initialize a terminal state.
        
        Args:
            rows: Number of rows in the terminal
            cols: Number of columns in the terminal
        """
        self.rows = rows
        self.cols = cols
        self.cursor_row = 0
        self.cursor_col = 0
        self.buffer = []
        self.attrs = {
            "bold": False,
            "dim": False,
            "italic": False,
            "underline": False,
            "blink": False,
            "reverse": False,
            "hidden": False,
            "fg_color": None,
            "bg_color": None
        }
        
        # Initialize buffer with empty lines
        for _ in range(rows):
            self.buffer.append([" " * cols])
    
    def resize(self, rows: int, cols: int):
        """
        Resize the terminal.
        
        Args:
            rows: New number of rows
            cols: New number of columns
        """
        # Save old buffer
        old_buffer = self.buffer
        old_rows = self.rows
        old_cols = self.cols
        
        # Update dimensions
        self.rows = rows
        self.cols = cols
        
        # Create new buffer
        self.buffer = []
        for _ in range(rows):
            self.buffer.append([" " * cols])
        
        # Copy old buffer to new buffer
        for i in range(min(old_rows, rows)):
            for j in range(min(old_cols, cols)):
                if i < len(old_buffer) and j < len(old_buffer[i]):
                    self.buffer[i][j] = old_buffer[i][j]
        
        # Adjust cursor position
        self.cursor_row = min(self.cursor_row, rows - 1)
        self.cursor_col = min(self.cursor_col, cols - 1)
    
    def write(self, text: str):
        """
        Write text to the terminal.
        
        Args:
            text: Text to write
        """
        # Process ANSI escape sequences
        parts = ANSI_ESCAPE_PATTERN.split(text)
        escapes = ANSI_ESCAPE_PATTERN.findall(text)
        
        # Process each part
        for i, part in enumerate(parts):
            # Write the text part
            self._write_text(part)
            
            # Process the escape sequence (if any)
            if i < len(escapes):
                self._process_escape(escapes[i])
    
    def _write_text(self, text: str):
        """
        Write plain text to the terminal.
        
        Args:
            text: Text to write
        """
        for char in text:
            if char == "\n":
                # Move to the beginning of the next line
                self.cursor_col = 0
                self.cursor_row += 1
                
                # Scroll if needed
                if self.cursor_row >= self.rows:
                    self.buffer.pop(0)
                    self.buffer.append([" " * self.cols])
                    self.cursor_row = self.rows - 1
            elif char == "\r":
                # Move to the beginning of the current line
                self.cursor_col = 0
            elif char == "\b":
                # Move back one character
                if self.cursor_col > 0:
                    self.cursor_col -= 1
            elif char == "\t":
                # Move to the next tab stop
                self.cursor_col = (self.cursor_col + 8) // 8 * 8
                
                # Wrap if needed
                if self.cursor_col >= self.cols:
                    self.cursor_col = 0
                    self.cursor_row += 1
                    
                    # Scroll if needed
                    if self.cursor_row >= self.rows:
                        self.buffer.pop(0)
                        self.buffer.append([" " * self.cols])
                        self.cursor_row = self.rows - 1
            else:
                # Write the character
                if self.cursor_row < len(self.buffer) and self.cursor_col < self.cols:
                    self.buffer[self.cursor_row][self.cursor_col] = char
                
                # Move to the next column
                self.cursor_col += 1
                
                # Wrap if needed
                if self.cursor_col >= self.cols:
                    self.cursor_col = 0
                    self.cursor_row += 1
                    
                    # Scroll if needed
                    if self.cursor_row >= self.rows:
                        self.buffer.pop(0)
                        self.buffer.append([" " * self.cols])
                        self.cursor_row = self.rows - 1
    
    def _process_escape(self, escape: str):
        """
        Process an ANSI escape sequence.
        
        Args:
            escape: ANSI escape sequence
        """
        # Handle cursor movement
        if escape.startswith("\033[") and escape.endswith("A"):
            # Cursor up
            count = int(escape[2:-1]) if len(escape) > 3 else 1
            self.cursor_row = max(0, self.cursor_row - count)
        elif escape.startswith("\033[") and escape.endswith("B"):
            # Cursor down
            count = int(escape[2:-1]) if len(escape) > 3 else 1
            self.cursor_row = min(self.rows - 1, self.cursor_row + count)
        elif escape.startswith("\033[") and escape.endswith("C"):
            # Cursor forward
            count = int(escape[2:-1]) if len(escape) > 3 else 1
            self.cursor_col = min(self.cols - 1, self.cursor_col + count)
        elif escape.startswith("\033[") and escape.endswith("D"):
            # Cursor backward
            count = int(escape[2:-1]) if len(escape) > 3 else 1
            self.cursor_col = max(0, self.cursor_col - count)
        elif escape.startswith("\033[") and escape.endswith("H"):
            # Cursor position
            if len(escape) > 3:
                parts = escape[2:-1].split(";")
                if len(parts) == 2:
                    self.cursor_row = max(0, min(self.rows - 1, int(parts[0]) - 1))
                    self.cursor_col = max(0, min(self.cols - 1, int(parts[1]) - 1))
            else:
                self.cursor_row = 0
                self.cursor_col = 0
        elif escape.startswith("\033[") and escape.endswith("J"):
            # Erase in display
            mode = escape[2:-1] if len(escape) > 3 else "0"
            if mode == "0" or mode == "":
                # Erase from cursor to end of screen
                for i in range(self.cursor_row, self.rows):
                    if i == self.cursor_row:
                        self.buffer[i] = self.buffer[i][:self.cursor_col] + [" " * (self.cols - self.cursor_col)]
                    else:
                        self.buffer[i] = [" " * self.cols]
            elif mode == "1":
                # Erase from start of screen to cursor
                for i in range(self.cursor_row + 1):
                    if i == self.cursor_row:
                        self.buffer[i] = [" " * self.cursor_col] + self.buffer[i][self.cursor_col:]
                    else:
                        self.buffer[i] = [" " * self.cols]
            elif mode == "2" or mode == "3":
                # Erase entire screen
                for i in range(self.rows):
                    self.buffer[i] = [" " * self.cols]
        elif escape.startswith("\033[") and escape.endswith("K"):
            # Erase in line
            mode = escape[2:-1] if len(escape) > 3 else "0"
            if mode == "0" or mode == "":
                # Erase from cursor to end of line
                self.buffer[self.cursor_row] = self.buffer[self.cursor_row][:self.cursor_col] + [" " * (self.cols - self.cursor_col)]
            elif mode == "1":
                # Erase from start of line to cursor
                self.buffer[self.cursor_row] = [" " * self.cursor_col] + self.buffer[self.cursor_row][self.cursor_col:]
            elif mode == "2":
                # Erase entire line
                self.buffer[self.cursor_row] = [" " * self.cols]
        elif escape.startswith("\033[") and escape.endswith("m"):
            # SGR (Select Graphic Rendition)
            if len(escape) > 3:
                params = escape[2:-1].split(";")
                for param in params:
                    if param == "0":
                        # Reset all attributes
                        self.attrs = {
                            "bold": False,
                            "dim": False,
                            "italic": False,
                            "underline": False,
                            "blink": False,
                            "reverse": False,
                            "hidden": False,
                            "fg_color": None,
                            "bg_color": None
                        }
                    elif param == "1":
                        self.attrs["bold"] = True
                    elif param == "2":
                        self.attrs["dim"] = True
                    elif param == "3":
                        self.attrs["italic"] = True
                    elif param == "4":
                        self.attrs["underline"] = True
                    elif param == "5":
                        self.attrs["blink"] = True
                    elif param == "7":
                        self.attrs["reverse"] = True
                    elif param == "8":
                        self.attrs["hidden"] = True
                    elif param == "22":
                        self.attrs["bold"] = False
                        self.attrs["dim"] = False
                    elif param == "23":
                        self.attrs["italic"] = False
                    elif param == "24":
                        self.attrs["underline"] = False
                    elif param == "25":
                        self.attrs["blink"] = False
                    elif param == "27":
                        self.attrs["reverse"] = False
                    elif param == "28":
                        self.attrs["hidden"] = False
                    elif param in ["30", "31", "32", "33", "34", "35", "36", "37"]:
                        self.attrs["fg_color"] = int(param) - 30
                    elif param in ["40", "41", "42", "43", "44", "45", "46", "47"]:
                        self.attrs["bg_color"] = int(param) - 40
                    elif param == "39":
                        self.attrs["fg_color"] = None
                    elif param == "49":
                        self.attrs["bg_color"] = None
            else:
                # Reset all attributes
                self.attrs = {
                    "bold": False,
                    "dim": False,
                    "italic": False,
                    "underline": False,
                    "blink": False,
                    "reverse": False,
                    "hidden": False,
                    "fg_color": None,
                    "bg_color": None
                }
    
    def get_display(self) -> str:
        """
        Get the current display as a string.
        
        Returns:
            Current display as a string
        """
        display = []
        for line in self.buffer:
            display.append("".join(line))
        return "\n".join(display)
    
    def get_cursor_position(self) -> Tuple[int, int]:
        """
        Get the current cursor position.
        
        Returns:
            Tuple of (row, column)
        """
        return (self.cursor_row, self.cursor_col)


class TerminalEmulator:
    """Terminal emulator for interactive sessions."""
    
    def __init__(self, rows: int = 24, cols: int = 80):
        """
        Initialize a terminal emulator.
        
        Args:
            rows: Number of rows in the terminal
            cols: Number of columns in the terminal
        """
        self.state = TerminalState(rows, cols)
        self.input_queue = queue.Queue()
        self.output_queue = queue.Queue()
        self.input_callbacks = []
        self.output_callbacks = []
        self.running = False
        self.input_thread = None
        self.output_thread = None
    
    def start(self):
        """Start the terminal emulator."""
        if self.running:
            return
        
        self.running = True
        
        # Start input thread
        self.input_thread = threading.Thread(target=self._input_loop)
        self.input_thread.daemon = True
        self.input_thread.start()
        
        # Start output thread
        self.output_thread = threading.Thread(target=self._output_loop)
        self.output_thread.daemon = True
        self.output_thread.start()
    
    def stop(self):
        """Stop the terminal emulator."""
        self.running = False
        
        # Wait for threads to stop
        if self.input_thread:
            self.input_thread.join(timeout=1.0)
            self.input_thread = None
        
        if self.output_thread:
            self.output_thread.join(timeout=1.0)
            self.output_thread = None
    
    def resize(self, rows: int, cols: int):
        """
        Resize the terminal.
        
        Args:
            rows: New number of rows
            cols: New number of columns
        """
        self.state.resize(rows, cols)
    
    def write(self, text: str):
        """
        Write text to the terminal.
        
        Args:
            text: Text to write
        """
        self.state.write(text)
        
        # Notify output callbacks
        for callback in self.output_callbacks:
            callback(text)
    
    def read(self, timeout: Optional[float] = None) -> str:
        """
        Read text from the terminal.
        
        Args:
            timeout: Timeout in seconds (None for no timeout)
            
        Returns:
            Text read from the terminal
        """
        try:
            return self.input_queue.get(timeout=timeout)
        except queue.Empty:
            return ""
    
    def send_input(self, text: str):
        """
        Send input to the terminal.
        
        Args:
            text: Text to send
        """
        self.input_queue.put(text)
        
        # Notify input callbacks
        for callback in self.input_callbacks:
            callback(text)
    
    def get_output(self, timeout: Optional[float] = None) -> str:
        """
        Get output from the terminal.
        
        Args:
            timeout: Timeout in seconds (None for no timeout)
            
        Returns:
            Output from the terminal
        """
        try:
            return self.output_queue.get(timeout=timeout)
        except queue.Empty:
            return ""
    
    def add_input_callback(self, callback: Callable[[str], None]):
        """
        Add an input callback.
        
        Args:
            callback: Callback function that takes input text
        """
        self.input_callbacks.append(callback)
    
    def add_output_callback(self, callback: Callable[[str], None]):
        """
        Add an output callback.
        
        Args:
            callback: Callback function that takes output text
        """
        self.output_callbacks.append(callback)
    
    def get_display(self) -> str:
        """
        Get the current display as a string.
        
        Returns:
            Current display as a string
        """
        return self.state.get_display()
    
    def get_cursor_position(self) -> Tuple[int, int]:
        """
        Get the current cursor position.
        
        Returns:
            Tuple of (row, column)
        """
        return self.state.get_cursor_position()
    
    def _input_loop(self):
        """Input processing loop."""
        while self.running:
            try:
                # Get input from the queue
                text = self.input_queue.get(timeout=0.1)
                
                # Process input
                self._process_input(text)
                
            except queue.Empty:
                # No input available
                pass
            except Exception as e:
                print(f"Error processing input: {e}")
    
    def _output_loop(self):
        """Output processing loop."""
        while self.running:
            try:
                # Get output from the display
                display = self.get_display()
                
                # Put output in the queue
                self.output_queue.put(display)
                
                # Sleep for a short time
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Error processing output: {e}")
    
    def _process_input(self, text: str):
        """
        Process input text.
        
        Args:
            text: Input text
        """
        # Echo input to the display
        self.write(text)


class PtyTerminalEmulator(TerminalEmulator):
    """Terminal emulator that uses a pseudo-terminal."""
    
    def __init__(self, rows: int = 24, cols: int = 80):
        """
        Initialize a PTY terminal emulator.
        
        Args:
            rows: Number of rows in the terminal
            cols: Number of columns in the terminal
        """
        super().__init__(rows, cols)
        self.master_fd = None
        self.slave_fd = None
        self.process = None
        self.read_thread = None
        self.write_thread = None
    
    def start_process(self, command: List[str], env: Optional[Dict[str, str]] = None):
        """
        Start a process in the terminal.
        
        Args:
            command: Command to run
            env: Environment variables
        """
        import pty
        import subprocess
        
        # Create a pseudo-terminal
        self.master_fd, self.slave_fd = pty.openpty()
        
        # Set terminal size
        term_size = struct.pack("HHHH", self.state.rows, self.state.cols, 0, 0)
        fcntl.ioctl(self.slave_fd, termios.TIOCSWINSZ, term_size)
        
        # Start the process
        self.process = subprocess.Popen(
            command,
            stdin=self.slave_fd,
            stdout=self.slave_fd,
            stderr=self.slave_fd,
            env=env,
            preexec_fn=os.setsid,
            start_new_session=True
        )
        
        # Start the terminal emulator
        self.start()
        
        # Start read thread
        self.read_thread = threading.Thread(target=self._read_loop)
        self.read_thread.daemon = True
        self.read_thread.start()
        
        # Start write thread
        self.write_thread = threading.Thread(target=self._write_loop)
        self.write_thread.daemon = True
        self.write_thread.start()
    
    def stop(self):
        """Stop the terminal emulator and the process."""
        # Stop the process
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
        
        # Stop the terminal emulator
        super().stop()
        
        # Wait for threads to stop
        if self.read_thread:
            self.read_thread.join(timeout=1.0)
            self.read_thread = None
        
        if self.write_thread:
            self.write_thread.join(timeout=1.0)
            self.write_thread = None
    
    def resize(self, rows: int, cols: int):
        """
        Resize the terminal.
        
        Args:
            rows: New number of rows
            cols: New number of columns
        """
        # Update terminal state
        super().resize(rows, cols)
        
        # Update PTY size
        if self.master_fd:
            term_size = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, term_size)
    
    def _read_loop(self):
        """Read from the PTY and write to the terminal."""
        buffer_size = 1024
        
        while self.running and self.master_fd:
            try:
                # Check if there's data to read
                r, _, _ = select.select([self.master_fd], [], [], 0.1)
                
                if self.master_fd in r:
                    # Read data from the master fd
                    data = os.read(self.master_fd, buffer_size)
                    
                    if data:
                        # Write the data to the terminal
                        self.write(data.decode("utf-8", errors="replace"))
                    else:
                        # End of file
                        break
                
            except (OSError, IOError) as e:
                print(f"Error reading from PTY: {e}")
                break
            except Exception as e:
                print(f"Unexpected error reading from PTY: {e}")
                break
    
    def _write_loop(self):
        """Read from the terminal and write to the PTY."""
        while self.running and self.master_fd:
            try:
                # Get input from the queue
                text = self.read(timeout=0.1)
                
                if text:
                    # Write the data to the master fd
                    os.write(self.master_fd, text.encode("utf-8"))
                
            except (OSError, IOError) as e:
                print(f"Error writing to PTY: {e}")
                break
            except Exception as e:
                print(f"Unexpected error writing to PTY: {e}")
                break


class TerminalRenderer:
    """Renders a terminal state as HTML."""
    
    def __init__(self, state: TerminalState):
        """
        Initialize a terminal renderer.
        
        Args:
            state: Terminal state to render
        """
        self.state = state
    
    def render_html(self) -> str:
        """
        Render the terminal state as HTML.
        
        Returns:
            HTML representation of the terminal state
        """
        html = ["<pre class=\"terminal\">"]
        
        for i, line in enumerate(self.state.buffer):
            html.append("<div class=\"terminal-line\">")
            
            for j, char in enumerate(line):
                # Check if this is the cursor position
                is_cursor = (i == self.state.cursor_row and j == self.state.cursor_col)
                
                # Get character style
                style = self._get_style(is_cursor)
                
                # Add the character
                html.append(f"<span style=\"{style}\">{self._escape_html(char)}</span>")
            
            html.append("</div>")
        
        html.append("</pre>")
        
        return "".join(html)
    
    def _get_style(self, is_cursor: bool) -> str:
        """
        Get the CSS style for a character.
        
        Args:
            is_cursor: Whether this is the cursor position
            
        Returns:
            CSS style string
        """
        style = []
        
        # Add cursor style
        if is_cursor:
            style.append("background-color: #ffffff;")
            style.append("color: #000000;")
        else:
            # Add attribute styles
            if self.state.attrs["bold"]:
                style.append("font-weight: bold;")
            
            if self.state.attrs["dim"]:
                style.append("opacity: 0.5;")
            
            if self.state.attrs["italic"]:
                style.append("font-style: italic;")
            
            if self.state.attrs["underline"]:
                style.append("text-decoration: underline;")
            
            if self.state.attrs["blink"]:
                style.append("animation: blink 1s step-end infinite;")
            
            # Add color styles
            if self.state.attrs["fg_color"] is not None:
                fg_color = self._get_color(self.state.attrs["fg_color"])
                style.append(f"color: {fg_color};")
            
            if self.state.attrs["bg_color"] is not None:
                bg_color = self._get_color(self.state.attrs["bg_color"])
                style.append(f"background-color: {bg_color};")
            
            # Handle reverse video
            if self.state.attrs["reverse"]:
                style.append("filter: invert(100%);")
            
            # Handle hidden text
            if self.state.attrs["hidden"]:
                style.append("visibility: hidden;")
        
        return " ".join(style)
    
    def _get_color(self, color_code: int) -> str:
        """
        Get the CSS color for an ANSI color code.
        
        Args:
            color_code: ANSI color code (0-7)
            
        Returns:
            CSS color string
        """
        colors = [
            "#000000",  # Black
            "#aa0000",  # Red
            "#00aa00",  # Green
            "#aa5500",  # Yellow
            "#0000aa",  # Blue
            "#aa00aa",  # Magenta
            "#00aaaa",  # Cyan
            "#aaaaaa"   # White
        ]
        
        return colors[color_code % len(colors)]
    
    def _escape_html(self, text: str) -> str:
        """
        Escape HTML special characters.
        
        Args:
            text: Text to escape
            
        Returns:
            Escaped text
        """
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;")

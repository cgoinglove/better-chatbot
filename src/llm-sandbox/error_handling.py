"""
Error handling for sandbox environments.

This module provides classes and functions for improved error handling in
sandbox environments, including detailed error messages, debugging support,
and stack traces.
"""

import os
import sys
import traceback
import re
import ast
from typing import Dict, Any, Optional, List, Tuple, Union


class SandboxError(Exception):
    """Base class for sandbox errors."""
    
    def __init__(self, message: str, error_code: Optional[int] = None):
        """
        Initialize a sandbox error.
        
        Args:
            message: Error message
            error_code: Error code
        """
        super().__init__(message)
        self.error_code = error_code


class ExecutionError(SandboxError):
    """Error during code execution."""
    
    def __init__(self, message: str, error_code: Optional[int] = None,
                stdout: Optional[str] = None, stderr: Optional[str] = None,
                traceback_info: Optional[str] = None):
        """
        Initialize an execution error.
        
        Args:
            message: Error message
            error_code: Error code
            stdout: Standard output
            stderr: Standard error
            traceback_info: Traceback information
        """
        super().__init__(message, error_code)
        self.stdout = stdout
        self.stderr = stderr
        self.traceback_info = traceback_info


class ConfigurationError(SandboxError):
    """Error in sandbox configuration."""
    
    def __init__(self, message: str, config_key: Optional[str] = None):
        """
        Initialize a configuration error.
        
        Args:
            message: Error message
            config_key: Configuration key that caused the error
        """
        super().__init__(message)
        self.config_key = config_key


class ResourceError(SandboxError):
    """Error related to resource limits."""
    
    def __init__(self, message: str, resource_type: Optional[str] = None,
                limit: Optional[Union[int, float, str]] = None,
                usage: Optional[Union[int, float, str]] = None):
        """
        Initialize a resource error.
        
        Args:
            message: Error message
            resource_type: Type of resource (e.g., "cpu", "memory")
            limit: Resource limit
            usage: Resource usage
        """
        super().__init__(message)
        self.resource_type = resource_type
        self.limit = limit
        self.usage = usage


class SecurityError(SandboxError):
    """Error related to security restrictions."""
    
    def __init__(self, message: str, security_profile: Optional[str] = None):
        """
        Initialize a security error.
        
        Args:
            message: Error message
            security_profile: Security profile that caused the error
        """
        super().__init__(message)
        self.security_profile = security_profile


class ErrorAnalyzer:
    """Analyzes errors and provides detailed information."""
    
    def __init__(self):
        """Initialize an error analyzer."""
        # Common error patterns for different languages
        self.error_patterns = {
            "python": [
                (r"NameError: name '([^']+)' is not defined", "Undefined variable: {0}"),
                (r"SyntaxError: invalid syntax", "Syntax error in the code"),
                (r"IndentationError: ([^\\n]+)", "Indentation error: {0}"),
                (r"ImportError: No module named '([^']+)'", "Missing module: {0}"),
                (r"TypeError: ([^\\n]+)", "Type error: {0}"),
                (r"ValueError: ([^\\n]+)", "Value error: {0}"),
                (r"IndexError: ([^\\n]+)", "Index error: {0}"),
                (r"KeyError: ([^\\n]+)", "Key error: {0}"),
                (r"AttributeError: ([^\\n]+)", "Attribute error: {0}"),
                (r"ZeroDivisionError: ([^\\n]+)", "Division by zero: {0}")
            ],
            "javascript": [
                (r"ReferenceError: ([^\\n]+)", "Reference error: {0}"),
                (r"SyntaxError: ([^\\n]+)", "Syntax error: {0}"),
                (r"TypeError: ([^\\n]+)", "Type error: {0}"),
                (r"RangeError: ([^\\n]+)", "Range error: {0}"),
                (r"URIError: ([^\\n]+)", "URI error: {0}"),
                (r"EvalError: ([^\\n]+)", "Eval error: {0}"),
                (r"Error: ([^\\n]+)", "Error: {0}")
            ],
            "java": [
                (r"error: ([^\\n]+)", "Compilation error: {0}"),
                (r"Exception in thread \"[^\"]*\" ([^:]+): ([^\\n]+)", "{0}: {1}"),
                (r"java.lang.([^:]+): ([^\\n]+)", "{0}: {1}")
            ],
            "cpp": [
                (r"error: ([^\\n]+)", "Compilation error: {0}"),
                (r"undefined reference to ([^']+)", "Undefined reference: {0}"),
                (r"Segmentation fault", "Segmentation fault (memory access violation)")
            ],
            "go": [
                (r"undefined: ([^\\n]+)", "Undefined: {0}"),
                (r"cannot use ([^\\n]+)", "Cannot use: {0}"),
                (r"syntax error: ([^\\n]+)", "Syntax error: {0}")
            ],
            "ruby": [
                (r"NameError: ([^\\n]+)", "Name error: {0}"),
                (r"SyntaxError: ([^\\n]+)", "Syntax error: {0}"),
                (r"TypeError: ([^\\n]+)", "Type error: {0}"),
                (r"ArgumentError: ([^\\n]+)", "Argument error: {0}")
            ]
        }
    
    def analyze_error(self, language: str, stderr: str, stdout: str = "",
                     code: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze an error and provide detailed information.
        
        Args:
            language: Programming language
            stderr: Standard error output
            stdout: Standard output
            code: Source code (optional)
            
        Returns:
            Dictionary with error information
        """
        # Combine stdout and stderr for analysis
        output = stderr
        if stdout and not stderr:
            output = stdout
        
        # Initialize error info
        error_info = {
            "type": "unknown",
            "message": "Unknown error",
            "details": "",
            "line_number": None,
            "column_number": None,
            "code_snippet": None,
            "suggestions": []
        }
        
        # Check for timeout
        if "timeout" in output.lower():
            error_info["type"] = "timeout"
            error_info["message"] = "Execution timed out"
            error_info["details"] = "The code took too long to execute and was terminated"
            error_info["suggestions"] = [
                "Check for infinite loops",
                "Optimize your code to run faster",
                "Increase the timeout limit if possible"
            ]
            return error_info
        
        # Check for memory limit
        if "memory" in output.lower() and ("limit" in output.lower() or "allocation" in output.lower()):
            error_info["type"] = "memory"
            error_info["message"] = "Memory limit exceeded"
            error_info["details"] = "The code tried to use more memory than allowed"
            error_info["suggestions"] = [
                "Check for memory leaks",
                "Optimize your code to use less memory",
                "Increase the memory limit if possible"
            ]
            return error_info
        
        # Check for language-specific error patterns
        if language.lower() in self.error_patterns:
            for pattern, template in self.error_patterns[language.lower()]:
                match = re.search(pattern, output)
                if match:
                    # Format the error message using the template
                    groups = match.groups()
                    error_message = template.format(*groups)
                    
                    error_info["type"] = pattern.split(":")[0].lower()
                    error_info["message"] = error_message
                    error_info["details"] = match.group(0)
                    
                    # Try to extract line and column numbers
                    line_match = re.search(r"line (\d+)", output)
                    if line_match:
                        error_info["line_number"] = int(line_match.group(1))
                    
                    col_match = re.search(r"column (\d+)", output)
                    if col_match:
                        error_info["column_number"] = int(col_match.group(1))
                    
                    # Extract code snippet if line number is available and code is provided
                    if error_info["line_number"] is not None and code:
                        error_info["code_snippet"] = self._extract_code_snippet(
                            code, error_info["line_number"]
                        )
                    
                    # Add suggestions based on error type
                    error_info["suggestions"] = self._get_suggestions(
                        language, error_info["type"], error_info["message"]
                    )
                    
                    return error_info
        
        # If no specific error pattern was found, return a generic error
        if output:
            error_info["message"] = output.split("\n")[0]
            error_info["details"] = output
        
        return error_info
    
    def _extract_code_snippet(self, code: str, line_number: int, context: int = 2) -> str:
        """
        Extract a code snippet around the error.
        
        Args:
            code: Source code
            line_number: Line number of the error
            context: Number of lines of context to include
            
        Returns:
            Code snippet
        """
        lines = code.split("\n")
        
        # Adjust line number (1-based to 0-based)
        line_index = line_number - 1
        
        # Calculate start and end lines
        start_line = max(0, line_index - context)
        end_line = min(len(lines), line_index + context + 1)
        
        # Extract the snippet
        snippet_lines = []
        for i in range(start_line, end_line):
            prefix = "  "
            if i == line_index:
                prefix = "> "
            line_num = i + 1
            snippet_lines.append(f"{prefix}{line_num}: {lines[i]}")
        
        return "\n".join(snippet_lines)
    
    def _get_suggestions(self, language: str, error_type: str, error_message: str) -> List[str]:
        """
        Get suggestions for fixing an error.
        
        Args:
            language: Programming language
            error_type: Type of error
            error_message: Error message
            
        Returns:
            List of suggestions
        """
        # Common suggestions for different error types
        common_suggestions = {
            "syntax": [
                "Check for missing parentheses, brackets, or braces",
                "Check for missing semicolons or colons",
                "Check for typos in keywords",
                "Make sure indentation is correct"
            ],
            "name": [
                "Check for typos in variable names",
                "Make sure the variable is defined before use",
                "Check the scope of the variable"
            ],
            "type": [
                "Check the types of your variables",
                "Make sure you're using the right operations for the types",
                "Convert types explicitly if needed"
            ],
            "import": [
                "Make sure the module is installed",
                "Check for typos in the module name",
                "Check the import path"
            ],
            "index": [
                "Check array/list bounds",
                "Make sure the index is valid",
                "Use defensive programming to check indices before access"
            ],
            "key": [
                "Make sure the key exists in the dictionary/map",
                "Check for typos in the key",
                "Use defensive programming to check keys before access"
            ],
            "attribute": [
                "Check if the object has the attribute/method",
                "Check for typos in the attribute/method name",
                "Make sure you're using the right object"
            ],
            "value": [
                "Check the values you're using",
                "Make sure the values are in the expected range",
                "Validate input values"
            ]
        }
        
        # Language-specific suggestions
        language_suggestions = {
            "python": {
                "indentation": [
                    "Make sure all lines in the same block have the same indentation",
                    "Use spaces or tabs consistently (preferably spaces)",
                    "Check for mixed tabs and spaces"
                ],
                "zerodivision": [
                    "Check for division by zero",
                    "Add a check before division: if denominator != 0"
                ]
            },
            "javascript": {
                "reference": [
                    "Make sure the variable is defined before use",
                    "Check if you're using 'const' or 'let' to declare variables",
                    "Check the scope of the variable"
                ],
                "range": [
                    "Check array bounds",
                    "Make sure numbers are within the expected range"
                ]
            }
        }
        
        # Get common suggestions for the error type
        suggestions = common_suggestions.get(error_type, [])
        
        # Add language-specific suggestions
        if language in language_suggestions and error_type in language_suggestions[language]:
            suggestions.extend(language_suggestions[language][error_type])
        
        # If no specific suggestions, add generic ones
        if not suggestions:
            suggestions = [
                "Review the error message carefully",
                "Check the documentation for the functions/methods you're using",
                "Try simplifying your code to isolate the issue"
            ]
        
        return suggestions


class StackTraceAnalyzer:
    """Analyzes stack traces and provides detailed information."""
    
    def __init__(self):
        """Initialize a stack trace analyzer."""
        pass
    
    def parse_python_traceback(self, traceback_text: str) -> List[Dict[str, Any]]:
        """
        Parse a Python traceback.
        
        Args:
            traceback_text: Traceback text
            
        Returns:
            List of frames in the traceback
        """
        frames = []
        
        # Regular expression to match traceback lines
        frame_pattern = r'File "([^"]+)", line (\d+), in (.+)\n\s+(.+)'
        
        # Find all frames in the traceback
        for match in re.finditer(frame_pattern, traceback_text):
            file_path, line_number, function_name, code_line = match.groups()
            
            frames.append({
                "file": file_path,
                "line": int(line_number),
                "function": function_name,
                "code": code_line.strip()
            })
        
        return frames
    
    def parse_javascript_stack(self, stack_text: str) -> List[Dict[str, Any]]:
        """
        Parse a JavaScript stack trace.
        
        Args:
            stack_text: Stack trace text
            
        Returns:
            List of frames in the stack trace
        """
        frames = []
        
        # Regular expression to match stack trace lines
        frame_pattern = r'at\s+(?:(.+)\s+\()?(?:(.+):(\d+):(\d+))\)?'
        
        # Find all frames in the stack trace
        for match in re.finditer(frame_pattern, stack_text):
            groups = match.groups()
            
            if len(groups) == 4:
                function_name, file_path, line_number, column_number = groups
                
                frames.append({
                    "function": function_name if function_name else "<anonymous>",
                    "file": file_path,
                    "line": int(line_number),
                    "column": int(column_number)
                })
        
        return frames
    
    def analyze_traceback(self, language: str, traceback_text: str) -> Dict[str, Any]:
        """
        Analyze a traceback and provide detailed information.
        
        Args:
            language: Programming language
            traceback_text: Traceback text
            
        Returns:
            Dictionary with traceback information
        """
        traceback_info = {
            "language": language,
            "frames": [],
            "error_type": "unknown",
            "error_message": "",
            "summary": ""
        }
        
        if not traceback_text:
            return traceback_info
        
        # Parse traceback based on language
        if language.lower() == "python":
            # Extract error type and message
            error_match = re.search(r'([A-Za-z]+Error): (.+)$', traceback_text, re.MULTILINE)
            if error_match:
                traceback_info["error_type"] = error_match.group(1)
                traceback_info["error_message"] = error_match.group(2)
            
            # Parse frames
            traceback_info["frames"] = self.parse_python_traceback(traceback_text)
            
        elif language.lower() == "javascript":
            # Extract error type and message
            error_match = re.search(r'([A-Za-z]+Error): (.+)$', traceback_text, re.MULTILINE)
            if error_match:
                traceback_info["error_type"] = error_match.group(1)
                traceback_info["error_message"] = error_match.group(2)
            
            # Parse frames
            traceback_info["frames"] = self.parse_javascript_stack(traceback_text)
        
        # Generate a summary
        if traceback_info["frames"]:
            last_frame = traceback_info["frames"][-1]
            traceback_info["summary"] = f"{traceback_info['error_type']}: {traceback_info['error_message']} at {last_frame.get('file', 'unknown')}:{last_frame.get('line', 'unknown')}"
        else:
            traceback_info["summary"] = f"{traceback_info['error_type']}: {traceback_info['error_message']}"
        
        return traceback_info


class Debugger:
    """Base class for debuggers."""
    
    def __init__(self, code: str):
        """
        Initialize a debugger.
        
        Args:
            code: Source code to debug
        """
        self.code = code
        self.breakpoints = []
    
    def add_breakpoint(self, line_number: int):
        """
        Add a breakpoint.
        
        Args:
            line_number: Line number for the breakpoint
        """
        self.breakpoints.append(line_number)
    
    def remove_breakpoint(self, line_number: int):
        """
        Remove a breakpoint.
        
        Args:
            line_number: Line number for the breakpoint
        """
        if line_number in self.breakpoints:
            self.breakpoints.remove(line_number)
    
    def get_breakpoints(self) -> List[int]:
        """
        Get all breakpoints.
        
        Returns:
            List of breakpoint line numbers
        """
        return self.breakpoints
    
    def instrument_code(self) -> str:
        """
        Instrument the code with debugging statements.
        
        Returns:
            Instrumented code
        """
        raise NotImplementedError("Subclasses must implement instrument_code")


class PythonDebugger(Debugger):
    """Debugger for Python code."""
    
    def instrument_code(self) -> str:
        """
        Instrument Python code with debugging statements.
        
        Returns:
            Instrumented code
        """
        try:
            # Parse the code into an AST
            tree = ast.parse(self.code)
            
            # Create a transformer to add debugging statements
            transformer = PythonDebugTransformer(self.breakpoints)
            instrumented_tree = transformer.visit(tree)
            
            # Fix line numbers
            ast.fix_missing_locations(instrumented_tree)
            
            # Generate code from the instrumented AST
            return ast.unparse(instrumented_tree)
            
        except Exception as e:
            print(f"Error instrumenting code: {e}")
            return self.code


class PythonDebugTransformer(ast.NodeTransformer):
    """AST transformer for adding debugging statements to Python code."""
    
    def __init__(self, breakpoints: List[int]):
        """
        Initialize a Python debug transformer.
        
        Args:
            breakpoints: List of breakpoint line numbers
        """
        self.breakpoints = breakpoints
    
    def visit(self, node):
        """
        Visit a node in the AST.
        
        Args:
            node: AST node
            
        Returns:
            Transformed node
        """
        # Check if the node has a line number and it's a breakpoint
        if hasattr(node, 'lineno') and node.lineno in self.breakpoints:
            # Create a debug print statement
            debug_stmt = ast.Expr(
                value=ast.Call(
                    func=ast.Name(id='print', ctx=ast.Load()),
                    args=[
                        ast.Constant(value=f"Breakpoint at line {node.lineno}"),
                        ast.Call(
                            func=ast.Name(id='locals', ctx=ast.Load()),
                            args=[],
                            keywords=[]
                        )
                    ],
                    keywords=[]
                )
            )
            
            # Add the debug statement before the node
            if isinstance(node, ast.stmt):
                return [debug_stmt, node]
            
        # Continue with the normal transformation
        return super().visit(node)


class JavaScriptDebugger(Debugger):
    """Debugger for JavaScript code."""
    
    def instrument_code(self) -> str:
        """
        Instrument JavaScript code with debugging statements.
        
        Returns:
            Instrumented code
        """
        lines = self.code.split('\n')
        instrumented_lines = []
        
        for i, line in enumerate(lines):
            line_number = i + 1
            
            # Add debugging statement if this is a breakpoint
            if line_number in self.breakpoints:
                # Create a debug console.log statement
                indent = len(line) - len(line.lstrip())
                debug_stmt = ' ' * indent + f'console.log("Breakpoint at line {line_number}", ' + '{...(() => {try {return {locals: eval("({" + Object.keys(window).filter(k => !k.startsWith("webkit")).map(k => `${k}: ${k}`).join(",") + "})")}} catch (e) {return {error: e.message}}})()});'
                
                instrumented_lines.append(debug_stmt)
            
            instrumented_lines.append(line)
        
        return '\n'.join(instrumented_lines)


def create_debugger(language: str, code: str) -> Optional[Debugger]:
    """
    Create a debugger for the specified language.
    
    Args:
        language: Programming language
        code: Source code
        
    Returns:
        A debugger instance, or None if the language is not supported
    """
    if language.lower() == "python":
        return PythonDebugger(code)
    elif language.lower() == "javascript":
        return JavaScriptDebugger(code)
    else:
        return None

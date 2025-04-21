"""
Multi-file project support for sandbox environments.

This module provides classes and functions for working with multi-file projects
in sandbox environments, including project creation, file management, and
dependency management.
"""

import os
import shutil
import tempfile
import json
import zipfile
import tarfile
import subprocess
from typing import Dict, Any, Optional, List, Union, Set

from .sandbox_config import SandboxConfig
from .sandbox_result import ExecutionResult
from .enhanced_session import EnhancedSandboxSession


class ProjectFile:
    """Represents a file in a project."""
    
    def __init__(self, path: str, content: str, executable: bool = False):
        """
        Initialize a project file.
        
        Args:
            path: Path to the file (relative to project root)
            content: Content of the file
            executable: Whether the file should be executable
        """
        self.path = path
        self.content = content
        self.executable = executable
    
    def write_to_directory(self, directory: str) -> str:
        """
        Write the file to a directory.
        
        Args:
            directory: Directory to write the file to
            
        Returns:
            Full path to the written file
        """
        # Create the full path
        full_path = os.path.join(directory, self.path)
        
        # Create parent directories if they don't exist
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Write the file
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(self.content)
        
        # Set executable permission if needed
        if self.executable:
            os.chmod(full_path, 0o755)
        
        return full_path


class Project:
    """Represents a multi-file project."""
    
    def __init__(self, name: str, language: str = "python"):
        """
        Initialize a project.
        
        Args:
            name: Name of the project
            language: Primary programming language of the project
        """
        self.name = name
        self.language = language
        self.files = {}
        self.dependencies = []
        self.main_file = None
        self.build_commands = []
        self.run_commands = []
        self.test_commands = []
    
    def add_file(self, path: str, content: str, executable: bool = False, main: bool = False) -> None:
        """
        Add a file to the project.
        
        Args:
            path: Path to the file (relative to project root)
            content: Content of the file
            executable: Whether the file should be executable
            main: Whether this is the main file of the project
        """
        self.files[path] = ProjectFile(path, content, executable)
        
        if main:
            self.main_file = path
    
    def remove_file(self, path: str) -> bool:
        """
        Remove a file from the project.
        
        Args:
            path: Path to the file (relative to project root)
            
        Returns:
            True if the file was removed, False if it didn't exist
        """
        if path in self.files:
            del self.files[path]
            
            if self.main_file == path:
                self.main_file = None
            
            return True
        
        return False
    
    def get_file(self, path: str) -> Optional[ProjectFile]:
        """
        Get a file from the project.
        
        Args:
            path: Path to the file (relative to project root)
            
        Returns:
            The file, or None if it doesn't exist
        """
        return self.files.get(path)
    
    def add_dependency(self, dependency: str) -> None:
        """
        Add a dependency to the project.
        
        Args:
            dependency: Dependency specification (e.g., "requests==2.25.1")
        """
        if dependency not in self.dependencies:
            self.dependencies.append(dependency)
    
    def remove_dependency(self, dependency: str) -> bool:
        """
        Remove a dependency from the project.
        
        Args:
            dependency: Dependency specification
            
        Returns:
            True if the dependency was removed, False if it didn't exist
        """
        if dependency in self.dependencies:
            self.dependencies.remove(dependency)
            return True
        
        return False
    
    def add_build_command(self, command: str) -> None:
        """
        Add a build command to the project.
        
        Args:
            command: Build command
        """
        if command not in self.build_commands:
            self.build_commands.append(command)
    
    def add_run_command(self, command: str) -> None:
        """
        Add a run command to the project.
        
        Args:
            command: Run command
        """
        if command not in self.run_commands:
            self.run_commands.append(command)
    
    def add_test_command(self, command: str) -> None:
        """
        Add a test command to the project.
        
        Args:
            command: Test command
        """
        if command not in self.test_commands:
            self.test_commands.append(command)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the project to a dictionary.
        
        Returns:
            Dictionary representation of the project
        """
        return {
            "name": self.name,
            "language": self.language,
            "files": {
                path: {
                    "content": file.content,
                    "executable": file.executable
                }
                for path, file in self.files.items()
            },
            "dependencies": self.dependencies,
            "main_file": self.main_file,
            "build_commands": self.build_commands,
            "run_commands": self.run_commands,
            "test_commands": self.test_commands
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Project':
        """
        Create a project from a dictionary.
        
        Args:
            data: Dictionary representation of the project
            
        Returns:
            Project instance
        """
        project = cls(data["name"], data.get("language", "python"))
        
        # Add files
        for path, file_data in data.get("files", {}).items():
            project.add_file(
                path=path,
                content=file_data["content"],
                executable=file_data.get("executable", False),
                main=(path == data.get("main_file"))
            )
        
        # Add dependencies
        for dependency in data.get("dependencies", []):
            project.add_dependency(dependency)
        
        # Add commands
        for command in data.get("build_commands", []):
            project.add_build_command(command)
        
        for command in data.get("run_commands", []):
            project.add_run_command(command)
        
        for command in data.get("test_commands", []):
            project.add_test_command(command)
        
        return project
    
    def save_to_file(self, file_path: str) -> None:
        """
        Save the project to a file.
        
        Args:
            file_path: Path to the file
        """
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load_from_file(cls, file_path: str) -> 'Project':
        """
        Load a project from a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Project instance
        """
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return cls.from_dict(data)
    
    def export_to_directory(self, directory: str) -> None:
        """
        Export the project to a directory.
        
        Args:
            directory: Directory to export to
        """
        # Create the directory if it doesn't exist
        os.makedirs(directory, exist_ok=True)
        
        # Write all files
        for file in self.files.values():
            file.write_to_directory(directory)
        
        # Create dependency files based on language
        if self.dependencies:
            if self.language == "python":
                with open(os.path.join(directory, "requirements.txt"), "w", encoding="utf-8") as f:
                    f.write("\n".join(self.dependencies))
            elif self.language == "javascript" or self.language == "typescript":
                # Create a basic package.json
                package_json = {
                    "name": self.name,
                    "version": "1.0.0",
                    "dependencies": {}
                }
                
                for dep in self.dependencies:
                    parts = dep.split("==")
                    name = parts[0]
                    version = parts[1] if len(parts) > 1 else "latest"
                    package_json["dependencies"][name] = version
                
                with open(os.path.join(directory, "package.json"), "w", encoding="utf-8") as f:
                    json.dump(package_json, f, indent=2)
    
    def export_to_zip(self, file_path: str) -> None:
        """
        Export the project to a zip file.
        
        Args:
            file_path: Path to the zip file
        """
        with zipfile.ZipFile(file_path, "w") as zip_file:
            for path, file in self.files.items():
                zip_file.writestr(path, file.content)
            
            # Add dependency files based on language
            if self.dependencies:
                if self.language == "python":
                    zip_file.writestr("requirements.txt", "\n".join(self.dependencies))
                elif self.language == "javascript" or self.language == "typescript":
                    # Create a basic package.json
                    package_json = {
                        "name": self.name,
                        "version": "1.0.0",
                        "dependencies": {}
                    }
                    
                    for dep in self.dependencies:
                        parts = dep.split("==")
                        name = parts[0]
                        version = parts[1] if len(parts) > 1 else "latest"
                        package_json["dependencies"][name] = version
                    
                    zip_file.writestr("package.json", json.dumps(package_json, indent=2))
    
    @classmethod
    def import_from_directory(cls, directory: str, name: Optional[str] = None,
                             language: Optional[str] = None) -> 'Project':
        """
        Import a project from a directory.
        
        Args:
            directory: Directory to import from
            name: Name of the project (default: directory name)
            language: Primary programming language (default: auto-detect)
            
        Returns:
            Project instance
        """
        # Use directory name as project name if not specified
        if name is None:
            name = os.path.basename(os.path.abspath(directory))
        
        # Auto-detect language if not specified
        if language is None:
            language = _detect_project_language(directory)
        
        # Create the project
        project = cls(name, language)
        
        # Import dependencies
        if os.path.exists(os.path.join(directory, "requirements.txt")):
            with open(os.path.join(directory, "requirements.txt"), "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        project.add_dependency(line)
        
        if os.path.exists(os.path.join(directory, "package.json")):
            with open(os.path.join(directory, "package.json"), "r", encoding="utf-8") as f:
                package_json = json.load(f)
                for name, version in package_json.get("dependencies", {}).items():
                    project.add_dependency(f"{name}=={version}")
        
        # Import files
        for root, _, files in os.walk(directory):
            for file in files:
                # Skip dependency files
                if file in ["requirements.txt", "package.json", "package-lock.json", "yarn.lock"]:
                    continue
                
                # Get the relative path
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, directory)
                
                # Check if the file is executable
                executable = os.access(full_path, os.X_OK)
                
                # Read the file content
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                # Add the file to the project
                project.add_file(rel_path, content, executable)
        
        # Try to detect the main file
        main_file = _detect_main_file(directory, language)
        if main_file:
            project.main_file = main_file
        
        return project
    
    @classmethod
    def import_from_zip(cls, file_path: str, name: Optional[str] = None,
                       language: Optional[str] = None) -> 'Project':
        """
        Import a project from a zip file.
        
        Args:
            file_path: Path to the zip file
            name: Name of the project (default: zip file name without extension)
            language: Primary programming language (default: auto-detect)
            
        Returns:
            Project instance
        """
        # Use zip file name as project name if not specified
        if name is None:
            name = os.path.splitext(os.path.basename(file_path))[0]
        
        # Create a temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Extract the zip file
            with zipfile.ZipFile(file_path, "r") as zip_file:
                zip_file.extractall(temp_dir)
            
            # Import the project from the directory
            return cls.import_from_directory(temp_dir, name, language)


class ProjectSession(EnhancedSandboxSession):
    """
    Enhanced sandbox session for multi-file projects.
    
    This class extends the EnhancedSandboxSession class to add support for
    multi-file projects.
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None, **kwargs):
        """
        Initialize a new project sandbox session.
        
        Args:
            config: Configuration for the sandbox. If None, default config is used.
            **kwargs: Additional configuration options that override config values.
        """
        super().__init__(config, **kwargs)
        self.project = None
    
    def set_project(self, project: Project) -> None:
        """
        Set the project for the session.
        
        Args:
            project: Project to use
        """
        self.project = project
    
    def open(self):
        """
        Open the sandbox session.
        
        This creates a sandbox environment for the project.
        
        Returns:
            self for method chaining
        """
        if self._is_open:
            return self
        
        # Create a temporary directory
        self._create_temp_dir()
        
        # Export the project to the temporary directory
        if self.project:
            self.project.export_to_directory(self._runtime_dir)
        
        # Install dependencies
        if self.project and self.project.dependencies:
            self._install_dependencies()
        
        # Run build commands
        if self.project and self.project.build_commands:
            self._run_build_commands()
        
        self._is_open = True
        self._log("Project sandbox session opened")
        return self
    
    def run(self, code: Optional[str] = None, language: Optional[str] = None,
           file_path: Optional[str] = None) -> ExecutionResult:
        """
        Run code in the sandbox.
        
        Args:
            code: The code to execute (if None, runs the main file)
            language: The programming language (default: project language)
            file_path: Path to the file to run (relative to project root)
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")
        
        if not self.project:
            raise RuntimeError("No project set")
        
        # If code is provided, create a temporary file and run it
        if code:
            return super().run(code, language or self.project.language)
        
        # If file_path is provided, run that file
        if file_path:
            file = self.project.get_file(file_path)
            if not file:
                return ExecutionResult(
                    success=False,
                    exit_code=-1,
                    error=f"File not found: {file_path}"
                )
            
            # Get the full path to the file
            full_path = os.path.join(self._runtime_dir, file_path)
            
            # Run the file
            return self._run_file(full_path, language or self.project.language)
        
        # If no code or file_path is provided, run the main file
        if not self.project.main_file:
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error="No main file specified"
            )
        
        # Get the full path to the main file
        main_file_path = os.path.join(self._runtime_dir, self.project.main_file)
        
        # Run the main file
        return self._run_file(main_file_path, self.project.language)
    
    def run_tests(self) -> ExecutionResult:
        """
        Run tests for the project.
        
        Returns:
            ExecutionResult containing the test output and status
        """
        if not self._is_open:
            raise RuntimeError("Session is not open")
        
        if not self.project:
            raise RuntimeError("No project set")
        
        # If no test commands are specified, try to run tests based on language
        if not self.project.test_commands:
            return self._run_default_tests()
        
        # Run the test commands
        results = []
        for command in self.project.test_commands:
            result = self.execute_command(command)
            results.append(result)
        
        # Combine the results
        combined_result = ExecutionResult(
            success=all(result.success for result in results),
            exit_code=0 if all(result.success for result in results) else 1,
            output="\n".join(result.output for result in results),
            stdout="\n".join(result.stdout for result in results),
            stderr="\n".join(result.stderr for result in results)
        )
        
        return combined_result
    
    def _install_dependencies(self) -> None:
        """Install project dependencies."""
        if not self.project or not self.project.dependencies:
            return
        
        if self.project.language == "python":
            # Create a requirements.txt file
            requirements_path = os.path.join(self._runtime_dir, "requirements.txt")
            with open(requirements_path, "w", encoding="utf-8") as f:
                f.write("\n".join(self.project.dependencies))
            
            # Install the dependencies
            self._log("Installing Python dependencies")
            self.execute_command(["pip", "install", "-r", "requirements.txt"])
            
        elif self.project.language in ["javascript", "typescript"]:
            # Create a package.json file
            package_json_path = os.path.join(self._runtime_dir, "package.json")
            
            package_json = {
                "name": self.project.name,
                "version": "1.0.0",
                "dependencies": {}
            }
            
            for dep in self.project.dependencies:
                parts = dep.split("==")
                name = parts[0]
                version = parts[1] if len(parts) > 1 else "latest"
                package_json["dependencies"][name] = version
            
            with open(package_json_path, "w", encoding="utf-8") as f:
                json.dump(package_json, f, indent=2)
            
            # Install the dependencies
            self._log("Installing JavaScript/TypeScript dependencies")
            self.execute_command(["npm", "install"])
    
    def _run_build_commands(self) -> None:
        """Run project build commands."""
        if not self.project or not self.project.build_commands:
            return
        
        for command in self.project.build_commands:
            self._log(f"Running build command: {command}")
            self.execute_command(command)
    
    def _run_file(self, file_path: str, language: str) -> ExecutionResult:
        """
        Run a file in the sandbox.
        
        Args:
            file_path: Path to the file
            language: Programming language
            
        Returns:
            ExecutionResult containing the execution output and status
        """
        # Get language configuration
        lang_config = self._get_language_config(language)
        if not lang_config:
            return ExecutionResult(
                success=False,
                exit_code=-1,
                error=f"Unsupported language: {language}"
            )
        
        # Construct the command
        command = [lang_config["command"]]
        command.extend(lang_config["args"])
        command.append(file_path)
        
        # Execute the command
        return self.execute_command(command)
    
    def _run_default_tests(self) -> ExecutionResult:
        """
        Run default tests based on the project language.
        
        Returns:
            ExecutionResult containing the test output and status
        """
        if self.project.language == "python":
            # Try to run pytest
            pytest_result = self.execute_command(["pytest"])
            if pytest_result.success:
                return pytest_result
            
            # Try to run unittest
            return self.execute_command(["python", "-m", "unittest", "discover"])
            
        elif self.project.language in ["javascript", "typescript"]:
            # Try to run npm test
            return self.execute_command(["npm", "test"])
            
        elif self.project.language == "java":
            # Try to run Maven tests
            if os.path.exists(os.path.join(self._runtime_dir, "pom.xml")):
                return self.execute_command(["mvn", "test"])
            
            # Try to run Gradle tests
            if os.path.exists(os.path.join(self._runtime_dir, "build.gradle")):
                return self.execute_command(["gradle", "test"])
            
        elif self.project.language == "go":
            # Run Go tests
            return self.execute_command(["go", "test", "./..."])
        
        # Default: no tests
        return ExecutionResult(
            success=True,
            exit_code=0,
            output="No tests found for this project language"
        )


def _detect_project_language(directory: str) -> str:
    """
    Detect the primary programming language of a project.
    
    Args:
        directory: Project directory
        
    Returns:
        Detected language
    """
    # Count files by extension
    extensions = {}
    
    for root, _, files in os.walk(directory):
        for file in files:
            _, ext = os.path.splitext(file)
            if ext:
                ext = ext.lower()
                extensions[ext] = extensions.get(ext, 0) + 1
    
    # Map extensions to languages
    language_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".java": "java",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "cpp",
        ".hpp": "cpp",
        ".go": "go",
        ".rb": "ruby",
        ".php": "php",
        ".cs": "csharp",
        ".rs": "rust",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala",
        ".r": "r",
        ".pl": "perl",
        ".sh": "bash"
    }
    
    # Count languages
    languages = {}
    for ext, count in extensions.items():
        if ext in language_map:
            lang = language_map[ext]
            languages[lang] = languages.get(lang, 0) + count
    
    # Return the most common language
    if languages:
        return max(languages.items(), key=lambda x: x[1])[0]
    
    # Default to Python
    return "python"


def _detect_main_file(directory: str, language: str) -> Optional[str]:
    """
    Detect the main file of a project.
    
    Args:
        directory: Project directory
        language: Project language
        
    Returns:
        Relative path to the main file, or None if not found
    """
    # Common main file names by language
    main_file_patterns = {
        "python": ["main.py", "app.py", "__main__.py"],
        "javascript": ["main.js", "index.js", "app.js", "server.js"],
        "typescript": ["main.ts", "index.ts", "app.ts", "server.ts"],
        "java": ["Main.java", "App.java", "Application.java"],
        "cpp": ["main.cpp", "Main.cpp", "App.cpp"],
        "go": ["main.go"],
        "ruby": ["main.rb", "app.rb"],
        "php": ["index.php", "main.php", "app.php"]
    }
    
    # Check for common main file names
    if language in main_file_patterns:
        for pattern in main_file_patterns[language]:
            for root, _, files in os.walk(directory):
                for file in files:
                    if file == pattern:
                        return os.path.relpath(os.path.join(root, file), directory)
    
    # Check for files with "main" function
    if language in ["python", "javascript", "typescript", "java", "cpp", "go"]:
        for root, _, files in os.walk(directory):
            for file in files:
                _, ext = os.path.splitext(file)
                
                if (language == "python" and ext.lower() == ".py") or \
                   (language == "javascript" and ext.lower() == ".js") or \
                   (language == "typescript" and ext.lower() == ".ts") or \
                   (language == "java" and ext.lower() == ".java") or \
                   (language == "cpp" and ext.lower() in [".cpp", ".cc", ".cxx"]) or \
                   (language == "go" and ext.lower() == ".go"):
                    
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            
                            # Check for main function
                            if language == "python" and "if __name__ == \"__main__\":" in content:
                                return os.path.relpath(file_path, directory)
                            elif language in ["javascript", "typescript"] and "function main" in content:
                                return os.path.relpath(file_path, directory)
                            elif language == "java" and "public static void main" in content:
                                return os.path.relpath(file_path, directory)
                            elif language == "cpp" and "int main" in content:
                                return os.path.relpath(file_path, directory)
                            elif language == "go" and "func main" in content:
                                return os.path.relpath(file_path, directory)
                    except:
                        # Ignore errors reading files
                        pass
    
    # No main file found
    return None

"""
Enhanced language detection for sandbox environments.

This module provides functions for detecting programming languages from
file paths, code content, and other sources.
"""

import re
import os
from typing import Dict, Any, Optional, List, Tuple

from .language_config import LANGUAGE_CONFIGS


def detect_language_from_code(code: str) -> Optional[str]:
    """
    Detect the programming language from code content.
    
    Args:
        code: The code content
        
    Returns:
        The detected language, or None if the language could not be detected
    """
    # Check for shebang
    first_line = code.split('\n', 1)[0] if '\n' in code else code
    for lang, config in LANGUAGE_CONFIGS.items():
        if 'shebang' in config and re.match(config['shebang'], first_line):
            return lang
    
    # Language-specific patterns
    patterns = {
        # PHP
        "php": [
            r'^<\?php',
            r'\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*=',
            r'function\s+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\([^\)]*\)\s*{'
        ],
        
        # Go
        "go": [
            r'package\s+main',
            r'import\s+["(]\s*"fmt"',
            r'func\s+main\(\)\s*{'
        ],
        
        # Java
        "java": [
            r'public\s+class\s+[A-Z][a-zA-Z0-9_]*',
            r'public\s+static\s+void\s+main\s*\(\s*String\s*\[\]\s*[a-zA-Z0-9_]+\s*\)',
            r'import\s+java\.'
        ],
        
        # Rust
        "rust": [
            r'fn\s+main\(\)\s*{',
            r'let\s+mut\s+[a-zA-Z_][a-zA-Z0-9_]*',
            r'use\s+std::'
        ],
        
        # JavaScript
        "javascript": [
            r'const\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=',
            r'let\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=',
            r'import\s+React',
            r'export\s+default',
            r'console\.log\s*\('
        ],
        
        # TypeScript
        "typescript": [
            r'interface\s+[A-Z][a-zA-Z0-9_]*',
            r'type\s+[A-Z][a-zA-Z0-9_]*\s*=',
            r'(const|let|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*[A-Z][a-zA-Z0-9_<>]*'
        ],
        
        # Python
        "python": [
            r'def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(',
            r'import\s+[a-zA-Z_][a-zA-Z0-9_]*',
            r'from\s+[a-zA-Z_][a-zA-Z0-9_.]*\s+import',
            r'print\s*\('
        ],
        
        # C++
        "cpp": [
            r'#include\s+<[a-zA-Z0-9_./]+>',
            r'std::[a-zA-Z0-9_]+',
            r'int\s+main\s*\(\s*int\s+argc\s*,\s*char\s*\*\s*argv\s*\[\s*\]\s*\)'
        ],
        
        # C
        "c": [
            r'#include\s+<[a-zA-Z0-9_./]+\.h>',
            r'int\s+main\s*\(\s*int\s+argc\s*,\s*char\s*\*\s*argv\s*\[\s*\]\s*\)',
            r'printf\s*\('
        ],
        
        # Ruby
        "ruby": [
            r'def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\(|$)',
            r'require\s+[\'"][a-zA-Z0-9_./]+[\'"]',
            r'puts\s+',
            r'end\s*$'
        ],
        
        # Haskell
        "haskell": [
            r'module\s+[A-Z][a-zA-Z0-9_.]*',
            r'import\s+[A-Z][a-zA-Z0-9_.]*',
            r'[a-zA-Z_][a-zA-Z0-9_\']*\s*::\s*[A-Z][a-zA-Z0-9_]*'
        ],
        
        # Elixir
        "elixir": [
            r'defmodule\s+[A-Z][a-zA-Z0-9_.]*',
            r'def\s+[a-zA-Z_][a-zA-Z0-9_?!]*\s*do',
            r'@[a-zA-Z_][a-zA-Z0-9_]*'
        ],
        
        # Clojure
        "clojure": [
            r'\(defn\s+[a-zA-Z-]+',
            r'\(ns\s+[a-zA-Z-.]+',
            r'\(def\s+[a-zA-Z-]+'
        ],
        
        # Dart
        "dart": [
            r'void\s+main\(\)\s*{',
            r'import\s+[\'\"](dart:|package:)'
        ],
        
        # Julia
        "julia": [
            r'function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(',
            r'using\s+[A-Z][a-zA-Z0-9_]*'
        ],
        
        # Lua
        "lua": [
            r'function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(',
            r'local\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=',
            r'require\s*\([\'"][a-zA-Z0-9_.]+[\'\"]\)'
        ],
        
        # OCaml
        "ocaml": [
            r'let\s+[a-z_][a-zA-Z0-9_\']*\s*=',
            r'module\s+[A-Z][a-zA-Z0-9_]*\s*='
        ],
        
        # F#
        "fsharp": [
            r'let\s+[a-z_][a-zA-Z0-9_\']*\s*=',
            r'module\s+[A-Z][a-zA-Z0-9_]*\s*=',
            r'open\s+[A-Z][a-zA-Z0-9_.]*'
        ],
        
        # C#
        "csharp": [
            r'using\s+[A-Z][a-zA-Z0-9_.]*;',
            r'namespace\s+[A-Z][a-zA-Z0-9_.]*',
            r'class\s+[A-Z][a-zA-Z0-9_]*',
            r'public\s+[a-zA-Z0-9_]+\s+[A-Za-z0-9_]+\s*\('
        ],
        
        # Groovy
        "groovy": [
            r'class\s+[A-Z][a-zA-Z0-9_]*',
            r'def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=',
            r'@[A-Z][a-zA-Z0-9_]*'
        ],
        
        # Crystal
        "crystal": [
            r'def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(',
            r'require\s+[\'"][a-zA-Z0-9_./]+[\'"]',
            r'module\s+[A-Z][a-zA-Z0-9_]*'
        ],
        
        # Nim
        "nim": [
            r'proc\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(',
            r'import\s+[a-zA-Z0-9_,\s]+',
            r'echo\s+'
        ],
        
        # Kotlin
        "kotlin": [
            r'fun\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(',
            r'val\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:',
            r'var\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:'
        ],
        
        # Scala
        "scala": [
            r'object\s+[A-Z][a-zA-Z0-9_]*',
            r'class\s+[A-Z][a-zA-Z0-9_]*',
            r'def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\('
        ],
        
        # R
        "r": [
            r'<-\s*function\s*\(',
            r'library\s*\(',
            r'[a-zA-Z_][a-zA-Z0-9_]*\s*<-'
        ],
        
        # Perl
        "perl": [
            r'use\s+[A-Z][a-zA-Z0-9_:]*;',
            r'\$[a-zA-Z_][a-zA-Z0-9_]*\s*=',
            r'sub\s+[a-zA-Z_][a-zA-Z0-9_]*\s*{'
        ],
        
        # Bash
        "bash": [
            r'\$\{[a-zA-Z_][a-zA-Z0-9_]*\}',
            r'function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(\)\s*{',
            r'if\s+\[\s+.+\s+\];\s+then'
        ],
        
        # PowerShell
        "powershell": [
            r'\$[a-zA-Z_][a-zA-Z0-9_]*\s*=',
            r'function\s+[A-Z][a-zA-Z0-9_-]*\s*\{',
            r'Write-Host'
        ]
    }
    
    # Count matches for each language
    matches = {}
    for lang, patterns_list in patterns.items():
        count = 0
        for pattern in patterns_list:
            if re.search(pattern, code, re.MULTILINE):
                count += 1
        if count > 0:
            matches[lang] = count
    
    # Return the language with the most matches
    if matches:
        return max(matches.items(), key=lambda x: x[1])[0]
    
    # Additional checks for languages that are harder to detect
    if "#" in code and "def" in code and not "<" in code:
        return "python"
    
    if "{" in code and "}" in code and "function" in code and "var" in code:
        return "javascript"
    
    if "{" in code and "}" in code and "class" in code and "public" in code:
        return "java"
    
    # Could not detect language
    return None


def detect_language_from_file(file_path: str) -> Optional[str]:
    """
    Detect the programming language from a file path.
    
    Args:
        file_path: Path to the file
        
    Returns:
        The detected language, or None if the language could not be detected
    """
    # Convert to lowercase for case-insensitive matching
    file_path = file_path.lower()
    
    # Check file extension against language patterns
    for lang, config in LANGUAGE_CONFIGS.items():
        if "file_pattern" in config and re.search(config["file_pattern"], file_path):
            return lang
    
    # Could not detect language from file extension
    if os.path.exists(file_path):
        try:
            # Try to detect language from file content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(4096)  # Read first 4KB
                return detect_language_from_code(content)
        except:
            pass
    
    # Could not detect language
    return None


def detect_language_from_project(directory: str) -> Optional[str]:
    """
    Detect the primary programming language of a project.
    
    Args:
        directory: Project directory
        
    Returns:
        The detected language, or None if the language could not be detected
    """
    # Count files by language
    language_counts = {}
    
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            language = detect_language_from_file(file_path)
            if language:
                language_counts[language] = language_counts.get(language, 0) + 1
    
    # Return the most common language
    if language_counts:
        return max(language_counts.items(), key=lambda x: x[1])[0]
    
    # Could not detect language
    return None


def get_language_info(language: str) -> Dict[str, Any]:
    """
    Get detailed information about a programming language.
    
    Args:
        language: The programming language
        
    Returns:
        Dictionary with language information
    """
    # Get language configuration
    config = LANGUAGE_CONFIGS.get(language.lower())
    if not config:
        return {}
    
    # Build language info
    info = {
        "name": language,
        "extension": config.get("extension", ""),
        "command": config.get("command", ""),
        "args": config.get("args", []),
        "package_manager": config.get("package_manager", ""),
        "install_command": config.get("install_command", []),
        "version_command": config.get("version_command", []),
        "code_block_name": config.get("code_block_name", language),
        "aliases": config.get("aliases", [])
    }
    
    return info


def list_supported_languages() -> List[Dict[str, Any]]:
    """
    Get a list of all supported programming languages.
    
    Returns:
        List of dictionaries with language information
    """
    languages = []
    
    for lang in LANGUAGE_CONFIGS.keys():
        languages.append(get_language_info(lang))
    
    # Sort by language name
    return sorted(languages, key=lambda x: x["name"])


def detect_language_from_content_type(content_type: str) -> Optional[str]:
    """
    Detect the programming language from a content type.
    
    Args:
        content_type: Content type (e.g., "text/x-python", "application/javascript")
        
    Returns:
        The detected language, or None if the language could not be detected
    """
    # Map of content types to languages
    content_type_map = {
        "text/x-python": "python",
        "application/javascript": "javascript",
        "text/javascript": "javascript",
        "application/typescript": "typescript",
        "text/x-typescript": "typescript",
        "text/x-java": "java",
        "text/x-c++src": "cpp",
        "text/x-csrc": "c",
        "text/x-go": "go",
        "text/x-ruby": "ruby",
        "text/x-php": "php",
        "text/x-rustsrc": "rust",
        "text/x-swift": "swift",
        "text/x-kotlin": "kotlin",
        "text/x-scala": "scala",
        "text/x-r": "r",
        "text/x-perl": "perl",
        "text/x-shellscript": "bash",
        "text/x-powershell": "powershell",
        "text/x-haskell": "haskell",
        "text/x-elixir": "elixir",
        "text/x-clojure": "clojure",
        "text/x-dart": "dart",
        "text/x-julia": "julia",
        "text/x-lua": "lua",
        "text/x-ocaml": "ocaml",
        "text/x-fsharp": "fsharp",
        "text/x-csharp": "csharp",
        "text/x-groovy": "groovy",
        "text/x-crystal": "crystal",
        "text/x-nim": "nim"
    }
    
    # Convert to lowercase for case-insensitive matching
    content_type = content_type.lower()
    
    # Check for exact match
    if content_type in content_type_map:
        return content_type_map[content_type]
    
    # Check for partial match
    for ct, lang in content_type_map.items():
        if ct in content_type:
            return lang
    
    # Could not detect language
    return None

"""
Language configuration for sandbox environments.

This module provides configuration for different programming languages,
including file extensions, commands, and arguments.
"""

from typing import Dict, Any, Optional


# Map of supported languages to their configurations
LANGUAGE_CONFIGS = {
    # Python
    "python": {
        "extension": "py",
        "command": "python",
        "args": [],
        "aliases": ["py", "python3"],
        "file_pattern": r"\.py$",
        "shebang": r"^#!/usr/bin/env python",
        "package_manager": "pip",
        "install_command": ["pip", "install"],
        "version_command": ["python", "--version"],
        "code_block_name": "python"
    },

    # JavaScript
    "javascript": {
        "extension": "js",
        "command": "node",
        "args": [],
        "aliases": ["js", "node"],
        "file_pattern": r"\.js$",
        "shebang": r"^#!/usr/bin/env node",
        "package_manager": "npm",
        "install_command": ["npm", "install"],
        "version_command": ["node", "--version"],
        "code_block_name": "javascript"
    },

    # TypeScript
    "typescript": {
        "extension": "ts",
        "command": "ts-node",
        "args": [],
        "aliases": ["ts"],
        "file_pattern": r"\.ts$",
        "package_manager": "npm",
        "install_command": ["npm", "install"],
        "version_command": ["ts-node", "--version"],
        "code_block_name": "typescript"
    },

    # Java
    "java": {
        "extension": "java",
        "command": "java",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.java$",
        "package_manager": "maven",
        "install_command": ["mvn", "install"],
        "version_command": ["java", "--version"],
        "code_block_name": "java"
    },

    # C++
    "cpp": {
        "extension": "cpp",
        "command": "g++",
        "args": ["-o", "/tmp/program", "/workspace/code.cpp", "&&", "/tmp/program"],
        "aliases": ["c++", "cplusplus"],
        "file_pattern": r"\.(cpp|cc|cxx)$",
        "version_command": ["g++", "--version"],
        "code_block_name": "cpp"
    },

    # C
    "c": {
        "extension": "c",
        "command": "gcc",
        "args": ["-o", "/tmp/program", "/workspace/code.c", "&&", "/tmp/program"],
        "aliases": [],
        "file_pattern": r"\.c$",
        "version_command": ["gcc", "--version"],
        "code_block_name": "c"
    },

    # Go
    "go": {
        "extension": "go",
        "command": "go",
        "args": ["run"],
        "aliases": ["golang"],
        "file_pattern": r"\.go$",
        "package_manager": "go",
        "install_command": ["go", "get"],
        "version_command": ["go", "version"],
        "code_block_name": "go"
    },

    # Ruby
    "ruby": {
        "extension": "rb",
        "command": "ruby",
        "args": [],
        "aliases": ["rb"],
        "file_pattern": r"\.rb$",
        "shebang": r"^#!/usr/bin/env ruby",
        "package_manager": "gem",
        "install_command": ["gem", "install"],
        "version_command": ["ruby", "--version"],
        "code_block_name": "ruby"
    },

    # PHP
    "php": {
        "extension": "php",
        "command": "php",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.php$",
        "shebang": r"^#!/usr/bin/env php",
        "package_manager": "composer",
        "install_command": ["composer", "install"],
        "version_command": ["php", "--version"],
        "code_block_name": "php"
    },

    # Rust
    "rust": {
        "extension": "rs",
        "command": "rustc",
        "args": ["-o", "/tmp/program", "/workspace/code.rs", "&&", "/tmp/program"],
        "aliases": ["rs"],
        "file_pattern": r"\.rs$",
        "package_manager": "cargo",
        "install_command": ["cargo", "add"],
        "version_command": ["rustc", "--version"],
        "code_block_name": "rust"
    },

    # Swift
    "swift": {
        "extension": "swift",
        "command": "swift",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.swift$",
        "package_manager": "swift",
        "install_command": ["swift", "package", "add"],
        "version_command": ["swift", "--version"],
        "code_block_name": "swift"
    },

    # Kotlin
    "kotlin": {
        "extension": "kt",
        "command": "kotlinc",
        "args": ["-script"],
        "aliases": ["kt"],
        "file_pattern": r"\.(kt|kts)$",
        "package_manager": "gradle",
        "install_command": ["gradle", "add"],
        "version_command": ["kotlinc", "--version"],
        "code_block_name": "kotlin"
    },

    # Scala
    "scala": {
        "extension": "scala",
        "command": "scala",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.scala$",
        "package_manager": "sbt",
        "install_command": ["sbt", "add"],
        "version_command": ["scala", "--version"],
        "code_block_name": "scala"
    },

    # R
    "r": {
        "extension": "r",
        "command": "Rscript",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.r$",
        "shebang": r"^#!/usr/bin/env Rscript",
        "package_manager": "install.packages",
        "install_command": ["Rscript", "-e", "install.packages"],
        "version_command": ["Rscript", "--version"],
        "code_block_name": "r"
    },

    # Perl
    "perl": {
        "extension": "pl",
        "command": "perl",
        "args": [],
        "aliases": ["pl"],
        "file_pattern": r"\.(pl|pm)$",
        "shebang": r"^#!/usr/bin/env perl",
        "package_manager": "cpan",
        "install_command": ["cpan", "install"],
        "version_command": ["perl", "--version"],
        "code_block_name": "perl"
    },

    # Bash
    "bash": {
        "extension": "sh",
        "command": "bash",
        "args": [],
        "aliases": ["sh", "shell"],
        "file_pattern": r"\.sh$",
        "shebang": r"^#!/bin/bash",
        "version_command": ["bash", "--version"],
        "code_block_name": "bash"
    },

    # PowerShell
    "powershell": {
        "extension": "ps1",
        "command": "pwsh",
        "args": ["-Command"],
        "aliases": ["ps", "ps1"],
        "file_pattern": r"\.ps1$",
        "version_command": ["pwsh", "--version"],
        "code_block_name": "powershell"
    },

    # Haskell
    "haskell": {
        "extension": "hs",
        "command": "runhaskell",
        "args": [],
        "aliases": ["hs"],
        "file_pattern": r"\.hs$",
        "package_manager": "cabal",
        "install_command": ["cabal", "install"],
        "version_command": ["ghc", "--version"],
        "code_block_name": "haskell"
    },

    # Elixir
    "elixir": {
        "extension": "ex",
        "command": "elixir",
        "args": [],
        "aliases": ["ex"],
        "file_pattern": r"\.(ex|exs)$",
        "package_manager": "mix",
        "install_command": ["mix", "deps.get"],
        "version_command": ["elixir", "--version"],
        "code_block_name": "elixir"
    },

    # Clojure
    "clojure": {
        "extension": "clj",
        "command": "clojure",
        "args": [],
        "aliases": ["clj"],
        "file_pattern": r"\.(clj|cljs)$",
        "package_manager": "lein",
        "install_command": ["lein", "deps"],
        "version_command": ["clojure", "--version"],
        "code_block_name": "clojure"
    },

    # Dart
    "dart": {
        "extension": "dart",
        "command": "dart",
        "args": ["run"],
        "aliases": [],
        "file_pattern": r"\.dart$",
        "package_manager": "pub",
        "install_command": ["dart", "pub", "add"],
        "version_command": ["dart", "--version"],
        "code_block_name": "dart"
    },

    # Julia
    "julia": {
        "extension": "jl",
        "command": "julia",
        "args": [],
        "aliases": ["jl"],
        "file_pattern": r"\.jl$",
        "package_manager": "pkg",
        "install_command": ["julia", "-e", "using Pkg; Pkg.add"],
        "version_command": ["julia", "--version"],
        "code_block_name": "julia"
    },

    # Lua
    "lua": {
        "extension": "lua",
        "command": "lua",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.lua$",
        "shebang": r"^#!/usr/bin/env lua",
        "package_manager": "luarocks",
        "install_command": ["luarocks", "install"],
        "version_command": ["lua", "-v"],
        "code_block_name": "lua"
    },

    # OCaml
    "ocaml": {
        "extension": "ml",
        "command": "ocaml",
        "args": [],
        "aliases": ["ml"],
        "file_pattern": r"\.(ml|mli)$",
        "package_manager": "opam",
        "install_command": ["opam", "install"],
        "version_command": ["ocaml", "-version"],
        "code_block_name": "ocaml"
    },

    # F#
    "fsharp": {
        "extension": "fs",
        "command": "dotnet",
        "args": ["fsi"],
        "aliases": ["fs"],
        "file_pattern": r"\.(fs|fsx)$",
        "package_manager": "nuget",
        "install_command": ["dotnet", "add", "package"],
        "version_command": ["dotnet", "--version"],
        "code_block_name": "fsharp"
    },

    # C#
    "csharp": {
        "extension": "cs",
        "command": "dotnet",
        "args": ["run"],
        "aliases": ["cs", "c#"],
        "file_pattern": r"\.cs$",
        "package_manager": "nuget",
        "install_command": ["dotnet", "add", "package"],
        "version_command": ["dotnet", "--version"],
        "code_block_name": "csharp"
    },

    # Groovy
    "groovy": {
        "extension": "groovy",
        "command": "groovy",
        "args": [],
        "aliases": [],
        "file_pattern": r"\.groovy$",
        "shebang": r"^#!/usr/bin/env groovy",
        "package_manager": "grape",
        "install_command": ["grape", "install"],
        "version_command": ["groovy", "--version"],
        "code_block_name": "groovy"
    },

    # Crystal
    "crystal": {
        "extension": "cr",
        "command": "crystal",
        "args": ["run"],
        "aliases": ["cr"],
        "file_pattern": r"\.cr$",
        "shebang": r"^#!/usr/bin/env crystal",
        "package_manager": "shards",
        "install_command": ["shards", "install"],
        "version_command": ["crystal", "--version"],
        "code_block_name": "crystal"
    },

    # Nim
    "nim": {
        "extension": "nim",
        "command": "nim",
        "args": ["compile", "--run"],
        "aliases": [],
        "file_pattern": r"\.nim$",
        "package_manager": "nimble",
        "install_command": ["nimble", "install"],
        "version_command": ["nim", "--version"],
        "code_block_name": "nim"
    }
}


# Map of language aliases to their canonical names
LANGUAGE_ALIASES = {}
for lang, config in LANGUAGE_CONFIGS.items():
    for alias in config.get("aliases", []):
        LANGUAGE_ALIASES[alias] = lang


def get_language_config(language: str) -> Optional[Dict[str, Any]]:
    """
    Get the configuration for a programming language.

    Args:
        language: The programming language or alias

    Returns:
        A dictionary with language configuration, or None if the language is not supported
    """
    # Convert to lowercase for case-insensitive matching
    language = language.lower()

    # Check if the language is directly supported
    if language in LANGUAGE_CONFIGS:
        return LANGUAGE_CONFIGS[language]

    # Check if the language is an alias
    if language in LANGUAGE_ALIASES:
        return LANGUAGE_CONFIGS[LANGUAGE_ALIASES[language]]

    # Language not supported
    return None


def detect_language_from_file(file_path: str) -> Optional[str]:
    """
    Detect the programming language from a file path.

    Args:
        file_path: Path to the file

    Returns:
        The detected language, or None if the language could not be detected
    """
    import re

    # Convert to lowercase for case-insensitive matching
    file_path = file_path.lower()

    # Check file extension against language patterns
    for lang, config in LANGUAGE_CONFIGS.items():
        if "file_pattern" in config and re.search(config["file_pattern"], file_path):
            return lang

    # Could not detect language
    return None


def detect_language_from_code(code: str) -> Optional[str]:
    """
    Detect the programming language from code content.

    Args:
        code: The code content

    Returns:
        The detected language, or None if the language could not be detected
    """
    # Simple heuristics for language detection
    if code.strip().startswith("<?php"):
        return "php"

    if "function main() {" in code and "fmt." in code:
        return "go"

    if "public static void main" in code and "class" in code:
        return "java"

    if "fn main" in code and "let mut" in code:
        return "rust"

    if "import React" in code or "export default" in code:
        return "javascript"

    if "console.log" in code and "const" in code:
        return "javascript"

    if "def " in code and "print(" in code:
        return "python"

    if "#include <iostream>" in code:
        return "cpp"

    if "puts " in code and "end" in code:
        return "ruby"

    # Could not detect language
    return None

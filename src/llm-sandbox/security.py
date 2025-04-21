import ast
import re
from typing import List, Optional, Set, Tuple


class CodeValidator:
    """
    Validates and analyzes Python code for potential security issues.
    
    This class uses Python's AST to parse and analyze code before execution,
    looking for potentially dangerous patterns.
    """
    
    # Set of potentially dangerous builtins
    DANGEROUS_BUILTINS = {
        'eval', 'exec', 'compile', 'globals', 'locals', 'open', 
        '__import__', 'getattr', 'setattr', 'delattr', 'hasattr',
        'input', 'breakpoint'
    }
    
    # Set of potentially dangerous modules
    DANGEROUS_MODULES = {
        'os', 'sys', 'subprocess', 'shutil', 'importlib', 
        'pickle', 'marshal', 'builtins', 'ctypes'
    }
    
    def __init__(self, 
                 allow_dangerous_builtins: bool = False,
                 allow_dangerous_modules: bool = False,
                 additional_dangerous_builtins: Optional[Set[str]] = None,
                 additional_dangerous_modules: Optional[Set[str]] = None):
        """
        Initialize a new CodeValidator.
        
        Args:
            allow_dangerous_builtins: Whether to allow dangerous builtins
            allow_dangerous_modules: Whether to allow dangerous modules
            additional_dangerous_builtins: Additional builtin functions to consider dangerous
            additional_dangerous_modules: Additional modules to consider dangerous
        """
        self.allow_dangerous_builtins = allow_dangerous_builtins
        self.allow_dangerous_modules = allow_dangerous_modules
        
        # Merge additional dangerous items with defaults
        self.dangerous_builtins = self.DANGEROUS_BUILTINS.copy()
        if additional_dangerous_builtins:
            self.dangerous_builtins.update(additional_dangerous_builtins)
            
        self.dangerous_modules = self.DANGEROUS_MODULES.copy()
        if additional_dangerous_modules:
            self.dangerous_modules.update(additional_dangerous_modules)
    
    def validate(self, code: str) -> Tuple[bool, List[str]]:
        """
        Validate Python code for security issues.
        
        Args:
            code: The Python code to validate
            
        Returns:
            Tuple of (is_valid, warnings) where:
            - is_valid: Boolean indicating if the code passes basic security checks
            - warnings: List of warning messages for potential security issues
        """
        warnings = []
        
        try:
            # Parse the code into an AST
            tree = ast.parse(code)
            
            # Check for syntax errors
            compile(tree, filename="<ast>", mode="exec")
            
            # Analyze the AST
            visitor = SecurityVisitor(
                self.dangerous_builtins,
                self.dangerous_modules,
                self.allow_dangerous_builtins,
                self.allow_dangerous_modules
            )
            visitor.visit(tree)
            
            # Add any warnings from the visitor
            warnings.extend(visitor.warnings)
            
            # Check for regex patterns
            warnings.extend(self._check_regex_patterns(code))
            
            # Determine if code is valid based on warnings
            is_valid = not any(w.startswith("ERROR:") for w in warnings)
            
            return is_valid, warnings
            
        except SyntaxError as e:
            return False, [f"ERROR: Syntax error: {str(e)}"]
        except Exception as e:
            return False, [f"ERROR: Error validating code: {str(e)}"]
    
    def _check_regex_patterns(self, code: str) -> List[str]:
        """Check code for suspicious patterns using regex."""
        warnings = []
        
        # Check for direct references to __class__, __base__, etc.
        if re.search(r'__class__\s*\.\s*__base__', code):
            warnings.append("WARNING: Suspicious attribute access pattern detected (__class__.__base__)")
        
        # Check for __subclasses__ usage, which can lead to sandbox escapes
        if re.search(r'__subclasses__\s*\(\s*\)', code):
            warnings.append("WARNING: Suspicious __subclasses__ call detected")
        
        # Check for __builtins__ access
        if re.search(r'__builtins__', code):
            warnings.append("WARNING: Direct __builtins__ access detected")
        
        # Check for eval/exec as string literals (to bypass AST checks)
        if re.search(r'["\']eval\(', code) or re.search(r'["\']exec\(', code):
            warnings.append("WARNING: String containing eval/exec detected")
        
        return warnings


class SecurityVisitor(ast.NodeVisitor):
    """AST visitor that checks for security issues in Python code."""
    
    def __init__(self, 
                 dangerous_builtins: Set[str],
                 dangerous_modules: Set[str],
                 allow_dangerous_builtins: bool,
                 allow_dangerous_modules: bool):
        """Initialize the security visitor."""
        self.dangerous_builtins = dangerous_builtins
        self.dangerous_modules = dangerous_modules
        self.allow_dangerous_builtins = allow_dangerous_builtins
        self.allow_dangerous_modules = allow_dangerous_modules
        self.warnings = []
        
        # Track imported modules
        self.imported_modules = set()
    
    def visit_Import(self, node):
        """Check direct imports."""
        for name in node.names:
            module_name = name.name.split('.')[0]
            self.imported_modules.add(module_name)
            
            if not self.allow_dangerous_modules and module_name in self.dangerous_modules:
                self.warnings.append(f"ERROR: Import of dangerous module '{module_name}'")
        
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        """Check from X import Y style imports."""
        module_name = node.module.split('.')[0] if node.module else ""
        self.imported_modules.add(module_name)
        
        if not self.allow_dangerous_modules and module_name in self.dangerous_modules:
            self.warnings.append(f"ERROR: Import from dangerous module '{module_name}'")
        
        self.generic_visit(node)
    
    def visit_Call(self, node):
        """Check function calls for dangerous built-ins."""
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if not self.allow_dangerous_builtins and func_name in self.dangerous_builtins:
                self.warnings.append(f"ERROR: Call to dangerous built-in '{func_name}'")
        
        # Check for __import__() call
        elif isinstance(node.func, ast.Attribute) and node.func.attr == '__import__':
            self.warnings.append("ERROR: Use of __import__ call detected")
        
        self.generic_visit(node)
    
    def visit_Attribute(self, node):
        """Check attribute access for dangerous patterns."""
        # Check for sys.modules access
        if (isinstance(node.value, ast.Name) and node.value.id == 'sys' and node.attr == 'modules'):
            self.warnings.append("WARNING: Access to sys.modules detected")
        
        # Check for __dict__ access
        if node.attr == '__dict__':
            self.warnings.append("WARNING: Access to __dict__ attribute detected")
        
        self.generic_visit(node) 
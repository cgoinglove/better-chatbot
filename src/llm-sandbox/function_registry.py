import inspect
import json
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar, Union

from .exceptions import SandboxSecurityError

# Type for function registry
T = TypeVar('T', bound=Callable)


class FunctionRegistry:
    """
    A registry for functions that can be safely executed by an LLM.
    
    This class provides a secure way to define a whitelist of functions that
    can be called based on LLM-generated function call objects, with proper
    validation of function names and parameters.
    """
    
    def __init__(self):
        """Initialize a new function registry."""
        self._functions: Dict[str, Callable] = {}
        self._function_schemas: Dict[str, Dict[str, Any]] = {}
    
    def register(self, func: Callable) -> Callable:
        """
        Register a function to be callable by the LLM.
        
        This can be used as a decorator:
        
        @registry.register
        def my_function(param1, param2):
            ...
        
        Args:
            func: The function to register
            
        Returns:
            The original function (for decorator usage)
        """
        function_name = func.__name__
        self._functions[function_name] = func
        
        # Generate schema for the function based on its signature
        self._function_schemas[function_name] = self._generate_function_schema(func)
        
        return func
    
    def register_method(self, cls: Type, method_name: str) -> None:
        """
        Register a method from a class.
        
        Args:
            cls: The class containing the method
            method_name: The name of the method to register
        """
        if not hasattr(cls, method_name):
            raise ValueError(f"Class {cls.__name__} has no method named {method_name}")
        
        method = getattr(cls, method_name)
        if not callable(method):
            raise ValueError(f"{method_name} is not a callable method")
        
        # Register with class name prefix to avoid conflicts
        function_name = f"{cls.__name__}.{method_name}"
        self._functions[function_name] = method
        self._function_schemas[function_name] = self._generate_function_schema(method)
    
    def execute(self, function_call: Dict[str, Any]) -> Any:
        """
        Execute a function based on a function call object.
        
        The function_call object should have the following structure:
        {
            "name": "function_name",
            "parameters": {
                "param1": value1,
                "param2": value2,
                ...
            }
        }
        
        Args:
            function_call: A dictionary describing the function to call
            
        Returns:
            The result of the function call
            
        Raises:
            SandboxSecurityError: If the function is not registered or parameters are invalid
        """
        # Validate function call structure
        if not isinstance(function_call, dict):
            raise SandboxSecurityError("Function call must be a dictionary")
        
        if "name" not in function_call:
            raise SandboxSecurityError("Function call missing 'name' field")
        
        function_name = function_call["name"]
        
        # Check if function is in the registry
        if function_name not in self._functions:
            raise SandboxSecurityError(f"Function '{function_name}' is not registered")
        
        # Get the function from the registry
        func = self._functions[function_name]
        
        # Get parameters (default to empty dict if not provided)
        parameters = function_call.get("parameters", {})
        
        # Validate parameters
        self._validate_parameters(function_name, parameters)
        
        # Execute the function
        return func(**parameters)
    
    def get_schemas(self) -> List[Dict[str, Any]]:
        """
        Get JSONSchema-style schemas for all registered functions.
        
        Returns:
            A list of function schemas in JSONSchema format
        """
        schemas = []
        for name, schema in self._function_schemas.items():
            schemas.append({
                "name": name,
                "parameters": schema
            })
        return schemas
    
    def _generate_function_schema(self, func: Callable) -> Dict[str, Any]:
        """
        Generate a JSONSchema-style schema for a function's parameters.
        
        Args:
            func: The function to generate a schema for
            
        Returns:
            A JSONSchema-style schema for the function's parameters
        """
        sig = inspect.signature(func)
        schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for name, param in sig.parameters.items():
            # Skip self for methods
            if name == "self":
                continue
                
            # Add parameter to properties
            schema["properties"][name] = {"type": "string"}  # Default to string
            
            # If parameter has a type annotation, use it
            if param.annotation != inspect.Parameter.empty:
                schema["properties"][name] = self._type_annotation_to_schema(param.annotation)
            
            # If parameter has no default value, it's required
            if param.default == inspect.Parameter.empty:
                schema["required"].append(name)
        
        return schema
    
    def _type_annotation_to_schema(self, annotation: Any) -> Dict[str, Any]:
        """
        Convert a Python type annotation to a JSONSchema type.
        
        Args:
            annotation: The type annotation
            
        Returns:
            A JSONSchema type definition
        """
        # Handle simple types
        if annotation == str:
            return {"type": "string"}
        elif annotation == int:
            return {"type": "integer"}
        elif annotation == float:
            return {"type": "number"}
        elif annotation == bool:
            return {"type": "boolean"}
        elif annotation == list or getattr(annotation, "__origin__", None) == list:
            return {"type": "array"}
        elif annotation == dict or getattr(annotation, "__origin__", None) == dict:
            return {"type": "object"}
        
        # Handle Union types (e.g. Optional[str])
        if getattr(annotation, "__origin__", None) == Union:
            # Special case for Optional[X] (Union[X, None])
            if type(None) in annotation.__args__:
                # Get the non-None type
                inner_type = next(arg for arg in annotation.__args__ if arg != type(None))
                schema = self._type_annotation_to_schema(inner_type)
                return schema  # Note: Nullability isn't represented in the schema
        
        # Default to string for unsupported types
        return {"type": "string"}
    
    def _validate_parameters(self, function_name: str, parameters: Dict[str, Any]) -> None:
        """
        Validate parameters against the function's schema.
        
        Args:
            function_name: The name of the function
            parameters: The parameters to validate
            
        Raises:
            SandboxSecurityError: If the parameters are invalid
        """
        schema = self._function_schemas[function_name]
        
        # Check for required parameters
        for required in schema.get("required", []):
            if required not in parameters:
                raise SandboxSecurityError(f"Missing required parameter: {required}")
        
        # Check for unknown parameters
        for param_name in parameters:
            if param_name not in schema.get("properties", {}):
                raise SandboxSecurityError(f"Unknown parameter: {param_name}")
        
        # Type validation could be added here if needed 
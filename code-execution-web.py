"""
Simple web interface for the code execution system.

This script creates a basic web server that allows you to execute Python code
using the DirectSandbox implementation.

To use:
1. Run this script: python code-execution-web.py
2. Open a web browser and go to http://localhost:8000
3. Enter Python code in the text area and click "Execute"
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs
import html

# Add the llm-sandbox directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "llm-sandbox"))

try:
    from direct_sandbox import DirectSandbox, ExecutionResult
    
    # HTML template for the web interface
    HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
    <title>Python Code Execution</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
        textarea {
            width: 100%;
            height: 200px;
            font-family: monospace;
            padding: 10px;
            margin-bottom: 10px;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #45a049;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border: 1px solid #ddd;
            white-space: pre-wrap;
        }
        .success {
            color: green;
        }
        .error {
            color: red;
        }
        .result-container {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>Python Code Execution</h1>
    <p>Enter Python code below and click "Execute" to run it in the sandbox.</p>
    
    <form method="post">
        <textarea name="code" placeholder="Enter Python code here...">{code}</textarea>
        <button type="submit">Execute</button>
    </form>
    
    {result}
    
    <h2>Example Code Snippets</h2>
    <ul>
        <li><a href="#" onclick="loadExample('hello'); return false;">Hello World</a></li>
        <li><a href="#" onclick="loadExample('math'); return false;">Math Operations</a></li>
        <li><a href="#" onclick="loadExample('data'); return false;">Data Structures</a></li>
        <li><a href="#" onclick="loadExample('error'); return false;">Error Handling</a></li>
    </ul>
    
    <script>
        function loadExample(type) {
            const textarea = document.querySelector('textarea[name="code"]');
            
            switch(type) {
                case 'hello':
                    textarea.value = 'print("Hello, World!")\\n\\nname = input("What is your name? ")\\nprint(f"Hello, {name}!")';
                    break;
                case 'math':
                    textarea.value = '# Math operations\\nimport math\\n\\nx = 10\\ny = 20\\n\\nprint(f"{x} + {y} = {x + y}")\\nprint(f"{x} - {y} = {x - y}")\\nprint(f"{x} * {y} = {x * y}")\\nprint(f"{x} / {y} = {x / y}")\\n\\nprint(f"Square root of 16 is {math.sqrt(16)}")\\nprint(f"Pi is approximately {math.pi}")';
                    break;
                case 'data':
                    textarea.value = '# Data structures\\n\\n# Lists\\nnumbers = [1, 2, 3, 4, 5]\\nprint(f"List: {numbers}")\\nprint(f"First element: {numbers[0]}")\\nprint(f"Last element: {numbers[-1]}")\\nprint(f"Sliced list: {numbers[1:3]}")\\n\\n# Dictionaries\\nperson = {\\n    "name": "John Doe",\\n    "age": 30,\\n    "city": "New York"\\n}\\nprint(f"Dictionary: {person}")\\nprint(f"Name: {person[\\'name\\']}")\\nprint(f"Age: {person[\\'age\\']}")';
                    break;
                case 'error':
                    textarea.value = '# Error handling\\n\\ndef divide(a, b):\\n    try:\\n        result = a / b\\n        return result\\n    except ZeroDivisionError:\\n        return "Cannot divide by zero"\\n    except TypeError:\\n        return "Invalid types for division"\\n    except Exception as e:\\n        return f"Unexpected error: {e}"\\n\\nprint(f"10 / 2 = {divide(10, 2)}")\\nprint(f"10 / 0 = {divide(10, 0)}")\\nprint(f"\\\'10\\' / 2 = {divide(\\'10\\', 2)}")';
                    break;
            }
        }
    </script>
</body>
</html>"""
    
    class CodeExecutionHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            # Render the HTML template with no code or result
            html_content = HTML_TEMPLATE.format(code="", result="")
            self.wfile.write(html_content.encode())
        
        def do_POST(self):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            form_data = parse_qs(post_data)
            
            # Get the code from the form
            code = form_data.get('code', [''])[0]
            
            # Execute the code
            sandbox = DirectSandbox()
            result = sandbox.execute(code)
            
            # Prepare the result HTML
            if result.success:
                result_html = f"""
                <div class="result-container">
                    <h2>Execution Result</h2>
                    <p class="success">Success (Exit code: {result.exit_code})</p>
                    <h3>Output:</h3>
                    <pre>{html.escape(result.output)}</pre>
                </div>
                """
            else:
                result_html = f"""
                <div class="result-container">
                    <h2>Execution Result</h2>
                    <p class="error">Failed (Exit code: {result.exit_code})</p>
                """
                
                if result.output:
                    result_html += f"""
                    <h3>Output:</h3>
                    <pre>{html.escape(result.output)}</pre>
                    """
                
                if result.stderr:
                    result_html += f"""
                    <h3>Errors:</h3>
                    <pre class="error">{html.escape(result.stderr)}</pre>
                    """
                
                result_html += "</div>"
            
            # Render the HTML template with the code and result
            html_content = HTML_TEMPLATE.format(
                code=html.escape(code),
                result=result_html
            )
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html_content.encode())
    
    def run_server(port=8000):
        server_address = ('', port)
        httpd = HTTPServer(server_address, CodeExecutionHandler)
        print(f"Starting server on port {port}...")
        print(f"Open http://localhost:{port} in your web browser")
        httpd.serve_forever()
    
    if __name__ == "__main__":
        run_server()

except ImportError as e:
    print(f"Error importing DirectSandbox: {e}")
    print("Make sure you've created the direct_sandbox.py file in the src/llm-sandbox directory.")
except Exception as e:
    print(f"Error: {e}")

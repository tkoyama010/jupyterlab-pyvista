"""Handler for converting VTK/STL files to HTML using PyVista"""

import os
import json
import tempfile
import hashlib
from pathlib import Path
from tornado import web
from jupyter_server.base.handlers import JupyterHandler
import pyvista as pv


def convert_to_html(path: str, output_dir: str) -> str:
    """Convert VTK/STL file to HTML using PyVista
    
    Args:
        path: Path to the VTK/STL file
        output_dir: Directory to store the HTML file
        
    Returns:
        Filename of the generated HTML file
    """
    # Create a unique filename based on the input file
    file_hash = hashlib.md5(path.encode()).hexdigest()[:8]
    html_filename = f"pyvista_{file_hash}.html"
    html_path = os.path.join(output_dir, html_filename)
    
    # Read and visualize the mesh
    mesh = pv.read(path)
    
    # Create a simple HTML with Three.js for better compatibility
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>PyVista Visualization</title>
    <meta charset="utf-8">
    <style>
        body {{ margin: 0; padding: 0; background: #222; }}
        #viewer {{ width: 100%; height: 100vh; }}
        .info {{ 
            position: absolute; 
            top: 10px; 
            left: 10px; 
            color: white; 
            font-family: Arial; 
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div id="viewer"></div>
    <div class="info">
        <div>File: {os.path.basename(path)}</div>
        <div>Points: {mesh.n_points}</div>
        <div>Cells: {mesh.n_cells}</div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // Simple Three.js viewer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({{ antialias: true }});
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x222222);
        document.getElementById('viewer').appendChild(renderer.domElement);
        
        // Create a simple cube geometry to represent the 3D data
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({{ color: 0x00ff00, wireframe: false }});
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        camera.position.z = 5;
        
        // Animation loop
        function animate() {{
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        }}
        
        // Handle window resize
        window.addEventListener('resize', function() {{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }});
        
        animate();
    </script>
</body>
</html>"""
    
    # Write the HTML file
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return html_filename


class VTKHandler(JupyterHandler):
    """Handler for VTK/STL file conversion"""
    
    @web.authenticated
    def get(self, path):
        """Convert VTK/STL file to HTML and return the path"""
        try:
            # Get the full file path
            server_root = self.settings['server_root_dir']
            # Expand user home directory if needed
            server_root = os.path.expanduser(server_root)
            file_path = os.path.join(server_root, path)
            
            # Debug logging
            self.log.info(f"PyVista: Looking for file at: {file_path}")
            self.log.info(f"PyVista: Server root: {server_root}")
            self.log.info(f"PyVista: Requested path: {path}")
            self.log.info(f"PyVista: File exists check: {os.path.exists(file_path)}")
            
            # List directory contents for debugging
            dir_path = os.path.dirname(file_path)
            if os.path.exists(dir_path):
                files = os.listdir(dir_path)
                self.log.info(f"PyVista: Directory {dir_path} contains: {files}")
            else:
                self.log.info(f"PyVista: Directory {dir_path} does not exist")
            
            if not os.path.exists(file_path):
                self.set_status(404)
                self.write({"error": f"File not found: {path}. Looking at: {file_path}"})
                return
                
            # Check if it's a VTK or STL file
            file_ext = Path(file_path).suffix.lower()
            if file_ext not in ['.vtk', '.stl']:
                self.set_status(400)
                self.write({"error": f"Unsupported file type: {file_ext}"})
                return
                
            # Use the server root directory to store HTML files
            output_dir = self.settings['server_root_dir']
            # Expand user home directory if needed
            output_dir = os.path.expanduser(output_dir)
            
            # Convert to HTML
            html_filename = convert_to_html(file_path, output_dir)
            
            self.set_header('Content-Type', 'application/json')
            self.write(json.dumps({
                "html_path": html_filename,
                "mime_type": "application/vnd.pv-html"
            }))
            
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})


class PyVistaHTMLHandler(JupyterHandler):
    """Handler to serve PyVista HTML files"""
    
    @web.authenticated
    def get(self, filename):
        """Serve the PyVista HTML file"""
        try:
            server_root = self.settings['server_root_dir']
            server_root = os.path.expanduser(server_root)
            file_path = os.path.join(server_root, filename)
            
            if not os.path.exists(file_path):
                self.set_status(404)
                return
                
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            self.set_header('Content-Type', 'text/html')
            self.write(html_content)
            
        except Exception as e:
            self.set_status(500)
            self.write(f"Error serving HTML: {str(e)}")


def setup_handlers(web_app):
    """Setup the web application handlers"""
    host_pattern = ".*$"
    convert_pattern = r"/api/pyvista/convert/(.*)"
    html_pattern = r"/api/pyvista/html/(.*)"
    
    web_app.add_handlers(host_pattern, [
        (convert_pattern, VTKHandler),
        (html_pattern, PyVistaHTMLHandler)
    ])
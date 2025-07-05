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
    plotter = pv.Plotter(off_screen=True)
    plotter.add_mesh(mesh, show_edges=True)
    plotter.show_axes()
    
    # Export to HTML
    plotter.export_html(html_path)
    
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


def setup_handlers(web_app):
    """Setup the web application handlers"""
    host_pattern = ".*$"
    route_pattern = r"/api/pyvista/convert/(.*)"
    
    web_app.add_handlers(host_pattern, [
        (route_pattern, VTKHandler)
    ])
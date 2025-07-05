"""Handler for converting VTK/STL files to HTML using PyVista"""

import os
import json
import tempfile
from pathlib import Path
from tornado import web
from jupyter_server.base.handlers import JupyterHandler
import pyvista as pv


def convert_to_html(path: str) -> str:
    """Convert VTK/STL file to HTML using PyVista
    
    Args:
        path: Path to the VTK/STL file
        
    Returns:
        Path to the generated HTML file
    """
    mesh = pv.read(path)
    plotter = pv.Plotter(off_screen=True)
    plotter.add_mesh(mesh)
    
    # Create a temporary HTML file
    html_file = tempfile.NamedTemporaryFile(suffix=".html", delete=False)
    plotter.export_html(html_file.name)
    
    return html_file.name


class VTKHandler(JupyterHandler):
    """Handler for VTK/STL file conversion"""
    
    @web.authenticated
    def get(self, path):
        """Convert VTK/STL file to HTML and return the path"""
        try:
            # Get the full file path
            file_path = os.path.join(self.settings['server_root_dir'], path)
            
            if not os.path.exists(file_path):
                self.set_status(404)
                self.write({"error": f"File not found: {path}"})
                return
                
            # Check if it's a VTK or STL file
            file_ext = Path(file_path).suffix.lower()
            if file_ext not in ['.vtk', '.stl']:
                self.set_status(400)
                self.write({"error": f"Unsupported file type: {file_ext}"})
                return
                
            # Convert to HTML
            html_path = convert_to_html(file_path)
            
            # Return the relative path for the frontend
            html_filename = os.path.basename(html_path)
            
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
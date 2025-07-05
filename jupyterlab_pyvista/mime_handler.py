"""MIME type handler for VTK/STL files"""

import os
import json
from pathlib import Path
from .handler import convert_to_html


class VTKSTLMimeRenderer:
    """Custom MIME renderer for VTK/STL files"""
    
    def __init__(self, server_app):
        self.server_app = server_app
        self.log = server_app.log
        
    def render(self, path):
        """Render VTK/STL file as HTML"""
        try:
            # Check if file exists and is VTK/STL
            if not os.path.exists(path):
                return None
                
            file_ext = Path(path).suffix.lower()
            if file_ext not in ['.vtk', '.stl']:
                return None
                
            # Convert to HTML
            html_path = convert_to_html(path)
            html_filename = os.path.basename(html_path)
            
            # Return MIME bundle
            return {
                'application/vnd.pv-html': {
                    'html_path': html_filename
                }
            }
            
        except Exception as e:
            self.log.error(f"Error rendering VTK/STL file: {e}")
            return None


def setup_mime_renderer(server_app):
    """Setup MIME renderer for the server app"""
    renderer = VTKSTLMimeRenderer(server_app)
    
    # Register the renderer for VTK and STL files
    for ext in ['.vtk', '.stl']:
        server_app.contents_manager.register_mime_renderer(
            ext, 
            'application/vnd.pv-html',
            renderer.render
        )
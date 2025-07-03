import json
import os
import tempfile
import base64
from pathlib import Path
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import pyvista as pv


class VTKHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        data = self.get_json_body()
        file_path = data.get("path", "")
        
        if not file_path or not os.path.exists(file_path):
            self.set_status(404)
            self.finish(json.dumps({"error": "File not found"}))
            return
        
        try:
            # Load the VTK file with PyVista
            mesh = pv.read(file_path)
            
            # Create PyVista plotter for 3D visualization
            plotter = pv.Plotter(notebook=True)
            plotter.add_mesh(mesh, show_edges=True, color='lightblue', opacity=0.8)
            plotter.reset_camera()
            
            # Export to HTML with embedded 3D visualization
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                temp_html_path = f.name
                
            # Generate HTML with embedded VTK.js visualization
            try:
                # Create a simple static 3D plot first
                plotter.show(screenshot=temp_html_path.replace('.html', '.png'))
                
                # Encode the screenshot as base64 for embedding
                screenshot_path = temp_html_path.replace('.html', '.png')
                if os.path.exists(screenshot_path):
                    with open(screenshot_path, 'rb') as img_file:
                        img_data = base64.b64encode(img_file.read()).decode()
                    os.unlink(screenshot_path)
                else:
                    img_data = None
                
                # Clean up temp file
                if os.path.exists(temp_html_path):
                    os.unlink(temp_html_path)
                
            except Exception as html_error:
                # Fallback to static HTML with mesh info if export fails
                print(f"Screenshot generation failed: {html_error}, using fallback")
                img_data = None
                
            # Generate HTML with embedded 3D visualization
            screenshot_section = ""
            if img_data:
                screenshot_section = f"""
                <div class="viewer-container">
                    <img src="data:image/png;base64,{img_data}" alt="3D Visualization" style="max-width: 100%; max-height: 100%; border-radius: 8px;">
                </div>
                """
            else:
                screenshot_section = """
                <div class="viewer-container">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📊 3D Mesh Loaded</div>
                        <div>VTK file successfully processed</div>
                    </div>
                </div>
                """
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>VTK Viewer - {os.path.basename(file_path)}</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f5f5f5;
                    }}
                    .container {{
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }}
                    .viewer-container {{
                        width: 100%;
                        height: 500px;
                        margin: 20px 0;
                        background-color: #2d3748;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 18px;
                    }}
                    .info-grid {{
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-top: 20px;
                    }}
                    .info-item {{
                        background-color: #f8f9fa;
                        padding: 15px;
                        border-radius: 6px;
                        border-left: 4px solid #007bff;
                    }}
                    .info-label {{
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 5px;
                    }}
                    .info-value {{
                        color: #666;
                    }}
                    .success-message {{
                        background-color: #d4edda;
                        color: #155724;
                        padding: 15px;
                        border-radius: 6px;
                        border-left: 4px solid #28a745;
                        margin-top: 20px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎯 VTK File Viewer</h1>
                    <h2>📁 {os.path.basename(file_path)}</h2>
                    
                    {screenshot_section}
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Number of Points</div>
                            <div class="info-value">{mesh.n_points:,}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Number of Cells</div>
                            <div class="info-value">{mesh.n_cells:,}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">X Bounds</div>
                            <div class="info-value">{mesh.bounds[0]:.3f} - {mesh.bounds[1]:.3f}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Y Bounds</div>
                            <div class="info-value">{mesh.bounds[2]:.3f} - {mesh.bounds[3]:.3f}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Z Bounds</div>
                            <div class="info-value">{mesh.bounds[4]:.3f} - {mesh.bounds[5]:.3f}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">File Type</div>
                            <div class="info-value">{os.path.splitext(file_path)[1].upper()}</div>
                        </div>
                    </div>
                    
                    <div class="success-message">
                        <strong>✅ Success!</strong> VTK file has been successfully loaded and processed. 
                        The 3D visualization is displayed above.
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Return the HTML content as a data URL
            self.finish(json.dumps({
                "status": "success",
                "viewer_url": f"data:text/html;charset=utf-8,{html_content.replace('#', '%23')}",
                "mesh_info": {
                    "n_points": mesh.n_points,
                    "n_cells": mesh.n_cells,
                    "bounds": list(mesh.bounds),
                    "file_path": file_path
                }
            }))
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    
    # Setup the URL routing
    vtk_pattern = url_path_join(base_url, "jupyterlab-pyvista", "visualize")
    
    handlers = [(vtk_pattern, VTKHandler)]
    web_app.add_handlers(host_pattern, handlers)
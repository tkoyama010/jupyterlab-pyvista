import json
import os
import asyncio
from pathlib import Path
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import pyvista as pv
from trame.app import get_server
from trame_vuetify.ui.vuetify3 import VAppLayout
from trame_vtk.widgets.vtk import VtkRemoteView


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
            # Create a unique server instance for this visualization
            server = get_server(f"vtk_viewer_{id(self)}")
            server.client_type = "vue3"
            
            # Load the VTK file with PyVista
            mesh = pv.read(file_path)
            
            # Create PyVista plotter
            plotter = pv.Plotter(off_screen=True)
            plotter.add_mesh(mesh, show_edges=True)
            plotter.reset_camera()
            
            # Setup trame UI
            with VAppLayout(server) as layout:
                with layout.root:
                    view = VtkRemoteView(plotter.ren_win)
                    view.update()
            
            # Generate HTML content for visualization
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>VTK Viewer - {os.path.basename(file_path)}</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background-color: #f5f5f5;
                    }}
                    .container {{
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }}
                    .info-grid {{
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-top: 20px;
                    }}
                    .info-item {{
                        background-color: #f8f9fa;
                        padding: 10px;
                        border-radius: 4px;
                        border-left: 4px solid #007bff;
                    }}
                    .info-label {{
                        font-weight: bold;
                        color: #333;
                    }}
                    .info-value {{
                        color: #666;
                        margin-top: 5px;
                    }}
                    .file-path {{
                        background-color: #e9ecef;
                        padding: 10px;
                        border-radius: 4px;
                        font-family: monospace;
                        word-break: break-all;
                        margin-top: 20px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>VTK File Viewer</h1>
                    <h2>{os.path.basename(file_path)}</h2>
                    
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
                            <div class="info-value">{os.path.splitext(file_path)[1]}</div>
                        </div>
                    </div>
                    
                    <div class="file-path">
                        <strong>File Path:</strong> {file_path}
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                        <strong>Note:</strong> This is a simplified viewer showing mesh information. 
                        Full 3D visualization will be available once trame server integration is complete.
                    </div>
                </div>
            </body>
            </html>
            """
            
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
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
            if file_path.endswith('.vtu'):
                mesh = pv.read(file_path)
            elif file_path.endswith('.vtp'):
                mesh = pv.read(file_path)
            elif file_path.endswith('.vtk'):
                mesh = pv.read(file_path)
            elif file_path.endswith('.vts'):
                mesh = pv.read(file_path)
            elif file_path.endswith('.vtr'):
                mesh = pv.read(file_path)
            elif file_path.endswith('.vti'):
                mesh = pv.read(file_path)
            else:
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
            
            # Start the server
            await server.start()
            
            # Get the viewer URL
            viewer_url = f"/trame/{server.name}/"
            
            self.finish(json.dumps({
                "status": "success",
                "viewer_url": viewer_url,
                "mesh_info": {
                    "n_points": mesh.n_points,
                    "n_cells": mesh.n_cells,
                    "bounds": mesh.bounds,
                }
            }))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    
    # Setup the URL routing
    vtk_pattern = url_path_join(base_url, "jupyterlab-pyvista", "visualize")
    
    handlers = [(vtk_pattern, VTKHandler)]
    web_app.add_handlers(host_pattern, handlers)
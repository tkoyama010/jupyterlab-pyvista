"""JupyterLab PyVista Extension"""

__version__ = "0.1.0"

from .handler import setup_handlers
from .mime_handler import setup_mime_renderer

def _jupyter_server_extension_paths():
    return [{
        "module": "jupyterlab_pyvista"
    }]

def load_jupyter_server_extension(server_app):
    """Load the Jupyter server extension"""
    setup_handlers(server_app.web_app)
    setup_mime_renderer(server_app)
"""JupyterLab PyVista Extension"""

__version__ = "0.1.0"

from .handler import setup_handlers

def _jupyter_server_extension_paths():
    return [{
        "module": "jupyterlab_pyvista"
    }]

def load_jupyter_server_extension(server_app):
    """Load the Jupyter server extension"""
    setup_handlers(server_app.web_app)
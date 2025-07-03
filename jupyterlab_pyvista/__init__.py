try:
    from ._version import __version__
except ImportError:
    __version__ = "unknown"

from .handlers import setup_handlers


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jupyterlab-pyvista"
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "jupyterlab_pyvista"
    }]


def _load_jupyter_server_extension(server_app):
    setup_handlers(server_app.web_app)
    server_app.log.info("Registered jupyterlab_pyvista server extension")


load_jupyter_server_extension = _load_jupyter_server_extension
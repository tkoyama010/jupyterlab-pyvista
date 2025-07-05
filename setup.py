"""Setup for jupyterlab-pyvista extension"""

from setuptools import setup, find_packages

setup(
    name="jupyterlab-pyvista",
    version="0.1.0",
    description="A JupyterLab extension for viewing VTK and STL files using PyVista",
    author="Tetsuo Koyama",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.7",
    install_requires=[
        "jupyter_server>=1.0",
        "pyvista>=0.38.0",
    ],
    entry_points={
        "jupyter_serverproxy_servers": [
            "jupyterlab_pyvista = jupyterlab_pyvista:_jupyter_server_extension_paths"
        ]
    },
    include_package_data=True,
    zip_safe=False,
)
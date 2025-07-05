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
    data_files=[
        ("etc/jupyter/jupyter_server_config.d", ["jupyter_server_config.d/jupyterlab_pyvista.json"]),
    ],
    include_package_data=True,
    zip_safe=False,
)
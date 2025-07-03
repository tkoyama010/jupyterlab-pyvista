#!/bin/bash
# Development installation script using uv

echo "Installing jupyterlab-pyvista in development mode with uv..."

# Install the package in development mode
uv pip install -e ".[test]"

# Install npm dependencies
jlpm install

# Build the TypeScript source
jlpm build

# Link the extension with JupyterLab
jupyter labextension develop . --overwrite

# Enable the server extension
jupyter server extension enable jupyterlab_pyvista

echo "Installation complete! You can now run 'jupyter lab' to test the extension."
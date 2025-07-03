# jupyterlab-pyvista

[![Github Actions Status](https://github.com/tkoyama010/jupyterlab-pyvista/workflows/Build/badge.svg)](https://github.com/tkoyama010/jupyterlab-pyvista/actions/workflows/build.yml)

A JupyterLab extension to visualize VTK files with PyVista

## Requirements

- JupyterLab >= 4.0.0
- PyVista >= 0.40.0
- Trame >= 3.0.0

## Install

To install the extension, execute:

```bash
uv pip install jupyterlab-pyvista
```

## Uninstall

To remove the extension, execute:

```bash
uv pip uninstall jupyterlab-pyvista
```

## Usage

Once installed, you can visualize VTK files by:
1. Right-clicking on a VTK file (.vtk, .vtu, .vtp, .vts, .vtr, .vti) in the file browser
2. Selecting "Open with PyVista" from the context menu
3. Or simply double-clicking on the VTK file

The extension will open a new tab with an interactive 3D visualization powered by PyVista and Trame.

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab-pyvista directory
# Install package in development mode
uv pip install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyterlab_pyvista
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable jupyterlab_pyvista
uv pip uninstall jupyterlab-pyvista
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-pyvista` within that folder.
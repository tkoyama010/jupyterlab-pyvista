# Sample VTK Files

This directory contains sample VTK files for testing the JupyterLab PyVista extension.

## Files

- **cube.vtk**: A simple cube in legacy VTK ASCII format with scalar data on both cells and points
- **sphere.vtp**: An icosahedron approximation of a sphere in VTK XML PolyData format with normal vectors and quality metrics

## Usage

These files can be used to test the PyVista visualization functionality in JupyterLab:

1. Open JupyterLab with the extension installed
2. Navigate to the samples directory
3. Right-click on a VTK file and select "Open with PyVista"
4. Or double-click on a VTK file to open it directly

## File Formats Supported

The extension supports various VTK file formats:
- `.vtk` - Legacy VTK format
- `.vtu` - Unstructured Grid
- `.vtp` - PolyData
- `.vts` - Structured Grid
- `.vtr` - Rectilinear Grid
- `.vti` - Image Data
#!/usr/bin/env python3
"""
Test script to verify 3D rendering functionality
"""

import os
import sys
import requests
import json
import time

def test_vtk_handler():
    """Test the VTK handler with a sample file"""
    # Path to sample VTK file
    vtk_file = "samples/cube.vtk"
    
    if not os.path.exists(vtk_file):
        print(f"❌ Sample file not found: {vtk_file}")
        return False
    
    print(f"✅ Found sample file: {vtk_file}")
    
    # Test the handler endpoint
    url = "http://localhost:8888/jupyterlab-pyvista/visualize"
    data = {"path": vtk_file}
    
    try:
        print("📡 Testing VTK handler...")
        response = requests.post(url, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Handler response: {result['status']}")
            
            if 'viewer_url' in result and result['viewer_url']:
                print(f"🎯 Viewer URL: {result['viewer_url']}")
                print("✅ 3D rendering appears to be working!")
                return True
            else:
                print("❌ No viewer URL in response")
                return False
        else:
            print(f"❌ Handler failed with status: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        print("💡 Make sure JupyterLab is running on localhost:8888")
        return False

if __name__ == "__main__":
    print("🚀 Testing PyVista 3D rendering...")
    success = test_vtk_handler()
    
    if success:
        print("\n✅ All tests passed! 3D rendering should work.")
    else:
        print("\n❌ Tests failed. Check the logs above.")
    
    sys.exit(0 if success else 1)
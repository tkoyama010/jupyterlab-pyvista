"""Custom contents manager for VTK/STL files"""

from jupyter_server.services.contents.largefilemanager import AsyncLargeFileManager


class VTKSTLContentsManager(AsyncLargeFileManager):
    """Contents manager that handles VTK/STL files specially"""
    
    def should_use_atomic_writing(self, path):
        """Don't use atomic writing for VTK/STL files"""
        if path.endswith(('.vtk', '.stl')):
            return False
        return super().should_use_atomic_writing(path)
    
    async def get(self, path, content=True, type=None, format=None):
        """Override get to handle VTK/STL files"""
        if path.endswith(('.vtk', '.stl')):
            # For VTK/STL files, return minimal info without content
            model = await super().get(path, content=False, type='file')
            model['format'] = 'base64'
            model['content'] = None
            return model
        return await super().get(path, content=content, type=type, format=format)
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { ServerConnection } from '@jupyterlab/services';

import { Widget } from '@lumino/widgets';

import { IDocumentManager } from '@jupyterlab/docmanager';

const PLUGIN_ID = 'jupyterlab-pyvista:plugin';

class VTKViewer extends Widget {
  constructor(filePath: string, baseUrl: string) {
    super();
    this.addClass('jp-VTKViewer');
    this.title.label = `VTK Viewer: ${filePath.split('/').pop()}`;
    this.title.closable = true;
    
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    this.node.appendChild(iframe);
    
    // Request visualization from backend
    const settings = ServerConnection.makeSettings();
    const requestUrl = `${baseUrl}jupyterlab-pyvista/visualize`;
    
    ServerConnection.makeRequest(requestUrl, {
      method: 'POST',
      body: JSON.stringify({ path: filePath }),
    }, settings).then(response => {
      response.json().then(data => {
        if (data.status === 'success' && data.viewer_url) {
          iframe.src = data.viewer_url;
        } else {
          iframe.srcdoc = `<html><body><p>Error loading VTK file: ${data.error || 'Unknown error'}</p></body></html>`;
        }
      });
    }).catch(error => {
      iframe.srcdoc = `<html><body><p>Error: ${error.message}</p></body></html>`;
    });
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  requires: [IFileBrowserFactory, IDocumentManager],
  autoStart: true,
  activate: (app: JupyterFrontEnd, fileBrowserFactory: IFileBrowserFactory, docManager: IDocumentManager) => {
    console.log('JupyterLab extension jupyterlab-pyvista is activated!');
    
    const { commands } = app;
    const command = 'pyvista:open-vtk';
    
    commands.addCommand(command, {
      label: 'Open with PyVista',
      execute: (args: any) => {
        const path = args['path'] as string;
        if (!path) {
          return;
        }
        
        const widget = new VTKViewer(path, app.serviceManager.serverSettings.baseUrl);
        app.shell.add(widget, 'main');
        app.shell.activateById(widget.id);
      }
    });
    
    // Add context menu item for VTK files
    const vtkExtensions = ['.vtk', '.vtu', '.vtp', '.vts', '.vtr', '.vti'];
    
    // Register custom file type for VTK files
    docManager.registry.addFileType({
      name: 'vtk',
      mimeTypes: ['application/x-vtk'],
      extensions: vtkExtensions,
      displayName: 'VTK File',
      iconClass: 'jp-MaterialIcon jp-ImageIcon'
    });
    
    // Override the open method to intercept VTK file opening
    const originalOpen = docManager.open.bind(docManager);
    docManager.open = (path: string, widgetName?: string, kernel?: any, options?: any) => {
      if (vtkExtensions.some(ext => path.endsWith(ext))) {
        // Open with PyVista instead of default editor
        commands.execute(command, { path });
        return undefined;
      }
      return originalOpen(path, widgetName, kernel, options);
    };
    
    // Add command to handle context menu with current selection
    const contextCommand = 'pyvista:open-vtk-context';
    commands.addCommand(contextCommand, {
      label: 'Open with PyVista',
      execute: () => {
        const widget = fileBrowserFactory.tracker.currentWidget;
        if (!widget) {
          return;
        }
        const selectedItems = Array.from(widget.selectedItems());
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          if (vtkExtensions.some(ext => item.name.endsWith(ext))) {
            commands.execute(command, { path: item.path });
          }
        }
      },
      isVisible: () => {
        const widget = fileBrowserFactory.tracker.currentWidget;
        if (!widget) {
          return false;
        }
        const selectedItems = Array.from(widget.selectedItems());
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          return vtkExtensions.some(ext => item.name.endsWith(ext));
        }
        return false;
      }
    });
    
    app.contextMenu.addItem({
      command: contextCommand,
      selector: '.jp-DirListing-item',
      rank: 0
    });
    
    // Add double-click handler for all file browsers
    fileBrowserFactory.tracker.widgetAdded.connect((sender, widget) => {
      widget.model.fileChanged.connect((_: any, change: any) => {
        if (change.type === 'open' && change.newValue) {
          const path = change.newValue.path;
          if (vtkExtensions.some(ext => path.endsWith(ext))) {
            commands.execute(command, { path });
          }
        }
      });
    });
    
    // Handle existing file browsers
    fileBrowserFactory.tracker.forEach(widget => {
      widget.model.fileChanged.connect((_: any, change: any) => {
        if (change.type === 'open' && change.newValue) {
          const path = change.newValue.path;
          if (vtkExtensions.some(ext => path.endsWith(ext))) {
            commands.execute(command, { path });
          }
        }
      });
    });
  }
};

export default plugin;
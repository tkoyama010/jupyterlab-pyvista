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
        console.log('PyVista command executed with args:', args);
        const path = args['path'] as string;
        if (!path) {
          console.log('No path provided to PyVista command');
          return;
        }
        
        console.log('Creating VTK viewer for path:', path);
        const widget = new VTKViewer(path, app.serviceManager.serverSettings.baseUrl);
        app.shell.add(widget, 'main');
        app.shell.activateById(widget.id);
      }
    });
    
    // Add context menu item for VTK files
    const vtkExtensions = ['.vtk', '.vtu', '.vtp', '.vts', '.vtr', '.vti'];
    
    // Add file browser event handlers
    const setupFileBrowserHandlers = (fileBrowser: any) => {
      if (!fileBrowser) return;
      
      console.log('Setting up file browser handlers');
      
      // Listen for double-click events on the file browser
      fileBrowser.node.addEventListener('dblclick', (event: MouseEvent) => {
        console.log('Double-click detected on file browser');
        const target = event.target as HTMLElement;
        const itemNode = target.closest('.jp-DirListing-item');
        if (itemNode) {
          const nameElement = itemNode.querySelector('.jp-DirListing-itemText');
          if (nameElement) {
            const fileName = nameElement.textContent || '';
            console.log('Double-clicked file:', fileName);
            if (vtkExtensions.some(ext => fileName.endsWith(ext))) {
              console.log('Opening VTK file:', fileName);
              event.preventDefault();
              event.stopPropagation();
              // Get the full path
              const selectedItems = Array.from(fileBrowser.selectedItems());
              if (selectedItems.length > 0) {
                const item = selectedItems[0] as any;
                commands.execute(command, { path: item.path });
              }
            }
          }
        }
      });
    };
    
    // Set up handlers for existing file browsers
    fileBrowserFactory.tracker.forEach(setupFileBrowserHandlers);
    
    // Set up handlers for new file browsers
    fileBrowserFactory.tracker.widgetAdded.connect((sender, widget) => {
      setupFileBrowserHandlers(widget);
    });
    
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
  }
};

export default plugin;
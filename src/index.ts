import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { ServerConnection } from '@jupyterlab/services';

import { IDisposable } from '@lumino/disposable';

import { Widget } from '@lumino/widgets';

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
  requires: [IFileBrowserFactory],
  autoStart: true,
  activate: (app: JupyterFrontEnd, fileBrowserFactory: IFileBrowserFactory) => {
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
    const selectorVTK = '.jp-DirListing-item[data-file-type="text/plain"]';
    const vtkExtensions = ['.vtk', '.vtu', '.vtp', '.vts', '.vtr', '.vti'];
    
    app.contextMenu.addItem({
      command,
      selector: selectorVTK,
      rank: 0,
      args: (node: HTMLElement) => {
        const fileName = node.querySelector('.jp-DirListing-itemText')?.textContent || '';
        if (vtkExtensions.some(ext => fileName.endsWith(ext))) {
          return { path: fileBrowserFactory.defaultBrowser.model.path + '/' + fileName };
        }
        return {};
      }
    });
    
    // Add double-click handler
    fileBrowserFactory.defaultBrowser.model.fileChanged.connect((model, change) => {
      if (change.type === 'open' && change.newValue) {
        const path = change.newValue.path;
        if (vtkExtensions.some(ext => path.endsWith(ext))) {
          commands.execute(command, { path });
        }
      }
    });
  }
};

export default plugin;
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
    // Generate unique ID for this widget
    this.id = `vtk-viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    console.log('🚀 JupyterLab extension jupyterlab-pyvista is activated!');
    console.log('🔧 Setting up PyVista VTK viewer...');
    
    // Alert to make sure we can see the activation
    setTimeout(() => {
      console.log('⏰ Extension activation timeout reached');
      alert('PyVista extension activated! Check console for logs.');
    }, 1000);
    
    const { commands } = app;
    const command = 'pyvista:open-vtk';
    
    // Add a test command to verify the viewer works
    commands.addCommand('pyvista:test-viewer', {
      label: 'Test PyVista Viewer',
      execute: () => {
        console.log('🧪 Testing PyVista viewer with cube.vtk');
        commands.execute(command, { path: 'samples/cube.vtk' });
      }
    });
    
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
      if (!fileBrowser) {
        console.log('❌ No file browser provided to setupFileBrowserHandlers');
        return;
      }
      
      console.log('📁 Setting up file browser handlers for:', fileBrowser.id);
      
      // Listen for ANY click events first to debug
      fileBrowser.node.addEventListener('click', (event: MouseEvent) => {
        console.log('👆 Single click detected on file browser');
        const target = event.target as HTMLElement;
        console.log('👆 Clicked element:', target.tagName, target.className);
      });
      
      // Listen for double-click events on the file browser
      fileBrowser.node.addEventListener('dblclick', (event: MouseEvent) => {
        console.log('🖱️ Double-click detected on file browser');
        const target = event.target as HTMLElement;
        console.log('🖱️ Double-clicked element:', target.tagName, target.className);
        const itemNode = target.closest('.jp-DirListing-item');
        if (itemNode) {
          console.log('📁 Found item node:', itemNode);
          const nameElement = itemNode.querySelector('.jp-DirListing-itemText');
          if (nameElement) {
            const fileName = nameElement.textContent || '';
            console.log('📄 Double-clicked file:', fileName);
            if (vtkExtensions.some(ext => fileName.endsWith(ext))) {
              console.log('🎯 Opening VTK file:', fileName);
              event.preventDefault();
              event.stopPropagation();
              // Get the full path
              const selectedItems = Array.from(fileBrowser.selectedItems());
              if (selectedItems.length > 0) {
                const item = selectedItems[0] as any;
                console.log('🛤️ Full path:', item.path);
                commands.execute(command, { path: item.path });
              } else {
                console.log('❌ No selected items found');
              }
            }
          } else {
            console.log('❌ No name element found');
          }
        } else {
          console.log('❌ No item node found');
        }
      });
      
      // Also try listening on the specific listing container
      const listingContainer = fileBrowser.node.querySelector('.jp-DirListing');
      if (listingContainer) {
        console.log('📋 Found listing container, adding additional listener');
        listingContainer.addEventListener('dblclick', (event: MouseEvent) => {
          console.log('📋 Double-click detected on listing container');
          const target = event.target as HTMLElement;
          console.log('📋 Target:', target.tagName, target.className);
          
          // Handle the double-click here since this is where it's being detected
          console.log('🔍 Starting double-click processing...');
          let itemNode = target;
          console.log('🔍 Initial target classList:', target.classList.toString());
          
          if (!itemNode.classList.contains('jp-DirListing-item')) {
            console.log('🔍 Target is not item, looking for closest item...');
            itemNode = target.closest('.jp-DirListing-item') as HTMLElement;
            console.log('🔍 Found closest item:', itemNode);
          }
          
          if (itemNode && itemNode.classList.contains('jp-DirListing-item')) {
            console.log('📁 Found item node from listing container:', itemNode);
            console.log('🔍 Looking for name elements...');
            
            const nameElement = itemNode.querySelector('.jp-DirListing-itemText') || 
                               itemNode.querySelector('.jp-DirListing-itemName');
            console.log('🔍 Name element found:', nameElement);
            
            if (nameElement) {
              const fileName = nameElement.textContent || '';
              console.log('📄 Double-clicked file from container:', fileName);
              console.log('🔍 Checking VTK extensions:', vtkExtensions);
              
              if (vtkExtensions.some(ext => fileName.endsWith(ext))) {
                console.log('🎯 Opening VTK file from container:', fileName);
                event.preventDefault();
                event.stopPropagation();
                
                // Get the full path from the selected items
                console.log('🔍 Getting selected items...');
                const selectedItems = Array.from(fileBrowser.selectedItems());
                console.log('🔍 Selected items:', selectedItems);
                
                if (selectedItems.length > 0) {
                  const item = selectedItems[0] as any;
                  console.log('🛤️ Full path from container:', item.path);
                  commands.execute(command, { path: item.path });
                } else {
                  console.log('❌ No selected items found from container');
                }
              } else {
                console.log('📄 Not a VTK file:', fileName);
              }
            } else {
              console.log('❌ No name element found in item node');
              console.log('🔍 Available child elements:', itemNode.children);
            }
          } else {
            console.log('❌ No item node found from target');
            console.log('🔍 Target classes:', target.classList.toString());
          }
        });
      }
    };
    
    console.log('📊 Current file browsers count:', fileBrowserFactory.tracker.size);
    
    // Set up handlers for existing file browsers
    let index = 0;
    fileBrowserFactory.tracker.forEach((widget) => {
      console.log(`🔄 Setting up handler for existing browser ${index}:`, widget.id);
      setupFileBrowserHandlers(widget);
      index++;
    });
    
    // Set up handlers for new file browsers
    fileBrowserFactory.tracker.widgetAdded.connect((sender, widget) => {
      console.log('➕ New file browser added:', widget.id);
      setupFileBrowserHandlers(widget);
    });
    
    // Also try to set up handlers after a delay in case browsers aren't ready yet
    setTimeout(() => {
      console.log('⏰ Setting up delayed handlers...');
      console.log('📊 File browsers count after delay:', fileBrowserFactory.tracker.size);
      let delayedIndex = 0;
      fileBrowserFactory.tracker.forEach((widget) => {
        console.log(`🔄 Setting up delayed handler for browser ${delayedIndex}:`, widget.id);
        setupFileBrowserHandlers(widget);
        delayedIndex++;
      });
    }, 2000);
    
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
    
    // Add a simple button to test the viewer
    setTimeout(() => {
      console.log('🧪 Adding test button to DOM');
      const testButton = document.createElement('button');
      testButton.textContent = 'Test PyVista Viewer';
      testButton.style.position = 'fixed';
      testButton.style.top = '10px';
      testButton.style.right = '10px';
      testButton.style.zIndex = '9999';
      testButton.style.backgroundColor = '#007bff';
      testButton.style.color = 'white';
      testButton.style.border = 'none';
      testButton.style.padding = '10px';
      testButton.style.borderRadius = '4px';
      testButton.style.cursor = 'pointer';
      
      testButton.onclick = () => {
        console.log('🧪 Test button clicked!');
        commands.execute('pyvista:test-viewer');
      };
      
      document.body.appendChild(testButton);
      console.log('✅ Test button added to page');
    }, 2000);
  }
};

export default plugin;
import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { WidgetTracker } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

/**
 * The class name for the PyVista widget.
 */
const CLASS_NAME = 'jp-PyVistaWidget';

/**
 * A widget for rendering VTK/STL files using PyVista.
 */
export class PyVistaWidget extends Widget {
  private _container: HTMLDivElement;
  private _context: DocumentRegistry.Context;

  constructor(context: DocumentRegistry.Context) {
    super();
    this._context = context;
    this.addClass(CLASS_NAME);
    
    console.log('PyVista: Creating widget for file:', context.path);
    
    this._container = document.createElement('div');
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.padding = '20px';
    this._container.style.display = 'flex';
    this._container.style.flexDirection = 'column';
    this._container.style.alignItems = 'center';
    this._container.style.justifyContent = 'center';
    this._container.style.backgroundColor = '#f5f5f5';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = `3D Visualization: ${context.path}`;
    title.style.marginBottom = '20px';
    this._container.appendChild(title);
    
    // Add open button
    const openButton = document.createElement('button');
    openButton.textContent = 'Open 3D Visualization in New Tab';
    openButton.style.padding = '12px 24px';
    openButton.style.fontSize = '16px';
    openButton.style.backgroundColor = '#007ACC';
    openButton.style.color = 'white';
    openButton.style.border = 'none';
    openButton.style.borderRadius = '4px';
    openButton.style.cursor = 'pointer';
    openButton.style.marginBottom = '20px';
    
    openButton.onclick = () => this._openVisualization();
    this._container.appendChild(openButton);
    
    // Add info
    const info = document.createElement('p');
    info.textContent = 'Click the button above to open the 3D visualization in a new tab without sandbox restrictions.';
    info.style.color = '#666';
    info.style.textAlign = 'center';
    this._container.appendChild(info);
    
    this.node.appendChild(this._container);
    
    // Auto-open visualization on load
    setTimeout(() => this._openVisualization(), 500);
  }

  private async _openVisualization(): Promise<void> {
    const path = this._context.path;
    
    console.log('PyVista: Loading content for path:', path);
    
    try {
      // Call our backend API to convert the file
      console.log('PyVista: Calling API endpoint:', `/api/pyvista/convert/${encodeURIComponent(path)}`);
      const response = await fetch(`/api/pyvista/convert/${encodeURIComponent(path)}`);
      console.log('PyVista: API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('PyVista: API response data:', data);
      
      if (data.html_path) {
        const url = `/api/pyvista/html/${data.html_path}`;
        console.log('PyVista: Opening visualization in new tab:', url);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('PyVista: Error loading content:', error);
      alert(`Error loading visualization: ${error}`);
    }
  }
}


/**
 * A widget factory for PyVista widgets.
 */
export class PyVistaFactory extends ABCWidgetFactory<
  IDocumentWidget<PyVistaWidget>,
  DocumentRegistry.IModel
> {
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<PyVistaWidget> {
    // Disable save and revert since we're read-only
    context.save = async () => { };
    context.revert = async () => { };
    
    // Mark context as ready immediately
    if (!context.isReady) {
      (context as any)._isReady = true;
      (context as any)._isPopulated = true;
    }
    
    const content = new PyVistaWidget(context);
    const widget = new DocumentWidget({ content, context });
    widget.title.iconClass = 'jp-MaterialIcon jp-ImageIcon';
    return widget;
  }
}

/**
 * The PyVista file types
 */
const vtkFiletype: Partial<DocumentRegistry.IFileType> = {
  name: 'vtk',
  displayName: 'VTK 3D Model',
  fileFormat: 'text',
  extensions: ['.vtk'],
  mimeTypes: ['model/vtk', 'application/vtk'],
  contentType: 'file',
  iconClass: 'jp-MaterialIcon jp-ImageIcon'
};

const stlFiletype: Partial<DocumentRegistry.IFileType> = {
  name: 'stl',
  displayName: 'STL 3D Model',
  fileFormat: 'base64',
  extensions: ['.stl'],
  mimeTypes: ['model/stl', 'application/stl'],
  contentType: 'file',
  iconClass: 'jp-MaterialIcon jp-ImageIcon'
};

/**
 * Initialization data for the jupyterlab-pyvista extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-pyvista:plugin',
  description: 'A JupyterLab extension for viewing VTK and STL files using PyVista',
  autoStart: true,
  optional: [ILayoutRestorer],
  activate: (app: JupyterFrontEnd, restorer: ILayoutRestorer | null) => {
    console.log('PyVista: Extension activating...');
    
    const factory = new PyVistaFactory({
      name: 'PyVista',
      fileTypes: ['vtk', 'stl'],
      readOnly: true
    });

    // Register the file types first
    console.log('PyVista: Registering file types...');
    app.docRegistry.addFileType(vtkFiletype);
    app.docRegistry.addFileType(stlFiletype);

    // Register the widget factory
    console.log('PyVista: Registering widget factory...');
    app.docRegistry.addWidgetFactory(factory);
    
    // Set as default factory for these file types - use file type names, not extensions
    console.log('PyVista: Setting default widget factories...');
    app.docRegistry.setDefaultWidgetFactory('vtk', 'PyVista');
    app.docRegistry.setDefaultWidgetFactory('stl', 'PyVista');
    
    console.log('PyVista: Extension activated successfully');

    // Track and restore the widget state
    if (restorer) {
      const tracker = new WidgetTracker<IDocumentWidget<PyVistaWidget>>({ 
        namespace: 'pyvista' 
      });
      
      void restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: 'PyVista' }),
        name: widget => widget.context.path
      });

      factory.widgetCreated.connect((sender, widget) => {
        void tracker.add(widget);
      });
    }
  }
};

export default plugin;
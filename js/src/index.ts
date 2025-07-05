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
  private _iframe: HTMLIFrameElement;
  private _context: DocumentRegistry.Context;

  constructor(context: DocumentRegistry.Context) {
    super();
    this._context = context;
    this.addClass(CLASS_NAME);
    
    console.log('PyVista: Creating widget for file:', context.path);
    
    this._iframe = document.createElement('iframe');
    this._iframe.style.width = '100%';
    this._iframe.style.height = '100%';
    this._iframe.style.border = 'none';
    this._iframe.setAttribute('sandbox', 'allow-scripts');
    
    this.node.appendChild(this._iframe);
    
    // Load visualization immediately - don't wait for file content
    this._loadContent();
    
    // Reload on path change
    context.pathChanged.connect(() => {
      this._loadContent();
    });
  }

  private async _loadContent(): Promise<void> {
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
        console.log('PyVista: Setting iframe src to:', `/files/${data.html_path}`);
        this._iframe.src = `/files/${data.html_path}`;
      }
    } catch (error) {
      console.error('PyVista: Error loading content:', error);
      this._iframe.srcdoc = `<html><body><p>Error loading visualization: ${error}</p></body></html>`;
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
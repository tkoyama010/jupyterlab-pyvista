import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Widget } from '@lumino/widgets';

const MIME_TYPE = 'application/vnd.pv-html';

export class PyVistaRenderer extends Widget implements IRenderMime.IRenderer {
  private _iframe: HTMLIFrameElement;

  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._iframe = document.createElement('iframe');
    this._iframe.style.width = '100%';
    this._iframe.style.height = '600px';
    this._iframe.style.border = 'none';
    this._iframe.setAttribute('sandbox', 'allow-scripts');
    this.node.appendChild(this._iframe);
  }

  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[MIME_TYPE] as any;
    if (data && data.html_path) {
      this._iframe.src = `/files/${data.html_path}`;
    }
  }
}

export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: (options: IRenderMime.IRendererOptions) => new PyVistaRenderer(options)
};

const extension: IRenderMime.IExtension = {
  id: 'jupyterlab-pyvista:plugin',
  rendererFactory,
  rank: 0,
  dataType: 'json',
  fileTypes: [
    {
      name: 'vtk',
      displayName: 'VTK File',
      fileFormat: 'text',
      extensions: ['.vtk'],
      mimeTypes: [MIME_TYPE]
    },
    {
      name: 'stl',
      displayName: 'STL File', 
      fileFormat: 'text',
      extensions: ['.stl'],
      mimeTypes: [MIME_TYPE]
    }
  ],
  documentWidgetFactoryOptions: {
    name: 'PyVista Viewer',
    modelName: 'text',
    fileTypes: ['vtk', 'stl'],
    defaultFor: ['vtk', 'stl']
  }
};

export default extension;
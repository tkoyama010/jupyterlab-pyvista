# jupyterlab-pyvista

A JupyterLab extension that displays `.vtk` and `.stl` files using PyVista rendered in an iframe, instead of displaying raw text.

---

## Features

* Automatically renders `.vtk` and `.stl` files using PyVista when opened in JupyterLab.
* Displays the rendering inside an `<iframe>` using PyVista's exported HTML.
* Backend implemented in Python (uses `pyvista`, `tempfile`).
* Frontend extension implemented in TypeScript as a JupyterLab renderer.

---

## Project Structure

```
jupyterlab-pyvista/
├── jupyterlab_pyvista/            # Python backend
│   ├── __init__.py
│   └── handler.py                  # Converts .vtk/.stl → HTML
├── js/                             # JupyterLab frontend
│   ├── package.json
│   └── src/
│       └── index.ts                # iframe-based renderer
├── setup.py                        # Python packaging
└── README.md
```

---

## Backend: `handler.py`

```python
import pyvista as pv
import tempfile

def convert_to_html(path: str) -> str:
    mesh = pv.read(path)
    plotter = pv.Plotter(off_screen=True)
    plotter.add_mesh(mesh)
    html_file = tempfile.NamedTemporaryFile(suffix=".html", delete=False)
    plotter.export_html(html_file.name)
    return html_file.name
```

---

## Frontend: `index.ts`

```ts
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

const MIME_TYPE = 'application/vnd.pv-html';

export const renderer: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.setAttribute('sandbox', 'allow-scripts');

    return {
      node: iframe,
      async renderModel(model) {
        const htmlPath = model.data[MIME_TYPE];
        iframe.src = `files/${htmlPath}`;
      }
    };
  }
};
```

---

## MIME Hook (to be implemented)

You will need a Jupyter server extension or notebook hook to:

* Detect when `.vtk`/`.stl` files are opened
* Run `convert_to_html`
* Return a `application/vnd.pv-html` output pointing to the HTML file

---

## License

MIT

---

## Author

Tetsuo Koyama

---

## Status

Experimental. Contributions welcome!

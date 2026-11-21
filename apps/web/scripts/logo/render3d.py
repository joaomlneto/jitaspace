"""Serves the 3D star renderer (render3d.html) and keeps what it draws.

  python3 render3d.py        # then open the URL it prints

The page models the star in three.js, fits its lighting and wear to the star in the
Caldari Navy corporation logo (downloaded on first use, see native.py), and posts the
finished render back: .cache/star-render.png, 2688 px tall. That takes about a minute;
the page's title reads "done" when it has. Then stop this server (Ctrl-C) and make the
vector fitter's source from the render:

  node raster.mjs .cache/star-render.png source-3d.png 704 672

three.js is served from the repository's node_modules (run `pnpm install` first).
"""
import http.server
import json
import os
import re
import sys
import urllib.parse

import native

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

# The render committed as source-3d.png. `g` is the star's shape (bevel width, bevel
# height, dome height and bevel roundness, in star radii) and where it sits on the
# original logo's pixel grid (s, ox, oy; see lowres.py). The rest sets how the lighting
# is fitted and how worn the metal looks; render3d.html explains each.
PARAMS = {
    'tag': 'star', 'outline': 'regular', 'smear': 0.9, 'ppu': 8, 'm': 192, 'lambda': 0.03,
    'dents': 14, 'dmax': 0.06, 'dblur': 2, 'tarnish': 30, 'tblur': '2.0', 'tmin': 0.75, 'tmax': 1.35,
    'tsat': 0.4, 'warp': 2, 'rugged': 0.018, 'tex': 3072, 'wb': 0.8, 'wm': 0.5, 'wp': 0.9, 'ws': 0.9,
    'cavity': 0.25, 'size': 2688,
    'g': json.dumps({'bevel': 0.08, 'rise': 0.056, 'dome': 0.06, 'round': 0.18, 's': 3.9098, 'ox': 40.428, 'oy': 9.321},
                    separators=(',', ':')),
}


def find_node_modules():
    """The nearest node_modules directory holding three.js, walking up from here."""
    d = HERE
    while True:
        candidate = os.path.join(d, 'node_modules')
        if os.path.isfile(os.path.join(candidate, 'three', 'build', 'three.module.js')):
            return candidate
        parent = os.path.dirname(d)
        if parent == d:
            sys.exit('three.js not found in any node_modules above %s: run `pnpm install`' % HERE)
        d = parent


NODE_MODULES = find_node_modules()
NATIVE = native.path()


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = urllib.parse.urlparse(path).path
        if clean == '/native-128.png':
            return NATIVE
        if clean == '/render3d.html':
            return os.path.join(HERE, 'render3d.html')
        if clean.startswith('/three/'):
            self.directory = NODE_MODULES
            return super().translate_path(path)
        return os.path.join(HERE, '.cache', 'not-served')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = query.get('name', [''])[0]
        if not re.fullmatch(r'[a-z0-9_-]+\.png', name):
            self.send_error(400, 'bad name')
            return
        data = self.rfile.read(int(self.headers['Content-Length']))
        if not data.startswith(b'\x89PNG'):
            self.send_error(400, 'not a png')
            return
        with open(os.path.join(native.CACHE, name), 'wb') as out:
            out.write(data)
        print('saved', os.path.join('.cache', name), flush=True)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'saved')


print('open http://localhost:%d/render3d.html?%s' % (PORT, urllib.parse.urlencode(PARAMS)), flush=True)
# Plain HTTP on purpose: this listens on the loopback interface only, for the person
# running the script, and a local page has no certificate to serve HTTPS with
# (sonar-project.properties records the same reason for SonarCloud).
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()

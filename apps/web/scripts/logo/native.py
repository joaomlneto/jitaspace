"""The star the logo is modelled on: the one in the Caldari Navy corporation logo.

CCP's artwork is not committed to this repository. The 128 px logo is downloaded from
CCP's image server into .cache/ the first time a script needs it.
"""
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
URL = 'https://images.evetech.net/corporations/1000035/logo?size=128'
USER_AGENT = 'JitaSpace logo tools (+https://www.jita.space)'


def path():
    """Path of the cached 128 x 128 logo, downloading it first if needed."""
    target = os.path.join(CACHE, 'caldari-navy-128.png')
    if not os.path.exists(target):
        os.makedirs(CACHE, exist_ok=True)
        request = urllib.request.Request(URL, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
        if not data.startswith(b'\x89PNG'):
            raise ValueError('%s did not return a PNG' % URL)
        with open(target, 'wb') as out:
            out.write(data)
    return target

# HTML → PDF rendering sandbox.
#
# code-interpreter-v1 cannot do this: WeasyPrint needs Pango, Cairo and
# GDK-PixBuf at the system level, which is why python-run-tool's description
# tells the model not to try. Preinstalling them here also removes the
# unpinned per-run `pip install`, which is network-dependent and drifts.
FROM python:3.12-slim-bookworm

# WeasyPrint's runtime deps. libpango + libharfbuzz do the text shaping,
# libgdk-pixbuf loads raster images, and the fonts are what stop a rendered
# page falling back to a single ugly default face.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz0b \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        shared-mime-info \
        fonts-dejavu-core \
        fonts-liberation2 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash user

# Pinned: an unpinned install is exactly the drift this template exists to fix.
RUN pip install --no-cache-dir \
        weasyprint==63.1 \
        pypdf==5.1.0 \
    && rm -rf /root/.cache/pip

# Must be the envd default CWD, not a subdirectory. Relative `files.write()`
# calls from the app resolve against /home/user, so a template rooted anywhere
# else silently receives its files in the wrong place — the bug that kept the
# Remotion template from ever passing its gate.
WORKDIR /home/user
USER user

# Execution template: driven entirely through the SDK, so no server to start.
CMD ["sleep", "infinity"]

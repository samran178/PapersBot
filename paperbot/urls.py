import os
import mimetypes

from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.urls import path, include, re_path

DIST_DIR = os.path.join(settings.BASE_DIR, 'dist', 'public')


def serve_react(request, path=''):
    index_path = os.path.join(DIST_DIR, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(open(index_path, 'rb'), content_type='text/html')
    return HttpResponse(
        '<h2>Frontend not built yet.</h2><p>Run <code>npm run build</code> first.</p>',
        status=503,
        content_type='text/html',
    )


def serve_dist_file(request, path):
    file_path = os.path.join(DIST_DIR, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        content_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(
            open(file_path, 'rb'),
            content_type=content_type or 'application/octet-stream',
        )
    return serve_react(request)


urlpatterns = [
    path('api/', include('api.urls')),
    re_path(r'^(?P<path>.*\..+)$', serve_dist_file),
    re_path(r'^.*$', serve_react),
]

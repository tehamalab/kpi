# -*- coding: utf-8 -*-
from __future__ import absolute_import

from .base import *

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
except ImportError:
    pass

# Add specific VARIABLES for production environment here
# So far, all values are declared in `base.py`


DATABASES = {
    'default': dj_database_url.config(default="sqlite:///%s/db.sqlite3" % BASE_DIR),
    'kobocat': dj_database_url.config('KOBOCAT_DATABASE_URL', default="sqlite:///%s/db.sqlite3" % BASE_DIR),
}

TEMPLATES[0]['DIRS'] = os.environ.get('KPI_TEMPLATES_DIRS', os.path.join(BASE_DIR, 'templates')).split()

TIME_ZONE = os.environ.get('TIME_ZONE', 'UTC')

STATIC_ROOT = os.environ.get('KPI_STATIC_ROOT', os.path.join(BASE_DIR, 'staticfiles'))
STATIC_URL = os.environ.get('KPI_STATIC_URL', '/static/')
MEDIA_ROOT = os.environ.get('KPI_MEDIA_ROOT', os.path.join(BASE_DIR, 'media'))
MEDIA_URL = os.environ.get('KPI_MEDIA_URL', '/media/')

CELERY_TIMEZONE = os.environ.get('KPI_CELERY_TIMEZONE', TIME_ZONE)

MONGO_DATABASE['SSL'] = os.environ.get('KPI_MONGO_SSL', '').lower() == 'true'

MONGO_CONNECTION_URL = os.environ.get('KPI_MONGO_CONNECTION_URL', MONGO_CONNECTION_URL)

MONGO_CONNECTION = MongoClient(
    MONGO_CONNECTION_URL, j=True, tz_aware=True, connect=False, ssl=MONGO_DATABASE['SSL'])

MONGO_DB = MONGO_CONNECTION[MONGO_DATABASE['NAME']]

# -*- coding: utf-8 -*-
from __future__ import unicode_literals, absolute_import

from rest_framework import viewsets
from rest_framework_extensions.mixins import NestedViewSetMixin
from kpi.filters import AssetOwnerFilterBackend
from kpi.models import AssetVersion
from kpi.serializers.v2.asset_version import AssetVersionListSerializer, AssetVersionSerializer


class AssetVersionViewSet(NestedViewSetMixin, viewsets.ModelViewSet):

    URL_NAMESPACE = 'api_v2'

    model = AssetVersion
    lookup_field = 'uid'
    filter_backends = (
            AssetOwnerFilterBackend,
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return AssetVersionListSerializer
        else:
            return AssetVersionSerializer

    def get_queryset(self):
        _asset_uid = self.get_parents_query_dict()['asset']
        _deployed = self.request.query_params.get('deployed', None)
        _queryset = self.model.objects.filter(asset__uid=_asset_uid)
        if _deployed is not None:
            _queryset = _queryset.filter(deployed=_deployed)
        if self.action == 'list':
            # Save time by only retrieving fields from the DB that the
            # serializer will use
            _queryset = _queryset.only(
                'uid', 'deployed', 'date_modified', 'asset_id')
        # `AssetVersionListSerializer.get_url()` asks for the asset UID
        _queryset = _queryset.select_related('asset__uid')
        return _queryset
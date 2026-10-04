#!/bin/bash
set -eux

cd tools
python extract_municipality_shape.py 坂戸市 -i data/N03-20260101_11_GML/N03-20260101_11.shp -o data/sakado_shape.json 
python extract_roads_in_municipality.py -s data/sakado_shape.json -r data/N13-24_5339_GEOJSON/N13-24_5339.geojson -o ../web/resources/sakado_roads.json


import argparse
import geopandas as gpd
from shapely.geometry import Point
from shapely.geometry import LineString, MultiLineString

parser = argparse.ArgumentParser(
    description="指定された市町村の形状にある道路を抽出するスクリプト"
)
parser.add_argument("-s", "--shape", type=str, help="市町村の形状ファイルのパス(json)")
parser.add_argument("-r", "--road", type=str, help="道路ファイルのパス(geojson)")
parser.add_argument("-o", "--output", type=str, help="出力ファイルのパス")

args = parser.parse_args()

if not args.shape or not args.road or not args.output:
    parser.print_help()
    exit(1)


# Read the municipality shape file
municipality = gpd.read_file(args.shape, encoding="utf-8")


def is_point_in_municipality(point, gdf=municipality):
    # Check if the point is within the municipality's geometry
    return gdf.geometry.contains(point).any()


# Read the road file
roads = gpd.read_file(args.road)


def is_road_in_municipality(geometry):
    if isinstance(geometry, LineString):
        lines = [geometry]
    elif isinstance(geometry, MultiLineString):
        lines = geometry.geoms
    else:
        return False

    return any(
        is_point_in_municipality(Point(longitude, latitude))
        for line in lines
        for longitude, latitude in line.coords
    )


roads = roads[roads["geometry"].apply(is_road_in_municipality)]
roads.to_file(args.output, driver="GeoJSON")

print(f"抽出した道路データを保存しました: {args.output}")

import os
import tempfile

target_year = 2026
n03_base = f"N03-{target_year}0101"
n03_dir = f"{n03_base}_GML"
url = f"https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-{target_year}/{n03_dir}.zip"

n13_base = f"N13-{target_year}0101"
import argparse

parser = argparse.ArgumentParser()
parser.add_argument(
    "boundary", type=str, help="Specify the boundary name to extract roads for"
)
parser.add_argument("output", type=str, help="Specify the output GeoJSON file path")
parser.add_argument("-d", "--dataset", type=str, default=n03_dir)
parser.add_argument("-p", "--prefecture", type=str, help="Specify the prefecture name")
args = parser.parse_args()
n03_dir = args.dataset


import urllib.request

if n03_dir is None or not os.path.exists(n03_dir):
    with tempfile.TemporaryDirectory() as tmpdirname:
        print(f"using temporary directory {tmpdirname}")
        try:
            print(f"downloading {url}")
            dst_path = os.path.join(tmpdirname, f"{n03_dir}.zip")
            urllib.request.urlretrieve(url, dst_path)
        except Exception as e:
            print(f"An error occurred: {e}")

        from zipfile import ZipFile

        print(f"unzipping {dst_path}")
        with ZipFile(dst_path, "r") as zip_ref:
            zip_ref.extractall(f"{n03_dir}")
else:
    print(f"using existing directory {n03_dir}")


import geopandas as gpd

gdf = gpd.read_file(f"{n03_dir}/{n03_base}.geojson")

# N03_001 都道府県名
# N03_002 北海道の振興局名
# N03_003 郡名
# N03_004 市区町村名
# N03_005 政令指定都市の行政区名
# N03_007 全国地方公共団体コード
if args.prefecture:
    gdf = gdf[gdf["N03_001"].isin([args.prefecture])]
boundary_line = gdf[gdf["N03_004"].isin([args.boundary])]
if boundary_line.empty:
    print(f"No data found for boundary {args.boundary}")
    exit()

min_lon, min_lat, max_lon, max_lat = boundary_line.total_bounds
print(f"Bounding box for boundary {args.boundary}:")
print(f"Min Longitude: {min_lon}, Min Latitude: {min_lat}")
print(f"Max Longitude: {max_lon}, Max Latitude: {max_lat}")


def get_mesh_code(latitude, longitude):
    """
    Calculate the mesh code for a given latitude and longitude.

    Args:
        latitude (float): Latitude in degrees.
        longitude (float): Longitude in degrees.

    Returns:
        str: Mesh code in the format "LLLLOO", where LLLL is the latitude code and OO is the longitude code.
    """
    lat_code = int(latitude * 1.5)
    lon_code = int(longitude) - 100
    return f"{lat_code:02d}{lon_code:02d}"


mesh_codes = list(
    {
        get_mesh_code(min_lat, min_lon),  # south-west
        get_mesh_code(min_lat, max_lon),  # south-east
        get_mesh_code(max_lat, min_lon),  # north-west
        get_mesh_code(max_lat, max_lon),  # north-east
    }
)

from zipfile import ZipFile


def download_n13(mesh_codes):
    for code in mesh_codes:
        n13_dir = f"N13-24_{code}_GEOJSON"
        url = f"https://nlftp.mlit.go.jp/ksj/gml/data/N13/N13-24/{n13_dir}.zip"

        if not os.path.exists(f"{n13_dir}"):
            with tempfile.TemporaryDirectory() as tmpdirname:
                print(f"using temporary directory {tmpdirname}")
                try:
                    print(f"downloading {url}")
                    dst_path = os.path.join(tmpdirname, f"{n13_dir}.zip")
                    urllib.request.urlretrieve(url, dst_path)
                    if os.path.exists(dst_path):
                        print(f"Successfully downloaded {url}")

                except Exception as e:
                    print(f"An error occurred: {e}")

                print(f"unzipping {dst_path}")
                with ZipFile(dst_path, "r") as zip_ref:
                    zip_ref.extractall(".")


download_n13(mesh_codes)


import pandas as pd

gdfs = []
for code in mesh_codes:
    d = f"N13-24_{code}_GEOJSON"
    f = f"N13-24_{code}.geojson"
    print(f"Reading GeoJSON file from {d}/{f}")
    gdf = gpd.read_file(f"{d}/{f}")
    gdfs.append(gdf)

road_data = pd.concat(gdfs, ignore_index=True)


from shapely.geometry import LineString, MultiLineString, Point


def is_point_in_boundary(point, boundary):
    """
    Check if a point is within a boundary.

    Args:
        point (shapely.geometry.Point): The point to check.
        boundary (geopandas.GeoDataFrame): The GeoDataFrame of the boundary.

    Returns:
        bool: True if the point is within the boundary, False otherwise.
    """
    # Check if the point is within the boundary's geometry
    return boundary.geometry.contains(point).any()


def is_road_in_boundary(geometry, boundary):
    """
    Check if a road (LineString or MultiLineString) is within a boundary.

    Args:
        geometry (shapely.geometry.LineString or shapely.geometry.MultiLineString): The geometry of the road.

    Returns:
        bool: True if any part of the road is within the boundary, False otherwise.
    """

    if isinstance(geometry, LineString):
        lines = [geometry]
    elif isinstance(geometry, MultiLineString):
        lines = geometry.geoms
    else:
        return False

    return any(
        is_point_in_boundary(Point(longitude, latitude), boundary)
        for line in lines
        for longitude, latitude in line.coords
    )


print(f"Extracting roads within the boundaries")
road_data = road_data.cx[min_lon:max_lon, min_lat:max_lat]
if road_data.empty:
    print("No road data within the specified bounding box.")
    exit()
extracted_roads = road_data[
    road_data["geometry"].apply(lambda geom: is_road_in_boundary(geom, boundary_line))
]

if "." in args.output:
    basename, ext = args.output.split(".")
    if ext.lower() != "geojson":
        args.output = f"{basename}.geojson"
else:
    args.output = f"{args.output}.geojson"

print(f"writing extracted roads to {args.output}")
extracted_roads.to_file(args.output, driver="GeoJSON")

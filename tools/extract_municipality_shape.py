# shp形式のファイルから指定した市区町村の形状を抽出するスクリプト.出力はjson形式
import argparse
import geopandas as gpd

parser = argparse.ArgumentParser(description="ファイルの入出力を処理するスクリプト")
parser.add_argument("municipality", type=str, help="市区町村名")

parser.add_argument("-i", "--input", type=str, help="入力ファイルのパス(shp形式)")
parser.add_argument("-o", "--output", type=str, help="出力ファイルのパス")

args = parser.parse_args()

if not args.municipality:
    raise ValueError("市区町村名を指定してください")
if not args.input:
    raise ValueError("入力ファイルのパスを指定してください")
if not args.output:
    raise ValueError("出力ファイルのパスを指定してください")

gdf = gpd.read_file(args.input, encoding="utf-8")

filtered = gdf[gdf["N03_004"].isin([args.municipality])]
filtered.to_file(args.output, encoding="utf-8")

print(f"{args.municipality}の形状を{args.output}に出力しました")

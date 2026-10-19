
# はじめに
webページで坂戸市の道路を幅員ごとに色分け表示します。道路データはgeojson形式でローカルに持っています。

# 環境
- WSL
  ```
  PS C:\Users\tatam> wsl --version
  WSL バージョン: 2.6.3.0
  カーネル バージョン: 6.6.87.2-1
  WSLg バージョン: 1.0.71
  MSRDC バージョン: 1.2.6353
  Direct3D バージョン: 1.611.1-81528511
  DXCore バージョン: 10.0.26100.1-240331-1435.ge-release
  Windows バージョン: 10.0.26300.9711
  ```

# 地図の表示

ローカルのhttpサーバーを立ち上げます。

```
python -m http.server 8000
```

ブラウザで```http://localhost:8000/```を開くと地図が表示されます。


## Netlify
- https://sakadocityroads.netlify.app/





# データ作成
道路データを作成するためのPythonスクリプトを作成しました。

```
$ python tools/create-road-dataset.py --help
usage: create-road-dataset.py [-h] [-d DATASET] [-p PREFECTURE] boundary output

positional arguments:
  boundary              Specify the boundary name to extract roads for
  output                Specify the output GeoJSON file path

options:
  -h, --help            show this help message and exit
  -d DATASET, --dataset DATASET
  -p PREFECTURE, --prefecture PREFECTURE
                        Specify the prefecture name
```


## Python

以下のライブラリが必要です。
  - geopandas

  ```
  python -m venv .venv
  . .venv/bin/activate
  pip install geopandas
  ```

##  作成手順

1. データセット作成

ここでは埼玉県坂戸市のデータを作成します

```
$ python tools/create-road-dataset.py 坂戸市 road_dataset
using temporary directory /tmp/tmp6qp4w1xo
downloading https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026/N03-20260101_GML.zip
unzipping /tmp/tmp6qp4w1xo/N03-20260101_GML.zip
Bounding box for boundary 坂戸市:
Min Longitude: 139.323653995, Min Latitude: 35.919690865
Max Longitude: 139.468291388, Max Latitude: 35.998095333
using temporary directory /tmp/tmpz8fl3nwk
downloading https://nlftp.mlit.go.jp/ksj/gml/data/N13/N13-24/N13-24_5339_GEOJSON.zip
Successfully downloaded https://nlftp.mlit.go.jp/ksj/gml/data/N13/N13-24/N13-24_5339_GEOJSON.zip
unzipping /tmp/tmpz8fl3nwk/N13-24_5339_GEOJSON.zip
Reading GeoJSON file from N13-24_5339_GEOJSON/N13-24_5339.geojson
Extracting roads within the boundaries
writing extracted roads to road_dataset.geojson
```

同一市町村名が存在する場合、pオプションで都道府県を指定します

```
python tools/create-road-dataset.py -p 東京都 府中市 road_dataset
```

2. 出力されたファイルをweb/dataにコピーします。

3. ```http://localhost:8000/```で確認します。
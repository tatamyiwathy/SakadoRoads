
# はじめに
[webページ](https://sakadocityroads.netlify.app/)で坂戸市の道路を幅員ごとに色分け表示します。道路データはAPIなどで取得しているわけではなくダウンロード、加工したデータをローカルに保存し参照しています。なおデータさえ用意すれば別の市町村の道路でも表示できます。


# 準備

## Python

以下のライブラリが必要です。
- geopandas

## 道路データのダウンロード

表示したい市町村の道路データを用意します。道路のデータをダウンロードする前に、都道府県の形状のデータをダウンロードします。このデータは、道路が指定の市町村にあるのかどうかの判定に使用します。

[国土数値情報ダウンロードサイト](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html#!)から、ダウンロードしたい都道府県を選択します。

ここでは埼玉県のデータをダウンロードします。
![1.png](docs/images/1.png)

都道府県を選択すると、ダウンロードできるデータが年ごとにに表示されていますので、必要なものを選択してください。

ここでは、最新のデータを選択します。
![2.png](docs/images/2.png)

ダウンロードボタンをクリックするとアンケートが表示されます。
![3.png](docs/images/3.png)
スキップしてもダウンロードはできます。

以上で、行政区域データをダウンロードできました。
次に道路データをダウンロードします。

[国土数値情報ダウンロードサイト/道路データ](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N13-2024.html)から表示したい道路が含まれるメッシュを選択します。

![4.png](docs/images/4.png)

ダウンロードできる形式の選択ができるので、geojson形式を選択してダウンロードします。

![5.png](docs/images/5.png)

データのダウンロードができました。次にデータの抽出をしていきます。上でダウンロードしたファイルを適当なフォルダに展開してください。
![6.png](docs/images/6.png)

表示したい市町村の形状データを抽出します。

```
(.venv) PS C:\Users\tatam\roaddata> python "C:\Users\tatam\Projects\myproj\SakadoRoads\tools\extract_municipality_shape.py" -i .\N03-20260101_11_GML\N03-20260101_11.geojson -o sakado-shape.json 坂戸市
坂戸市の形状をsakado-shape.jsonに出力しました
(.venv) PS C:\Users\tatam\roaddata> python "C:\Users\tatam\Projects\myproj\SakadoRoads\tools\extract_roads_in_municipality.py" -s .\sakado-shape.json -r .\N13-24_5339_GEOJSON\N13-24_5339.geojson -o sakado-road.json
抽出した道路データを保存しました: sakado-road.json
```
ここでは、埼玉県坂戸市の道路を抽出してsakado-road.jsonファイルに出力しました。

# 抽出したデータの表示

出力されたファイルをweb/dataへコピーします。

```javascript
// 道路データのパス
const roaddataset = "./data/sakado_roads.json";
// 地図の初期化
const map = L.map("map").setView([35.9572819, 139.4004482], 15);
```

必要に応じで上記の部分を書き換えてください。```roaddataset```は抽出した道路データのファイルのパスです。二行目の```setView```で最初に表示する経緯度とズームレベルを指定しています。
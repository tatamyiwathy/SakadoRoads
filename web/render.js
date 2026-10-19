// 地図描画および道路情報表示用のスクリプト


// 道路データのパス
const roaddataset = "./data/road_dataset.geojson";
// 地図の初期化
const map = L.map("map").setView([35.9572819, 139.4004482], 14);

// 地理院タイルを使用する
L.tileLayer(
    "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    {
        attribution: "<a href=\"https://maps.gsi.go.jp/development/ichiran.html\">地理院タイル</a>",
        opacity: 0.5

    }
).addTo(map);



/**
 * 円周上の角度に応じて R->G->B のグラデーション色を返す関数
 * @param {number} angle - 0～2πの範囲の角度（ラジアン）
 * @returns {Array<number>} [b, g, r, a] の配列（各値は 0.0～1.0）
 */
function pickColor(angle) {
    // 角度を 0～1 の範囲に正規化
    const normalizedAngle = (angle % (Math.PI * 2)) / (Math.PI * 2);

    // 0～1 の範囲を 3分割
    // 0.0～0.33: R(1,0,0) → G(0,1,0)
    // 0.33～0.67: G(0,1,0) → B(0,0,1)
    // 0.67～1.0: B(0,0,1) → R(1,0,0)

    let r, g, b;

    if (normalizedAngle < 0.333) {
        // R → G
        const t = normalizedAngle / 0.333;
        r = 1.0 - t;
        g = t;
        b = 0.0;
    } else if (normalizedAngle < 0.667) {
        // G → B
        const t = (normalizedAngle - 0.333) / 0.334;
        r = 0.0;
        g = 1.0 - t;
        b = t;
    } else {
        // B → R
        const t = (normalizedAngle - 0.667) / 0.333;
        r = t;
        g = 0.0;
        b = 1.0 - t;
    }

    return [b, g, r, 1.0];
}

// 道路幅コードから角度を計算する関数
function codeToAngle(code) {
    return angle = (2 * Math.PI) / 6 * (code - 1);
}

function rgbToColorCode(rgba) {
    const r = Math.round(rgba[0] * 255);    //B成分をR成分として扱う
    const g = Math.round(rgba[1] * 255);
    const b = Math.round(rgba[2] * 255);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function codeToColor(code) {
    return rgbToColorCode(pickColor(codeToAngle(code)))
}

function getRoadType(code) {
    switch (Number(code)) {
        case 1:
            return "通常部";
        case 2:
            return "庭園部";
        case 3:
            return "徒歩道";
        case 4:
            return "石段";
        default:
            return "不明";
    }
}


function getRoadCategory(code) {
    switch (Number(code)) {
        case 1:
            return "国道";
        case 2:
            return "都道府県道";
        case 3:
            return "市区町村道等";
        case 4:
            return "高速自動車国道等";
        case 5:
            return "その他";
        default:
            return "不明";
    }
}

function getRoadState(code) {
    switch (Number(code)) {
        case 1:
            return "通常部";
        case 2:
            return "橋・高架";
        case 3:
            return "トンネル";
        case 4:
            return "雪囲い";
        case 5:
            return "建設中";
        case 6:
            return "その他";
        default:
            return "不明";
    }
}

function getRoadWidth(code) {
    switch (Number(code)) {
        case 1:
            return "3m未満";
        case 2:
            return "3m-5.5m未満";
        case 3:
            return "5.5m-13m未満";
        case 4:
            return "13m-19.5m未満";
        case 5:
            return "19.5m以上";
        default:
            return "不明";
    }
}
function showRoadDetails(feature) {
    return `
                <div>
                    <b>道路情報</b><br>
                    種別：${getRoadType(feature.properties.N13_002)}<br>
                    道路分類：${getRoadCategory(feature.properties.N13_003)}<br>
                    道路状態：${getRoadState(feature.properties.N13_004)}<br>
                    幅員区分：${getRoadWidth(feature.properties.N13_006)}<br>
                </div>
            `;
}

// 2点間の距離を計算する関数
function latlngDistance(lat1, lng1, lat2, lng2) {
    return L.latLng(lat1, lng1)
        .distanceTo(L.latLng(lat2, lng2));
}

function distanceToSegment(p, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0 && dy === 0) {
        return p.distanceTo(p1);
    }

    const t = Math.max(
        0,
        Math.min(
            1,
            ((p.x - p1.x) * dx + (p.y - p1.y) * dy) /
            (dx * dx + dy * dy)
        )
    );

    const closest = L.point(
        p1.x + t * dx,
        p1.y + t * dy
    );

    return p.distanceTo(closest);
}

function distanceToLineString(centerPoint, coordinates) {
    let minDistance = Infinity;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const a = map.latLngToLayerPoint(
            L.latLng(coordinates[i][1], coordinates[i][0])
        );

        const b = map.latLngToLayerPoint(
            L.latLng(coordinates[i + 1][1], coordinates[i + 1][0])
        );

        const distance = distanceToSegment(
            centerPoint,
            a,
            b
        );

        minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
}

function distanceToRoad(center, geometry) {
    if (geometry.type === "LineString") {
        return distanceToLineString(
            center,
            geometry.coordinates
        );
    }

    if (geometry.type === "MultiLineString") {
        let minDistance = Infinity;

        for (const coordinates of geometry.coordinates) {
            const distance = distanceToLineString(
                center,
                coordinates
            );

            minDistance = Math.min(
                minDistance,
                distance
            );
        }

        return minDistance;
    }

    return Infinity;
}

// 指定した中心座標に最も近い道路を検索する関数
function findRoadAtCenter(roadData, center, threshold) {
    // 中央点をLeaflet座標へ変換
    const centerPoint = map.latLngToLayerPoint(center);

    let nearestRoad = null;
    let nearestDistance = Infinity;

    for (const road of roadData.features) {

        const distance = distanceToRoad(
            centerPoint,
            road.geometry
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestRoad = road;
        }
    }
    if (nearestDistance <= threshold) {
        return nearestRoad;
    }

    return null;
}

async function loadRoads() {
    const response = await fetch(roaddataset);
    const roadData = await response.json();

    L.geoJSON(roadData, {

        style: function (feature) {
            const code = Number(feature.properties.N13_006)
            const weight = 3;
            switch (code) {
                case 1: // 3m未満
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
                case 2: // 3m-5.5m未満
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
                case 3: // 5.5m-13m未満
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
                case 4: // 13m-19.5m未満
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
                case 5: // 19.5m以上
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
                case 6: // 未分類
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
                default:
                    return {
                        color: codeToColor(code),
                        weight: weight
                    };
            }
            return {
                color: "#000000",
                weight: 3
            };
        },

        onEachFeature: function (feature, layer) {
            // layer.on({
            //     mouseover: function (e) {
            //         // マウスオーバーした道路を強調
            //         e.target.setStyle({
            //             weight: 6,
            //         });

            //         // ポップアップ表示
            //         e.target.bindPopup(`
            //             <div>
            //                 <b>道路情報</b><br>
            //                 種別：${get_roadtype(feature.properties.N13_002)}<br>
            //                 道路分類：${get_roadcategory(feature.properties.N13_003)}<br>
            //                 道路状態：${get_roadstate(feature.properties.N13_004)}<br>
            //                 幅員区分：${get_roadwidth(feature.properties.N13_006)}<br>
            //             </div>
            //         `).openPopup();
            //     },

            //     mouseout: function (e) {
            //         // 元の表示に戻す
            //         e.target.setStyle({
            //             weight: 3,
            //         });

            //         e.target.closePopup();
            //     }
            // });
            layer.on('click', function (e) {
                // クリックした道路の情報を表示
                e.target.bindPopup(showRoadDetails(feature)).openPopup();
            });
        }
    }).addTo(map);

    return roadData;
}


function updateCenterRoad(roadData, map) {
    if (!roadData) {
        return;
    }

    const center = map.getCenter();

    const road = findRoadAtCenter(
        roadData,
        center,
        5
    );
    console.log("Center road:", road);
    const info = document.getElementById("road-info");

    if (!road) {
        info.style.display = "none";
        return;
    }

    info.style.display = "block";

    const properties = road.properties;

    info.innerHTML = `${showRoadDetails(road)}`;
}


async function main() {

    road = await loadRoads();

    // 地図が移動するたびに呼ばれる
    map.on("moveend", function () {
        updateCenterRoad(road, map);

    });

}
main();

// L.geoJSON(roadData, {
//     style: function (feature) {
//         return {
//             color: "#ff0000",
//             weight: 3
//         };
//     }
// }).addTo(map);     

//  凡例の表示
function showLegend() {
    const div = document.getElementById("road-width-legend");

    div.innerHTML = `
            <h4>道路幅</h4>
            <div><span class="color-box" style="background:${codeToColor(1)}"></span> ${getRoadWidth(1)}</div>
            <div><span class="color-box" style="background:${codeToColor(2)}"></span> ${getRoadWidth(2)}</div>
            <div><span class="color-box" style="background:${codeToColor(3)}"></span> ${getRoadWidth(3)}</div>
            <div><span class="color-box" style="background:${codeToColor(4)}"></span> ${getRoadWidth(4)}</div>
            <div><span class="color-box" style="background:${codeToColor(5)}"></span> ${getRoadWidth(5)}</div>
            <div><span class="color-box" style="background:${codeToColor(6)}"></span> ${getRoadWidth(6)}</div>
            <hr>
            データ出典：
            <a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N13-2024.html" target="_blank"
                rel="noopener noreferrer">
                国土交通省国土数値情報ダウンロードサイト
            </a>

        `;
}

showLegend();


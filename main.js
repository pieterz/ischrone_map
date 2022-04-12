import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import LayerVector from 'ol/layer/vector';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Point, LineString, Polygon } from 'ol/geom';
import { fromLonLat, transform } from 'ol/proj';
import { Control, ScaleLine, MousePosition, Attribution, FullScreen, defaults as defaultControls, OverviewMap } from 'ol/control';
import Feature from 'ol/Feature';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import { createStringXY } from 'ol/coordinate.js';

let isoButtonFlag = false;

var mapView = new View({
  center: fromLonLat([4.887, 52.373]),
  zoom: 10
});

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: mapView
});

// This will show use the coordinate of your mouse position in EPSG:4326. You can change this to any other EPSG.
var mouse_position = new MousePosition({
  className: 'mousePosition',
  placeholder: [],
  coordinateFormat: createStringXY(3),
  projection: 'EPSG:4326'
});
map.addControl(mouse_position);

map.addControl(new ScaleLine({
  unit: 'metric'
}));

// Isochrone tool
var isoButton = document.createElement('button');
isoButton.innerHTML = '<img src="./assets/duration.svg" alt="" class="myImg"></img>';
isoButton.className = 'myButton';
isoButton.id = 'isoButton';
isoButton.title = 'Isochrone tool';

var isoElement = document.createElement('div');
isoElement.className = 'isoButtonDiv';
isoElement.appendChild(isoButton);

var isoControl = new Control({
  element: isoElement
})

map.addControl(isoControl);

document.getElementById('getCoord').onclick = function () {
  document.getElementById("map").style.cursor = "crosshair";

  //here is you callback function
  function myCallback(evt) {
    map.getLayers().getArray()
      .filter(layer => layer.get('name') === 'isochroneStartPoint')
      .forEach(layer => map.removeLayer(layer));

    let coordinates = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326')
    document.getElementById("coordValueX").value = coordinates[0].toFixed(4);
    document.getElementById("coordValueY").value = coordinates[1].toFixed(4);

    const point = new Point(evt.coordinate);

    let pointLayer = new LayerVector({
      title: "Starting point",
      name: "isochroneStartPoint",
      source: new VectorSource({
        features: [new Feature(point)],
      }),
      style: new Style({
        image: new Circle({
          radius: 3,
          fill: new Fill({ color: 'black' }),
        }),
      }),
    });

    pointLayer.setZIndex(10);
    map.addLayer(pointLayer);

    //To unbind the event
    map.un('singleclick', myCallback);
    document.getElementById("map").style.cursor = "auto";
  }

  //To bind the event 
  map.on('singleclick', myCallback);
}

isoButton.addEventListener("click", () => {
  isoButtonFlag = !isoButtonFlag
  if (isoButtonFlag) {
    document.getElementById("isochroneTool").style.display = "block";
  } else {
    document.getElementById("isochroneTool").style.display = "none";
  }
});

document.getElementById('runIsochroneTool').onclick = function () {
  if (document.getElementById("timeInput").value.split(",").map(Number) < 1) {
    alert("No valid format for time. Use: 5, 10, 15")
  } else if (document.getElementById("timeInput").value.split(",").map(Number).includes(NaN)) {
    alert("No valid format for time. Use: 5, 10, 15");
  } else if (document.getElementById("timeInput").value.split(",").map(Number) > 9) {
    alert("The maximum isochrones are 10");
  } else if (document.getElementById("coordValueX").value == '') {
    alert("Input a X coordinate. Tip use the Starting Point button");
  } else if (document.getElementById("coordValueY").value == '') {
    alert("Input a Y coordinate. Tip use the Starting Point button");
  } else {
    // Remove old layers
    map.getLayers().getArray()
      .filter(layer => layer.get('name') === 'isochrone')
      .forEach(layer => map.removeLayer(layer));

    // Initial settings
    let transportMode = document.querySelector('input[name="transportmode"]:checked').value;
    let coordValueX = document.getElementById("coordValueX").value;
    let coordValueY = document.getElementById("coordValueY").value;
    let timeInput = document.getElementById("timeInput").value;
    let contourMinutes = timeInput.split(",").map(Number);
    let access_token = "pk.eyJ1IjoienBpZXRlciIsImEiOiJja2lla2F5OTYwYXR6MnlxdWp4NTd6Ymg0In0.WBB-07UorMMN67LGzSJPPw"
    let urls = []

    console.log(contourMinutes)
    // Make array with urls
    for (let i = contourMinutes.length - 1; i >= 0; i--) {
      urls.push(`https://api.mapbox.com/isochrone/v1/mapbox/${transportMode}/${coordValueX}%2C${coordValueY}?contours_minutes=${contourMinutes[i]}&polygons=true&denoise=1&access_token=${access_token}`)
    }

    // Colors for up to 10 layers
    let colors = ["rgba(43, 131, 186, 0.5)", "rgba(100, 171, 176, 0.5)", "rgba(157, 211, 167, 0.5)", "rgba(199, 233, 173, 0.5)", "rgba(237, 248, 185, 0.5)", "rgba(255, 237, 170, 0.5)", "rgba(254, 201, 128, 0.5)", "rgba(232, 91, 58, 0.5)", "rgba(215, 25, 28, 0.5)"]

    // Retrieve isochrones and add to map
    Promise.all(urls.map(url => fetch(url)))
      .then(resp => Promise.all(resp.map(r => r.json())))
      .then(jsonData => {
        jsonData.forEach(function (data, i) {
          let querySelectedFeatureStyle = new Style({
            fill: new Fill({
              color: colors[i],
            }),
            stroke: new Stroke({
              color: "white",
              width: 1,
            })
          });

          let isolayer = new LayerVector({
            title: `isochrone_${transportMode}_${contourMinutes[i]}`,
            name: "isochrone",
            source: new VectorSource({
              features: new GeoJSON().readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })
            }),
            style: querySelectedFeatureStyle,
          });
          map.addLayer(isolayer);
        })
      });
  }
}
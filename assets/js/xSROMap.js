// Increase performance with too many markers
L.Marker.addInitHook(function(){
	if(this.options.virtual){
		// setup virtualization after marker was added
		this.on('add',function(){
			this._updateIconVisibility = function() {
				if(this._map == null)
					return;
				var map = this._map,
				isVisible = map.getBounds().contains(this.getLatLng()),
				wasVisible = this._wasVisible,
				icon = this._icon,
				iconParent = this._iconParent,
				shadow = this._shadow,
				shadowParent = this._shadowParent;
				// remember parent of icon 
				if (!iconParent) {
					iconParent = this._iconParent = icon.parentNode;
				}
				if (shadow && !shadowParent) {
					shadowParent = this._shadowParent = shadow.parentNode;
				}
				// add/remove from DOM on change
				if (isVisible != wasVisible) {
					if (isVisible) {
						iconParent.appendChild(icon);
						if (shadow) {
							shadowParent.appendChild(shadow);
						}
					}else{
						iconParent.removeChild(icon);
						if (shadow) {
							shadowParent.removeChild(shadow);
						}
					}
					this._wasVisible = isVisible;
				}
			};
			// on map size change, remove/add icon from/to DOM
			this._map.on('resize moveend zoomend', this._updateIconVisibility, this);
			this._updateIconVisibility();
		}, this);
	}
});

// Silkroad map handler
var xSROMap = function(){
	// map handler
	var map;
	// mapping
	var mappingLayers = {};
	var mappingMarkers = {};
	// current tile layer
	var mapLayer;
	var coordBackToPosition;
	// xSRO Map conversions
	var CoordMapToSRO = function(latlng){
		var coords = {}
		// world map layer
		if(mapLayer == mappingLayers[''])
		{
			return CoordsGameToSRO({'posX':(latlng.lng - 135) * 192,'posY':(latlng.lat - 91) * 192});
		}
		// area layer
		coords['x'] = ( latlng.lng * 192 - 128 * 192) * 10;
		coords['y'] = ( latlng.lat * 192 - 127 * 192) * 10;
		coords['z'] = mapLayer.options.z;
		coords['region'] = mapLayer.options.region;
		return coords;
	};
	var CoordSROToMap = function(coords) {
		var lng,lat;
		// dungeon?
		if(coords.region > 32767)
		{
			lng = (128 * 192 + coords.x / 10) / 192;
			lat = (127 * 192 + coords.y / 10) /192;
			return [lat,lng];
		}
		lat = ( coords.posY / 192 ) + 91;
		lng = ( coords.posX / 192 ) + 135;
		return [lat,lng];
	};
	var CoordsGameToSRO = function(gameCoords) {
		gameCoords['x'] = Math.round(Math.abs(gameCoords.posX) % 192.0 * 10.0);
		if (gameCoords.posX < 0.0)
			gameCoords.x = 1920 - gameCoords.x;
		gameCoords['y'] = Math.round(Math.abs(gameCoords.posY) % 192.0 * 10.0);
		if (gameCoords.posY < 0.0)
			gameCoords.y = 1920 - gameCoords.y;
		gameCoords['z'] = 0;

		var xSector = Math.round((gameCoords.posX - gameCoords.x / 10.0) / 192.0 + 135);
		var ySector = Math.round((gameCoords.posY - gameCoords.y / 10.0) / 192.0 + 92);

		gameCoords['region'] = (ySector << 8) | xSector;
		return gameCoords;
	};
	// initialize layers setup
	var initLayers = function(id){
		// minimap location
		var imgHost = 'assets/img/silkroad/minimap/';

		// silkroad base setup
		map = L.map('map', {
			crs: L.CRS.Simple,
			minZoom:8,maxZoom:8
		});
		var SRLayer = L.TileLayer.extend({
			getTileUrl: function(coords) {
				coords.y = -coords.y;
				return L.TileLayer.prototype.getTileUrl.call(this, coords);
			}
		});
		// 192 map units x 256 tiles = 49152 game units (coords)
		var mapSize = 49152;
		map.fitBounds([[0,0],[mapSize,mapSize]]);

		// Default layer
		mapLayer = new SRLayer(imgHost+'{x}x{y}.jpg', {
			attribution: '<a href="http://silkroadonline.net/">World Map</a>',
			errorTileUrl:imgHost+'0.jpg',
		});
		mappingLayers[''] = mapLayer;

		map.addLayer(mapLayer);
		map.setView([91,135], 8);

		// Area layers
		// cave donwhang
		mappingLayers['32769'] = new SRLayer(imgHost+'d/dh_a01_floor01_{x}x{y}.jpg', {
			attribution: '<a href="#">Donwhang Stone Cave [1F]</a>',
			errorTileUrl:imgHost+'0.jpg',
			z:0,
			overlap:[
				new SRLayer(imgHost+'d/dh_a01_floor02_{x}x{y}.jpg', {
				attribution: '<a href="#">Donwhang Stone Cave [2F]</a>',
				errorTileUrl:imgHost+'0.jpg',
				z:115}),
				new SRLayer(imgHost+'d/dh_a01_floor03_{x}x{y}.jpg', {
				attribution: '<a href="#">Donwhang Stone Cave [3F]</a>',
				errorTileUrl:imgHost+'0.jpg',
				z:230}),
				new SRLayer(imgHost+'d/dh_a01_floor04_{x}x{y}.jpg', {
				attribution: '<a href="#">Donwhang Stone Cave [4F]</a>',
				errorTileUrl:imgHost+'0.jpg',
				z:345})
			]
		});
		// cave jangan
		mappingLayers['32775'] = new SRLayer(imgHost+'d/qt_a01_floor01_{x}x{y}.jpg', {
			attribution: '<a href="#">Underground Level 1 of Tomb of Qui-Shin [B1]</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		mappingLayers['32774'] = new SRLayer(imgHost+'d/qt_a01_floor02_{x}x{y}.jpg', {
			attribution: '<a href="#">Underground Level 2 of Tomb of Qui-Shin [B2]</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		mappingLayers['32773'] = new SRLayer(imgHost+'d/qt_a01_floor03_{x}x{y}.jpg', {
			attribution: '<a href="#">Underground Level 3 of Tomb of Qui-Shin [B3]</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		mappingLayers['32772'] = new SRLayer(imgHost+'d/qt_a01_floor04_{x}x{y}.jpg', {
			attribution: '<a href="#">Underground Level 4 of Tomb of Qui-Shin [B4]</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		mappingLayers['32771'] = new SRLayer(imgHost+'d/qt_a01_floor05_{x}x{y}.jpg', {
			attribution: '<a href="#">Underground Level 5 of Tomb of Qui-Shin [B5]</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		mappingLayers['32770'] = new SRLayer(imgHost+'d/qt_a01_floor06_{x}x{y}.jpg', {
			attribution: '<a href="#">Underground Level 6 of Tomb of Qui-Shin [B6]</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		// job temple
		mappingLayers['32784'] = new SRLayer(imgHost+'d/RN_SD_EGYPT1_01_{x}x{y}.jpg', {
			attribution: '<a href="#">Pharaon Tomb</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		mappingLayers['32778'] = mappingLayers['32779'] = mappingLayers['32780'] = mappingLayers['32781'] = mappingLayers['32782'] = mappingLayers['32784'];
		mappingLayers['32783'] = new SRLayer(imgHost+'d/RN_SD_EGYPT1_02_{x}x{y}.jpg', {
			attribution: '<a href="#">Pharaon Tomb (Chamber)</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		// cave generated by fortress war
		mappingLayers['32785'] = new SRLayer(imgHost+'fort_dungeon01_{0}x{1}.jpg', {
			attribution: '<a href="#">Cave of Meditation [1F]</a>',
			errorTileUrl:imgHost+'0.jpg',
			z:0,
			overlap:[
				new SRLayer(imgHost+'fort_dungeon02_{0}x{1}.jpg', {
				attribution: '<a href="#">Cave of Meditation [2F]</a>',
				errorTileUrl:imgHost+'0.jpg',
				z:115}),
				new SRLayer(imgHost+'fort_dungeon03_{0}x{1}.jpg', {
				attribution: '<a href="#">Cave of Meditation [3F]</a>',
				errorTileUrl:imgHost+'0.jpg',
				z:230}),
				new SRLayer(imgHost+'fort_dungeon04_{0}x{1}.jpg', {
				attribution: '<a href="#">Cave of Meditation [4F]</a>',
				errorTileUrl:imgHost+'0.jpg',
				z:345})
			]
		});
		// mountain flame
		mappingLayers['32786'] = new SRLayer(imgHost+'d/flame_dungeon01_{x}x{y}.jpg', {
			attribution: '<a href="#">Flame Mountain</a>',
			errorTileUrl:imgHost+'0.jpg'
		});
		
	};
	// initialize UI controls
	var initControls = function(){
		// move back to the last pointer
		L.easyButton({
			states:[{
				icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 576" style="vertical-align:middle"><path fill="#333" d="M444.52 3.52L28.74 195.42c-47.97 22.39-31.98 92.75 19.19 92.75h175.91v175.91c0 51.17 70.36 67.17 92.75 19.19l191.9-415.78c15.99-38.39-25.59-79.97-63.97-63.97z"/></svg>',
				title: 'Get back',
				onClick: function(){
					setView(coordBackToPosition);
				}
			}]
		}).addTo(map);

		// show SRO coordinates on click
		map.on('click', function (e){
			var coord = CoordMapToSRO(e.latlng);
			var content;
			if(coord.region > 32767){
				content = "( X:"+coord.x+" , Y:"+coord.y+" , Z:"+coord.z+" , Region: "+coord.region+" )";
			}
			else{
				content = "( X:"+coord.posX+" , Y:"+coord.posY+" )";
			}
			// Show popup
			L.popup().setLatLng(e.latlng).setContent(content).openOn(map);
		});
	};
	// Set the map layer
	var setMapLayer = function (tileLayer){
		if(mapLayer != tileLayer)
		{
			// Clear map
			map.eachLayer(function(layer){
				map.removeLayer(layer);
			});
			// Set the new layer
			mapLayer = tileLayer;
			map.addLayer(mapLayer);
			// Add markers from layer
		}
	};
	// Return the layer from the specified silkroad coordinate
	var getLayer = function (coord){
		if(coord.region > 32767)
		{
			var layer = mappingLayers[''+coord.region];
			if(layer)
			{
				// check if has overlap at same region
				if(layer.options.overlap)
				{
					var layers = layer.options.overlap;
					// check the Z position
					for (var i = 0; i < layers.length; i++) {
						if (coord.z < layers[i].options.z){
							break;
						}
						layer = layers[i];
					}
				}
				else
				{
					layer.options['z'] = 0;
				}
				// add/override layer region
				layer.options['region'] = coord.region;
				return layer;
			}
		}
		return mappingLayers[''];
	};
	// Set the view using a silkroad coord
	var setView = function (coord){
		// track navigation
		coordBackToPosition = coord;
		// update layer
		setMapLayer(getLayer(coord));
		// center view
		map.panTo(CoordSROToMap(coord));
	};
	// Fix coordinates, return internal silkroad coords
	var fixCoords = function(x,y,z,region) {
		// Fix negative region
		if(region < 0){
			region += 65536;
		}
		// Check coord type
		if(region == 0){
			// using x,y as game coords
			return CoordsGameToSRO({'posX':x,'posY':y});
		}
		// using x,y,z,region internal silkroad coords
		return {'x':x,'y':y,'z':z,'region':region};
	};
	return{
		// Initialize silkroad world map
		init:function(id,x=113,y=12,z=0,region=0){
			// init stuffs
			initLayers(id);
			initControls();
			// set initial view
			setView(fixCoords(x,y,z,region));
		},
		SetView:function(x,y,z=0,region=0){
			setView(fixCoords(x,y,z,region));
		}
	};
}();
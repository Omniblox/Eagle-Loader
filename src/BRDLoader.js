THREE.BRDLoader = function ( manager ) {

	/**
	EAGLE .BRD Loader for THREE.js

	David ten Have, St. Zeno Exploration Ltd.

	This script is a helper for loading the output of EagleBrdRenderer
	into a THREE.js environment

	@class THREE.BRDLoader
	@constructor
	@param [manager] {THREE.LoadingManager} Loading manager to use
	**/

	this.revision = "Blank Space by Ryan Adams";
	this.version = "0.2.0";

	this.manager = ( manager !== undefined ) ?
		manager :
		THREE.DefaultLoadingManager;

};

THREE.BRDLoader.prototype = {

	constructor: THREE.BRDLoader,

	/**
	Start loading the BRD and associated fonts.

	@method load
	@param url {string} .brd file URL
	@param [params] {object} Composite parameter object
		@param [params.colors] {object} Define custom colors; see `this.colors`
		@param [params.composite=true] {boolean} Whether to composite layers,
			or render them as individual geometries. Warning: individual
			layers are very slow.
		@param [params.maskOpacity=0.8] {number} Opacity of solder mask;
			opacity is halved over copper traces
		@param [params.material="phong"] {string} Material shader to use.
			Options include `"phong"` for realistic lighting,
			`"lambert"` for flat lighting, and `"basic"` for no lighting.
		@param [params.pixelMicrons=35] {number} Resolution of texture maps.
			By default, this is 35 microns, equal to the thickness
			of a default copper layer. Note that this will affect the
			size of the board geometry.
		@param [params.thickness] {number} Override computed thickness
			of board. Measured in millimeters. Note that this value will be
			converted to pixels for use within the board.
		@param [params.viewConnectors=false] {boolean} Whether to visualize
			Connector objects
		@param [params.viewGhosts=false] {boolean} Whether to draw
			approximate ghosts of on-board devices
		@param [params.viewComponents=false] {boolean} Whether to load and
			display models of the components on the PCB.
		@param [params.shouldPopulate] {object} Hash of component names
			(e.g. `J1`, `LED1`) and whether the associated component model
			should be displayed or not. Overrides the default heuristics.
		@param [params.componentMapCfg] {object} Alternative standard model
			library map configuration to use instead of the default.
		@param [params.componentMapCfg.mapUrl] {string} URL for the file that
			contains the "component package name" to "model file path" mapping.
		@param [params.componentMapCfg.urlPrefix] {string} (Optional) URL
			prefix to prepend to the model file path when loading model file.
	@param onLoad {function} Will be called when load completes.
		The argument will be the loaded Object3D.
	@param [onProgress] {function} Will be called while load progresses.
		The argument will be the XmlHttpRequest instance,
		that contain .total and .loaded bytes.
	@param [onError] {function} Will be called when load errors.
	@param [fontPath] {array} Paths to font files.
		Defaults to the array `"./OCRA.woff", "./OCRA.otf"`.
		You may specify any number of files as fallbacks,
		but a WOFF and OTF should cover all your bases.
		If you specify `null`, the loader will skip font loading.
	**/

	load: function ( url, brdParams, onLoad, onProgress, onError, fontPath ) {

		console.log("THREE.BRDLoader " + this.version + " (" + this.revision + ")");

		if (brdParams.viewComponents == true) {
			if (typeof THREE.STLLoader !== 'function'){
				console.error('You need to add THREE.STLLoader to see components on your BRD file.');
			}
		}

		var i, style, urls,
			loadBrd = function() {
				var scope = this;

				var loader = new THREE.XHRLoader( scope.manager );
				//loader.setCrossOrigin( this.crossOrigin );
				loader.load( url, function ( text ) {

					onLoad( scope._parse( text, brdParams ) );

				}, onProgress, onError );
			}.bind( this ),
			observe = function() {
				var observer = new FontFaceObserver( "Vector" );
				console.log( "Validating fonts..." );
				observer.load().then(
					loadBrd,
					processFontError );
			},
			processFontError = function() {
				console.log( "Fonts invalid, using system fonts" );
				loadBrd();
			};

		// Null fontpath means skip font validation
		if ( fontPath === null ) {
			loadBrd();
			return;
		}

		// Set up fonts before rendering board
		observe();

		urls = "";
		fontPath = fontPath || [ "./OCRA.woff", "./OCRA.otf" ];
		for ( i = 0; i < fontPath.length; i++ ) {
			urls += "url( " + fontPath[ i ] + " ),";
		}
		urls = urls.slice( 0, -1 );

		style = document.createElement( "style" );
		style.appendChild( document.createTextNode(
			"@font-face { " +
			"  font-family: \"Vector\";" +
			"  src: " +
			urls +
			";" +
			"}" ) );
		document.head.appendChild( style );
	},

	/**
	Construct the EagleBrdRenderer object THREE.js geometry (brd.root),
	bearing composited textures from all layers.

	@method _parse
	@param data {String} Contents of the .brd file as a string
	@param [params] {object} Composite parameter object
		@param [params.colors] {object} Define custom colors; see `this.colors`
		@param [params.composite=true] {boolean} Whether to composite layers,
			or render them as individual geometries. Warning: individual
			layers are very slow.
		@param [params.maskOpacity=0.8] {number} Opacity of solder mask;
			opacity is halved over copper traces
		@param [params.material="phong"] {string} Material shader to use.
			Options include `"phong"` for realistic lighting,
			`"lambert"` for flat lighting, and `"basic"` for no lighting.
		@param [params.pixelMicrons=35] {number} Resolution of texture maps.
			By default, this is 35 microns, equal to the thickness
			of a default copper layer. Note that this will affect the
			size of the board geometry.
		@param [params.thickness] {number} Override computed thickness
			of board. Measured in millimeters. Note that this value will be
			converted to pixels for use within the board.
		@param [params.viewConnectors=false] {boolean} Whether to visualize
			Connector objects
		@param [params.viewGhosts=false] {boolean} Whether to draw
			approximate ghosts of on-board devices
		@param [params.viewComponents=false] {boolean} Whether to load and
			display models of the components on the PCB.
		@param [params.shouldPopulate] {object} Hash of component names
			(e.g. `J1`, `LED1`) and whether the associated component model
			should be displayed or not. Overrides the default heuristics.
		@param [params.componentMapCfg] {object} Alternative standard model
			library map configuration to use instead of the default.
		@param [params.componentMapCfg.mapUrl] {string} URL for the file that
			contains the "component package name" to "model file path" mapping.
		@param [params.componentMapCfg.urlPrefix] {string} (Optional) URL
			prefix to prepend to the model file path when loading model file.
	@private
	**/

	_parse: function ( data, brdParams ) {

		var parser = new DOMParser();
		var xmlBrd = parser.parseFromString( data, "text/xml" );
		brd = new EagleBrdRenderer( xmlBrd, brdParams );

		return brd;
	}

};

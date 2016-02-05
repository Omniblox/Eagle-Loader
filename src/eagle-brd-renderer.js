/*

EAGLE .BRD Renderer

Benjamin D. Richards, Gamelab

This script generates a model of a PCB (printed circuit board)
based on XML data in a BRD file. Cadsoft EAGLE BRD files use XML from version
6.0 onwards.

The model includes `Connectors` with which the PCB may be added
as a component to a larger hardware system.

This visualisation should be regarded as indicative only.
Although every care has been taken to represent the actual data,
it is not guaranteed to be completely accurate.

*/


/**
@module EagleBrdRenderer
**/


var EagleBrdRenderer = function( xml, params ) {

	/**
	Creator of board renders. Reads XML and composites the appropriate
	textures and geometry.

	@class EagleBrdRenderer
	@constructor
	@param xml {Document} XML document to parse
	@param [params] {object} Composite parameter object
		@param [params.pixelMicrons=35] {number} Resolution of texture maps.
			By default, this is 35 microns, equal to the thickness
			of a default copper layer.
	**/

	console.log( "Beginning BRD parse" );

	/**
	Optional parameters used to configure render.

	@property params {object}
	**/
	this.params = params;

	/**
	XML document that contains the board data

	@property xml {Document}
	**/
	this.xml = xml;

	console.log( "EAGLE version",
		this.xml.getElementsByTagName( "eagle" )[ 0 ]
		.getAttribute( "version" ) );

	/**
	PCB layers to be combined into the final board

	@property layers {array}
	@default []
	**/
	this.layers = [];

	this._setDefaultParams();

	/**
	Scale factor for converting from millimeters to pixels.
	Coords in the XML should be multiplied by this before drawing.

	@property coordScale {number}
	@default 28.57
	**/
	this.coordScale = 1000 / this.params.pixelMicrons;

	this._parseDesignRules();

	this._populateLayers();

	// Determine dimensions of board and derived textures.
	this._parseBounds();

	this.renderBounds();

	this.renderCopper();

	this.renderSolderMask();
};


EagleBrdRenderer.prototype._parseBounds = function() {

	/**
	Determine and record the boundaries of the board surface.
	This is derived from `eagle.drawing.board.plain` wires.

	@method _parseBounds
	@private
	**/

	var chordPoints, layer, wires, i, j, x, y,
		testMinMax = function( x, y ) {
			minX = Math.min( x, minX );
			minY = Math.min( y, minY );
			maxX = Math.max( x, maxX );
			maxY = Math.max( y, maxY );
		},
		maxX = 0,
		maxY = 0,
		minX = 0,
		minY = 0;

	layer = this.getLayer( "Bounds" );
	wires = layer.getElements( "wire" );

	/*
	Some wires may be curved. Under rare circumstances,
	such as a curved line between two horizontally-aligned points,
	this might disrupt normal minmax point estimates of bounds.

	Solution: chord checking. This is simple and robust.
	Wire curve is a circular chord. If the chord sweep takes in
	any cardinal direction (top, bottom, left, right), that cardinal point
	is a minmax candidate. As we know the start and end points of the chord,
	we can compute this easily.
	*/

	// Assemble boundaries
	for ( i = 0; i < wires.length; i++ ) {

		// Simple minmax point test
		for ( j = 1; j <= 2; j++ ) {
			x = wires[ i ].getAttribute( "x" + j );
			y = wires[ i ].getAttribute( "y" + j );
			testMinMax( x, y );
		}

		// Chord checks
		if ( wires[ i ].hasAttribute( "curve" ) ) {
			chordPoints = this.getChordPoints( wires[ i ] );
			for ( j = 0; j < chordPoints.length; j++ ) {
				testMinMax( chordPoints[ j ][ 0 ], chordPoints[ j ][ 1 ] );
			}
		}
	}

	/**
	Information on physical bounds of board, in mm.

	@property bounds {object}
		@property bounds.maxX {number}
		@property bounds.maxY {number}
		@property bounds.minX {number}
		@property bounds.minY {number}
		@property bounds.width {number}
		@property bounds.height {number}
	**/
	this.bounds = {
		minX: minX,
		minY: minY,
		maxX: maxX,
		maxY: maxY,
		width: maxX - minX,
		height: maxY - minY
	};

	/**
	Horizontal resolution of this board's texture maps.

	@property width {number}
	**/
	this.width = Math.ceil( this.bounds.width * this.coordScale );

	/**
	Vertical resolution of this board's texture maps.

	@property height {number}
	**/
	this.height = Math.ceil( this.bounds.height * this.coordScale );

	/**
	Horizontal offset for drawing pixels

	@property offsetX {number}
	**/
	this.offsetX = -Math.ceil( this.bounds.minX * this.coordScale );

	/**
	Vertical offset for drawing pixels

	@property offsetY {number}
	**/
	this.offsetY = -Math.ceil( this.bounds.minY * this.coordScale );

	if ( !( this.width > 1 && this.height > 1 ) ) {
		console.error( "Error: Texture dimensions too small.",
			"BRD boundaries not found, or too many microns per pixel." );
		return;
	}
};


EagleBrdRenderer.prototype._parseCollection = function( collection ) {

	/**
	Parse an element from the BRD which contains primitives.
	If if encounters a package, it will recurse and parse that element.
	Primitives are deployed to any number of layers, from 0 to all,
	depending on which layers want it.

	@method _parseCollection
	@param el {Element} XML element from BRD to parse
	@private
	**/

	var el, i, j, name, type,
		nodeTypes = [ "circle", "element", "hole", "pad", "polygon",
			"rectangle", "smd", "text", "via", "wire" ];

	for ( i = 0; i < collection.childNodes.length; i++ ) {
		el = collection.childNodes[ i ];
		type = el.nodeType;

		if ( type === el.ELEMENT_NODE ) {
			name = el.tagName;

			// Recurse element packages
			if ( name === "element" ) {
				this._parseElement( el );
			} else if ( nodeTypes.indexOf( name ) !== -1 ) {

				// Add element data to package components
				if ( this._elementCurrent ) {
					el.elementParent = this._elementCurrent;
				}

				// Allow layers to register elements they desire
				for ( j = 0; j < this.layers.length; j++ ) {
					this.layers[ j ].assessElementCandidate( el );
				}
			}
		}
	}
};


EagleBrdRenderer.prototype._parseDesignRules = function() {

	/**
	Set `designRules` to contain important circuit rules from XML.

	@method _parseDesignRules
	@private
	**/

	var i,
		rules = this.xml.getElementsByTagName( "designrules" )[ 0 ]
			.getElementsByTagName( "param" );

	console.log( "Parsing design rules..." );

	/**
	Design rules for this PCB layout. These are used in determining
	various important layout characteristics.

	@property designRules {object}
	@default {}
	**/
	this.designRules = {};

	for ( i = 0; i < rules.length; i++ ) {
		this.designRules[ rules[ i ].getAttribute( "name" ) ] =
			rules[ i ].getAttribute( "value" );
	}
};


EagleBrdRenderer.prototype._parseElement = function( el ) {

	/**
	Parse an `<element>` element from the XML library.

	@method _parseElement
	@param el {Element} `<element>` element to parse
	**/

	var i, lib, libs, pack, packs,
		libName = el.getAttribute( "library" ),
		packName = el.getAttribute( "package" );

	console.log( "Preparing element:", el.getAttribute( "name" ),
		"-- Library", libName, "-- Package", packName );

	// Get a named library from the XML
	libs = this.xml.getElementsByTagName( "libraries" )[ 0 ]
		.getElementsByTagName( "library" );
	for ( i = 0; i < libs.length; i++ ) {
		lib = libs[ i ];
		if ( lib.getAttribute( "name" ) === libName ) {
			break;
		}
		lib = null;
	}

	if ( !lib ) {
		return;
	}

	// Get the named package from the library
	packs = lib.getElementsByTagName( "packages" )[ 0 ]
		.getElementsByTagName( "package" );
	for ( i = 0; i < packs.length; i++ ) {
		pack = packs[ i ];
		if ( pack.getAttribute( "name" ) === packName ) {
			break;
		}
		pack = null;
	}

	if ( !pack ) {
		return;
	}

	/**
	Element currently being parsed. Used to append data to package elements.

	@property _elementCurrent {Element} undefined
	**/
	this._elementCurrent = el;

	// Parse the package into the layers
	this._parseCollection( pack );

	this._elementCurrent = null;
};


EagleBrdRenderer.prototype._populateLayers = function() {

	/**
	Initialize layers and populate them with the BRD elements.

	Derives layer identities from designrules.
	These are described as layers and combinations.

	Layers are identified by numbers.
	Combinations are either "+" or "*".

	* "*" combinations are core-fused.
	* "+" combinations are prepreg-fused.
	* ":" combinations are discardable information about blind vias.
	* "(" and "[" are also discardable via information.

	The combination method doesn't really matter, except for texturing.
	What matters is that we discard blind vias,
	and correctly identify copper and isolate layers in sequence.
	Thickness is defined in designrules as mtCopper and mtIsolate,
	in order of encountered types.

	For example, `(1*16)` can be simplified to `1*16`, and means
	"copper layer 1, then a core isolate layer, then copper layer 2".
	The copper layer thicknesses are found in `mtCopper` [ 0 ] and [ 1 ].
	The isolate layer is found in `mtIsolate` [ 0 ].

	This method will also create cream, mask, and board layers.

	@method _populateLayers
	**/

	var config, extract, i, isNum, iso, layer,
		mtCopper, mtIsolate, signals, thickness,
		layers = [],
		thickMask = 0.015 * this.coordScale,
		thickSolder = 0.05 * this.coordScale,
		offset = 0,
		regexNum = /^\d+/,
		regexIso = /^\D/;

	console.log( "Parsing board layers..." );

	// Create top cream mask
	// Note: Thickness of solder is a guess, based on a little research.
	// The current 50-micron value should be reasonably accurate,
	// but as of 2016-02-02 I haven't found a BRD specification.
	this.layers.push( new EagleBrdRenderer.Layer( {
		board: this,
		height: offset,
		layers: [ 31 ],
		name: "Top Solderpaste",
		tags: [ "Solderpaste", "Top" ],
		thickness: thickSolder
	} ) );

	offset += thickSolder;

	// Create top mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		board: this,
		height: offset,
		layers: [ 21, 25, 29 ],
		name: "Top Mask",
		tags: [ "Mask", "Top" ],
		thickness: thickMask
	} ) );

	offset += thickMask;

	// Parse layer setup
	config = this.designRules.layerSetup;

	config = config.replace( /\[\d+:/g, "" );
	config = config.replace( /:\d+\]/g, "" );
	config = config.replace( /[()]/g, "" );

	while ( config !== "" ) {
		extract = config.match( regexNum );
		if ( extract ) {
			layers.push( parseInt( extract, 10 ) );
			config = config.replace( regexNum, "" );
		} else {
			extract = config.match( regexIso );
			layers.push( extract[ 0 ] );
			config = config.replace( regexIso, "" );
		}
	}

	// `layers` should now be an alternating sequence
	// of numbers representing coppers and symbols representing isolates.

	// Build copper and isolate arrays from designrules strings
	mtCopper = this.designRules.mtCopper.split( " " );
	mtIsolate = this.designRules.mtIsolate.split( " " );

	for ( i = 0; i < layers.length; i++ ) {
		isNum = typeof layers[ i ] === "number";
		if ( !isNum ) {
			iso = layers[ i ] === "*" ? "Core" : "Prepreg";
		} else {
			iso = "";
		}
		thickness = isNum ?
				mtCopper[ Math.floor( i / 2 ) ] :
				mtIsolate[ Math.floor( i / 2 ) ];
		thickness =
			this.parseDistanceMm( thickness ) * this.coordScale;

		layer = new EagleBrdRenderer.Layer( {
			board: this,
			height: offset,
			layers: [ isNum ? layers[ i ] : layers[ i - 1 ] ],
			name: isNum ?
				"Layer" + layers [ i ] :
				"Layer" + layers[ i - 1 ] + iso,
			tags: [ iso || "Copper" ],
			thickness: thickness
		} );
		this.layers.push( layer );

		offset += thickness;

		if ( i === 0 ) {
			layer.tags.push( "Top" );
		}
		if ( i === layers.length - 1 ) {
			layer.tags.push( "Bottom" );
		}
	}

	// Create bottom mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		board: this,
		height: offset,
		layers: [ 22, 26, 30 ],
		name: "Bottom Mask",
		tags: [ "Mask", "Bottom" ],
		thickness: thickMask
	} ) );

	offset += thickMask;

	// Create bottom cream mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		board: this,
		height: offset,
		layers: [ 32 ],
		name: "Bottom Solderpaste",
		tags: [ "Solderpaste", "Bottom" ],
		thickness: thickSolder
	} ) );

	offset += thickSolder;

	// Create board dimensions
	this.layers.push( new EagleBrdRenderer.Layer( {
		board: this,
		height: offset,
		layers: [ 20 ],
		name: "Bounds",
		tags: [ "Bounds" ],
		thickness: 1
	} ) );

	/**
	Total thickness, including solderpaste and mask layers.
	Does not actually check for presence of solderpaste or mask.

	@property thickness {number}
	**/
	this.thickness = offset;

	for ( i = 0; i < this.layers.length; i++ ) {
		console.log( "Layer generated:", this.layers[ i ].tags[ 0 ],
			"thickness", this.layers[ i ].thickness );
	}

	// Populate layers
	console.log( "Populating plain..." );
	this._parseCollection( this.xml.getElementsByTagName( "plain" )[ 0 ] );

	console.log( "Populating signals..." );
	signals = this.xml.getElementsByTagName( "signal" );
	for ( i = 0; i < signals.length; i++ ) {
		this._parseCollection( signals[ i ] );
	}

	console.log( "Populating elements..." );
	this._parseCollection( this.xml.getElementsByTagName( "elements" )[ 0 ] );
};


EagleBrdRenderer.prototype._setDefaultParams = function() {

	/**
	Ensure that required params are set.

	@method _setDefaultParams
	@private
	**/

	if ( !this.params ) {
		this.params = {};
	}

	this.params.pixelMicrons = this.params.pixelMicrons || 35;
};


EagleBrdRenderer.prototype.drawCircles = function( params ) {

	/**
	Draw a series of circles, using current drawing styles.

	@method drawCircles
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] Extra size
		@param params.circles {array} List of circle elements to draw
		@param [params.layerMatch] {number} If defined,
			only elements with a matching `layer` attribute will draw
	**/

	var circle, i, radius, x, y,
		ctx = params.layer.ctx,
		layer = params.layer,
		circles = params.circles,
		offset = params.offset || 0;

	for ( i = 0; i < circles.length; i++ ) {
		circle = circles[ i ];

		if ( params.layerMatch &&
				parseInt( circle.getAttribute( "layer" ), 10 ) !==
				params.layerMatch ) {
			continue;
		}

		x = this.parseCoord( circle.getAttribute( "x" ) );
		y = this.parseCoord( circle.getAttribute( "y" ) );
		radius = this.parseCoord( circle.getAttribute( "radius" ) );

		ctx.save();

		// Account for objects created by elements
		if ( circle.elementParent ) {
			layer.orientContext( circle.elementParent, this.coordScale );
		}

		ctx.beginPath();
		ctx.arc( x, x, radius, 0, Math.PI * 2 );
		ctx.fill();

		if ( offset ) {
			ctx.lineWidth = offset;
			ctx.stroke();
		}

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawHoles = function( params ) {

	/**
	Draw a series of drill holes, using current drawing styles.

	@method drawHoles
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] {number} Extra radius
		@param params.holes {array} List of hole or via elements to draw
	**/

	var drill, hole, i, x, y,
		ctx = params.layer.ctx,
		holes = params.holes,
		layer = params.layer,
		offset = params.offset || 0;

	ctx.save();
	ctx.globalCompositeOperation = "destination-out";

	for ( i = 0; i < holes.length; i++ ) {
		hole = holes[ i ];

		ctx.save();

		// Account for objects created by elements
		if ( hole.elementParent ) {
			layer.orientContext(
				hole.elementParent, this.coordScale );
		}

		// Derive properties
		x = this.parseCoord( hole.getAttribute( "x" ) );
		y = this.parseCoord( hole.getAttribute( "y" ) );
		drill = this.parseCoord( hole.getAttribute( "drill" ) || 0 ) / 2;

		// Orient pad
		ctx.translate( x, y );

		ctx.beginPath();
		ctx.arc( 0, 0, drill + offset, 0, Math.PI * 2 );
		ctx.fill();

		ctx.restore();
	}

	ctx.restore();
};


EagleBrdRenderer.prototype.drawPads = function( params ) {

	/**
	Draw a series of pads, using current drawing styles.

	@method drawPads
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] {number} Extra radius
		@param params.pads {array} List of pad elements to draw
	**/

	var angData, drill, i, pad, radius, step,
		rest, restMin, restMax, restPc, shape, x, y,
		ctx = params.layer.ctx,
		layer = params.layer,
		pads = params.pads,
		offset = params.offset || 0;

	for ( i = 0; i < pads.length; i++ ) {
		pad = pads[ i ];
		
		ctx.save();

		// Account for objects created by elements
		if ( pad.elementParent ) {
			layer.orientContext(
				pad.elementParent, this.coordScale );
		}

		// Derive properties
		shape = pad.getAttribute( "shape" ) || "round";
		x = this.parseCoord( pad.getAttribute( "x" ) );
		y = this.parseCoord( pad.getAttribute( "y" ) );
		drill = parseFloat( pad.getAttribute( "drill" ) || 0 ) / 2;
		radius = parseFloat( pad.getAttribute( "diameter" ) || 0 ) / 2;
		angData = new EagleBrdRenderer.AngleData( pad.getAttribute( "rot" ) );

		// Orient pad
		ctx.translate( x, y );
		ctx.rotate( angData.angle );
		if ( angData.mirror ) {
			ctx.scale( -1, 1 );
		}
		if ( angData.spin ) {
			ctx.scale( 1, -1 );
		}

		// Compute rest ring
		restMin = layer.hasTag( "Top" ) ?
			this.parseDistanceMm( this.designRules.rlMinPadTop ) :
			layer.hasTag( "Bottom" ) ?
			this.parseDistanceMm( this.designRules.rlMinPadBottom ) :
			this.parseDistanceMm( this.designRules.rlMinPadInner );
		restMax = layer.hasTag( "Top" ) ?
			this.parseDistanceMm( this.designRules.rlMaxPadTop ) :
			layer.hasTag( "Bottom" ) ?
			this.parseDistanceMm( this.designRules.rlMaxPadBottom ) :
			this.parseDistanceMm( this.designRules.rlMaxPadInner );
		restPc = layer.hasTag( "Top" ) ?
			parseFloat( this.designRules.rvPadTop ) :
			layer.hasTag( "Bottom" ) ?
			parseFloat( this.designRules.rvPadBottom ) :
			parseFloat( this.designRules.rvPadInner );
		rest = Math.min( Math.max( drill * restPc, restMin ), restMax );
		if ( radius < rest + drill ) {
			radius = rest + drill;
		}

		radius *= this.coordScale;
		radius += offset;

		switch ( shape ) {
			case "round":
				ctx.beginPath();
				ctx.arc( 0, 0, radius, 0, Math.PI * 2 );
				ctx.fill();
				break;
			case "square":
				ctx.fillRect( -radius, -radius, radius * 2, radius * 2 );
				break;
			case "octagon":
				step = radius * Math.sin( Math.PI / 8 );
				ctx.beginPath();
				ctx.moveTo( radius, step );
				ctx.lineTo( step, radius );
				ctx.lineTo( -step, radius );
				ctx.lineTo( -radius, step );
				ctx.lineTo( -radius, -step );
				ctx.lineTo( -step, -radius );
				ctx.lineTo( step, -radius );
				ctx.lineTo( radius, -step );
				ctx.closePath();
				ctx.fill();
				break;
			case "long":
				step = ( radius - offset ) * 0.01 *
					parseFloat( this.designRules.psElongationLong );
				ctx.beginPath();
				ctx.lineCap = "round";
				ctx.lineWidth = radius * 2;
				ctx.moveTo( -step, 0 );
				ctx.lineTo( step, 0 );
				ctx.stroke();
				break;
			case "offset":
				step = ( radius - offset ) * 0.01 *
					parseFloat( this.designRules.psElongationLong );
				ctx.beginPath();
				ctx.lineCap = "round";
				ctx.lineWidth = radius * 2;
				ctx.moveTo( 0, 0 );
				ctx.lineTo( step * 2, 0 );
				ctx.stroke();
				break;
		}

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawPolygons = function( params ) {

	/**
	Draw a series of polygons, using current draw styles.

	NOTE: Some polygons can become part of pads.
	This is not implemented in this version. A thin isolation gap
	will appear around the core pad. Signal merging would be optimal.

	@method drawPolygons
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.layerMatch] {number} If defined,
			only elements with a matching `layer` attribute will draw
		@param params.polys {array} List of polygon elements to render
		@param [params.offset=0] {number} Extra margins
	**/

	var chordData, i, j, verts, x, y,
		ctx = params.layer.ctx,
		layer = params.layer,
		polys = params.polys,
		offset = params.offset || 0;

	for ( i = 0; i < polys.length; i++ ) {

		if ( params.layerMatch &&
				parseInt( polys[ i ].getAttribute( "layer" ), 10 ) !==
				params.layerMatch ) {
			continue;
		}

		verts = polys[ i ].getElementsByTagName( "vertex" );

		// Skip polys with no possible area.
		if ( verts.length < 3 ) {
			continue;
		}

		ctx.save();

		// Account for objects created by elements
		if ( polys[ i ].elementParent ) {
			layer.orientContext(
				polys[ i ].elementParent, this.coordScale );
		}

		ctx.beginPath();
		x = this.parseCoord( verts[ 0 ].getAttribute( "x" ) );
		y = this.parseCoord( verts[ 0 ].getAttribute( "y" ) );
		ctx.moveTo( x, y );

		for ( j = 0; j < verts.length; j++ ) {
			if ( verts[ j ].hasAttribute( "curve" ) ) {
				chordData = new EagleBrdRenderer.ChordData( {
					curve: parseFloat( verts[ j ].getAttribute( "curve" ) ),
					x1: parseFloat( verts[ j ].getAttribute( "x" ) ),
					y1: parseFloat( verts[ j ].getAttribute( "y" ) ),
					x2: parseFloat(
						verts[ ( j < verts.length - 1 ) ? j + 1 : 0 ]
						.getAttribute( "x" ) ),
					y2: parseFloat(
						verts[ ( j < verts.length - 1 ) ? j + 1 : 0 ]
						.getAttribute( "y" ) )
				} );
				ctx.arc(
					chordData.x * this.coordScale,
					chordData.y * this.coordScale,
					chordData.radius * this.coordScale,
					chordData.bearing1, chordData.bearing2 );
			} else {
				x = this.parseCoord( verts[ j ].getAttribute( "x" ) );
				y = this.parseCoord( verts[ j ].getAttribute( "y" ) );
				ctx.lineTo( x, y );
			}
		}

		ctx.closePath();
		ctx.fill();

		if ( offset ) {
			ctx.lineWidth = offset;
			ctx.stroke();
		}

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawRectangles = function( params ) {

	/**
	Draw a series of rectangles, using current drawing styles.

	@method drawRectangles
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] Extra size
		@param params.rects {array} List of rectangle elements to draw
		@param [params.layerMatch] {number} If defined,
			only elements with a matching `layer` attribute will draw
	**/

	var dx, dy, i, rect, x, y,
		ctx = params.layer.ctx,
		layer = params.layer,
		rects = params.rects,
		offset = params.offset || 0;

	for ( i = 0; i < rects.length; i++ ) {
		rect = rects[ i ];

		if ( params.layerMatch &&
				parseInt( rect.getAttribute( "layer" ), 10 ) !==
				params.layerMatch ) {
			continue;
		}

		x = rect.getAttribute( "x1" );
		y = rect.getAttribute( "y1" );
		dx = this.parseCoord( rect.getAttribute( "x2" ) - x );
		dy = this.parseCoord( rect.getAttribute( "y2" ) - y );

		ctx.save();

		// Account for objects created by elements
		if ( rect.elementParent ) {
			layer.orientContext( rect.elementParent, this.coordScale );
		}

		ctx.translate( this.parseCoord( x ), this.parseCoord( y ) );

		ctx.fillRect( 0, 0, dx, dy );

		if ( offset ) {
			ctx.lineWidth = offset;
			ctx.strokeRect( 0, 0, dx, dy );
		}

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawSmds = function( params ) {

	/**
	Draw a series of smds, using current drawing styles.

	@method drawSmds
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] Extra size
		@param params.smds {array} List of SMD elements to draw
	**/

	var i, smd, x, y,
		ctx = params.layer.ctx,
		layer = params.layer,
		smds = params.smds,
		offset = params.offset || 0;

	for ( i = 0; i < smds.length; i++ ) {
		smd = smds[ i ];

		ctx.save();

		// Account for objects created by elements
		if ( smd.elementParent ) {
			layer.orientContext( smd.elementParent, this.coordScale );
		}

		// Derive properties
		x = this.parseCoord( smd.getAttribute( "x" ) );
		y = this.parseCoord( smd.getAttribute( "y" ) );
		dx = this.parseCoord( smd.getAttribute( "dx" ) ) + offset * 2;
		dy = this.parseCoord( smd.getAttribute( "dy" ) ) + offset * 2;
		angData = new EagleBrdRenderer.AngleData( smd.getAttribute( "rot" ) );
		// TODO: Roundness?

		// Orient object
		ctx.translate( x, y );
		ctx.rotate( angData.angle );
		if ( angData.mirror ) {
			ctx.scale( -1, 1 );
		}
		if ( angData.spin ) {
			ctx.scale( 1, -1 );
		}

		ctx.fillRect( -dx / 2, -dy / 2, dx, dy );

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawTexts = function( params ) {

	/**
	Draw a series of text legends, using current drawing styles.

	@method drawTexts
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] Extra size
		@param params.texts {array} List of text elements to draw
		@param [params.layerMatch] {number} If defined,
			only elements with a matching `layer` attribute will draw
	**/

	var angData, i, text,
		ctx = params.layer.ctx,
		layer = params.layer,
		texts = params.texts,
		offset = params.offset || 0;

	for ( i = 0; i < texts.length; i++ ) {
		text = texts[ i ];

		console.log( "Rendering text", text.innerHTML );

		if ( params.layerMatch &&
				parseInt( text.getAttribute( "layer" ), 10 ) !==
				params.layerMatch ) {
			continue;
		}

		x = this.parseCoord( text.getAttribute( "x" ) );
		y = this.parseCoord( text.getAttribute( "x" ) );

		ctx.save();

		// Account for objects created by elements
		if ( text.elementParent ) {
			layer.orientContext( text.elementParent, this.coordScale );
		}

		ctx.translate( this.parseCoord( x ), this.parseCoord( y ) );

		if ( text.hasAttribute( "rot" ) ) {
			angData = new EagleBrdRenderer.AngleData(
				text.getAttribute( "rot" ) );
			ctx.rotate( angData.angle );
			ctx.scale(
				angData.mirror ? -1 : 1,
				angData.spin ? -1 : 1 );
		}


		// Set font
		// Note: Other fonts may be set.
		// Default/vector is OCR A (available on OSX as OCR A Std).
		// "Proportional" is said to be generally Helvetica.
		// "Fixed" is said to be generally Courier.
		ctx.font = Math.round( this.parseCoord(
			text.getAttribute( "size" ) ) ) + "px " + "OCR A Std";

		ctx.fillText( text.innerHTML, x, y );

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawViaRings = function( params ) {

	/**
	Draw a series of via rings, using current drawing styles.

	@method drawViaRings
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.offset=0] {number} Extra radius
		@param params.vias {array} List of via elements to draw
	**/

	var drill, i, radius, rest, restMin, restMax, restPc, shape, x, y,
		ctx = params.layer.ctx,
		layer = params.layer,
		offset = params.offset || 0,
		vias = params.vias;

	for ( i = 0; i < vias.length; i++ ) {
		via = vias[ i ];

		ctx.save();

		// Account for objects created by elements
		if ( via.elementParent ) {
			layer.orientContext(
				via.elementParent, this.coordScale );
		}

		// Derive properties
		shape = via.getAttribute( "shape" ) || "round";
		x = this.parseCoord( via.getAttribute( "x" ) );
		y = this.parseCoord( via.getAttribute( "y" ) );
		drill = parseFloat( via.getAttribute( "drill" ) || 0 ) / 2;
		radius = parseFloat( via.getAttribute( "diameter" ) || 0 ) / 2;

		// Orient pad
		ctx.translate( x, y );

		// Compute rest ring
		restMin = layer.hasTag( "Top" ) || layer.hasTag( "Bottom" ) ?
			this.parseDistanceMm( this.designRules.rlMinViaOuter ) :
			this.parseDistanceMm( this.designRules.rlMinViaInner );
		restMax = layer.hasTag( "Top" ) || layer.hasTag( "Bottom" ) ?
			this.parseDistanceMm( this.designRules.rlMaxViaOuter ) :
			this.parseDistanceMm( this.designRules.rlMaxViaInner );
		restPc = layer.hasTag( "Top" ) || layer.hasTag( "Bottom" ) ?
			parseFloat( this.designRules.rvViaOuter ) :
			parseFloat( this.designRules.rvViaInner );
		rest = Math.min( Math.max( drill * restPc, restMin ), restMax );
		if ( radius < rest + drill ) {
			radius = rest + drill;
		}

		// Scale radius to pixel coords
		radius *= this.coordScale;

		switch ( shape ) {
			case "round":
				ctx.beginPath();
				ctx.arc( 0, 0, radius + offset, 0, Math.PI * 2 );
				ctx.fill();
				break;
			// TODO: other shapes
		}

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.drawWirePaths = function( params ) {

	/**
	Draw a series of paths from an array of wires.
	These paths are not continuous. Each has its own stroke width.

	Stroke style, other than width, does not change.

	@method drawWirePaths
	@param params {object} Composite parameter object
		@param params.layer {EagleBrdRenderer.Layer} Layer being drawn
		@param [params.widthOffset=0] {number} Extra width
		@param params.wires {array} List of wire elements to draw
		@param [params.layerMatch] {number} If defined,
			only elements with a matching `layer` attribute will draw
	**/

	var chordData, i, wire,
		ctx = params.layer.ctx,
		layer = params.layer,
		wires = params.wires,
		widthOffset = params.widthOffset || 0;

	for ( i = 0; i < wires.length; i++ ) {
		wire = wires[ i ];

		if ( params.layerMatch &&
				parseInt( wire.getAttribute( "layer" ), 10 ) !==
				params.layerMatch ) {
			continue;
			}

		ctx.save();

		// Account for objects created by elements
		if ( wire.elementParent ) {
			layer.orientContext( wire.elementParent, this.coordScale );
		}

		ctx.beginPath();
		ctx.lineWidth = this.parseCoord( wire.getAttribute( "width" ) ) +
			widthOffset;

		if ( wire.hasAttribute( "curve" ) ) {
			chordData = new EagleBrdRenderer.ChordData( wire );
			ctx.arc(
				chordData.x * this.coordScale,
				chordData.y * this.coordScale,
				chordData.radius * this.coordScale,
				chordData.bearing1, chordData.bearing2,
				chordData.curve < 0 );
		} else {
			ctx.moveTo(
				this.parseCoord( wire.getAttribute( "x1" ) ),
				this.parseCoord( wire.getAttribute( "y1" ) ) );
			ctx.lineTo(
				this.parseCoord( wire.getAttribute( "x2" ) ),
				this.parseCoord( wire.getAttribute( "y2" ) ) );
		}

		ctx.stroke();

		ctx.restore();
	}
};


EagleBrdRenderer.prototype.getChordPoints = function( wire ) {

	/**
	Return a list of `[ x, y ]` coordinate pairs
	representing the cardinal points of a circle described by the
	curvature of the wire parameter. This list may be length 0.

	@method getChordPoints
	@return array
	**/

	var centroidX, centroidY, radius, sweepMin, sweepMax,
		chordData = new EagleBrdRenderer.ChordData( wire ),
		points = [];

	// Pull data from chord analytics
	centroidX = chordData.x;
	centroidY = chordData.y;
	radius = chordData.radius;
	sweepMin = chordData.bearing1;
	sweepMax = chordData.bearing2;

	if ( chordData.curve < 0 ) {
		sweepMin = chordData.bearing2;
		sweepMax = chordData.bearing1;
	}
	if ( sweepMax > Math.PI ) {
		sweepMax -= Math.PI * 2;
	}

	// Determine points that fall within sweep.
	// Note that perfect matches are discarded,
	// as this indicates the wire point is on that cardinal point.
	if ( sweepMin < -Math.PI / 2 && sweepMax > -Math.PI / 2 ) {
		points.push( [ centroidX, centroidY + radius ] );
	}
	if ( sweepMin < 0 && sweepMax > 0 ) {
		points.push( [ centroidX - radius, centroidY ] );
	}
	if ( sweepMin < Math.PI / 2 && sweepMax > Math.PI / 2 ) {
		points.push( [ centroidX, centroidY - radius ] );
	}
	if ( sweepMin < Math.PI && sweepMax > Math.PI ) {
		points.push( [ centroidX + radius, centroidY ] );
	}

	return points;
};


EagleBrdRenderer.prototype.getLayer = function( name ) {

	/**
	Return a layer of the specified name.

	@method getLayer
	@param name {string} Identifier of the layer
	@return EagleBrdRenderer.Layer
	**/

	var i;

	for ( i = 0; i < this.layers.length; i++ ) {
		if ( this.layers[ i ].name === name ) {
			return this.layers[ i ];
		}
	}
};


EagleBrdRenderer.prototype.parseCoord = function( coord ) {

	/**
	Convert a string coord into a pixel number.

	@method parseCoord
	@param coord {string} String that represents a number in mm
	@return {number} Coord in pixels
	**/

	return parseFloat( coord ) * this.coordScale;
};


EagleBrdRenderer.prototype.parseDistanceMm = function( dist ) {

	/**
	Return the distance measured by a BRD string, e.g. "0.035mm".
	This distance is measured in mm.

	@method parseDistanceMm
	@param dist {string} Distance string from BRD XML
	@return {number} Distance in mm
	**/

	var tokens = dist.match( /([0-9.]+)(\D+)/ ),
		num = parseFloat( tokens[ 1 ] ),
		unit = tokens[ 2 ];

	switch( unit ) {

		// Millimeters are the base unit
		case "mm":
			return num;

		// Milliinch or "mil"
		case "mil":
			return num * 0.0254;

		// Microns
		case "mic":
			return num * 0.001;

		// Inch
		case "inch":
			return num * 25.4;
	}

	return 0;
};


EagleBrdRenderer.prototype.renderBounds = function() {

	/**
	Render the bounds to a buffer.

	@method renderBounds
	**/

	var chordData, holes, pads,
		i, j, k, x, y, firstX, firstY, lastX, lastY,
		wireGrps, wireGrp, wire,
		layer = this.getLayer( "Bounds" ),
		wires = layer.getElements( "wire" );

	layer.initBuffer();

	// Setup draw style
	layer.ctx.fillStyle = "rgb( 32, 192, 32 )";
	layer.ctx.save();



	// Order wires
	// Wire entities may be out of order in the BRD.
	// This will cause fills to operate badly.
	wireGrps = [];
	wireGrp = [];
	wireGrps.push( wireGrp );

	// Sort wires into groups of single origin.
	for ( i = 0; i < wires.length; i++ ) {
		if ( wire && wire.elementParent !== wires[ i ].elementParent ) {
			wireGrp = [];
			wireGrps.push( wireGrp );
		}
		wire = wires[ i ];
		wireGrp.push( wire );
	}

	// Sort wire groups by link.
	for ( i = 0; i < wireGrps.length; i++ ) {
		wireGrp = wireGrps[ i ];

		for ( j = 0; j < wireGrp.length; j++ ) {
			wire = wireGrp[ j ];
			x = wire.getAttribute( "x2" );
			y = wire.getAttribute( "y2" );
			for ( k = j; k >= 0; k-- ) {
				if ( x === wireGrp[ k ].getAttribute( "x1" ) &&
						y === wireGrp[ k ].getAttribute( "y1" ) ) {
					wireGrp.splice( j, 1 );
					wireGrp.splice( k, 0, wire );
					break;
				}
			}
		}
	}

	wires = [];
	for ( i = 0; i < wireGrps.length; i++ ) {
		wires = wires.concat( wireGrps[ i ] );
	}



	// Draw wire outlines
	layer.ctx.beginPath();

	// First point
	if ( wires.length ) {
		lastX = this.parseCoord(
			wires[ 0 ].getAttribute( "x1" ) );
		lastY = this.parseCoord(
			wires[ 0 ].getAttribute( "y1" ) );
		layer.ctx.moveTo( lastX, lastY );
		firstX = lastX;
		firstY = lastY;
	}

	for ( i = 0; i < wires.length; i++ ) {

		// Account for objects created by elements
		if ( wires[ i ].elementParent ) {
			layer.ctx.save();
			layer.orientContext( wires[ i ].elementParent, this.coordScale );
		}

		x = this.parseCoord( wires[ i ].getAttribute( "x1" ) );
		y = this.parseCoord( wires[ i ].getAttribute( "y1" ) );

		// Check for line breaks
		if ( x !== lastX || y !== lastY ) {
			layer.ctx.closePath();
			layer.ctx.moveTo( x, y );
			firstX = x;
			firstY = y;
		}

		lastX = this.parseCoord( wires[ i ].getAttribute( "x2" ) );
		lastY = this.parseCoord( wires[ i ].getAttribute( "y2" ) );

		// Connect segment
		if ( wires[ i ].hasAttribute( "curve" ) ) {
			chordData = new EagleBrdRenderer.ChordData( wires[ i ] );
			layer.ctx.arc(
				chordData.x * this.coordScale,
				chordData.y * this.coordScale,
				chordData.radius * this.coordScale,
				chordData.bearing1, chordData.bearing2,
				chordData.curve < 0 );
		} else {
			layer.ctx.lineTo( lastX, lastY );
		}

		// Revert element positioning
		if ( wires[ i ].elementParent ) {
			layer.ctx.restore();
		}
	}

	layer.ctx.closePath();
	layer.ctx.fill( "evenodd" );
	// layer.ctx.stroke();



	// Draw apertures
	holes = layer.getElements( "hole" );
	pads = layer.getElements( "pad" );
	holes = holes.concat( pads );

	// Subtractive draw
	layer.ctx.save();
	layer.ctx.globalCompositeOperation = "destination-out";

	for ( i = 0; i < holes.length; i++ ) {

		// Account for objects created by elements
		if ( holes[ i ].elementParent ) {
			layer.ctx.save();
			layer.orientContext( holes[ i ].elementParent, this.coordScale );
		}

		x = this.parseCoord( holes[ i ].getAttribute( "x" ) );
		y = this.parseCoord( holes[ i ].getAttribute( "y" ) );
		layer.ctx.beginPath();
		layer.ctx.arc( x, y,
			holes[ i ].getAttribute( "drill" ) * this.coordScale / 2,
			0, Math.PI * 2
		);
		layer.ctx.fill();

		// Revert element positioning
		if ( holes[ i ].elementParent ) {
			layer.ctx.restore();
		}
	}

	layer.ctx.restore();
};


EagleBrdRenderer.prototype.renderCopper = function() {

	/**
	Render all copper textures.

	@method renderCopper
	**/

	var i;

	for ( i = 0; i < this.layers.length; i++ ) {
		if ( this.layers[ i ].hasTag( "Copper" ) ) {
			this.renderCopperLayer( this.layers[ i ] );
		}
	}
};


EagleBrdRenderer.prototype.renderCopperLayer = function( layer ) {

	/**
	Render a copper layer.

	@method renderCopperLayer
	@param layer {EagleBrdRenderer.Layer} Layer to initialize and parse
	**/

	var chordData, ctx, i, j, verts, x, y,
		margin = this.parseDistanceMm( this.designRules.slThermalIsolate ) *
			this.coordScale,
		pads = layer.getElements( "pad" ),
		polys = layer.getElements( "polygon" ),
		smds = layer.getElements( "smd" ),
		vias = layer.getElements( "via" ),
		wires = layer.getElements( "wire" );

	layer.initBuffer();
	ctx = layer.ctx;


	// Copper styles
	ctx.fillStyle = "rgb( 255, 192, 128 )";
	ctx.strokeStyle = "rgb( 255, 192, 128 )";
	ctx.lineCap = "round";


	// Fill with copper
	// ctx.fillRect( -this.offsetX, -this.offsetY, this.width , this.height );


	// Draw polys
	// These are laid down first, because other objects will carve into them.
	this.drawPolygons( {
		layer: layer,
		polys: polys
	} );


	// Erase clearances
	ctx.save();
	ctx.globalCompositeOperation = "destination-out";

	// Erase wire clearance
	this.drawWirePaths( {
		layer: layer,
		widthOffset: margin * 2,
		wires: wires
	} );

	// Erase pad clearance
	this.drawPads( {
		layer: layer,
		offset: margin,
		pads: pads
	} );

	// Erase SMD clearance
	this.drawSmds( {
		layer: layer,
		offset: margin,
		smds: smds
	} );

	// Erase via ring clearance
	this.drawViaRings( {
		layer: layer,
		offset: margin,
		vias: vias
	} );

	// Erase board boundaries
	this.drawWirePaths( {
		layer: layer,
		widthOffset:
			this.parseDistanceMm( this.designRules.mdCopperDimension ) *
			this.coordScale,
		wires: this.getLayer( "Bounds" ).getElements( "wire" )
	} );
	this.drawHoles( {
		layer: layer,
		offset: this.parseDistanceMm( this.designRules.mdCopperDimension ) *
			this.coordScale,
		holes: this.getLayer( "Bounds" ).getElements( "hole" )
	} );

	ctx.restore();



	// Draw traces

	// Draw wires
	this.drawWirePaths( {
		layer: layer,
		wires: wires
	} );

	// Draw pads
	this.drawPads( {
		layer: layer,
		pads: pads
	} );

	// Draw SMDs
	this.drawSmds( {
		layer: layer,
		smds: smds
	} );

	// Draw via rings
	this.drawViaRings( {
		layer: layer,
		vias: vias
	} );

	// Cut vias
	this.drawHoles( {
		layer: layer,
		holes: vias
	} );


	// Apply bounds mask
	ctx.save();
	ctx.globalCompositeOperation = "destination-in";
	ctx.translate( -this.offsetX, this.height - this.offsetY );
	ctx.scale( 1, -1 );
	ctx.drawImage( this.getLayer( "Bounds" ).buffer, 0, 0 );
	ctx.restore();
};


EagleBrdRenderer.prototype.renderSolderMask = function() {

	/**
	Render all solder mask textures. These bear silkscreen.

	@method renderSolderMask
	**/

	var i;

	for ( i = 0; i < this.layers.length; i++ ) {
		if ( this.layers[ i ].hasTag( "Mask" ) ) {
			this.renderSolderMaskLayer( this.layers[ i ] );
		}
	}
};


EagleBrdRenderer.prototype.renderSolderMaskLayer = function( layer ) {

	/**
	Render a solder mask layer. This bears silkscreen legends.

	@method renderSolderMaskLayer
	@param layer {EagleBrdRenderer.Layer} Layer to initialize and parse
	**/

	var ctx, i, probeLayer, smds, vias,
		layerMatch = layer.hasTag( "Top" ) ? 29 : 30,
		margin = this.parseDistanceMm( this.designRules.mlMinStopFrame ) *
			this.coordScale;

	// NOTE: This uses an inaccurate margin.
	// Offset should be derived from smd dimensions per designrules.
	// As I'm just reusing draw methods, I can't do that,
	// so I'm using the min mask values.

	layer.initBuffer();
	ctx = layer.ctx;


	ctx.save();


	// Mask styles
	ctx.fillStyle = "rgb( 32, 64, 192 )";
	ctx.strokeStyle = "rgb( 32, 64, 192 )";
	ctx.lineCap = "round";


	// Fill with mask
	ctx.save();
	ctx.globalAlpha = 0.8;
	ctx.fillRect( -this.offsetX, -this.offsetY, this.width , this.height );
	ctx.restore();




	// Silkscreen layer
	ctx.save();

	// Silkscreen styles
	ctx.fillStyle = "rgb( 255, 255, 255 )";
	ctx.strokeStyle = "rgb( 255, 255, 255 )";
	ctx.lineCap = "round";

	layerMatch = layer.hasTag( "Top" ) ? [ 21, 25 ] : [ 22, 26 ];
	for ( i = 0; i < layerMatch.length; i++ ) {

		// Draw polygons
		this.drawPolygons( {
			layer: layer,
			polys: layer.getElements( "polygon" ),
			layerMatch: layerMatch[ i ]
		} );

		// Draw rects
		this.drawRectangles( {
			layer: layer,
			rects: layer.getElements( "rectangle" ),
			layerMatch: layerMatch[ i ]
		} );

		// Draw circles
		this.drawCircles( {
			layer: layer,
			circles: layer.getElements( "circle" ),
			layerMatch: layerMatch[ i ]
		} );

		// Draw wires
		this.drawWirePaths( {
			layer: layer,
			wires: layer.getElements( "wire" ),
			layerMatch: layerMatch[ i ]
		} );

		// Draw text
		this.drawTexts( {
			layer: layer,
			texts: layer.getElements( "text" ),
			layerMatch: layerMatch[ i ]
		} );
	}

	ctx.restore();




	// Erase mask holes
	ctx.globalCompositeOperation = "destination-out";

	// Cut polygons
	this.drawPolygons( {
		layer: layer,
		polys: layer.getElements( "polygon" ),
		layerMatch: layerMatch
	} );

	// Cut rects
	this.drawRectangles( {
		layer: layer,
		rects: layer.getElements( "rectangle" ),
		layerMatch: layerMatch
	} );

	// Cut circles
	this.drawCircles( {
		layer: layer,
		circles: layer.getElements( "circle" ),
		layerMatch: layerMatch
	} );

	// Cut pad rings
	this.drawPads( {
		layer: layer,
		pads: layer.getElements( "pad" ),
		offset: margin
	} );

	// Cut wires
	this.drawWirePaths( {
		layer: layer,
		wires: layer.getElements( "wire" ),
		layerMatch: layerMatch
	} );

	// Derive associated copper layer
	for ( i = 0; i < this.layers.length; i++ ) {
		probeLayer = this.layers [ i ];
		if ( ( layer.hasTag( "Bottom" ) && probeLayer.hasTag( "Bottom" ) ) ||
				( layer.hasTag( "Top" ) && probeLayer.hasTag( "Top" ) ) &&
				probeLayer.hasTag( "Copper" ) ) {
			break;
		}
	}

	if ( probeLayer ) {

		// Cut vias
		vias = probeLayer.getElements( "via" );
		this.drawHoles( {
			layer: layer,
			holes: vias
		} );

		// Cut smds
		smds = probeLayer.getElements( "smd" );
		this.drawSmds( {
			layer: layer,
			offset: margin,
			smds: smds
		} );
	}

	ctx.restore();




	// Apply bounds mask
	ctx.save();
	ctx.globalCompositeOperation = "destination-in";
	ctx.translate( -this.offsetX, this.height - this.offsetY );
	ctx.scale( 1, -1 );
	ctx.drawImage( this.getLayer( "Bounds" ).buffer, 0, 0 );
	ctx.restore();
};





/**
@namespace EagleBrdRenderer
**/





EagleBrdRenderer.AngleData = function( ang ) {

	/**
	Holds data about a BRD angle.

	@class AngleData
	@constructor
	@param ang {string} BRD angle description
	**/

	if ( !ang || typeof ang !== "string" ) {
		ang = "R0";
	}

	this.angle = parseFloat( ang.match( /[0-9.]+/ ) ) * Math.PI / 180;

	/**
	Whether the angle includes a horizontal mirror

	@property mirror {boolean} false
	**/
	this.mirror = ang.indexOf( "M" ) === -1 ? false : true;

	/**
	Whether the angle includes a vertical spin

	@property spin {boolean} false
	**/
	this.spin = ang.indexOf( "S" ) === -1 ? false : true;
};





EagleBrdRenderer.ChordData = function( chord ) {

	/**
	Analysis of the chord and circular segment described
	by a curving wire element.

	@class ChordData
	@constructor
	@param chord {Element} EAGLE BRD `wire` XML element.
		May also be a JS object definition.
	**/

	var ang,
		curve, x1, x2, y1, y2;

	// Parse feed
	if ( chord.getAttribute ) {
		curve = parseFloat( chord.getAttribute( "curve" ) );
		x1 = parseFloat( chord.getAttribute( "x1" ) );
		x2 = parseFloat( chord.getAttribute( "x2" ) );
		y1 = parseFloat( chord.getAttribute( "y1" ) );
		y2 = parseFloat( chord.getAttribute( "y2" ) );
	} else {
		curve = chord.curve;
		x1 = chord.x1;
		x2 = chord.x2;
		y1 = chord.y1;
		y2 = chord.y2;
	}

	/**
	Curvature of wire segment

	@property curve {number}
	**/
	this.curve = curve * Math.PI / 180;

	/**
	Horizontal coodinate of wire start

	@property x1 {number}
	**/
	this.x1 = x1;

	/**
	Vertical coodinate of wire start

	@property y1 {number}
	**/
	this.y1 = y1;

	/**
	Horizontal coodinate of wire end

	@property x2 {number}
	**/
	this.x2 = x2;

	/**
	Vertical coodinate of wire end

	@property y2 {number}
	**/
	this.y2 = y2;

	/**
	Horizontal wire displacement

	@property dx {number}
	**/
	this.dx = this.x2 - this.x1;

	/**
	Vertical wire displacement

	@property dy {number}
	**/
	this.dy = this.y2 - this.y1;

	/**
	Distance between start and end points of wire.

	@property chord {number}
	**/
	this.chord = Math.sqrt( Math.pow( this.dx, 2 ) + Math.pow( this.dy, 2 ) );

	/**
	Angle from start to end points of wire.

	@property bearing {number}
	**/
	this.bearing = Math.atan2( this.dy, this.dx );

	/**
	Radius of chord arc. Per chord identity,
	chord = 2 * radius * sin( angle / 2 ), rearranged to acquire radius.

	@property radius {number}
	**/
	this.radius = this.chord / ( 2 * Math.sin( this.curve / 2 ) );

	ang = this.bearing + Math.PI / 2 - this.curve / 2;

	/**
	Horizontal position of arc origin

	@property x {number}
	**/
	this.x = this.x1 + this.radius * Math.cos( ang );

	/**
	Vertical position of arc origin

	@property y {number}
	**/
	this.y = this.y1 + this.radius * Math.sin( ang );

	/**
	Angle from origin to wire start

	@property bearing1 {number}
	**/
	this.bearing1 = Math.atan2( this.y1 - this.y, this.x1 - this.x );

	/**
	Angle from origin to wire end

	@property bearing2 {number}
	**/
	this.bearing2 = Math.atan2( this.y2 - this.y, this.x2 - this.x );

	// Correct radius after calculations
	this.radius = Math.abs( this.radius );
};





EagleBrdRenderer.Layer = function( params ) {

	/**
	Define a layer of a PCB board. This contains a list of elements,
	and the render of these elements.

	Layer objects do not correspond directly to BRD layers.
	They may combine many BRD layers into one target,
	such as for rendering silkscreen;
	share an element across multiple targets,
	such as with vias and holes;
	or ignore a BRD layer entirely,
	such as with Symbol layers.

	@class Layer
	@constructor
	@param params {object} Composite parameter object
		@param params.board {EagleBrdRenderer} Master board
		@param [params.height=0] {number} Offset of layer from base in pixels
		@param params.layers {array} List of BRD layer numbers to follow
		@param params.name {string} Unique layer identifier
		@param [params.tags] {array} List of tag strings
		@param params.thickness {number} Thickness of layer in pixels
	**/

	/**
	Master board to which this layer belongs

	@property board {EagleBrdRenderer}
	**/
	this.board = params.board;

	/**
	Unordered list of elements to be drawn to this layer

	@property elements {array}
	**/
	this.elements = [];

	this.height = params.height;

	/**
	List of BRD layer numbers to follow

	@property layers {array}
	**/
	this.layers = params.layers;

	/**
	Unique layer identifier

	@property name {string}
	**/
	this.name = params.name;

	/**
	Tags on this layer. List of strings.

	@property tags {array}
	**/
	this.tags = params.tags || [];

	/**
	Thickness of this layer. Measured in pixels, but they may be fractional.

	@property thickness {number}
	**/
	this.thickness = params.thickness;
};


EagleBrdRenderer.Layer.prototype.add = function ( el ) {

	/**
	Add an element (cloned) to this layer.
	The element will not be checked for layer information.

	@method add
	@param el {Element} XML element describing a BRD element
	@return {EagleBrdRenderer.Layer} This Layer
	**/

	var inner,
		parent = el.elementParent;

	// Get subordinate data
	inner = el.innerHTML || "";

	// Clone the node, so package components become unique.
	el = el.cloneNode();

	// Append any current `<element>` parent to the clone
	if ( parent ) {
		el.elementParent = parent;
	}

	el.innerHTML = inner;

	this.elements.push( el );

	return this;
};


EagleBrdRenderer.Layer.prototype.assessElementCandidate = function( el ) {

	/**
	Assess an element for inclusion in this layer.
	If the element contains or spans this layer, it is included.

	@method assessElementCandidate
	@param el {Element} XML element describing a BRD primitive
	@return {EagleBrdRenderer.Layer} This Layer
	**/

	var extent1, extent2, i, mirror, oldLayer,
		extent = el.getAttribute( "extent" ),
		layer = parseInt( el.getAttribute( "layer" ), 10 ),
		swapLayers = function( layerOriginal ) {
			switch( layerOriginal ) {
				case 21:
					el.setAttribute( "layer", "22" );
					layer = 22;
					break;
				case 22:
					el.setAttribute( "layer", "21" );
					layer = 21;
					break;
				case 25:
					el.setAttribute( "layer", "26" );
					layer = 26;
					break;
				case 26:
					el.setAttribute( "layer", "25" );
					layer = 25;
					break;
			}
		};

	if ( layer ) {

		// Flip layers on mirrored elements
		// NOTE: This might not catch everything.
		// I've only seen it used for silkscreen elements.
		if ( el.elementParent && ( new EagleBrdRenderer.AngleData(
				el.elementParent.getAttribute( "rot" ) ) ).mirror ) {
			oldLayer = layer;
			swapLayers( layer );
		}

		// See whether this is a matching layer.
		if ( this.layers.indexOf( layer ) !== -1 ) {
			this.add( el );
		}

		// Unflip layers
		if ( oldLayer ) {
			swapLayers( layer );
			oldLayer = null;
		}
	} else if ( extent ) {

		// See whether this layer is within the specified extent.
		extent = extent.match( /(\d+)-(\d+)/ );
		extent1 = parseInt( extent[ 1 ], 10 );
		extent2 = parseInt( extent[ 2 ], 10 );
		for ( i = 0; i < this.layers.length; i++ ) {
			if ( extent1 <= this.layers[ i ] &&
					extent2 >= this.layers[ i ] ) {
				this.add( el );
				break;
			}
		}
	} else {

		// If no layer information is provided,
		// this must be a hole through everything,
		// or a pad that contains a hole through everything.
		this.add( el );
	}

	return this;
};


EagleBrdRenderer.Layer.prototype.getElements = function() {

	/**
	Return a list of elements. If no tags are passed as parameters,
	all elements will be returned. Otherwise, only elements that match
	one of the specified tags are returned.

	@method getElements
	@param [...tags] {string} Tags to return
	**/

	var i,
		out = [],
		tags = Array.apply( null, arguments );

	for ( i = 0; i < this.elements.length; i++ ) {
		if ( tags.length === 0 ||
				tags.indexOf( this.elements[ i ].tagName ) !== -1 ) {
			out.push( this.elements[ i ] );
		}
	}

	return out;
};


EagleBrdRenderer.Layer.prototype.hasTag = function( tag ) {

	/**
	Return whether this layer has the specified tag.

	@method hasTag
	@param tag {string} Tag to assess
	@return boolean
	**/

	if ( this.tags.indexOf( tag ) === -1 ) {
		return false;
	}
	return true;
};


EagleBrdRenderer.Layer.prototype.initBuffer = function() {

	/**
	Initialise the buffer for this layer.

	@method initBuffer
	**/

	/**
	Texture buffer to which layer elements are rendered

	@property buffer {HTMLCanvasElement}
	**/
	this.buffer = document.createElement( "canvas" );
	this.buffer.width = this.board.width;
	this.buffer.height = this.board.height;

	/**
	Texture drawing context for this layer

	@property ctx {CanvasRenderingContext2D}
	**/
	this.ctx = this.buffer.getContext( "2d" );

	// EAGLE coordinates are bottom-left, not top-left.
	// This coord system should be persistent.
	this.ctx.save();
	this.ctx.scale( 1, -1 );
	this.ctx.translate(
		this.board.offsetX, this.board.offsetY - this.board.height );
};


EagleBrdRenderer.Layer.prototype.orientContext = function( el, scale ) {

	/**
	Transform the drawing context according to properties on BRD elements.

	Note: this method does not save or restore context transform.

	@method orientContext
	@param el {Element} BRD element to serve as transformation basis
	@param [scale=1] {number} `coordScale` factor
	**/

	var x, y,
		ang = new EagleBrdRenderer.AngleData( el.getAttribute( "rot" ) );

	// Cannot draw if the buffer has not been initialized
	if ( !this.ctx ) {
		return;
	}

	scale = isNaN( scale ) ? 1 : scale;

	x = parseFloat( el.getAttribute( "x" ) ) * scale;
	y = parseFloat( el.getAttribute( "y" ) ) * scale;

	this.ctx.translate( x, y );

	this.ctx.rotate( ang.angle );

	if ( ang.mirror ) {
		this.ctx.scale( -1, 1 );
	}
	if ( ang.spin ) {
		this.ctx.scale( 1, -1 );
	}
};

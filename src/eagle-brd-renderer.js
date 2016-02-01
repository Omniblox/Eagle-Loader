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
	Named textures. Includes layer textures and other data.

	@property buffers {object}
	@default {}
	**/
	this.buffers = {};

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
	this.coordScale = 1 / ( this.params.pixelMicrons * 0.001 );

	this._parseDesignRules();

	this._populateLayers();

	this._parseBoardBounds();

	// TODO Init layers
	// We probably want a proper layer manager here, rather than
	// a naïve array. On the other hand, the BRD does specify the complete
	// layer list.  On the first hand again, most of them are unused.

	// TODO Parse BRD into layers
};


EagleBrdRenderer.prototype._parseBoardBounds = function() {

	/**
	Determine and record the boundaries of the board surface.
	This is derived from `eagle.drawing.board.plain` wires.

	@method _parseBoardBounds
	@private
	**/

	var buffer, ctx, curve, chordData, chordPoints, i, j, k, layer, wires,
		x, y, lastX, lastY,
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

		// Cord checks
		curve = wires[ i ].getAttribute( "curve" );
		if ( curve ) {
			chordPoints = this.getChordPoints( wires[ i ] );
			for ( k = 0; k < chordPoints.length; k++ ) {
				testMinMax( chordPoints[ k ][ 0 ], chordPoints[ k ][ 1 ] );
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
	this.width = Math.ceil( this.bounds.width * this.params.pixelMicrons );

	/**
	Vertical resolution of this board's texture maps.

	@property height {number}
	**/
	this.height = Math.ceil( this.bounds.height * this.params.pixelMicrons );

	/**
	Horizontal offset for drawing pixels

	@property offsetX {number}
	**/
	this.offsetX = -Math.ceil( this.bounds.minX * this.params.pixelMicrons );

	/**
	Vertical offset for drawing pixels

	@property offsetY {number}
	**/
	this.offsetY = -Math.ceil( this.bounds.minY * this.params.pixelMicrons );

	if ( !( this.width > 1 && this.height > 1 ) ) {
		console.error( "Error: Texture dimensions too small.",
			"BRD boundaries not found, or too many microns per pixel." );
		return;
	}

	// Draw outline mask
	buffer = document.createElement( "canvas" );
	buffer.width = this.width;
	buffer.height = this.height;
	this.buffers.bounds = buffer;

	ctx = buffer.getContext( "2d" );

	// Setup draw style
	ctx.fillStyle = "rgb( 32, 192, 32 )";

	// EAGLE coordinates are bottom-left, not top-left
	ctx.scale( 1, -1 );
	ctx.translate( 0, -this.height );

	ctx.beginPath();

	if ( wires.length ) {
		lastX = this.parseCoord(
			wires[ 0 ].getAttribute( "x1" ) ) + this.offsetX;
		lastY = this.parseCoord(
			wires[ 0 ].getAttribute( "y1" ) ) + this.offsetY;
		ctx.moveTo( lastX, lastY );
	}

	for ( i = 0; i < wires.length; i++ ) {

		x = this.parseCoord( wires[ i ].getAttribute( "x1" ) ) + this.offsetX;
		y = this.parseCoord( wires[ i ].getAttribute( "y1" ) ) + this.offsetY;

		// Check for line breaks
		if ( x !== lastX || y !== lastY ) {
			ctx.moveTo(
				this.parseCoord(
					wires[ i ].getAttribute( "x1" ) ) + this.offsetX,
				this.parseCoord(
					wires[ i ].getAttribute( "y1" ) ) + this.offsetY );
		}

		lastX = this.parseCoord(
			wires[ i ].getAttribute( "x2" ) ) + this.offsetX;
		lastY = this.parseCoord(
			wires[ i ].getAttribute( "y2" ) ) + this.offsetY;

		// Connect segment
		if ( wires[ i ].hasAttribute( "curve" ) ) {
			chordData = new EagleBrdRenderer.ChordData( wires[ i ] );
			ctx.arc(
				chordData.x * this.coordScale + this.offsetX,
				chordData.y * this.coordScale + this.offsetY,
				chordData.radius * this.coordScale,
				chordData.bearing1, chordData.bearing2 );
		} else {
			ctx.lineTo( lastX, lastY );
		}
	}

	ctx.closePath();
	ctx.fill( "evenodd" );
	ctx.stroke();

	// Diagnostic
	document.body.appendChild( buffer );
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

	console.log( "Preparing element: Library", libName, "Package", packName );

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

	// Parse the package into the layers
	this._parseCollection( pack );
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

	// Create bottom cream mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		height: offset,
		layers: [ 32 ],
		name: "Bottom Solderpaste",
		tags: [ "Solderpaste" ],
		thickness: thickSolder
	} ) );

	offset += thickSolder;

	// Create bottom mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		height: offset,
		layers: [ 22, 26 ],
		name: "Bottom Mask",
		tags: [ "Mask" ],
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
	}

	// Create top mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		height: offset,
		layers: [ 21, 25 ],
		name: "Top Mask",
		tags: [ "Mask" ],
		thickness: thickMask
	} ) );

	offset += thickMask;

	// Create top cream mask
	this.layers.push( new EagleBrdRenderer.Layer( {
		height: offset,
		layers: [ 31 ],
		name: "Top Solderpaste",
		tags: [ "Solderpaste" ],
		thickness: thickSolder
	} ) );

	offset += thickSolder;

	// Create board dimensions
	this.layers.push( new EagleBrdRenderer.Layer( {
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


EagleBrdRenderer.prototype.getChordPoints = function( wire ) {

	/**
	Return a list of `[ x, y ]` coordinate pairs
	representing the cardinal points of a circle described by the
	curvature of the wire parameter. This list may be length 0.

	@method getChordPoints
	@return array
	**/

	var centroidX, centroidY, curve, radius, sweepMin, sweepMax,
		x1, x2, y1, y2,
		chordData = new EagleBrdRenderer.ChordData( wire ),
		points = [];

	// Pull data from chord analytics
	curve = chordData.curve;
	centroidX = chordData.centroidX;
	centroidY = chordData.centroidY;
	radius = chordData.radius;
	x1 = chordData.x1;
	y1 = chordData.y1;
	x2 = chordData.x2;
	y2 = chordData.y2;

	// Determine angular sweep from point 1 to point 2.
	// The sweep may be greater than PI.
	sweepMin = Math.atan2( centroidY - y1, centroidX - x1 );
	sweepMax = Math.atan2( centroidY - y2, centroidX - x2 );
	if ( sweepMin > sweepMax ) {
		sweepMax += Math.PI * 2;
	}

	// Determine points that fall within sweep.
	// Must check extra points, as `sweepMax` may be as high as PI * 3.
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
	if ( sweepMax > Math.PI * 1.5 ) {
		points.push( [ centroidX, centroidY + radius ] );
	}
	if ( sweepMax > Math.PI * 2 ) {
		points.push( [ centroidX - radius, centroidY ] );
	}
	if ( sweepMax > Math.PI * 2.5 ) {
		points.push( [ centroidX, centroidY - radius ] );
	}
	if ( sweepMax > Math.PI * 3 ) {
		points.push( [ centroidX + radius, centroidY ] );
	}

	return points;
};


EagleBrdRenderer.prototype.getElementsByTagNameAndLayer =
function( tag, layer ) {

	/**
	Return a list of all specified tags on a specified layer.

	@method getElementsByTagNameAndLayer
	@param tag {string} Tag name
	@param layer {string} Layer number (note: still a string)
	@return array
	**/

	var i,
		out = [],
		tags = this.xml.getElementsByTagName( tag );

	for ( i = 0; i < tags.length; i++ ) {
		if ( tags[ i ].getAttribute( "layer" ) === layer ) {
			out.push( tags[ i ] );
		}
	}

	return out;
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





/**
@namespace EagleBrdRenderer
**/





EagleBrdRenderer.ChordData = function( wire ) {

	/**
	Analysis of the chord and circular segment described
	by a curving wire element.

	@class ChordData
	@constructor
	@param wire {Element} EAGLE BRD `wire` XML element
	**/

	var ang;

	/**
	Curvature of wire segment

	@property curve {number}
	**/
	this.curve = parseFloat( wire.getAttribute( "curve" ) ) * Math.PI / 180;

	/**
	Horizontal coodinate of wire start

	@property x1 {number}
	**/
	this.x1 = parseFloat( wire.getAttribute( "x1" ) );

	/**
	Vertical coodinate of wire start

	@property y1 {number}
	**/
	this.y1 = parseFloat( wire.getAttribute( "y1" ) );

	/**
	Horizontal coodinate of wire end

	@property x2 {number}
	**/
	this.x2 = parseFloat( wire.getAttribute( "x2" ) );

	/**
	Vertical coodinate of wire end

	@property y2 {number}
	**/
	this.y2 = parseFloat( wire.getAttribute( "y2" ) );

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
	this.radius = Math.abs( this.chord / ( 2 * Math.sin( this.curve / 2 ) ) );

	// Determine sidedness
	ang = this.curve > 0 ?
		this.bearing + Math.PI / 2 - this.curve / 2 :
		this.bearing - Math.PI / 2 + this.curve / 2;

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
		@param [params.height=0] {number} Offset of layer from base in pixels
		@param params.layers {array} List of BRD layer numbers to follow
		@param params.name {string} Unique layer identifier
		@param [params.tags] {array} List of tag strings
		@param params.thickness {number} Thickness of layer in pixels
	**/

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
	Add an element to this layer. The element will not be checked
	for layer information.

	@method add
	@param el {Element} XML element describing a BRD element
	@return {EagleBrdRenderer.Layer} This Layer
	**/

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

	var extent1, extent2, i,
		layer = parseInt( el.getAttribute( "layer" ), 10 ),
		extent = el.getAttribute( "extent" );

	if ( layer ) {

		// See whether this is a matching layer.
		if ( this.layers.indexOf( layer ) !== -1 ) {
			this.add( el );
		}
	} else if ( extent ) {

		// See whether this layer is within the specified extent.
		extent = extent.match( /(\d+)-(\d+)/ );
		extent1 = parseInt( extent[ 1 ], 10 );
		extent2 = parseInt( extent[ 2 ], 10 );
		for ( i = 0; i < this.layers.length; i++ ) {
			if ( extent1 <= this.layers[ i ] && extent2 >= this.layers[ i ] ) {
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
	This must be called after the bounds are identified.

	@method initBuffer
	**/

	/**
	Texture buffer to which layer elements are rendered

	@property buffer {HTMLCanvasElement}
	**/
	this.buffer = document.createElement( "canvas" );
	this.buffer.width = this.width;
	this.buffer.height = this.height;

	/**
	Texture drawing context for this layer

	@property ctx {CanvasRenderingContext2D}
	**/
	this.ctx = this.buffer.getContext( "2d" );
};

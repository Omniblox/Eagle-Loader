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

	this._parseBoardBounds();

	// TODO Init layers
	// We probably want a proper layer manager here, rather than
	// a naïve array. On the other hand, the BRD does specify the complete
	// layer list.  On the first hand again, most of them are unused.

	// TODO Parse BRD into layers
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


EagleBrdRenderer.prototype._parseBoardBounds = function() {

	/**
	Determine and record the boundaries of the board surface.
	This is derived from `eagle.drawing.board.plain` wires.

	@method _parseBoardBounds
	@private
	**/

	var buffer, ctx, curve, chordData, chordPoints, i, j, k,
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
		minY = 0,
		wires = this.xml.getElementsByTagName( "plain" )[ 0 ]
			.getElementsByTagName( "wire" );

	// TODO Get wires by layer, rather than by element `plain`

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


EagleBrdRenderer.prototype.parseCoord = function( coord ) {

	/**
	Convert a string coord into a pixel number.

	@method parseCoord
	@param coord {string} String that represents a number in mm
	@return {number} Coord in pixels
	**/

	return parseFloat( coord ) * this.coordScale;
};





EagleBrdRenderer.ChordData = function( wire ) {

	/**
	Analysis of the chord and circular segment described
	by a curving wire element.

	@namespace EagleBrdRenderer
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
	this.radius = this.chord / ( 2 * Math.sin( this.curve / 2 ) );

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

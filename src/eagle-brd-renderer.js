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


var EagleBrdRenderer = {};


EagleBrdRenderer.getBoard = function( xml ) {

	/**
	Return a rendered board.

	@param xml {Document} XML document to parse
	@return EagleBrdRenderer.Board
	**/

	return new EagleBrdRenderer.Board( xml );
};


EagleBrdRenderer.Board = function( xml ) {

	/**
	Creator of board renders. Reads XML and composites the appropriate
	textures and geometry.

	@class Board
	@constructor
	@param xml {Document} XML document to parse
	**/

	/**
	XML document that contains the board data

	@property xml {Document}
	**/
	this.xml = xml;

	/**
	PCB layers to be combined into the final board

	@property layers {array}
	@default []
	**/
	this.layers = [];

	this._parseDesignRules();

	this._parseBoardBounds();

	// TODO Init layers
	// We probably want a proper layer manager here, rather than
	// a naïve array. On the other hand, the BRD does specify the complete
	// layer list.  On the first hand again, most of them are unused.

	// TODO Parse BRD into layers
};


EagleBrdRenderer.Board.prototype._parseDesignRules = function() {

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


EagleBrdRenderer.Board.prototype._parseBoardBounds = function() {

	/**
	Determine and record the boundaries of the board surface.
	This is derived from `eagle.drawing.board.plain` wires.

	@method _parseBoardBounds
	@private
	**/

	var curve, chordPoints, i, j, k, x, y,
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

	/*
	Some wires may be curved. Under rare circumstances, this might disrupt
	normal minmax point estimates of bounds.

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
			chordPoints = this._getChordPoints( wires[ i ] );
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

	// TODO slots
};


EagleBrdRenderer.Board.prototype._getChordPoints = function( wire ) {

	/**
	Return a list of `[ x, y ]` coordinate pairs
	representing the cardinal points of a circle described by the
	curvature of the wire parameter. This list may be length 0.

	@method _getChordPoints
	@return array
	@private
	**/

	var ang, bearing, centroidX, centroidY, dx, dy, len, radius,
		sweepMin, sweepMax,
		x1, x2, y1, y2,
		curve = parseFloat( wire.getAttribute( "curve" ) ) * Math.PI / 180,
		points = [];

	// Zero-curvature points are straight. Obviously.
	if ( curve === 0 ) {
		return points;
	}

	// Get coords.
	x1 = parseFloat( wire.getAttribute( "x1" ) );
	y1 = parseFloat( wire.getAttribute( "y1" ) );
	x2 = parseFloat( wire.getAttribute( "x2" ) );
	y2 = parseFloat( wire.getAttribute( "y2" ) );
	dx = x2 - x1;
	dy = y2 - y1;
	len = Math.sqrt( Math.pow( dx, 2 ) + Math.pow( dy, 2 ) );
	bearing = Math.atan2( dy, dx );

	// Determine circle characteristics.
	// Per chord identities, chord length = 2 * radius * sin( angle / 2 )
	radius = len / ( 2 * Math.sin( curve / 2 ) );

	// Determine sidedness
	if ( curve > 0 ) {
		ang = bearing + Math.PI / 2 - curve / 2;
	} else {
		ang = bearing - Math.PI / 2 + curve / 2;
	}
	centroidX = x1 + radius * Math.cos( ang );
	centroidY = y1 + radius * Math.sin( ang );

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

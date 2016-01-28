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

	@property xml
	@type Document
	**/
	this.xml = xml;

	/**
	PCB layers to be combined into the final board

	@property layers
	@type array
	@default []
	**/
	this.layers = [];

	this._parseDesignRules();

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

	@property designRules
	@type object
	@default {}
	**/
	this.designRules = {};

	for ( i = 0; i < rules.length; i++ ) {
		this.designRules[ rules[ i ].getAttribute( "name" ) ] =
			rules[ i ].getAttribute( "value" );
	}
};

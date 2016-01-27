var gameOptions = {
		renderer: Kiwi.RENDERER_WEBGL,
		plugins: [ "Primitives", "Text" ]
	},
	Test = {};

Test.game = new Kiwi.Game( null, "Test", null, gameOptions );


// Setup states
Test.state = new Kiwi.State( "state" );


Test.state.preload = function() {

	var brd,
		xhttp = new XMLHttpRequest();

	// brd = "../brd/adafruit-cc3000-breakout.brd";
	// brd = "../brd/adafruit-flora-mainboard-2.brd";
	// brd = "../brd/adafruit-pro-trinket-3v3.brd";
	brd = "../brd/adafruit-pro-trinket-5v0.brd";

	xhttp.onreadystatechange = function() {
		if ( xhttp.readyState === 4 && xhttp.status === 200 ) {
			this.parseXml( xhttp.responseXML );
		}
	}.bind( this );
	xhttp.open( "GET", brd, true );
	xhttp.send();
};


Test.state.create = function() {

	this.game.stage.color = "#fff";

	// Helper text
	this.caption = new Kiwi.GameObjects.TextField(
		this, "Move pointer to view schematic",
		this.game.stage.width, this.game.stage.height - 24,
		"#000", 16 );
	this.caption.textAlign = Kiwi.GameObjects.TextField.TEXT_ALIGN_RIGHT;
	this.addChild( this.caption );
};


Test.state.parseXml = function( xml ) {

	/**
	* Interpret the XML data and attempt to derive BRD layout.
	*
	* @method parseXml
	* @param xml {Document} An XML document to parse
	*/

	var arr, component, i,
		eagle = xml.getElementsByTagName( "eagle" )[ 0 ],
		drawing = eagle.getElementsByTagName( "drawing" )[ 0 ],
		board = drawing.getElementsByTagName( "board" )[ 0 ],
		plain = board.getElementsByTagName( "plain" )[ 0 ],
		signals = board.getElementsByTagName( "signals" )[ 0 ],
		libraries = board.getElementsByTagName( "libraries" )[ 0 ],
		elements = board.getElementsByTagName( "elements" )[ 0 ];

	// Add XML to state
	this.xml = xml;
	this.eagle = eagle;
	this.drawing = drawing;
	this.board = board;
	this.plain = plain;
	this.signals = signals;
	this.libraries = libraries;
	this.elements = elements;

	/**
	* Factor by which units are inflated
	*
	* @property scaleFactor
	* @type number
	* @default 10
	*/
	this.scaleFactor = 10;

	/**
	* Group to hold primitives
	*
	* @property pGroup
	* @type Kiwi.Group
	*/
	this.pGroup = new Kiwi.Group( this );
	this.pGroup.scale = this.scaleFactor;
	this.pGroup.scaleY *= -1;
	this.addChild( this.pGroup );

	// Viewing systems

	// Mouse trace
	component = new Kiwi.Component( this.pGroup, "ViewingComponent" );
	this.pGroup.components.add( component );
	component.update = function() {
		this.owner.x = this.game.input.x;
		this.owner.y = this.game.input.y;
	};

	// Zoom
	this.game.input.mouse.onWheel.add( function( dx, dy ) {
		var tween,
			s = 1 + ( dy / 512 ),
			targX = this.pGroup.scaleX * s,
			targY = this.pGroup.scaleY * s;

		if ( targX < 1 ) {
			targX = 1;
		}
		if ( targY > -1 ) {
			targY = -1;
		}

		tween = this.game.tweens.create( this.pGroup );
		tween.to(
			{
				scaleX: targX,
				scaleY: targY
			},
			500,
			Kiwi.Animations.Tweens.Easing.Sinusoidal.InOut );
		tween.start();
	}, this );



	Kiwi.Log.log(
		"#parse",
		"Eagle version",
		eagle.getAttribute( "version" ) );

	// Convert to array, because apparently
	// `children` isn't supported in Safari, and 
	// `childNodes` lists newlines as nodes;
	// also we just want `<signal>` elements.
	this.pGroup.addChild( this.parseComponent( plain ) );

	arr = signals.getElementsByTagName( "signal" );

	for ( i = 0; i < arr.length; i++ ) {
		this.pGroup.addChild( this.parseComponent( arr[ i ] ) );
	}

	this.pGroup.addChild( this.parseComponent( elements ) );
};


Test.state.parseComponent = function( component ) {

	/**
	* Parse and construct a component from a `<package>` or `<signal>` node.
	*
	* @method parseComponent
	* @param component {Element} XML element containing drawable primitives
	* @return Kiwi.Group
	*/

	var el, geo, group, i;

	// Create group to keep primitives together
	group = new Kiwi.Group( this );

	for ( i = 0; i < component.childNodes.length; i++ ) {
		el = component.childNodes[ i ];
		if ( el.nodeType === el.ELEMENT_NODE ) {
			geo = null;

			// Select from EAGLE basic object types.
			// Some of these are not in the sample files I'm testing.
			// They might not have physical components.
			switch ( el.nodeName ) {
				case "attribute":
					// What's an attribute? Has almost every property...
					break;
				case "circle":
					geo = this.drawCircle( el );
					break;
				case "connect":
					// What's a connect? Sounds like metadata...
					break;
				case "contactref":
					// What's a contactref? More metadata?
					break;
				case "dimension":
					// What's a dimension?
					break;
				case "element":
					geo = this.drawElement( el );
					break;
				case "frame":
					// What's a frame?
					break;
				case "gate":
					// What's a gate?
					break;
				case "hole":
					geo = this.drawHole( el );
					break;
				case "instance":
					// What's an instance? It has parts and gates...
					break;
				case "junction":
					// What's a junction? It has no layer; is it physical?
					break;
				case "label":
					// What's a label? Looks like text...
					break;
				case "pad":
					geo = this.drawPad( el );
					break;
				case "part":
					// What's a part? Probably a library entry...
					break;
				case "pin":
					// What's a pin?
					break;
				case "pinref":
					// What's a pinref?
					break;
				case "polygon":
					geo = this.drawPolygon( el );
					break;
				case "rectangle":
					geo = this.drawRectangle( el );
					break;
				case "smd":
					geo = this.drawSmd( el );
					break;
				case "technology":
					// What's a technology? Just a name...
					break;
				case "text":
					geo = this.drawText( el );
					break;
				case "variant":
					// What's a variant?
					break;
				case "variantdef":
					// What's a variantdef?
					break;
				case "vertex":
					// Part of the polygon spec
					break;
				case "via":
					geo = this.drawVia( el );
					break;
				case "wire":
					geo = this.drawWire( el );
					break;
			}

			// Add to scene
			if ( geo ) {
				group.addChild( geo );
			}
		}
	}

	return group;
};


Test.state.drawCircle = function( el ) {

	/**
	* Draw a circle primitive derived from the XML element.
	*
	* @method drawCircle
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	// TODO: Check whether this should be drawn from its center

	var geo = new Kiwi.Plugins.Primitives.Ellipse( {
			state: this,
			color: "#f00",
			alpha: 0.5,
			drawStroke: false,
			centerOnTransform: true,
			radius: parseFloat( el.getAttribute( "radius" ) ),
			x: parseFloat( el.getAttribute( "x" ) ),
			y: parseFloat( el.getAttribute( "y" ) )
		} );

	return geo;
};


Test.state.drawElement = function( el ) {

	/**
	* Look up and create an element from the BRD library.
	*
	* @method drawElement
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var ang, group, i, lib, name, pack, packages,
		libName = el.getAttribute( "library" ),
		packName = el.getAttribute( "package" );

	Kiwi.Log.log( "#debug", "Library: ", libName, "Package: ", packName );

	/**
	* Cached reference of element for children to examine
	*
	* @property _referenceElement
	* @type Element
	* @default undefined
	* @private
	*/
	this._referenceElement = el;

	// Get appropriate library
	for ( i = 0; i < this.libraries.childNodes.length; i++ ) {
		if ( this.libraries.childNodes[ i ].nodeType ===
				this.libraries.childNodes[ i ].ELEMENT_NODE &&
				this.libraries.childNodes[ i ].getAttribute( "name" ) ===
					libName ) {
			lib = this.libraries.childNodes[ i ];
			break;
		}
	}

	if ( lib ) {
		packages = lib.getElementsByTagName( "packages" )[ 0 ];
		if ( !packages ) {
			this._referenceElement = null;
			return null;
		}
	}

	// Get appropriate package
	for ( i = 0; i < packages.childNodes.length; i++ ) {
		if ( packages.childNodes[ i ].nodeType ===
				packages.childNodes[ i ].ELEMENT_NODE ) {

			pack = packages.childNodes[ i ];
			name = pack.getAttribute( "name" );
			if ( name === packName ) {
				group = this.parseComponent( pack );
				group.x = parseFloat( el.getAttribute( "x" ) );
				group.y = parseFloat( el.getAttribute( "y" ) );

				// Rotation and mirroring
				ang = el.getAttribute( "rot" );
				if ( ang ) {
					group.rotation = this.parseAngle( ang );
					if ( ang[ 0 ] === "M" ) {
						group.scaleX *= -1;
					}
				}

				this._referenceElement = null;
				return group;
			}
		}
	}

	this._referenceElement = null;
};


Test.state.drawHole = function( el ) {

	/**
	* Draw a hole primitive derived from the XML element.
	*
	* @method drawHole
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var geo = new Kiwi.Plugins.Primitives.Ellipse( {
			state: this,
			color: "#000",
			drawStroke: false,
			centerOnTransform: true,
			radius: this.getDrill( el ),
			x: parseFloat( el.getAttribute( "x" ) ),
			y: parseFloat( el.getAttribute( "y" ) )
		} );

	return geo;
};


Test.state.drawPad = function( el ) {

	/**
	* Draw a pad primitive derived from the XML element.
	*
	* Pads all have drills, plus an annular ring in some geometric form.
	*
	* @method drawPad
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var geo, pad, drill,
		ang = el.getAttribute( "rot" ),
		diameter = parseFloat( el.getAttribute( "diameter" ) ),
		length = 1;

	// NOTE: `length` is related to `long` shape pads.
	// It defaults to 1.
	// This is apparently described in board design rules.

	// Group components
	geo = new Kiwi.Group( this );
	geo.x = parseFloat( el.getAttribute( "x" ) );
	geo.y = parseFloat( el.getAttribute( "y" ) );

	// Orient pad
	if ( ang ) {
		geo.rotation = this.parseAngle( ang );
		if ( ang[ 0 ] === "M" ) {
			geo.scaleX *= -1;
		}
	}

	if ( diameter ) {
		// Fill in `shape`, rather than use a switch default,
		// because an unexpected `case` should fail,
		// not default to round.
		switch ( el.getAttribute( "shape" ) || "round" ) {
			case "round":
				pad = new Kiwi.Plugins.Primitives.Ellipse( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					radius: diameter / 2
				} );
				geo.addChild( pad );
				break;
			case "square":
				pad = new Kiwi.Plugins.Primitives.Rectangle( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					width: diameter,
					height: diameter
				} );
				geo.addChild( pad );
				break;
			case "octagon":
				pad = new Kiwi.Plugins.Primitives.Ellipse( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					radius: diameter / 2,
					segments: 8,
					rotation: Math.PI / 8
				} );
				geo.addChild( pad );
				break;
			case "long":
			case "offset": /* TODO Can't find solid information on this */
				pad = new Kiwi.Plugins.Primitives.Ellipse( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					radius: diameter / 2,
					x: -diameter * length
				} );
				geo.addChild( pad );
				pad = new Kiwi.Plugins.Primitives.Ellipse( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					radius: diameter / 2,
					x: diameter * length
				} );
				geo.addChild( pad );
				pad = new Kiwi.Plugins.Primitives.Rectangle( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					width: diameter * length,
					height: diameter
				} );
				geo.addChild( pad );
				break;
		}
	}

	// Apply ring coloration
	if ( pad && pad.color ) {
		pad.color = [ 0, 0.5, 0 ];
		pad.alpha = 0.5;
	}

	// Create drill
	drill = new Kiwi.Plugins.Primitives.Ellipse( {
		state: this,
		drawStroke: false,
		radius: this.getDrill( el ),
		centerOnTransform: true,
		color: "#000"
	} );
	geo.addChild( drill );

	return geo;
};


Test.state.drawPolygon = function( el ) {

	/**
	* Draw a polygon primitive derived from the XML element.
	*
	* @method drawPolygon
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	// Currently drawing an outline, as Kiwi primitive polys
	// use triangle strips and the conversion is non-trivial
	// TODO: Fill.
	// TODO: EAGLE seems to support non-closing polygons.
	// If the last vertex is the first vertex, it is "ignored".
	// TODO: Curve notations.
	// NOTE: Filled polygons automatically avoid other signals.
	// There are some rules surrounding this. Orphans etc.

	var geo = new Kiwi.Plugins.Primitives.Line( {
			state: this,
			strokeWidth: 0.1,
			strokeColor: "#0f0",
			alpha: 0.5,
			points: this.getPolygonVertices( el )
		} );

	return geo;
};


Test.state.drawRectangle = function( el ) {

	/**
	* Draw a rectangle primitive derived from the XML element.
	*
	* @method drawRectangle
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var ang = el.getAttribute( "rot" ),
		geo = new Kiwi.Plugins.Primitives.Rectangle( {
			state: this,
			color: "#f00",
			alpha: 0.5,
			drawStroke: false,
			x: parseFloat( el.getAttribute( "x1" ) ),
			y: parseFloat( el.getAttribute( "y1" ) ),
			width: parseFloat( el.getAttribute( "x2" ) ) -
				parseFloat( el.getAttribute( "x1" ) ),
			height: parseFloat( el.getAttribute( "y2" ) ) -
				parseFloat( el.getAttribute( "y1" ) )
		} );

	if ( ang ) {
		geo.rotation = parseAngle( ang );
	}

	return geo;
};


Test.state.drawSmd = function( el ) {

	/**
	* Draw a SMD pad primitive derived from the XML element.
	*
	* SMD, or Surface Mount Device, is a rectangular pad
	* to which a component can be attached.
	*
	* @method drawSmd
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var ang = el.getAttribute( "rot" ),
		geo = new Kiwi.Plugins.Primitives.Rectangle( {
			state: this,
			drawStroke: false,
			x: parseFloat( el.getAttribute( "x" ) ),
			y: parseFloat( el.getAttribute( "y" ) ),
			width: parseFloat( el.getAttribute( "dx" ) ),
			height: parseFloat( el.getAttribute( "dy" ) ),
			color: "#080",
			alpha: 0.5,
			centerOnTransform: true
		} );

	if ( ang ) {
		geo.rotation = this.parseAngle( ang );
		if ( ang[ 0 ] === "M" ) {
			geo.scaleX *= -1;
		}
	}

	return geo;
};


Test.state.drawText = function( el ) {

	/**
	* Draw a text primitive derived from the XML element.
	*
	* @method drawText
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var geo,
		align = el.getAttribute( "align" ),
		ang = el.getAttribute( "rot" ),
		text = "" + el.childNodes[ 0 ].data;

	// Parse references
	if ( text.toUpperCase() === ">NAME" ) {
		text = this._referenceElement.getAttribute( "name" );
		if ( text == null ) {
			text = ">NAME";
		}
	}
	if ( text.toUpperCase() === ">VALUE" ) {
		text = this._referenceElement.getAttribute( "value" );
		if ( text == null ) {
			text = ">VALUE";
		}
	}

	// Don't waste resources rendering an empty text field
	if ( text === "" ) {
		return;
	}

	geo = new Kiwi.Plugins.Text( {
		state: this,
		text: text,
		x: parseFloat( el.getAttribute( "x" ) ),
		y: parseFloat( el.getAttribute( "y" ) ),
		color: "#000",
		alpha: 0.5,
		size: parseFloat( el.getAttribute( "size" ) ) *
			this.scaleFactor * 1.5,
		fontFamily: "monospace"
	} );

	// Pretouch text to get accurate measurements
	geo.renderText();

	// Determine alignment
	// Note that alignment appears to work from the top line only.
	// In the event of multi-line text, evidence suggests
	// it only considers the first line.
	if ( !align ) {
		align = "bottom-left";
	}
	switch ( align ) {
		case "bottom-left":
			geo.anchorPointY = geo.fontSize;
			geo.y -= geo.anchorPointY;
			break;
		case "bottom-center":
			geo.textAlign = Kiwi.Plugins.Text.TEXT_ALIGN_CENTER;
			geo.anchorPointY = geo.fontSize;
			geo.y -= geo.anchorPointY;
			break;
		case "bottom-right":
			geo.textAlign = Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT;
			geo.anchorPointY = geo.fontSize;
			geo.y -= geo.anchorPointY;
			break;
		case "center-left":
			geo.anchorPointY = geo.fontSize / 2;
			geo.y -= geo.anchorPointY;
			break;
		case "center":
			geo.textAlign = Kiwi.Plugins.Text.TEXT_ALIGN_CENTER;
			geo.anchorPointY = geo.fontSize / 2;
			geo.y -= geo.anchorPointY;
			break;
		case "center-right":
			geo.textAlign = Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT;
			geo.anchorPointY = geo.fontSize / 2;
			geo.y -= geo.anchorPointY;
			break;
		case "top-left":
			break;
		case "top-center":
			geo.textAlign = Kiwi.Plugins.Text.TEXT_ALIGN_CENTER;
			break;
		case "top-right":
			geo.textAlign = Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT;
			break;
	}

	// Because TextField uses raster text, it can't be too small.
	// Font size is increased, and display size is decreased.
	geo.scale = 1 / this.scaleFactor;

	// I don't know why, but text appears to render upside-down.
	geo.scaleY *= -1;

	if ( ang ) {

		// Rotate
		geo.rotation = this.parseAngle( ang );

		// Mirror
		if ( ang[ 0 ] === "M" ) {
			geo.scaleX *= -1;
		}
	}

	return geo;
};


Test.state.drawVia = function( el ) {

	/**
	* Draw a pad primitive derived from the XML element.
	*
	* Vias may have annular rings, similar to pads.
	*
	* @method drawVia
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	var geo, pad, drill,
		diameter = parseFloat( el.getAttribute( "diameter" ) );

	// Group components
	geo = new Kiwi.Group( this );
	geo.x = parseFloat( el.getAttribute( "x" ) );
	geo.y = parseFloat( el.getAttribute( "y" ) );

	// Vias with no diameter don't get an annular ring.
	if ( diameter ) {
		Kiwi.Log.log("#debug", "Diameter", diameter);

		// Fill in `shape`, rather than use a switch default,
		// because an unexpected `case` should fail,
		// not default to round.
		switch ( el.getAttribute( "shape" ) || "round" ) {
			case "round":
				pad = new Kiwi.Plugins.Primitives.Ellipse( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					radius: diameter / 2
				} );
				geo.addChild( pad );
				break;
			case "square":
				pad = new Kiwi.Plugins.Primitives.Rectangle( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					width: diameter,
					height: diameter
				} );
				geo.addChild( pad );
				break;
			case "octagon":
				pad = new Kiwi.Plugins.Primitives.Ellipse( {
					state: this,
					drawStroke: false,
					centerOnTransform: true,
					radius: diameter / 2,
					segments: 8,
					rotation: Math.PI / 8
				} );
				geo.addChild( pad );
				break;
		}
	}

	// Apply ring coloration
	if ( pad && pad.color ) {
		pad.color = [ 1, 0, 1 ];
		pad.alpha = 0.5;
	}

	// Create drill
	drill = new Kiwi.Plugins.Primitives.Ellipse( {
		state: this,
		drawStroke: false,
		radius: this.getDrill( el ),
		centerOnTransform: true,
		color: "#000"
	} );
	geo.addChild( drill );

	return geo;
};


Test.state.drawWire = function( el ) {

	/**
	* Draw a wire primitive derived from the XML element.
	*
	* @method drawWire
	* @param el {Element} XML element containing data
	* @return Kiwi.Entity
	*/

	// TODO: End connectors. Looks like all angles are 45 degrees,
	// except those with curves set,
	// so a width-based offset might be intrinsic.
	// I certainly can't see any extra information that
	// manufacturers might be using to complete connections.
	// TODO: Curve notations.

	// If width === 0, this is probably a board outline notation.
	// This is properly noted through the "Dimension" layer.
	var cut, geo, width;

	width = parseFloat( el.getAttribute( "width" ) );
	if ( width === 0 ) {
		cut = true;
		width = 0.1;
	}

	geo = new Kiwi.Plugins.Primitives.Line( {
			state: this,
			strokeWidth: width,
			strokeColor: cut ? "#000" : "#00f",
			alpha: 0.5,
			points: [
				[
					parseFloat( el.getAttribute( "x1" ) ),
					parseFloat( el.getAttribute( "y1" ) )
				],
				[
					parseFloat( el.getAttribute( "x2" ) ),
					parseFloat( el.getAttribute( "y2" ) )
				]
			]
		} );

	return geo;
};


Test.state.getPolygonVertices = function( polygon ) {

	/**
	* Parse a `<polygon>` element from a BRD,
	* and return an array of points in format [ [ x1, y1 ], [ x2, y2 ]... ]
	* for use in `Kiwi.Plugins.Primitives.Line`.
	*
	* @method getPolygonVertices
	* @param polygon {Element} Node containing `<vertex>` elements
	* @return array
	*/

	var i, vert,
		out = [],
		verts = polygon.getElementsByTagName( "vertex" );
	for ( i = 0; i < verts.length; i++ ) {
		vert = verts[ i ];
		out.push( [
				parseFloat( vert.getAttribute( "x" ) ),
				parseFloat( vert.getAttribute( "y" ) )
			] );
	}
	return out;
};


Test.state.getDrill = function( el ) {

	/**
	* Return the radius of a circle representing the `drill` attribute
	* of the element.
	*
	* Drill is a diameter, and must be converted to a radius.
	*
	* @method getDrill
	* @param el {Element} XML data element
	* @return number
	*/

	var att = el.getAttribute( "drill" );

	if ( att ) {
		return parseFloat( att ) / 2;
	} else {
		return 0;
	}
};


Test.state.parseAngle = function( ang ) {

	/**
	* Return an angle based on a string from the XML.
	* For example, `"R90"` will return `Math.PI / 2`.
	*
	* The string is assumed to be prefixed with an "R".
	* It is also checked to see whether it is prefixed with "M",
	* indicating that the object should be mirrored.
	*
	* @method parseAngle
	* @param ang {string} Angle string
	* @return number
	*/

	var mirror = 1;

	if ( ang[ 0 ] === "M" ) {
		ang = ang.slice( 1 );
		mirror = -1;
	}

	ang = ang.slice( 1 );

	return parseFloat( ang ) * mirror * Math.PI / 180;
};


// Init game
Test.game.states.addState( Test.state );
Test.game.states.switchState( "state" );

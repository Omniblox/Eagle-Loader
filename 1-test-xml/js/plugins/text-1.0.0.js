/**
* @module Kiwi
* @submodule Plugins
* @namespace Kiwi.Plugins
*/

Kiwi.Plugins.Text =
	function( params ) {

	/**
	* Text is a GameObject that is used when you are wanting to render
	* text onto the current State.
	*
	* Text has width/height and a hitbox, but because text is difficult
	* to measure, these may not be 100% accurate. It does not have an
	* "Input" component either, although you may choose to add one.
	* Be aware of these limitations.
	*
	* @class Text
	* @extends Kiwi.Entity
	* @constructor
	* @param params {object} Composite parameter object
	*	@param [params.addToState=true] {boolean} Whether the Text object
	*		should be automatically added to the State upon creation
	*	@param [params.alignment="left"] {string} Text alignment.
	*		May be "left", "right", "center",
	*		`Kiwi.Plugins.Text.TEXT_ALIGN_CENTER`,
	*		`Kiwi.Plugins.Text.TEXT_ALIGN_LEFT`,
	*		or `Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT`.
	*	@param [params.alpha=1] {number} Object opacity
	*	@param [params.anchorNormalX=0] {number} Horizontal anchor point
	*		as a ratio of width
	*	@param [params.anchorNormalY=0] {number} Vertical anchor point
	*		as a ratio of height
	*	@param [params.anchorPointX=0] {number} Horizontal anchor point
	*		coordinate
	*	@param [params.anchorPointY=0] {number} Vertical anchor point
	*		coordinate
	*	@param [params.color="#000000"] {string} Text color
	*	@param [params.fontFamily="sans-serif"] {String}
	*		Font family to be used when rendering
	*	@param [params.fontSize=32] {number} Size of the text in pixels;
	*		equivalent to and overrides `size`
	*	@param [params.lineHeight="1em"] {string} Height of lines, defined
	*		in pixels or ems
	*	@param [params.lineHeightNormalized=1] {number} Height of lines in ems.
	*		Takes priority over `lineHeight` during creation.
	*	@param [params.maxHeight=Infinity] {number} Maximum pixel height
	*		of text.
	*	@param [params.maxLines=Infinity] {number} Maximum number
	*		of text lines to render.
	*	@param [params.maxWidth=Infinity] {number} Maximum pixel width
	*		of text lines.
	*	@param [params.rotation=0] {number} Initial rotation
	*	@param [params.scale=1] {number} Scale, before X and Y axes
	*	@param [params.scaleX=1] {number} Horizontal scale
	*	@param [params.scaleY=1] {number} Vertical scale
	*	@param [params.size=32] {number} Size of the text in pixels;
	*		equivalent to and overridden by `fontSize`. Deprecated.
	*	@param params.state {Kiwi.State} State that this Text belongs to
	*	@param [params.text="text"] {string} Text to be displayed
	*	@param [params.weight="normal"] {String} Weight of the text
	*	@param [params.x=0] {number} Horizontal coordinate
	*	@param [params.y=0] {number} Vertical coordinate
	*/

	/**
	* Maximum pixel height of text. If undefined, an infinite number
	* of lines will be permitted. Note that only the first 2048
	* pixel rows will display.
	*
	* @property _maxHeight
	* @type number
	* @default Infinity
	* @private
	*/
	this._maxHeight = params.maxHeight || Infinity;

	/**
	* Maximum number of text lines. If undefined, an infinite number
	* of lines will be permitted. Note that only the first 2048
	* pixel rows will display.
	*
	* @property _maxLines
	* @type number
	* @default Infinity
	* @private
	*/
	this._maxLines = params.maxLines || Infinity;

	/**
	* Maximum pixel width of text lines. If undefined, lines may be
	* infinite in length. Note that only the first 2048 pixel columns
	* will display.
	*
	* @property _maxWidth
	* @type number
	* @default Infinity
	* @private
	*/
	this._maxWidth = params.maxWidth || Infinity;

	/**
	* If the temporary canvas is dirty and needs to be re-rendered.
	*
	* @property _tempDirty
	* @type boolean
	* @private
	*/
	this._tempDirty = true;

	if ( typeof params.text !== "string" ) {
		if ( typeof params.text === "number" ) {
			params.text = "" + params.text;
		} else {
			params.text = "text";
		}
	}
	if ( isNaN( params.x ) ) {
		params.x = 0;
	}
	if ( isNaN( params.y ) ) {
		params.y = 0;
	}
	if ( params.color === void 0 ) {
		params.color = "#000000";
	}
	if ( params.size === void 0 ) {
		params.size = 32;
	}
	if ( params.fontSize === void 0 ) {
		params.fontSize = params.size;
	}
	if ( params.weight === void 0 ) {
		params.weight = "normal";
	}
	if ( params.fontFamily === void 0 ) {
		params.fontFamily = "sans-serif";
	}

	// Call super
	Kiwi.Entity.call( this, params.state, params.x, params.y );

	// Set transforms
	this.rotation = isNaN( params.rotation ) ? 0 : params.rotation;
	this.scale = isNaN( params.scale ) ? 1 : params.scale;
	this.scaleX = isNaN( params.scaleX ) ? this.scaleX : params.scaleX;
	this.scaleY = isNaN( params.scaleY ) ? this.scaleY : params.scaleY;
	this.alpha = isNaN( params.alpha ) ? 1 : params.alpha;
	this.anchorPointX = isNaN( params.anchorPointX ) ? 0 : params.anchorPointX;
	this.anchorPointY = isNaN( params.anchorPointY ) ? 0 : params.anchorPointY;

	/**
	* Horizontal anchor normal. This defines `anchorPointX` as a proportion
	* of `width`. If `anchorNormalX` is defined, it will update `anchorPointX`
	* when the dimensions of the rendered image change.
	*
	* @property _anchorNormalX
	* @type number
	* @default undefined
	* @private
	*/
	this._anchorNormalX = params.anchorNormalX;

	/**
	* Vertical anchor normal. This defines `anchorPointY` as a proportion
	* of `height`. If `anchorNormalY` is defined, it will update `anchorPointY`
	* when the dimensions of the rendered image change.
	*
	* @property _anchorNormalY
	* @type number
	* @default undefined
	* @private
	*/
	this._anchorNormalY = params.anchorNormalY;

	if ( this.game.renderOption === Kiwi.RENDERER_WEBGL ) {

		/**
		* GL renderer for this text object's internal canvas
		*
		* @property glRenderer
		* @type Kiwi.Renderers.Renderer
		*/

		this.glRenderer =
			this.game.renderer.requestSharedRenderer( "TextureAtlasRenderer" );
	}

	this.lineHeight = params.lineHeight || "1em";
	if ( params.lineHeightNormalized ) {
		this.lineHeightNormalized = params.lineHeightNormalized;
	}

	/**
	* The text that is to be rendered.
	* @property _text
	* @type string
	* @private
	*/
	this._text = params.text;

	/**
	* The weight of the font.
	* @property _fontWeight
	* @type string
	* @default "normal"
	* @private
	*/
	this._fontWeight = params.weight;

	/**
	* The size of the font.
	* @property _fontSize
	* @type number
	* @default 32
	* @private
	*/
	this._fontSize = params.fontSize;

	/**
	* The color of the text.
	* @property _fontColor
	* @type Kiwi.Utils.Color
	* @private
	*/
	this._fontColor = new Kiwi.Utils.Color( params.color );

	/**
	* The font family that is to be rendered.
	* @property _fontFamily
	* @type string
	* @default "sans-serif"
	* @private
	*/
	this._fontFamily = params.fontFamily;

	/**
	* The alignment of the text. This can either be "left", "right" or "center"
	* @property _textAlign
	* @type string
	* @default "center"
	* @private
	*/
	this._textAlign = "left";
	if ( params.alignment ) {
		this.alignment = params.alignment;
	}

	/**
	* The baseline of the text to be rendered.
	* @property _baseline
	* @type string
	* @private
	*/
	this._baseline = "top";


	/**
	* Canvas element onto which the text is rendered
	* @property _canvas
	* @type HTMLCanvasElement.
	* @private
	*/
	this._canvas = document.createElement( "canvas" );
	this._canvas.width = 2;
	this._canvas.height = 2;

	/**
	* Context for the canvas element. Used while rendering text.
	* @property _ctx
	* @type CanvasRenderingContext2D
	* @private
	*/
	this._ctx = this._canvas.getContext( "2d" );

	// Add it to the TextureLibrary
	this.atlas = new Kiwi.Textures.SingleImage(
		this.game.rnd.uuid(), this._canvas );
	this.state.textureLibrary.add( this.atlas );
	this.atlas.dirty = true;

	/**
	* Hitbox component
	* @property box
	* @type Kiwi.Components.Box
	* @public
	*/
	this.box = this.components.add( new Kiwi.Components.Box(
		this, this.x, this.y, this.width, this.height ) );

	// Auto-add to state
	if ( params.addToState !== false ) {
		this.state.addChild( this );
	}

	this._createPool();
};
Kiwi.extend( Kiwi.Plugins.Text, Kiwi.Entity );


Kiwi.Plugins.Text.prototype.create = function( game ) {

	/**
	* Execute when Kiwi Game that has been told to use this plugin
	* reaches the boot stage of the game loop.
	*
	* @method create
	* @param game {Kiwi.Game} Game that is current in the boot stage
	*/
};


Kiwi.Plugins.Text.prototype._createPool = function() {

	/**
	* Create a pool of objects to be used during rendering.
	*
	* @method _createPool
	* @private
	*/

	/**
	* Composite pool object
	*
	* @property _pool
	* @type object
	* @private
	*/
	this._pool = {
		pt1: new Kiwi.Geom.Point( 0, 0 ),
		pt2: new Kiwi.Geom.Point( 0, 0 ),
		pt3: new Kiwi.Geom.Point( 0, 0 ),
		pt4: new Kiwi.Geom.Point( 0, 0 ),
		xOffset: 0
	};
};


/**
* The name of this plugin.
*
* @property name
* @type string
* @default "Text"
*/
Kiwi.Plugins.Text.name = "Text";


/**
* The version of this plugin.
*
* @property version
* @type string
* @default "0.0.1"
*/
Kiwi.Plugins.Text.version = "0.0.1";


/**
* Returns the type of object that this is.
*
* @method objType
* @return {string} "Text"
*/
Kiwi.Plugins.Text.prototype.objType = function () {
	return "Text";
};


Object.defineProperty( Kiwi.Plugins.Text.prototype, "anchorNormalX", {

	/**
	* Horizontal anchor normal. This defines `anchorPointX` as a proportion
	* of `width`. If `anchorNormalX` is defined, it will update `anchorPointX`
	* when the dimensions of the rendered image change.
	*
	* @property anchorNormalX
	* @type number
	* @default undefined
	*/

	get: function () {
		return this._anchorNormalX;
	},
	set: function (value) {
		this._anchorNormalX = value;
		this.anchorPointX = this.width * this._anchorNormalX;
	}
} );


Object.defineProperty( Kiwi.Plugins.Text.prototype, "anchorNormalY", {

	/**
	* Vertical anchor normal. This defines `anchorPointY` as a proportion
	* of `height`. If `anchorNormalY` is defined, it will update `anchorPointY`
	* when the dimensions of the rendered image change.
	*
	* @property anchorNormalY
	* @type number
	* @default undefined
	*/

	get: function () {
		return this._anchorNormalY;
	},
	set: function (value) {
		this._anchorNormalY = value;
		this.anchorPointY = this.height * this._anchorNormalY;
	}
} );


Object.defineProperty( Kiwi.Plugins.Text.prototype, "alignment", {

	/**
	* Alignment of text. You can either use the static TEXT_ALIGN
	* constants or pass a string.
	*
	* Alias of `textAlign`.
	*
	* @property alignment
	* @type string
	*/

	get: function () {
		return this._textAlign;
	},
	set: function (value) {
		this._textAlign = value;
		this._tempDirty = true;
	}
} );


Object.defineProperty( Kiwi.Plugins.Text.prototype, "lineHeight", {

	/**
	* Height of individual text lines. Measured in pixels or ems.
	* For example, "100px" or "1.3em".
	*
	* @property lineHeight
	* @type string
	*/

	get: function() {

		/**
		* Main storage of line height.
		*
		* @property _lineHeight
		* @type string
		* @private
		*/

		return this._lineHeight;
	},
	set: function( value ) {
		this._lineHeight = value;
		this._tempDirty = true;
	}
} );


Object.defineProperty( Kiwi.Plugins.Text.prototype, "lineHeightNormalized", {

	/**
	* Height of individual text lines, determining separation
	* between lines. Measured in ems relative to font size.
	*
	* @property lineHeightNormalized
	* @type number
	*/

	get: function () {
		var factor = 1;

		if ( this._lineHeight.slice( -2 ) === "em" ) {
			factor = this._lineHeight.slice(0, this._lineHeight.length - 2 );
		} else if ( this._lineHeight.slice( -2 ) === "px" ) {
			factor = this._lineHeight.slice(0, this._lineHeight.length - 2 ) /
				this._fontSize;
		}
		
		if ( isNaN( factor ) ) {
			factor = 1;
		}
		return factor * 1;
	},
	set: function( value ) {
		if ( !isNaN( value ) ) {
			this._lineHeight = value + "em";
		}
	}
} );


Object.defineProperty(Kiwi.Plugins.Text.prototype, "text", {

	/**
	* The text that you would like to appear in this textfield.
	*
	* @property text
	* @type string
	*/

	get: function () {
		return this._text;
	},
	set: function ( value ) {
		this._text = value;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
} );


Object.defineProperty(Kiwi.Plugins.Text.prototype, "color", {

	/**
	* The color of the font that is contained in this textfield.
	* May be set with a string, or an array of any valid
	* Kiwi.Utils.Color arguments.
	*
	* Returns a hex string prepended with "#".
	*
	* @property color
	* @type string
	*/

	get: function () {
		return "#" + this._fontColor.getHex();
	},
	set: function ( value ) {
		if (!Kiwi.Utils.Common.isArray(value)) {
			value = [value];
		}
		this._fontColor.set.apply(this._fontColor, value);
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
});


Object.defineProperty(Kiwi.Plugins.Text.prototype, "fontWeight", {

	/**
	* The weight of the font.
	*
	* @property fontWeight
	* @type string
	*/

	get: function () {
		return this._fontWeight;
	},
	set: function (value) {
		this._fontWeight = value;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
});


Object.defineProperty(Kiwi.Plugins.Text.prototype, "fontSize", {

	/**
	* The size on font when being displayed onscreen.
	* @property fontSize
	* @type number
	*/

	get: function () {
		return this._fontSize;
	},
	set: function (value) {
		this._fontSize = value;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
});


Object.defineProperty(Kiwi.Plugins.Text.prototype, "size", {

	/**
	* The size on font when being displayed onscreen.
	* Alias for `fontSize`.
	* @property size
	* @type number
	* @deprecated
	*/

	get: function () {
		return this._fontSize;
	},
	set: function (value) {
		this._fontSize = value;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
});


Object.defineProperty(Kiwi.Plugins.Text.prototype, "fontFamily", {

	/**
	* The font family that is being used to render the text.
	*
	* @property fontFamily
	* @type string
	*/

	get: function () {
		return this._fontFamily;
	},
	set: function (value) {
		this._fontFamily = value;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
});


Object.defineProperty( Kiwi.Plugins.Text.prototype, "maxHeight", {

	/**
	* Maximum pixel height of text. If undefined, an infinite number
	* of lines will be permitted. Note that only the first 2048
	* pixel columns will display.
	*
	* @property maxHeight
	* @type number
	* @default Infinity
	*/

	get: function() {
		return this._maxHeight;
	},
	set: function( value ) {
		this._maxHeight = value ? value : Infinity;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
} );


Object.defineProperty( Kiwi.Plugins.Text.prototype, "maxLines", {

	/**
	* Maximum number of text lines. If undefined, an infinite number
	* of lines will be permitted. Note that only the first 2048
	* pixel rows will display.
	*
	* @property maxLines
	* @type number
	* @default Infinity
	*/

	get: function() {
		return this._maxLines;
	},
	set: function( value ) {
		this._maxLines = value ? value : Infinity;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
} );


Object.defineProperty( Kiwi.Plugins.Text.prototype, "maxWidth", {

	/**
	* Maximum pixel width of text lines. If undefined, lines may be
	* infinite in length. Note that only the first 2048 pixel columns
	* will display.
	*
	* @property maxWidth
	* @type number
	* @default Infinity
	*/

	get: function() {
		return this._maxWidth;
	},
	set: function( value ) {
		this._maxWidth = value ? value : Infinity;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
} );


Object.defineProperty(Kiwi.Plugins.Text.prototype, "textAlign", {

	/**
	* Alignment of the text. You can either use the static TEXT_ALIGN
	* constants or pass a string.
	*
	* @property textAlign
	* @type string
	*/

	get: function () {
		return this._textAlign;
	},
	set: function (value) {
		this._textAlign = value;
		this._tempDirty = true;
	},
	enumerable: true,
	configurable: true
});


Kiwi.Plugins.Text.prototype.renderText = function () {

	/**
	* This method is used to render the text to an offscreen-canvas
	* which is held in a TextureAtlas (which is generated upon the
	* instanitation of this class). This is so that the canvas doesn't
	* render it every frame as it can be costly and so that it can be used
	* in WebGL with the TextureAtlasRenderer.
	*
	* You should not need to call this function. It will automatically
	* be invoked during the render cycle. In the event that you need to
	* get up-to-date metrics, however, you should use this method before
	* accessing object properties to ensure they are updated.
	*
	* @method renderText
	*/

	var height, i, measurements, maxWidth,
		textLine, textLines, textWords, width, word, x;

	this._ctx.font = this._fontWeight + " " + this._fontSize + "px " +
		this._fontFamily;


	// Split text onto multiple lines

	textWords = this.text;

	// Convert linebreak characters to words
	// We do not consider trailing spaces here, because we add one,
	// and the first trailing space will be stripped by line parsing.
	// This preserves any leading space that users might put on a newline,
	// such as for indentation.
	textWords = textWords.replace( / *$\s/gm, " \n " );

	textWords = textWords.split( " " );
	textLines = [];
	maxWidth = 0;
	while ( textWords.length > 0 ) {
		textLine = [];
		while ( this._ctx.measureText( textLine.join( " " ) ).width <=
				this._maxWidth && textWords.length > 0) {
			if ( textWords[ 0 ] === "\n" ) {

				// Allow line breaks
				textWords.shift();
				break;
			}
			textLine.push( textWords.shift() );
		}

		// If the last word overran the limits, remove it
		if ( this._ctx.measureText( textLine.join( " " ) ).width >
				this._maxWidth ) {
			if ( textLine.length > 1 ) {
				textWords.unshift( textLine.pop() );
			} else {

				// If a single word would overflow the entire line, hyphenate it
				textWords.unshift( textLine.pop() );
				word = "";
				while ( this._ctx.measureText( word + "-" ).width <=
						this._maxWidth && textWords[ 0 ].length > 1 ) {
					word += textWords[ 0 ].slice( 0, 1 );
					textWords[ 0 ] = textWords[ 0 ].slice( 1 );
				}
				if ( this._ctx.measureText( word + "-" ).width >
						this._maxWidth && word.length > 1 ) {

					// Put the last letter onto the next line
					textWords[ 0 ] = word.slice( -1 ) + textWords[ 0 ];
					word = word.slice( 0, word.length - 1 );
				}
				word = word + "-";
				textLine.push( word );
			}
		}

		// Finalize current line
		textLines.push( textLine.join( " " ) );

		// Track dimensions
		maxWidth = Math.max(
			maxWidth, this._ctx.measureText( textLine.join( " " ) ).width );

		// Limit number of lines
		if ( textLines.length === this._maxLines ||
				this._fontSize * this.lineHeightNormalized *
				( textLines.length + 1.5 ) > this._maxHeight ) {
			break;
		}
	}
	width = maxWidth;
	height = this._fontSize * this.lineHeightNormalized *
		( textLines.length + 0.5 );

	// Update inherited properties
	this.width = width;
	this.height = height;

	// Set normalized anchor points
	if ( this._anchorNormalX ) {
		this.anchorPointX = this._anchorNormalX * width;
	}
	if ( this._anchorNormalY ) {
		this.anchorPointY = this._anchorNormalY * height;
	}

	// Is the width base2?
	if ( Kiwi.Utils.Common.base2Sizes.indexOf( width ) === -1 ||
			width === 4096 ) {
		i = 0;
		while ( Kiwi.Utils.Common.base2Sizes[ i ] < 2048 &&
				width > Kiwi.Utils.Common.base2Sizes[ i ] ) {
			i++;
		}
		width = Kiwi.Utils.Common.base2Sizes[ i ];
	}

	// Is the height base2?
	if ( Kiwi.Utils.Common.base2Sizes.indexOf( height ) === -1 ||
			height === 4096  ) {
		i = 0;
		while ( Kiwi.Utils.Common.base2Sizes[ i ] < 2048 &&
				height > Kiwi.Utils.Common.base2Sizes[ i ] ) {
			i++;
		}
		height = Kiwi.Utils.Common.base2Sizes[ i ];
	}

	// Apply the width/height
	this._canvas.width = width;
	this._canvas.height = height;

	// Clear the canvas
	this._ctx.clearRect(0, 0, width, height);

	// Reapply the styles, as we've recreated the canvas
	this._ctx.font =
		this._fontWeight + " " + this._fontSize + "px " + this._fontFamily;
	this._ctx.fillStyle = this.color.slice( 0, 7 );
	this._ctx.textBaseline = this._baseline;

	// Draw the text
	for ( i in textLines ) {
		x = 0;
		switch ( this._textAlign ) {
			case Kiwi.Plugins.Text.TEXT_ALIGN_CENTER:
				x = ( this.width -
					this._ctx.measureText( textLines[ i ] ).width ) / 2;
				break;
			case Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT:
				x = ( this.width -
					this._ctx.measureText( textLines[ i ] ).width );
				break;
		}
		this._ctx.fillText(
			textLines[ i ],
			x,
			i * this._fontSize * this.lineHeightNormalized );
	}

	// Update the cell and dirty/undirtyfy
	this.atlas.cells[ 0 ] = {
		x: 0,
		y: 0,
		w: this._canvas.width,
		h: this._canvas.height,
		hitboxes: [ {
			x: this._textAlign === Kiwi.Plugins.Text.TEXT_ALIGN_LEFT ?
				0 :
				this._textAlign === Kiwi.Plugins.Text.TEXT_ALIGN_CENTER ?
					-this.width * 0.5 :
					-this.width,
			y: 0,
			w: this.width,
			h: this.height
		} ]
	};
	this._tempDirty = false;
	this.atlas.dirty = true;
};


Kiwi.Plugins.Text.prototype.render = function ( camera ) {

	/**
	* Called by the Layer to which this Game Object is attached
	*
	* @method render
	* @param camera {Kiwi.Camera} Current camera
	* @public
	*/

	var m;

	if (this.alpha > 0 && this.visible) {

		// Render on stage
		this.game.stage.ctx.save();
		if (this.alpha > 0 && this.alpha <= 1) {
			this.game.stage.ctx.globalAlpha = this.alpha;
		}

		// Re-render text
		if (this._tempDirty) {
			this.renderText();
		}

		// Align the text
		switch (this._textAlign) {
			case Kiwi.Plugins.Text.TEXT_ALIGN_LEFT:
				this._pool.xOffset = 0;
				break;
			case Kiwi.Plugins.Text.TEXT_ALIGN_CENTER:
				this._pool.xOffset = this.width * 0.5;
				break;
			case Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT:
				this._pool.xOffset = this.width;
				break;
		}

		// Draw the Image
		m = this.transform.getConcatenatedMatrix();
		this.game.stage.ctx.transform( m.a, m.b, m.c, m.d, m.tx, m.ty );
		this.game.stage.ctx.drawImage( this._canvas,
			0, 0,
			this._canvas.width, this._canvas.height,
			-this.transform.anchorPointX - this._pool.xOffset,
			-this.transform.anchorPointY,
			this._canvas.width, this._canvas.height) ;
		this.game.stage.ctx.restore();
	}
};



Kiwi.Plugins.Text.prototype.renderGL = function (gl, camera, params) {

	/**
	* Renders the GameObject using WebGL.
	*
	* @method renderGL
	* @param gl {WebGLRenderingContext} Target WebGL rendering context
	* @param camera {Kiwi.Camera} Current camera
	* @param params {Object} Composite parameter object
	* @public
	*/

	// Re-render text
	if ( this._tempDirty ) {
		this.renderText();
	}

	// Transform/Matrix
	var m = this.transform.getConcatenatedMatrix();

	// Align text
	switch (this._textAlign) {
		case Kiwi.Plugins.Text.TEXT_ALIGN_LEFT:
			this._pool.xOffset = 0;
			break;
		case Kiwi.Plugins.Text.TEXT_ALIGN_CENTER:
			this._pool.xOffset = -( this.width * 0.5 );
			break;
		case Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT:
			this._pool.xOffset = -( this.width );
			break;
	}

	// Set the Point Objects.
	this._pool.pt1.setTo(
		this._pool.xOffset - this.transform.anchorPointX,
		0 - this.transform.anchorPointY );
	this._pool.pt2.setTo(
		this._canvas.width + this._pool.xOffset - this.transform.anchorPointX,
		0 - this.transform.anchorPointY );
	this._pool.pt3.setTo(
		this._canvas.width + this._pool.xOffset - this.transform.anchorPointX,
		this._canvas.height - this.transform.anchorPointY );
	this._pool.pt4.setTo(
		this._pool.xOffset - this.transform.anchorPointX,
		this._canvas.height - this.transform.anchorPointY );

	// Apply the matrix to the points
	m.transformPoint( this._pool.pt1 );
	m.transformPoint( this._pool.pt2 );
	m.transformPoint( this._pool.pt3 );
	m.transformPoint( this._pool.pt4 );

	// Add to the batch!
	this.glRenderer.concatBatch( [
		this._pool.pt1.x, this._pool.pt1.y,
		0, 0, this.alpha,
		this._pool.pt2.x, this._pool.pt2.y,
		this._canvas.width, 0, this.alpha,
		this._pool.pt3.x, this._pool.pt3.y,
		this._canvas.width, this._canvas.height, this.alpha,
		this._pool.pt4.x, this._pool.pt4.y,
		0, this._canvas.height, this.alpha
	] );
};


/**
* A static property that contains the string to center align the text.
* @property TEXT_ALIGN_CENTER
* @type string
* @static
* @final
* @public
*/
Kiwi.Plugins.Text.TEXT_ALIGN_CENTER = "center";


/**
* A static property that contains the string to right align the text.
* @property TEXT_ALIGN_RIGHT
* @type string
* @static
* @final
* @public
*/
Kiwi.Plugins.Text.TEXT_ALIGN_RIGHT = "right";


/**
* A static property that contains the string to left align the text.
* @property TEXT_ALIGN_LEFT
* @type string
* @static
* @final
* @public
*/
Kiwi.Plugins.Text.TEXT_ALIGN_LEFT = "left";


/**
* Primitive Gameobjects plugin, providing geometric objects to the designer.
*
* @module Kiwi
* @submodule Plugins
* @namespace Kiwi.Plugins
* @class Primitives
*/
Kiwi.Plugins.Primitives = {

	/**
	* The name of this plugin.
	* @property name
	* @type String
	* @default "Primitives"
	* @public
	*/
	name:"Primitives",

	/**
	* The version of this plugin.
	* @property version
	* @type String
	* @public
	*/
	version:"1.0.4",

	minimumKiwiVersion:"1.3.0"

};

/**
* Registers this plugin with the Global Kiwi Plugins Manager if it is avaiable.
* 
*/
Kiwi.PluginManager.register(Kiwi.Plugins.Primitives);

/**
* This create method is executed when Kiwi Game that has been told to
* use this plugin reaches the boot stage of the game loop.
* @method create
* @param game{Kiwi.Game} The game that is current in the boot stage.
* @private 
*/
Kiwi.Plugins.Primitives.create = function(game) {
	
};



/**
* Polygon Gameobject
* <br><br>
* This is the master system which handles all primitives. When you create
* another primitive (Ellipse, Line, Rectangle, Star or Triangle) you are
* really creating a Polygon with some options pre-set. All primitives
* inherit parameters and methods from Polygon.
* <br><br>
* Polygons are defined with a params object. This must contain the non-optional
* parameter "state", which is a reference to the current state. It also contains
* optional transform and style information.
* <br><br>
* You may specify common transform options in the params of any primitive.
* This includes alpha, visible, x, y, rotation, scale, scaleX, scaleY,
* anchorPointX, and anchorPointY. If not specified, these default to alpha = 1,
* visible = true, x = 0, y = 0, rotation = 0, scale = 1, and the anchorPoint
* defaults to the geometric center of the object.
* <br><br>
* All primitives contain both a fill and a stroke. You may style these
* separately and enable or disable rendering of either. Available style options
* include color (the color with which the primitive is filled; an array of 3
* normalized values, from black [ 0, 0, 0 ] to white [ 1, 1, 1 ] ), drawFill
* (whether to render the fill), strokeColor (as color, but for the stroke),
* drawStroke (whether to render the stroke), and strokeWidth (the width of the
* stroke line, in pixels).
* <br><br>
* If the default primitives do not meet your requirements, you can define your
* own by using the Polygon. You will need to provide the params object with
* arrays of vertices, indices, and strokeIndices.
* <br><br>
* new Kiwi.Plugins.Primitives.Polygon( {<br>
*	state: MyGame.state,<br>
*	indices: [ 0, 1, 2, 3 ],<br>
*	vertices: [[ 0, 0 ], [ 100, 100 ], [ 200, 0 ], [ 300, 100 ] ],<br>
*	strokeIndices: [ 0, 1, 2, 0 ]<br>
* } );
* <br><br>
* All three arrays are processed to create new internal representations.
* Two Polygons created from the same arrays will not contain the same data.
* This prevents unexpected modifications from one object affecting another.
* <br><br>
* The "vertices" param is a list of points, each defined as an array of two
* points. The order of vertices does not matter for rendering, but you must be
* aware of it. A simple vertices array might read [ [ 0, 0 ], [ 100, 100 ],
* [ 200, 0 ], [ 300, 100 ] ]. Each is an XY coordinate.
* <br><br>
* The "indices" param is a list of references to vertices. It is processed
* using a TRIANGLE_STRIP procedure. This means that every three consecutive
* values on the list define a new triangle. You can add new triangles simply
* by appending a single new index. Each index is the array position of a vertex.
* For example, to draw a single triangle you could pass [ 0, 1, 2 ]. To draw two
* triangles, you could pass [ 0, 1, 2, 3 ].
* <br><br>
* The TRIANGLE_STRIP procedure is very succinct, but it doesn't allow for every
* desirable form of geometry. If you need to stop positioning triangles in one
* place and start adding them elsewhere, you can't skip over empty space.
* Fortunately, you can use a concept called "degenerate triangles" to cheat.
* <br><br>
* A degenerate triangle is one with zero area. It is formed when a triangle has
* two or three vertices in the same place. It is very easy to simply not draw a
* degenerate triangle. We can use these to connect disparate triangles. (In
* fact, the renderer uses these behind the scenes to efficiently render numerous
* primitives at once.)
* <br><br>
* To create degenerate triangles, just double up an index on either side of the
* gap. For example, if you want to draw triangles at indices [ 0, 1, 2 ] and
* [ 8, 9, 10 ], you can combine them into one with the indices
* [ 0, 1, 2, 2, 8, 8, 9, 10 ]. This creates the degenerate triangles
* [ 1, 2, 2 ], [ 2, 2, 8 ], [ 2, 8, 8 ] and [ 8, 8, 9 ]. Although this
* introduces some overhead, it is often quicker than rendering them as separate
* objects.
* <br><br>
* You may reduce the degenerate data to a single index if you know what you're
* doing with winding orders. This is left as an exercise for the user.
* <br><br>
* The "strokeIndices" param is used to create a stroke. This is usually a line
* around the edge of a polygon, but it can be any sort of line. It is, like the
* indices param, a list of array positions in the vertices param. Unlike
* indices, strokeIndices does not use TRIANGLE_STRIP. It just connects points in
* order.
* <br><br>
* Technically, the stroke is itself a series of triangles, a sort of
* mini-polygon. It will usually have more triangles than the fill. For this
* reason, you should be careful about overusing stroke.
* <br><br>
* You may also construct polygons by building several objects and combining
* them using the ".combine()" method. This may not be as efficient as
* defining a polygon by hand, and will introduce several degenerate triangles,
* but for large-scale constructions it is very convenient.
*
* @class Polygon
* @constructor
* @namespace Kiwi.Plugins.Primitives
* @extends Kiwi.Entity
* @param params {Object} The parameter object.
* @param params.state {Kiwi.State} Context state
*	@param [params.color=[0.5,0.5,0.5]] {array} RGB normalized color
*	@param [params.drawFill=true] {boolean} Whether to fill the polygon
*	@param [params.drawStroke=true] {boolean} Whether to draw the stroke
*	@param [params.enableInput=false] {Boolean} Whether to enable input
*	@param [params.indices] {array} Array of vertices for triangle strips
*	@param [params.strokeColor=[0.5,0.5,0.5]] {array} RGB normalized color
*	@param [params.strokeWidth=1] {number} Width of stroke in pixels
*	@param [params.strokeIndices] {array} Array of vertices for strokes
*	@param [params.vertices] {array} Array of vertex coordinates
*		array pairs ([ [ x1, y1 ], [x2, y2 ] ] etc).
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.Polygon = function( params ) {

	var state = params.state;

	this._initProperties();

	// Super
	Kiwi.Entity.call( this, state, 0, 0 );

	this.parseParams( params );

	// Create WebGL renderer
	if (this.game.renderOption === Kiwi.RENDERER_WEBGL) {
		this.glRenderer =
			this.game.renderer.requestSharedRenderer( "PrimitiveRenderer" );
		this.atlas = this.glRenderer.getAtlas();
	}

	this.rebuildBounds();
};
Kiwi.extend( Kiwi.Plugins.Primitives.Polygon, Kiwi.Entity );

/**
* Index of pointers to vertices. The sequence of points
* which constructs the poly.
* @property indices
* @type {array}
* @public
* @since 0.3.0
*/
Object.defineProperty( Kiwi.Plugins.Primitives.Polygon.prototype, "indices", {
	get: function() {
		return this._indices;
	},
	set: function( value ) {
		var i;
		this._indices = [];

		if ( value.length > 2 ) {
			for ( i = 0; i < value.length; i++ ) {
				this._indices.push( value[ i ] );
			}
		}
	}
} );

/**
* Index of vertices.
* @property vertices
* @type {array}
* @public
* @since 0.3.0
*/
Object.defineProperty( Kiwi.Plugins.Primitives.Polygon.prototype, "vertices", {
	get: function() {
		return this._vertices;
	},
	set: function( value ) {
		var i;
		this._vertices = [];
		for ( i = 0; i < value.length; i++ ) {
			this._vertices.push( [
				value[ i ][ 0 ],
				value[ i ][ 1 ]
			] );
		}
	}
} );

/**
* Index of pointers to vertices. The sequence of points which
* constructs the stroke. To be distinguished from the strokePolyIndices,
* which define the actual shape of the stroke.
* @property strokeIndices
* @type {array}
* @public
* @since 0.3.0
*/
Object.defineProperty(
		Kiwi.Plugins.Primitives.Polygon.prototype, "strokeIndices", {
	get: function() {
		return this._strokeIndices;
	},
	set: function( value ) {
		var i;
		this._strokeIndices = [];

		if ( value.length > 1 ) {
			for ( i = 0; i < value.length; i++ ) {
				this._strokeIndices.push( value[ i ] );
			}
			this.createstroke( this._strokeIndices, this._vertices );
		}
	}
} );

/**
* Index of pointers to vertices. The sequence of points which
* make up the stroke. To be distinguished from the strokeIndices,
* which define the construction of the stroke.
* @property strokePolyIndices
* @type {array}
* @public
* @since 0.3.0
*/
Object.defineProperty(
		Kiwi.Plugins.Primitives.Polygon.prototype, "strokePolyIndices", {
	get: function() {
		return this._strokePolyIndices;
	},
	set: function( value ) {
		var i;
		this._strokePolyIndices = [];

		if ( value.length > 2 ) {

			// Double up the first index to prevent strip connexion
			if ( value.length === 3 ) {
				this._strokePolyIndices.push( value[ 0 ] );
			}

			for ( i = 0; i < value.length; i++ ) {
				this._strokePolyIndices.push( value[ i ] );
			}
		}
	}
} );

/**
* Index of vertices for stroke shape.
* @property strokePolyVertices
* @type {array}
* @public
* @since 0.3.0
*/
Object.defineProperty(
		Kiwi.Plugins.Primitives.Polygon.prototype, "strokePolyVertices", {
	get: function() {
		return this._strokePolyVertices;
	},
	set: function( value ) {
		var i;
		this._strokePolyVertices = [];
		for ( i = 0; i < value.length; i++ ) {
			this._strokePolyVertices.push( [
				value[ i ][ 0 ],
				value[ i ][ 1 ]
			] );
		}
	}
} );

/**
* Constructs a miter, a building block for strokes.
* Miters sit atop vertices and form the endpoints for two stroke segments.
* @method _buildMiter
* @param line1 {Array} The first line, an array of 2 Points
* @param line2 {Array} The second line, an array of 2 Points;
* the first point on line2 is the actual position of the miter
* @return {object}
* @private
* @since 0.3.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype._buildMiter =
		function( line1, line2) {
	var angle, angleDiffHalf, dx, dy, innerDist, line1Angle, line2Angle,
		line1Length, line2Length, lineMinLength, pointA, pointB,
		indices = [],
		vertices = [],
		pointN = line2[ 0 ];

	// Compute the length of the two lines
	line1Length = line1[0].distanceTo( line1[1] );
	line2Length = line2[0].distanceTo( line2[1] );
	lineMinLength = Math.min( line1Length, line2Length );

	// Compute the angles of the two lines
	line1Angle = Math.atan2(
		line1[ 1 ].y - line1[ 0 ].y,
		line1[ 1 ].x - line1[ 0 ].x );
	line2Angle = Math.atan2(
		line2[ 1 ].y - line2[ 0 ].y,
		line2[ 1 ].x - line2[ 0 ].x );
	line1Angle = Kiwi.Utils.GameMath.normalizeAngle( line1Angle );
	line2Angle = Kiwi.Utils.GameMath.normalizeAngle( line2Angle );

	// Compute the angle between the lines, then halve it for future use
	angleDiffHalf = line2Angle - line1Angle;
	if ( angleDiffHalf > Math.PI ) {
		angleDiffHalf = Math.PI * 2 - angleDiffHalf;
	} else if ( angleDiffHalf < -Math.PI ) {
		angleDiffHalf = -Math.PI * 2 - angleDiffHalf;
	}
	angleDiffHalf *= 0.5;

	// Compute the average angle of the two lines
	if ( Math.abs( line1Angle - line2Angle ) > Math.PI ) {
		if ( line1Angle < line2Angle ) {
			line1Angle += Math.PI * 2;
		} else {
			line2Angle += Math.PI * 2;
		}
	}
	angle = Kiwi.Utils.GameMath.normalizeAngle(
		( line1Angle + line2Angle ) * 0.5 );

	// Cache some trig
	dx = Math.cos( angle );
	dy = -Math.sin( angle );

	// Compute the distance to the inner corner, where two miter points overlap
	innerDist = this.strokeWidth / ( 2 * Math.cos( angleDiffHalf ) );
	if ( innerDist > lineMinLength ) {
		innerDist = lineMinLength;
	}

	// Create sharp miters
	pointA = new Kiwi.Geom.Point(
		dy * innerDist,
		dx * innerDist
	);
	pointB = new Kiwi.Geom.Point(
		dy * -innerDist,
		dx * -innerDist
	);
	pointA.x += pointN.x;
	pointA.y += pointN.y;
	pointB.x += pointN.x;
	pointB.y += pointN.y;

	indices = [ 0, 1, 0, 1 ];
	vertices = [ [ pointA.x, pointA.y ], [ pointB.x, pointB.y ] ];

	return { indices: indices, vertices: vertices };
};

/**
* Construct a stroke by tracing a connection through all vertices.
* @method _buildStroke
* @param srcIndices {array} List of points to connect in order.
* @param srcVertices {array} Definition of points.
* @private
* @since 0.3.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype._buildStroke =
		function( srcIndices, srcVertices ) {
	var dx, dy, end, i, j, miter, point1, point2, point3,
		inds = [],
		offset = 0,
		vertLen = srcIndices.length,
		verts = [];

	if ( vertLen > 1 ) {

		// Begin with a double-up on vertex 0
		point1 = new Kiwi.Geom.Point(
			srcVertices[ srcIndices[ 0 ] ][ 0 ],
			srcVertices[ srcIndices[ 0 ] ][ 1 ]
		);
		point2 = new Kiwi.Geom.Point(
			srcVertices[ srcIndices[ 1 ] ][ 0 ],
			srcVertices[ srcIndices[ 1 ] ][ 1 ]
		);
		miter = this._buildMiter( [ point1, point2 ], [ point1, point2 ] );
		inds = inds.concat( miter.indices );
		verts = verts.concat( miter.vertices );
		offset += miter.vertices.length;

		// Connect all additional vertices
		for ( i = 1; i < vertLen - 1; i++ ) {
			point1 = new Kiwi.Geom.Point(
				srcVertices[ srcIndices[ i - 1 ] ][ 0 ],
				srcVertices[ srcIndices[ i - 1 ] ][ 1 ]
			);
			point2 = new Kiwi.Geom.Point(
				srcVertices[ srcIndices[ i ] ][ 0 ],
				srcVertices[ srcIndices[ i ] ][ 1 ]
			);
			point3 = new Kiwi.Geom.Point(
				srcVertices[ srcIndices[ i + 1 ] ][ 0 ],
				srcVertices[ srcIndices[ i + 1 ] ][ 1 ]
			);
			miter = this._buildMiter( [ point1, point2 ], [ point2, point3 ] );
			for ( j = 0; j < miter.indices.length; j++ ) {
				miter.indices[ j ] += offset;
			}
			inds = inds.concat( miter.indices );
			verts = verts.concat( miter.vertices );
			offset += miter.vertices.length;
		}

		// Finish with a double-up on the last vertex
		// We must first construct an extension of the last line segment
		end = srcIndices.length - 1;
		dx = srcVertices[ srcIndices[ end ] ][ 0 ] -
			srcVertices[ srcIndices[ end - 1 ] ][ 0 ];
		dy = srcVertices[ srcIndices[ end ] ][ 1 ] -
			srcVertices[ srcIndices[ end - 1 ] ][ 1 ];
		point1 = new Kiwi.Geom.Point(
			srcVertices[ srcIndices[ end ] ][ 0 ],
			srcVertices[ srcIndices[ end ] ][ 1 ]
		);
		point2 = new Kiwi.Geom.Point(
			srcVertices[ srcIndices[ end ] ][ 0 ] + dx,
			srcVertices[ srcIndices[ end ] ][ 1 ] + dy
		);
		miter = this._buildMiter( [ point1, point2 ], [ point1, point2 ] );
		for ( j = 0; j < miter.indices.length; j++ ) {
			miter.indices[ j ] += offset;
		}
		inds = inds.concat( miter.indices );
		verts = verts.concat( miter.vertices );

		return { indices: inds, vertices: verts };
	}

	return null;
};

/**
* Creates a copy of this polygon.
* @method clone
* @return {Kiwi.Plugins.Primitives.Polygon}
* @public
* @since 0.3.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.clone = function() {
	var params = {
			color: this.color,
			indices: this._indices,
			state: this.state,
			strokeColor: this.strokeColor,
			strokeIndices: this._strokeIndices,
			vertices: this._vertices,

			x: this.x,
			y: this.y,
			rotation: this.rotation,
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			anchorPointX: this.anchorPointX,
			anchorPointY: this.anchorPointY,
			alpha: this.alpha,
			visible: this.visible
		};

	return (new Kiwi.Plugins.Primitives.Polygon( params ) );
};

/**
* Determines the min and max x and y coordinates from an array.
* @method computeMinMaxXY
* @param array {array} Array of points, defined as arrays [ x, y ]
* @return object
* @public
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.computeMinMaxXY = function( array ) {
	var i, vert,
		vertLen = array.length,
		maxX = 0,
		maxY = 0,
		minX = 0,
		minY = 0;

	for ( i = 0; i < vertLen; i++ ) {
		vert = array[ i ];
		if ( vert[0] < minX ) {
			minX = vert[0];
		}
		if ( vert[0] > maxX ) {
			maxX = vert[0];
		}
		if ( vert[1] < minY ) {
			minY = vert[1];
		}
		if ( vert[1] > maxY ) {
			maxY = vert[1];
		}
	}

	return {
		maxX: maxX,
		maxY: maxY,
		minX: minX,
		minY: minY
	};
};

/**
* Adds another poly to this.
* @method combine
* @param poly {Kiwi.Plugins.Primitives.Polygon} Primitive to combine.
* @param [discard=true] {boolean} Discard the combination source?
* @return {boolean}
* @public
* @since 0.3.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.combine = function( poly, discard ) {
	if ( typeof discard === "undefined" ) {
		discard = true;
	}

	// Do not self-combine
	if ( this.poly === this ) {
		return false;
	}

	var indexOffset,
		inverseMatrix = this.transform.getConcatenatedMatrix().invert(),
		matrix = poly.transform.getConcatenatedMatrix(),
		point = new Kiwi.Geom.Point( 0, 0 ),
		polyIndicesLen = poly.indices.length,
		polyVerticesLen = poly.vertices.length,
		polyStrokeIndicesLen = poly.strokePolyIndices.length,
		polyStrokeVerticesLen = poly.strokePolyVertices.length;


	// Attach fill
	if ( polyIndicesLen > 2 ) {
		indexOffset = this._vertices.length;

		// Create degenerate attachment
		if ( this._indices.length > 0 ) {
			this._indices.push( this._indices[ this._indices.length - 1 ] );
			this._indices.push( poly.indices[ 0 ] + indexOffset );
		}

		// Add vertices and indices
		for ( i = 0; i < polyIndicesLen; i++ ) {
			this._indices.push( poly.indices[ i ] + indexOffset );
		}
		for ( i = 0; i < polyVerticesLen; i++ ) {
			point.setTo(
				poly.vertices[ i ][ 0 ] - poly.anchorPointX,
				poly.vertices[ i ][ 1 ] - poly.anchorPointY
			);

			point = matrix.transformPoint( point );
			point = inverseMatrix.transformPoint( point );

			this._vertices.push( [
				point.x + this.anchorPointX,
				point.y + this.anchorPointY
			] );
		}
	}
	

	// Attach stroke
	if ( polyStrokeIndicesLen > 2 ) {
		indexOffset = this._strokePolyVertices.length;

		// Create degenerate attachment
		if ( this._strokePolyIndices.length > 0 ) {
			this._strokePolyIndices.push(
				this._strokePolyIndices[ this._strokePolyIndices.length - 1 ] );
			this._strokePolyIndices.push(
				poly.strokePolyIndices[ 0 ] + indexOffset );
		}

		// Add vertices and indices
		for ( i = 0; i < polyStrokeIndicesLen; i++ ) {
			this._strokePolyIndices.push(
				poly.strokePolyIndices[ i ] + indexOffset );
		}
		for ( i = 0; i < polyStrokeVerticesLen; i++ ) {
			point.setTo(
				poly.strokePolyVertices[ i ][ 0 ] - poly.anchorPointX,
				poly.strokePolyVertices[ i ][ 1 ] - poly.anchorPointY
			);

			point = matrix.transformPoint( point );
			point = inverseMatrix.transformPoint( point );

			this._strokePolyVertices.push( [
				point.x + this.anchorPointX,
				point.y + this.anchorPointY
			] );
		}
	}

	// Discard source
	if ( discard ) {
		poly.destroy();
	}

	return true;
};

/**
* Reports an error message.
* @method complain
* @param string {string} Text to report
* @public
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.complain = function( string ) {
	Kiwi.Log.log(
		"#primitive",
		"Primitive Error encountered:",
		string
	);
};

/**
* Put a stroke on this Polygon, following the strokeIndices vertex list.
* You should not need to do this manually.
* @method createstroke
* @public
* @return boolean
* @since 0.3.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.createstroke = function() {
	var strokeData = this._buildStroke( this.strokeIndices, this.vertices );

	if ( strokeData ) {
		this.strokePolyIndices = strokeData.indices;
		this.strokePolyVertices = strokeData.vertices;
	}
};

/**
* Initialise internal properties
* @method _initProperties
* @private
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype._initProperties = function() {
	/**
	* Part of the WebGL rendering pipeline
	* @property glRenderer
	* @type Kiwi.Renderers.Renderer
	* @public
	* @since 0.1.0
	*/
	this.glRenderer = undefined;

	// Mirror properties: private data accessed by getters/setters
	this._indices = null;
	this._vertices = null;
	this._strokeIndices = null;
	this._strokePolyIndices = null;
	this._strokePolyVertices = null;

	/**
	* Geometry point used in rendering.
	*
	* @property _p0
	* @type Kiwi.Geom.Point
	* @private
	* @since 1.0.3
	*/
	this._p0 = new Kiwi.Geom.Point( 0, 0 );

	/**
	* Geometry point used in rendering.
	*
	* @property _p1
	* @type Kiwi.Geom.Point
	* @private
	* @since 1.0.3
	*/
	this._p1 = new Kiwi.Geom.Point( 0, 0 );

	/**
	* Geometry point used in rendering.
	*
	* @property _p2
	* @type Kiwi.Geom.Point
	* @private
	* @since 1.0.3
	*/
	this._p2 = new Kiwi.Geom.Point( 0, 0 );

	/**
	* Color Utility. 
	* 
	* @property _color
	* @type Kiwi.Utils.Color
	* @private
	* @since 1.0.4
	*/
	this._color = new Kiwi.Utils.Color();

	/**
	* Stroke color utility. 
	* 
	* @property _strokeColor
	* @type Kiwi.Utils.Color
	* @private
	* @since 1.0.4
	*/
	this._strokeColor = new Kiwi.Utils.Color();
};

/**
* Returns the type of object that this is.
* @method objType
* @return {string}
* @public
*/
Kiwi.Plugins.Primitives.Polygon.prototype.objType = function() {
	return "Primitive Polygon";
};


/**
* RGB color triplet, normalized to the range 0-1
* @property color
* @type {array} 
* @public
*/
Object.defineProperty(Kiwi.Plugins.Primitives.Polygon.prototype, "color", {
	get: function() {
		return [ this._color.rNorm, this._color.gNorm, this._color.bNorm ];
	},
	set: function( val ) {
		this._color.set.apply( this._color, val );
	}
});


/**
* RGB color triplet, normalized to the range 0-1
* @property strokeColor
* @type {array}
* @public
*/
Object.defineProperty(Kiwi.Plugins.Primitives.Polygon.prototype, "strokeColor", {
	get: function() {
		return [ this._strokeColor.rNorm, this._strokeColor.gNorm, this._strokeColor.bNorm ];
	},
	set: function( val ) {
		this._strokeColor.set.apply( this._strokeColor, val );
	}
});


/**
* Sets default parameters on primitive. Note that this will redefine the
* entire primitive. If you call parseParams after creation, you will have to
* take steps to preserve any shape, style, or transform data you wish to keep.
* @method parseParams
* @param params {object} The param objects
* @return boolean
* @public
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.parseParams = function( params ) {

	if( typeof params.color !== "undefined" ) {
		
		if( Kiwi.Utils.Common.isArray( params.color ) ) {
			this.color = params.color;
		} else {
			this._color.set( params.color );
		}

	} else {
		this.color = [ 0.5, 0.5, 0.5 ];
	}

	/**
	* Whether the fill will draw
	* @property drawFill
	* @type {boolean}
	* @public
	*/
	this.drawFill = ( typeof params.drawFill !== "undefined" ) ?
		params.drawFill :
		true;

	/**
	* Whether the stroke will draw
	* @property drawFill
	* @type {boolean}
	* @public
	*/
	this.drawStroke = ( typeof params.drawStroke !== "undefined" ) ?
		params.drawStroke :
		true;

	/**
	* Whether to enable input
	* @property enableInput
	* @type {Boolean}
	* @public
	* @since 1.0.1
	*/
	this.enableInput = params.enableInput === true;

	this.indices = params.indices || [];
	this.vertices = params.vertices || [];

	// These stroke properties must be defined
	// after base vertices and in unique order

	if( typeof params.strokeColor !== "undefined" ) {
		
		if( Kiwi.Utils.Common.isArray( params.strokeColor ) ) {
			this.strokeColor = params.strokeColor;
		} else {
			this._strokeColor.set( params.strokeColor );
		}

	} else {
		this.strokeColor = [ 0, 0, 0 ];
	}

	/**
	* Width of the stroke, in pixels. If the primitive is scaled, the stroke
	* will also change size.
	* @property strokeWidth
	* @type {number}
	* @public
	*/
	this.strokeWidth = typeof params.strokeWidth === "number" ?
		params.strokeWidth : 1;

	this.strokeIndices = params.strokeIndices || [];
	this.strokePolyIndices = this._strokePolyIndices || [];
	this.strokePolyVertices = this._strokePolyVertices || [];

	// Universal entity params
	this.alpha = typeof params.alpha === "number" ?
		params.alpha : 1;
	this.anchorPointX = typeof params.anchorPointX === "number" ?
		params.anchorPointX : undefined;
	this.anchorPointY = typeof params.anchorPointY === "number" ?
		params.anchorPointY : undefined;
	this.rotation = typeof params.rotation === "number" ?
		params.rotation : 0;
	if (
			typeof params.scaleX === "undefined" &&
			typeof params.scaleY === "undefined" ) {
		this.scale = typeof params.scale === "number" ?
			params.scale : 1;
	} else {
		this.scaleX = typeof params.scaleX === "number" ?
			params.scaleX : 1;
		this.scaleY = typeof params.scaleY === "number" ?
			params.scaleY : 1;
	}
	this.visible = typeof params.visible === "boolean" ?
		params.visible : true;
	this.x = typeof params.x === "number" ?
		params.x : 0;
	this.y = typeof params.y === "number" ?
		params.y : 0;

	return this.parseStrict();
};

/**
* Perform a strict compliance check on data. If this fails,
* it's because somebody passed bad data.
* @method parseStrict
* @return boolean
* @public
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.parseStrict = function() {
	var i;

	// Check stroke width
	if ( isNaN( this.strokeWidth ) ) {
		this.complain( "strokeWidth is not a number" );
		return false;
	}

	// Check indices
	if ( Kiwi.Utils.Common.isArray( this.indices ) ) {
		for ( i = 0; i < this.indices.length; i++ ) {
			if ( isNaN( this.indices[ i ] ) ) {
				this.complain( "Index " + i + " is not a number" );
				return false;
			}
			if ( this.indices[ i ] % 1 !== 0 ) {
				this.complain( "Index" + i + " is not an integer" );
				return false;
			}
		}
	} else {
		this.complain( "Could not parse indices: Not an array" );
		return false;
	}

	// Check stroke indices
	if ( Kiwi.Utils.Common.isArray( this.strokeIndices ) ) {
		for ( i = 0; i < this.strokeIndices.length; i++ ) {
			if ( isNaN( this.strokeIndices[ i ] ) ) {
				this.complain( "Stroke Index " + i + " is not a number" );
				return false;
			}
			if ( this.strokeIndices[ i ] % 1 !== 0 ) {
				this.complain( "Stroke Index" + i + " is not an integer" );
				return false;
			}
		}
	} else {
		this.complain( "Could not parse strokeIndices: Not an array" );
		return false;
	}

	// Check vertices
	if ( Kiwi.Utils.Common.isArray( this.vertices ) ) {
		for ( i = 0; i < this.vertices.length; i++ ) {
			if ( Kiwi.Utils.Common.isArray( this.vertices[ i ] ) ) {
				if ( isNaN( this.vertices[ i ][ 0 ] ) ) {
					this.complain( "Vertex " + i + ".x is not a number" );
					return false;
				}
				if ( isNaN( this.vertices[ i ][ 1 ] ) ) {
					this.complain( "Vertex " + i + ".y is not a number" );
					return false;
				}
			} else {
				this.complain( "Vertex " + i + " is not an array" );
				return false;
			}
		}
	} else {
		this.complain( "Could not parse indices: Not an array" );
		return false;
	}

	// We can't find anything wrong with it
	return true;
};

/**
* Compute width, height, box, anchor points etc
* @method rebuildBounds
* @public
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.rebuildBounds = function() {

	// Compute width, height, and anchor points
	var bounds = this.computeMinMaxXY( this._vertices );
	this.width = bounds.maxX - bounds.minX;
	this.height = bounds.maxY - bounds.minY;
	if ( typeof this.anchorPointX === "undefined" ) {
		this.anchorPointX = bounds.maxX - 0.5 * this.width;
	}
	if ( typeof this.anchorPointY === "undefined" ) {
		this.anchorPointY = bounds.maxY - 0.5 * this.height;
	}

	// Compute box
	this.box = this.components.add( new Kiwi.Components.Box(
		this, this.x + bounds.minX, this.x + bounds.minY,
		this.width, this.height ) );
	this.box.hitbox = new Kiwi.Geom.Rectangle( 
		bounds.minX, 
		bounds.minY, 
		this.width, 
		this.height );

	// Create input
	this.input = this.components.add( new Kiwi.Components.Input(
		this, this.box, this.enableInput ) );

	// Set dummy cell data for use in hitboxes
	if ( this.atlas ) {
		this.atlas.cells[0].hitboxes[0] = {
			x: 0,
			y: 0,
			w: this.width,
			h: this.height
		};
	}
};

/**
* Software rendering method
* @method render
* @param {Kiwi.Camera} camera
* @public
*/
Kiwi.Plugins.Primitives.Polygon.prototype.render = function( camera ) {

	var ctx, i, pTemp,
		indicesLen = this._indices.length;

	Kiwi.Entity.prototype.render.call( this, camera );
	if ( this.alpha > 0 ) {
		ctx = this.game.stage.ctx;
		ctx.save();

		if ( this.alpha <= 1 ) {
			ctx.globalAlpha = this.alpha;
		}

		var t = this.transform;
		var m = t.getConcatenatedMatrix();
		ctx.transform( m.a, m.b, m.c, m.d, m.tx, m.ty );


		// Draw fill
		if ( this.drawFill && this._indices.length > 2 ) {
			ctx.fillStyle =
				"rgb(" +
				this._color.r255 + "," +
				this._color.g255 + "," +
				this._color.b255 + ")";

			this._p1.setTo(
				this._vertices[ this._indices[ 1 ] ][ 0 ] - t.anchorPointX,
				this._vertices[ this._indices[ 1 ] ][ 1 ] - t.anchorPointY
			);
			this._p2.setTo(
				this._vertices[ this._indices[ 0 ] ][ 0 ] - t.anchorPointX,
				this._vertices[ this._indices[ 0 ] ][ 1 ] - t.anchorPointY
			);

			ctx.beginPath();

			for ( i = 2; i < indicesLen; i++ ) {

				// Overwrite start point
				this._p0.setTo(
					this._vertices[ this._indices[ i ] ][ 0 ] - t.anchorPointX,
					this._vertices[ this._indices[ i ] ][ 1 ] - t.anchorPointY
				);

				// Draw
				ctx.moveTo( this._p0.x, this._p0.y );
				ctx.lineTo( this._p1.x, this._p1.y );
				ctx.lineTo( this._p2.x, this._p2.y );

				// Cycle points
				pTemp = this._p2;
				this._p2 = this._p1;
				this._p1 = this._p0;
				this._p0 = pTemp;
			}

			ctx.closePath();
			ctx.fill();
		}


		// Draw stroke
		if ( this.drawStroke && this._strokePolyIndices.length > 2 ) {
			indicesLen = this._strokePolyIndices.length;

			ctx.fillStyle =
				"rgb(" +
				this._strokeColor.r255 + "," +
				this._strokeColor.g255 + "," +
				this._strokeColor.b255 + ")";

			this._p1.setTo(
				this._strokePolyVertices[
					this._strokePolyIndices[ 1 ] ][ 0 ] - t.anchorPointX,
				this._strokePolyVertices[
					this._strokePolyIndices[ 1 ] ][ 1 ] - t.anchorPointY
			);
			this._p2.setTo(
				this._strokePolyVertices[
					this._strokePolyIndices[ 0 ] ][ 0 ] - t.anchorPointX,
				this._strokePolyVertices[
					this._strokePolyIndices[ 0 ] ][ 1 ] - t.anchorPointY
			);

			ctx.beginPath();

			for ( i = 2; i < indicesLen; i++ ) {

				// Overwrite start point
				this._p0.setTo(
					this._strokePolyVertices[
						this._strokePolyIndices[ i ] ][ 0 ] - t.anchorPointX,
					this._strokePolyVertices[
						this._strokePolyIndices[ i ] ][ 1 ] - t.anchorPointY
				);

				// Draw
				ctx.moveTo( this._p0.x, this._p0.y );
				ctx.lineTo( this._p1.x, this._p1.y );
				ctx.lineTo( this._p2.x, this._p2.y );

				// Cycle points
				pTemp = this._p2;
				this._p2 = this._p1;
				this._p1 = this._p0;
				this._p0 = pTemp;
			}

			ctx.closePath();
			ctx.fill();
		}


		// Clean up context
		ctx.restore();
	}
};



/**
* Hardware rendering method using WebGL
* @method renderGL
* @param gl {WebGLRenderingContext}
* @param camera {Kiwi.Camera}
* @param params {object}
*/
Kiwi.Plugins.Primitives.Polygon.prototype.renderGL =
		function( gl ) {
	if ( this.alpha > 0 ) {
		if ( this.drawFill ) {
			this.glRenderer.addToBatch( gl, this,
				this._indices, this._vertices, this.color
			);
		}
		if ( this.drawStroke ) {
			this.glRenderer.addToBatch( gl, this,
				this._strokePolyIndices, this._strokePolyVertices,
				this.strokeColor
			);
		}
	}
};

/**
* Decompose a polygon into its constituent triangles.
* This will destroy the original polygon and substitute a group
* containing the triangles.
* @method shatter
* @return {Kiwi.Group}
* @public
* @since 0.3.0
*/
Kiwi.Plugins.Primitives.Polygon.prototype.shatter = function() {
	var dVert12, dVert13, dVert23, i, params, tri, vert1, vert2, vert3,
		indices = [ 0, 1, 2 ],
		group = new Kiwi.Group( this.state );

	for ( i = 0; i < this._indices.length - 2; i++ ) {

		vert1 = this._vertices[ this._indices[ i ] ];
		vert2 = this._vertices[ this._indices[ i + 1 ] ];
		vert3 = this._vertices[ this._indices[ i + 2 ] ];

		dVert12 = Math.sqrt(
			Math.pow( vert1[ 0 ] - vert2[ 0 ], 2 ) +
			Math.pow( vert1[ 1 ] - vert2[ 1 ], 2 )
		);
		dVert13 = Math.sqrt(
			Math.pow( vert1[ 0 ] - vert3[ 0 ], 2 ) +
			Math.pow( vert1[ 1 ] - vert3[ 1 ], 2 )
		);
		dVert23 = Math.sqrt(
			Math.pow( vert2[ 0 ] - vert3[ 0 ], 2 ) +
			Math.pow( vert2[ 1 ] - vert3[ 1 ], 2 )
		);

		// Avoid degenerate triangles
		if ( dVert12 !== 0 && dVert13 !== 0 && dVert23 !== 0 ) {
			params = {
				indices: indices,
				vertices: [ vert1, vert2, vert3 ],
				state: this.state,
				color: this.color,
				x: this.x,
				y: this.y,
				rotation: this.rotation,
				scaleX: this.scaleX,
				scaleY: this.scaleY,
				anchorPointX: this.anchorPointX,
				anchorPointY: this.anchorPointY
			};
			tri = (new Kiwi.Plugins.Primitives.Polygon( params ) ).clone();
			group.addChild( tri );
		}
	}

	// Eliminate original
	if ( this.parent ) {
		this.parent.addChildBefore( group, this );
	}
	this.destroy();

	return group;
};


/**
* Automatically called once per update loop.
* Handles input. If you override this, make sure to call the prototype:
* <code>Kiwi.Plugins.prototype.update.calL( this );</code>
* @method update
* @public
* @since 1.0.1
*/
Kiwi.Plugins.Primitives.Polygon.prototype.update = function() {
	Kiwi.Entity.prototype.update.call( this );

	this.input.update();
};



/**
* Ellipse Primitive
* <br><br>
* Create a ellipse primitive. Define a params object including a reference
* to the current state. You may also add style parameters from the Polygon.
* <br><br>
* You may draw regular polygons by reducing the segments. For example,
* to draw a hexagon:
* <br><br>
* new Kiwi.Plugins.Primitives.Ellipse( {<br>
*	drawStroke: false,<br>
*	radius: 32,<br>
*	state: MyGame.state,<br>
*	segments: 6<br>
* } );
* @class Ellipse
* @constructor
* @extends Kiwi.Plugins.Primitives.Polygon
* @namespace Kiwi.Plugins.Primitives
* @param params {object} Parameter object
* @param params.state {Kiwi.State} Current state
* @param [params.centerOnTransform=false] {boolean} If true, ellipse is centered
*	on transform; if false, ellipse has top left corner on transform
* @param [params.height=8] {number} Height of the ellipse
* @param [params.radius] {number} Radius of a circle; overide width and height
* @param [params.radiusPointer=false] {boolean} Whether to draw the radius,
*	useful for debugging rotation on circles.
* @param [params.segments=32] {number} Number of radial segments; detail.
* @param [params.width=8] {number} Width of the ellipse
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Ellipse = function( params ) {
	var angle, i,
		defaultDimension = 8,
		offsetX = 0,
		offsetY = 0;

	// Create elliptical geometry data
	if ( typeof params.segments === "undefined" ) {
		params.segments = 32;
	}
	if ( typeof params.radius !== "undefined" ) {
		params.width = params.radius * 2;
		params.height = params.radius * 2;
	}
	if ( typeof params.width !== "number" ) {
		params.width = defaultDimension;
	}
	if ( typeof params.height !== "number" ) {
		params.height = defaultDimension;
	}
	if ( !params.centerOnTransform ) {
		offsetX = params.width * 0.5;
		offsetY = params.height * 0.5;
	}
	params.indices = [];
	params.vertices = [];
	params.strokeIndices = [];
	for ( i = 0; i < params.segments; i++ ) {

		// Define indices, looping from the middle
		params.indices.push( i );
		params.indices.push( params.segments );
		params.indices.push( ( i + 1 ) % params.segments );

		// Define vertices
		angle = Math.PI * 2 * i / params.segments;
		params.vertices.push( [
			params.width * 0.5 * Math.cos( angle ) + offsetX,
			params.height * 0.5 * Math.sin( angle ) + offsetY
		] );

		// Define stroke
		params.strokeIndices.push( i );
	}

	// Define central vertex
	params.vertices.push( [ offsetX, offsetY ] );

	// Complete stroke
	params.strokeIndices.push( 0 );

	// Add radius pointer
	if ( params.radiusPointer ) {
		params.strokeIndices.push( params.segments );
	}

	Kiwi.Plugins.Primitives.Polygon.call( this, params );
};
Kiwi.extend( Kiwi.Plugins.Primitives.Ellipse,
	Kiwi.Plugins.Primitives.Polygon );


/**
* Line Primitive
* <br><br>
* Create a line primitive. Define a params object including a reference
* to the current state. You may also add style parameters from the Polygon.
* For example:
* <br><br>
* new Kiwi.Plugins.Primitives.Line( {<br>
*	points: [ [ 0, 0 ], [ 100, 100 ], [ 200, 0 ] ],<br>
*	state: MyGame.state,<br>
*	strokeColor: [ 1, 0.1, 1 ],<br>
*	strokeWidth: 4<br>
* } );
* @class Line
* @constructor
* @extends Kiwi.Plugins.Primitives.Polygon
* @namespace Kiwi.Plugins.Primitives
* @param params {object} Parameter object
* @param params.state {Kiwi.State} Current state
* @param [params.points] {array} Array of x,y points to connect with lines
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Line = function( params ) {
	var i;

	params.vertices = [];
	params.strokeIndices = [];
	params.drawFill = false;
	params.drawStroke = true;
	if ( params.points ) {
		for ( i = 0; i < params.points.length; i++ ) {
			params.vertices.push( params.points[ i ] );
			params.strokeIndices.push( i );
		}
	}

	Kiwi.Plugins.Primitives.Polygon.call( this, params );
};
Kiwi.extend( Kiwi.Plugins.Primitives.Line,
	Kiwi.Plugins.Primitives.Polygon );



/**
* Null Texture Atlas interfaces with KiwiJS rendering system
* which expects a texture atlas, and provides it with an atlas
* that has no texture.
*
* @class NullAtlas
* @constructor
* @namespace Kiwi.Plugins.Primitives
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.NullAtlas = function() {
	this.cells = [ { hitboxes: [] } ];
};

/** Dummy texture enable method, doing the bare minimum to satisfy the
* texture manager requirements. Parameters don't matter.
* @method enableGL
* @public
* @since 0.1.0
*/
Kiwi.Plugins.Primitives.NullAtlas.prototype.enableGL = function() {};



/**
* Rectangle Primitive
* <br><br>
* Create a rectangular primitive. Define a params object including a reference
* to the current state. You may also add style parameters from the Polygon.
* For example:
* <br><br>
* new Kiwi.Plugins.Primitives.Rectangle( {<br>
*	state: MyGame.state,<br>
*	color: [ 0.9, 0.3, 0.7 ],<br>
*	strokeWidth: 4,<br>
*	width: 32,<br>
*	height: 16<br>
* } );
* @class Rectangle
* @constructor
* @extends Kiwi.Plugins.Primitives.Polygon
* @namespace Kiwi.Plugins.Primitives
* @param params {object} Parameter object
* @param params.state {Kiwi.State} Current state
* @param [params.centerOnTransform=true] {boolean} If true, rectangle is centered
*	on transform; if false, rectangle has top left corner on transform
* @param [params.height=8] {number} Height of the rectangle
* @param [params.width=8] {number} Width of the rectangle
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Rectangle = function( params ) {
	var defaultDimension = 8;

	// Create rectangle geometry data
	params.indices = [ 0, 1, 2, 3 ];
	params.strokeIndices = [ 0, 1, 3, 2, 0 ];
	if ( typeof params.width === "undefined" ) {
		params.width = defaultDimension;
	}
	if ( typeof params.height === "undefined" ) {
		params.height = defaultDimension;
	}

	// Position rectangle relative to transform
	if ( params.centerOnTransform ) {
		params.vertices = [
			[ -params.width * 0.5, -params.height * 0.5 ],
			[ params.width * 0.5, -params.height * 0.5 ],
			[ -params.width * 0.5, params.height * 0.5 ],
			[ params.width * 0.5, params.height * 0.5 ]
		];
	} else {
		params.vertices = [
			[ 0, 0 ],
			[ params.width, 0 ],
			[ 0, params.height ],
			[ params.width, params.height ]
		];
	}

	Kiwi.Plugins.Primitives.Polygon.call ( this, params );
};
Kiwi.extend( Kiwi.Plugins.Primitives.Rectangle,
	Kiwi.Plugins.Primitives.Polygon );




/**
* Primitive Renderer
* <br><br>
* This renders primitives using triangle strips.
* @class PrimitiveRenderer
* @constructor
* @namespace Kiwi.Renderers
* @param gl {WebGLRenderingContext} The WebGL rendering context in use.
* @param shaderManager {Kiwi.Renderers.ShaderManager} The Kiwi shader manager.
* @since 0.1.0
*/
Kiwi.Renderers.PrimitiveRenderer = function( gl, shaderManager ) {
	this.bufferItemSize = 6;
	this.indices = [];
	this.nullAtlas = new Kiwi.Plugins.Primitives.NullAtlas();
	this._tempPoint = new Kiwi.Geom.Point( 0, 0 );
	this._maxItems = 1000;
	this._vertexBuffer =
		new Kiwi.Renderers.GLArrayBuffer( gl, this.bufferItemSize );
	this._indexBuffer = new Kiwi.Renderers.GLElementArrayBuffer( gl, 1, [] );

	// Perform super functionality
	Kiwi.Renderers.Renderer.call( this, gl, shaderManager, true );

	this.setShaderPair( "PrimitiveShader" );
};
Kiwi.extend( Kiwi.Renderers.PrimitiveRenderer, Kiwi.Renderers.Renderer );

/**
* Returns a null atlas so that all primitives share a texture object.
* @method getAtlas
* @return Kiwi.Plugins.Primitives.NullAtlas
* @public
* @since 0.3.0
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.getAtlas = function() {
	return this.nullAtlas;
};

/**
* Enables the renderer for drawing
* @method enable
* @param gl {WebGLRenderingContext}
* @param [params=null] {object}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.enable = function( gl, params ) {
	// Boilerplate extension
	Kiwi.Renderers.Renderer.
		prototype.enable.call( this, gl, params );

	this.shaderPair = this.shaderManager.requestShader(gl,
		this._shaderPairName, true);

	gl.uniform2fv( this.shaderPair.uniforms.uResolution.location,
		params.stageResolution );
	gl.uniformMatrix3fv( this.shaderPair.uniforms.uCamMatrix.location,
		false, params.camMatrix );
};

/**
* Disables the renderer
* @method disable
* @param gl {WebGLRenderingContext}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.disable = function( gl ) {
	gl.disableVertexAttribArray( this.shaderPair.attributes.aXY );
	gl.disableVertexAttribArray( this.shaderPair.attributes.aRGBA );
};

/**
* Clears the vertex buffer
* @method clear
* @param gl {WebGLRenderingContext}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.clear = function( gl, params ) {
	this._vertexBuffer.clear();
	gl.uniformMatrix3fv( this.shaderPair.uniforms.uCamMatrix.location,
		false, params.camMatrix );
};

/**
* Updates the stage resolution uniforms
* @method updateStageResolution
* @param gl {WebGLRenderingContext}
* @param res {Float32Array}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.updateStageResolution =
		function( gl, res ) {
	gl.uniform2fv(this.shaderPair.uniforms.uResolution.location, res);
};

/**
* Sets shader pair by name
* @method setShaderPair
* @param shaderPair {String}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.setShaderPair =
		function( shaderPair ) {
	if ( typeof shaderPair === "string" ) {
		this._shaderPairName = shaderPair;
	}
};

/**
* Collates all xy and uv coordinates into a buffer
* ready for upload to video memory
* @method _collateVertexAttributeArrays
* @param gl {WebGLRenderingContext}
* @param entity {Kiwi.Entity}
* @param camera {Camera}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.addToBatch =
		function( gl, entity, indices, vertices, color ) {

	var i,
		indexLen = indices.length,
		indexOffset = this._vertexBuffer.items.length / this.bufferItemSize,
		vertLen = vertices.length;

	var t = entity.transform;
	var m = t.getConcatenatedMatrix();

	for ( i = 0; i < vertLen; i++ ) {
		this._tempPoint.setTo(
			vertices[ i ][ 0 ] - t.anchorPointX,
			vertices[ i ][ 1 ] - t.anchorPointY );

		this._tempPoint = m.transformPoint( this._tempPoint );

		this._vertexBuffer.items.push(
			this._tempPoint.x, this._tempPoint.y,
			color[ 0 ], color[ 1 ], color[ 2 ],
			entity.alpha
		);
	}

	// Append indices

	// Because we cannot guarantee winding order, we must always assume
	// that we will require two connectors, except for the first triangle.
	if ( this.indices.length > 0 ) {
		this.indices.push( this.indices[ this.indices.length - 1 ] );
		this.indices.push( indices[ 0 ] + indexOffset );
	}

	for ( i = 0; i < indexLen; i++ ) {
		this.indices.push( indices[ i ] + indexOffset );
	}
};

/**
* Makes a draw call. This is where things actually
* get rendered to the draw buffer (or a framebuffer).
* @method draw
* @param gl {WebGLRenderingContext}
* @public
*/
Kiwi.Renderers.PrimitiveRenderer.prototype.draw = function( gl ) {
	var byteHead = 0,
		bytesPerF32 = 4,
		bytes = this.bufferItemSize * bytesPerF32;

	this._vertexBuffer.uploadBuffer( gl, this._vertexBuffer.items );

	gl.enableVertexAttribArray( this.shaderPair.attributes.aXY );
	gl.vertexAttribPointer( this.shaderPair.attributes.aXY,
		bytesPerF32, gl.FLOAT, false, bytes, byteHead );
	byteHead += 2 * bytesPerF32;

	gl.enableVertexAttribArray( this.shaderPair.attributes.aRGBA );
	gl.vertexAttribPointer( this.shaderPair.attributes.aRGBA,
		bytesPerF32, gl.FLOAT, false, bytes, byteHead );
	// byteHead += 4 * bytesPerF32;

	// Generate vertex index strip
	this._indexBuffer.indices = this.indices;
	this._indexBuffer.refresh( gl );

	// Render
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer.buffer );
	gl.drawElements( gl.TRIANGLE_STRIP,
		this._indexBuffer.numItems,
		gl.UNSIGNED_SHORT, 0 );

	// Clear index buffer
	this.indices = [];
};



/**
* Primitive Shader Pair
* @class PrimitiveShader
* @constructor
* @namespace Kiwi.Shaders
* @since 0.1.0
*/
Kiwi.Shaders.PrimitiveShader = function() {

	// Super call
	Kiwi.Shaders.ShaderPair.call( this );

	// Extended functionality
	this.attributes = {
		aXY: null,
		aRGBA: null
	};

	// Configure uniforms
	this.uniforms = {
		uCamMatrix: {
			type: "mat3",
		},
		uResolution: {
			type: "2fv",
		}
	};

	// Declare shaders
	this.vertSource = [
		"attribute vec2 aXY;",
		"attribute vec4 aRGBA;",
		"uniform mat3 uCamMatrix;",
		"uniform vec2 uResolution;",
		"varying vec4 vRGBA;",
		"void main(void) {",
		"	vec2 pos = ( uCamMatrix * vec3( aXY, 1 ) ).xy; ",
		"	gl_Position = vec4( ( pos / uResolution * 2.0 - 1.0 ) *",
		"		vec2(1 , -1 ), 0, 1 );",
		"	vRGBA = aRGBA;",
		"}"
	];

	this.fragSource = [
		"precision mediump float;",
		"varying vec4 vRGBA;",
		"void main(void) {",
		"  gl_FragColor = vRGBA;",
		"}"
	];
};
Kiwi.extend( Kiwi.Shaders.PrimitiveShader, Kiwi.Shaders.ShaderPair );

Kiwi.Shaders.PrimitiveShader.prototype.init = function( gl ) {
	Kiwi.Shaders.ShaderPair.prototype.init.call( this, gl );

	this.attributes.aXY = gl.getAttribLocation(this.shaderProgram, "aXY");
	this.attributes.aRGBA = gl.getAttribLocation(this.shaderProgram, "aRGBA");

	this.initUniforms(gl);
};


/**
* Star Primitive
* <br><br>
* Create a star primitive. Define a params object including a reference
* to the current state. You may also add style parameters from the Polygon.
* <br><br>
* You may draw semi-random stars. For example, to draw a cartoon impact flare:
* <br><br>
* new Kiwi.Plugins.Primitives.Star( {<br>
*	centerOnTransform: true,<br>
*	color: [ 1, 0.01, 1 ],<br>
*	drawStroke: false,<br>
*	radius: 32,<br>
*	spikeRandom: 1,<br>
*	state: MyGame.state,<br>
*	segments: 16<br>
* } );
* @class Star
* @constructor
* @extends Kiwi.Plugins.Primitives.Polygon
* @namespace Kiwi.Plugins.Primitives
* @param params {object} Parameter object
* @param params.state {Kiwi.State} Current state
* @param [params.centerOnTransform=false] {boolean} If true, star is centered
*	on transform; if false star has top left corner on transform
* @param [params.height=8] {number} Height of the star
* @param [params.spikeLength=1] {number} Length of spikes relative to radius
* @param [params.spikeRandom=0] {number} Randomness of star spikes, where 0 is
*	no randomness and 1 will make some spikes up to twice as long;
*	there is no cap.
* @param [params.radius] {number} Radius of a star; overide width and height
* @param [params.segments=32] {number} Number of points
* @param [params.width=8] {number} Width of the star
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Star = function( params ) {
	var angle, i, spikiness,
		defaultDimension = 8,
		offsetX = 0,
		offsetY = 0;

	// Create stellar geometry data
	if ( typeof params.segments === "undefined" ) {
		params.segments = 32;
	}
	if ( typeof params.radius !== "undefined" ) {
		params.width = params.radius * 2;
		params.height = params.radius * 2;
	}
	if ( typeof params.width !== "number" ) {
		params.width = defaultDimension;
	}
	if ( typeof params.height !== "number" ) {
		params.height = defaultDimension;
	}
	if ( !params.centerOnTransform ) {
		offsetX = params.width * 0.5;
		offsetY = params.height * 0.5;
	}
	if( typeof params.spikeLength !== "number" ) {
		params.spikeLength = 1;
	}
	if( typeof params.spikeRandom !== "number" ) {
		params.spikeRandom = 0;
	}


	params.indices = [];
	params.vertices = [];
	params.strokeIndices = [];

	for ( i = 0; i < params.segments; i++ ) {

		// Define indices, looping from the middle
		params.indices.push( i );
		params.indices.push( params.segments );
		params.indices.push( ( i + 1 ) % params.segments );

		// Define vertices
		angle = Math.PI * 2 * i / params.segments;
		params.vertices.push( [
			params.width * 0.5 * Math.cos( angle ) + offsetX,
			params.height * 0.5 * Math.sin( angle ) + offsetY
		] );

		// Define stroke
		params.strokeIndices.push( i, i + 1 + params.segments );
	}

	// Define central vertex
	params.vertices.push( [ offsetX, offsetY ] );

	// Define stellar spikes
	for ( i = 0; i < params.segments; i++ ) {
		params.indices.push( i );
		params.indices.push( params.segments + i + 1 );
		params.indices.push( ( i + 1) % params.segments );

		// Define vertices
		angle = Math.PI * 2 * ( i + 0.5 ) / params.segments;
		spikiness = ( 1 + Math.random() * params.spikeRandom ) *
			( params.spikeLength + 1 ) * 0.5;
		params.vertices.push( [
			params.width * Math.cos( angle ) * spikiness + offsetX,
			params.height * Math.sin( angle ) * spikiness + offsetY
		] );
	}

	// Complete stroke
	params.strokeIndices.push( 0 );


	Kiwi.Plugins.Primitives.Polygon.call( this, params );


	// Reset anchor point to middle of core circle.
	// This compensates for random spike lengths.
	this.anchorPointX = params.anchorPointX || offsetX;
	this.anchorPointY = params.anchorPointY || offsetY;
};
Kiwi.extend( Kiwi.Plugins.Primitives.Star,
	Kiwi.Plugins.Primitives.Polygon );



/**
* Triangle Primitive
* <br><br>
* Create a triangle primitive. Define a params object including a reference
* to the current state. You may also add style parameters from the Polygon.
* For example:
* <br><br>
* new Kiwi.Plugins.Primitives.Triangle( {<br>
*	points: [ [ 0, 0 ], [ 100, 100 ], [ 200, 0 ] ],<br>
*	state: MyGame.state,<br>
*	x: 10,<br>
*	y: 10,<br>
*	scale: 2<br>
* } );
* <br><br>
* If you do not specify points in the param object, the Triangle will default to
* [ [ 0, 0 ], [ 0, 8 ], [ 8, 0 ] ]
* @class Triangle
* @constructor
* @extends Kiwi.Plugins.Primitives.Polygon
* @namespace Kiwi.Plugins.Primitives
* @param params {object} Parameter object
* @param params.state {Kiwi.State} Current state
* @param [params.points] {array} Array of x,y pairs to form triangle's corners.
* @since 0.4.0
*/
Kiwi.Plugins.Primitives.Triangle = function( params ) {
	var i,
		defaultDimension = 8;

	params.indices = [ 0, 1, 2 ];
	params.strokeIndices = [ 0, 1, 2, 0 ];
	params.vertices = [];
	
	// Create triangle geometry data
	if ( params.points ) {
		for ( i = 0; i < 3; i++ ) {
			if ( params.points[ i ] ) {
				params.vertices.push( params.points[ i ] );
			} else {
				params.vertices.push( [ 0, 0 ] );
			}
		}
	} else {
		params.vertices.push(
			[ 0, 0 ],
			[ 0, defaultDimension ],
			[ defaultDimension, 0 ]
		);
	}
	
	Kiwi.Plugins.Primitives.Polygon.call( this, params );
};
Kiwi.extend( Kiwi.Plugins.Primitives.Triangle,
	Kiwi.Plugins.Primitives.Polygon );


/**
 *
 * @author BenjaminDRichards / https://github.com/BenjaminDRichards
 * @author David ten Have
 *
 * Creates connector that allows for the arbitary connection of scene elements
 *
 * Connector.js library license:
 *
 * Copyright (C)2016 David ten Have
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

THREE.Connector = function() {

	/**
	* The Connector is a spatial alignment tool. It can be used to align a "master" `Object3D` such that both Connectors have the same position and orientation.
	*
	* Use `connectTo` in order to align the current master to another Connector. You may mirror or rotate the alignment at this time.
	*
	* By default, the Connector is its own master. You may set the `master` property to an `Object3D` to change this behaviour, or to `null` to restore default behaviour. Note that the Connector should be a child or sub-child of such an external master, so that their spatial relationship does not change upon alignment.
	*
	* Connector has a property called `normalVector`. This is linked to the object's rotation information. Consult this vector to see what direction the Connector is pointing, or set it using a `THREE.Vector3` to set the Connector's orientation by vector.
	*
	* Important note: Connector has an `up` axis inherited from `THREE.Object3D`. In the circumstance that the `normalVector` is parallel to (equals) the up axis, it is mathematically impossible to correctly mirror the connection. The `mirror` flag in `connectTo` will fail to take effect and a warning will be printed to the console.
	*
	* @class Connector
	* @constructor
	*/

	THREE.Object3D.call( this );

	this.type = "Connector";

	/**
	* Internal record of master
	*
	* @property _master
	* @type THREE.Object3D
	* @default null
	* @private
	*/
	this._master = null;
};


THREE.Connector.prototype = Object.create( THREE.Object3D.prototype );
THREE.Connector.prototype.constructor = THREE.Connector;


Object.defineProperties(
	THREE.Connector.prototype,
	{
		master: {

			/**
			* Current master of this Connector
			*
			* @property master
			* @type THREE.Object3D
			* @default null
			*/

			get: function() {
				if ( this._master == null ) {
					return this;
				} else {
					return this._master;
				}
			},
			set: function( value ) {
				if ( value instanceof THREE.Object3D ) {
					this._master = value;

					// TODO - perhaps check whether scene hierarchy
					// would advise this relationship.
					// If master is a child of the Connector,
					// things might get screwy.
					// If Connector is not a child of the master,
					// a warning may be appropriate.
				} else if ( value == null ) {
					this._master = null;
				} else {
					console.error(
						"Master must be instance of THREE.Object3D" );
				}
			}
		},
		normalVector: {

			/**
			* Vector describing the orientation of this Connector.
			* Should not be parallel to the `up` vector.
			*
			* @property normalVector
			* @type THREE.Vector3
			*/

			get: function() {
				return this.up.clone().applyEuler( this.rotation );
			},
			set: function( value ) {
				if ( value instanceof THREE.Vector3 ) {
					this.quaternion.setFromAxisAngle(
						axis.clone().normalize(), 0 );
				} else {
					console.error( "Axis must be instance of THREE.Vector3" );
				}
			}
		}
	} );


// Axial offset used to enable mirroring when axes are aligned
THREE.Connector.prototype.offsetQuaternionAxes = new THREE.Quaternion();
THREE.Connector.prototype.offsetQuaternionAxes.set(
	Math.SQRT1_2, 0, 0, Math.SQRT1_2 );
THREE.Connector.prototype.offsetQuaternionAxesInverse = new THREE.Quaternion();
THREE.Connector.prototype.offsetQuaternionAxesInverse.copy(
	THREE.Connector.prototype.offsetQuaternionAxes );
THREE.Connector.prototype.offsetQuaternionAxesInverse.inverse();


THREE.Connector.prototype.connectTo = function( connector, mirror, rotation ) {

	/**
	* Align the master to the specified Connector.
	*
	* @method connectTo
	* @param connector {Connector} Connector to which to align
	* @param [mirror=false] {boolean} Whether to reverse the direction of this
	*	Connector
	* @param [rotation=0] {number} How far to rotate about the up-axis of this
	*	Connector
	* @return {Connector} This object
	*/

	var axis, masterSpaceOffsetInverse, norm, slaveQuat,
		slaveSpaceOffsetInverse,
		offset = new THREE.Quaternion(),
		offsetInverse = new THREE.Quaternion();

	// Update matrices in case method was called before rendering began
	this.updateScene();

	// Get quaternion of master space, permitting parent orientation
	if ( this.master.parent ) {
		masterSpaceOffsetInverse =
			this.master.parent.getWorldQuaternion().inverse();
	} else {
		masterSpaceOffsetInverse = new THREE.Quaternion().inverse();
	}

	// Get quaternion of slave connector space, permitting parent orientation
	if ( this.parent ) {
		slaveSpaceOffsetInverse = this.parent.getWorldQuaternion().inverse();
	} else {
		slaveSpaceOffsetInverse = new THREE.Quaternion().inverse();
	}

	// Get inverse slave quaternion
	slaveQuat = this.getWorldQuaternion()
		.multiply( slaveSpaceOffsetInverse )
		.inverse();

	// Get Connector vector
	if ( mirror === true || !isNaN( rotation ) ) {
		norm = this.normalVector;
	}

	// Apply mirror
	// This could be set up by the user, but it's not always trivial to reverse a rotation in three dimensions.
	if ( mirror === true ) {
		if ( norm.equals( this.up ) ) {

			// That is, this is axis-aligned and thus degenerate
			console.warn( "Cannot mirror degenerate quaternions. Re-orient your Connector so it doesn't align with its up axis." );

			offset = this.offsetQuaternionAxes;
			offsetInverse = this.offsetQuaternionAxesInverse;
		}

		// Define axis of rotation as orthogonal to the plane formed by the up vector and the rotations, i.e. `norm`. Rotate a half-turn.
		axis = new THREE.Vector3();
		axis.copy( norm );
		axis.applyQuaternion( offset );
		axis.cross( this.up );
		axis.applyQuaternion( offsetInverse );
		slaveQuat.multiply(
			new THREE.Quaternion().setFromAxisAngle( axis, Math.PI ) );
	}

	// Apply rotation
	// This could be incorporated into the Connector's own spatial orientation, but there are use scenarios where the Connector should be rigid while its alignment changes.
	// The Connector's `up` vector is used as the axis of rotation.
	// This must be modified by the local rotation of the Connector.
	if ( !isNaN( rotation ) ) {
		slaveQuat.multiply(
			new THREE.Quaternion().setFromAxisAngle( norm, rotation ) );
	}

	// Quaternion connection
	this.master.quaternion.copy( connector.getWorldQuaternion() )
		.multiply( masterSpaceOffsetInverse )
		.multiply( slaveQuat );

	// Update matrix so as to have correct positions to the newly rotated connector
	this.updateScene();

	// Reposition
	this.master.position.add(
		connector.getWorldPosition().sub( this.getWorldPosition() ) );

	// One final update, so everything is guaranteed to be aligned for further operations
	this.updateScene();

	return this;
};


THREE.Connector.prototype.clone = function() {

	/**
	* Return a duplicate of this Connector.
	*
	* @method clone
	* @return Connector
	*/

	return new this.constructor().copy( this );
};


THREE.Connector.prototype.copy = function( source ) {

	/**
	* Copy properties of this Connector from another Connector.
	*
	* @method copy
	* @param source [Connector] Target connector
	* @return {Connector} This Connector
	*/

	THREE.Object3D.prototype.copy.call( this, source );

	this._master = source._master;

	return this;
};


THREE.Connector.prototype.updateScene = function() {

	/**
	* Updates the highest parent of the Connector's master.
	* This is assumed to be a Scene object, but doesn't have to be.
	*
	* @method updateScene
	*/

	var entity = this.master;

	while ( entity ) {
		if ( entity.type === "Scene" || !entity.parent ) {
			entity.updateMatrixWorld( true );
			return;
		}
		entity = entity.parent;
	}
};


THREE.ConnectorHelper = ( function () {

	var markerGeometry = new THREE.SphereGeometry( 5, 16, 16 );

	return function ( origin, params ) {

		params = params || {};

		THREE.Object3D.call( this );

		if ( params.color === undefined ) {
			color = 0xffff00;
		}
		if ( params.radius !== undefined ) {
			markerGeometry = new THREE.SphereGeometry( params.radius, 16, 16 );
		}

		this.position.copy( origin );

		this.marker = new THREE.Mesh(
			markerGeometry,
			new THREE.MeshBasicMaterial( { color: color } ) );
		this.marker.matrixAutoUpdate = false;
		this.add( this.marker );

	};

}() );

THREE.ConnectorHelper.prototype = Object.create( THREE.Object3D.prototype );
THREE.ConnectorHelper.prototype.constructor = THREE.ConnectorHelper;
;(function(){'use strict';var f,g=[];function l(a){g.push(a);1==g.length&&f()}function m(){for(;g.length;)g[0](),g.shift()}f=function(){setTimeout(m)};function n(a){this.a=p;this.b=void 0;this.f=[];var b=this;try{a(function(a){q(b,a)},function(a){r(b,a)})}catch(c){r(b,c)}}var p=2;function t(a){return new n(function(b,c){c(a)})}function u(a){return new n(function(b){b(a)})}function q(a,b){if(a.a==p){if(b==a)throw new TypeError;var c=!1;try{var d=b&&b.then;if(null!=b&&"object"==typeof b&&"function"==typeof d){d.call(b,function(b){c||q(a,b);c=!0},function(b){c||r(a,b);c=!0});return}}catch(e){c||r(a,e);return}a.a=0;a.b=b;v(a)}}
function r(a,b){if(a.a==p){if(b==a)throw new TypeError;a.a=1;a.b=b;v(a)}}function v(a){l(function(){if(a.a!=p)for(;a.f.length;){var b=a.f.shift(),c=b[0],d=b[1],e=b[2],b=b[3];try{0==a.a?"function"==typeof c?e(c.call(void 0,a.b)):e(a.b):1==a.a&&("function"==typeof d?e(d.call(void 0,a.b)):b(a.b))}catch(h){b(h)}}})}n.prototype.g=function(a){return this.c(void 0,a)};n.prototype.c=function(a,b){var c=this;return new n(function(d,e){c.f.push([a,b,d,e]);v(c)})};
function w(a){return new n(function(b,c){function d(c){return function(d){h[c]=d;e+=1;e==a.length&&b(h)}}var e=0,h=[];0==a.length&&b(h);for(var k=0;k<a.length;k+=1)u(a[k]).c(d(k),c)})}function x(a){return new n(function(b,c){for(var d=0;d<a.length;d+=1)u(a[d]).c(b,c)})};window.Promise||(window.Promise=n,window.Promise.resolve=u,window.Promise.reject=t,window.Promise.race=x,window.Promise.all=w,window.Promise.prototype.then=n.prototype.c,window.Promise.prototype["catch"]=n.prototype.g);}());

(function(){function l(a,b){document.addEventListener?a.addEventListener("scroll",b,!1):a.attachEvent("scroll",b)}function m(a){document.body?a():document.addEventListener?document.addEventListener("DOMContentLoaded",function c(){document.removeEventListener("DOMContentLoaded",c);a()}):document.attachEvent("onreadystatechange",function k(){if("interactive"==document.readyState||"complete"==document.readyState)document.detachEvent("onreadystatechange",k),a()})};function q(a){this.a=document.createElement("div");this.a.setAttribute("aria-hidden","true");this.a.appendChild(document.createTextNode(a));this.b=document.createElement("span");this.c=document.createElement("span");this.h=document.createElement("span");this.f=document.createElement("span");this.g=-1;this.b.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.c.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
this.f.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.h.style.cssText="display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;";this.b.appendChild(this.h);this.c.appendChild(this.f);this.a.appendChild(this.b);this.a.appendChild(this.c)}
function w(a,b){a.a.style.cssText="max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;left:-999px;white-space:nowrap;font:"+b+";"}function x(a){var b=a.a.offsetWidth,c=b+100;a.f.style.width=c+"px";a.c.scrollLeft=c;a.b.scrollLeft=a.b.scrollWidth+100;return a.g!==b?(a.g=b,!0):!1}function z(a,b){function c(){var a=k;x(a)&&null!==a.a.parentNode&&b(a.g)}var k=a;l(a.b,c);l(a.c,c);x(a)};function A(a,b){var c=b||{};this.family=a;this.style=c.style||"normal";this.weight=c.weight||"normal";this.stretch=c.stretch||"normal"}var B=null,C=null,D=null;function H(){if(null===C){var a=document.createElement("div");try{a.style.font="condensed 100px sans-serif"}catch(b){}C=""!==a.style.font}return C}function I(a,b){return[a.style,a.weight,H()?a.stretch:"","100px",b].join(" ")}
A.prototype.load=function(a,b){var c=this,k=a||"BESbswy",y=b||3E3,E=(new Date).getTime();return new Promise(function(a,b){null===D&&(D=!!document.fonts);if(D){var J=new Promise(function(a,b){function e(){(new Date).getTime()-E>=y?b():document.fonts.load(I(c,'"'+c.family+'"'),k).then(function(c){1<=c.length?a():setTimeout(e,25)},function(){b()})}e()}),K=new Promise(function(a,c){setTimeout(c,y)});Promise.race([K,J]).then(function(){a(c)},function(){b(c)})}else m(function(){function r(){var b;if(b=
-1!=f&&-1!=g||-1!=f&&-1!=h||-1!=g&&-1!=h)(b=f!=g&&f!=h&&g!=h)||(null===B&&(b=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent),B=!!b&&(536>parseInt(b[1],10)||536===parseInt(b[1],10)&&11>=parseInt(b[2],10))),b=B&&(f==t&&g==t&&h==t||f==u&&g==u&&h==u||f==v&&g==v&&h==v)),b=!b;b&&(null!==d.parentNode&&d.parentNode.removeChild(d),clearTimeout(G),a(c))}function F(){if((new Date).getTime()-E>=y)null!==d.parentNode&&d.parentNode.removeChild(d),b(c);else{var a=document.hidden;if(!0===a||
void 0===a)f=e.a.offsetWidth,g=n.a.offsetWidth,h=p.a.offsetWidth,r();G=setTimeout(F,50)}}var e=new q(k),n=new q(k),p=new q(k),f=-1,g=-1,h=-1,t=-1,u=-1,v=-1,d=document.createElement("div"),G=0;d.dir="ltr";w(e,I(c,"sans-serif"));w(n,I(c,"serif"));w(p,I(c,"monospace"));d.appendChild(e.a);d.appendChild(n.a);d.appendChild(p.a);document.body.appendChild(d);t=e.a.offsetWidth;u=n.a.offsetWidth;v=p.a.offsetWidth;F();z(e,function(a){f=a;r()});w(e,I(c,'"'+c.family+'",sans-serif'));z(n,function(a){g=a;r()});
w(n,I(c,'"'+c.family+'",serif'));z(p,function(a){h=a;r()});w(p,I(c,'"'+c.family+'",monospace'))})})};"undefined"!==typeof module?module.exports=A:(window.FontFaceObserver=A,window.FontFaceObserver.prototype.load=A.prototype.load);}());
;/*

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
		@param [params.componentMapCfg] {object/Array of objects} One or more
			model library map configuration(s) to use instead of the default
			standard library map. Including an empty object `{}` will cause
			the default standard library map to be loaded at that point.
			Earlier maps override later maps if they share a package name.
			This makes it possible to override a model in the standard library
			if desired, e.g. a board is using an outdated footprint.
		@param [params.componentMapCfg.mapUrl] {string} URL for the file that
			contains the "component package name" to "model file path" mapping.
		@param [params.componentMapCfg.urlPrefix] {string} (Optional) URL
			prefix to prepend to the model file path when loading model file.
	**/

	console.log( "Beginning BRD parse" );

	params = params || {};

	/**
	Collection of colors used to render boards.

	@property colors {object}
		@property colors.bounds {string} "rgb( 32, 192, 32 )"
		@property colors.copper {string} "rgb( 255, 222, 164 )"
		@property colors.prepreg {string} "rgb( 238, 238, 230 )"
		@property colors.silkscreen {string} "rgb( 255, 255, 255 )"
		@property colors.solderMask {string} "rgb( 32, 64, 192 )"
		@property colors.solderPaste {string} "rgb( 192, 192, 222 )"
	**/
	this.colors = params.colors || {};
	this.colors = {
		bounds: this.colors.bounds || "rgb( 32, 192, 32 )",
		copper: this.colors.copper || "rgb( 255, 222, 164 )",
		prepreg: this.colors.prepreg || "rgb( 238, 238, 230 )",
		silkscreen: this.colors.silkscreen || "rgb( 255, 255, 255 )",
		solderMask: this.colors.solderMask || "rgb( 32, 64, 192 )",
		solderPaste: this.colors.solderPaste || "rgb( 192, 192, 222 )"
	};

	/**
	List of `Connector` objects associated with packaged elements,
	such as resistors, surface-mounted devices, and other predefined
	board components

	@property connectElements {array}
	**/
	this.connectElements = [];

	/**
	List of `Connector` objects associated with holes and pads

	@property connectHoles {array}
	**/
	this.connectHoles = [];

	/**
	List of `Connector` handles; used to toggle visibility

	@property connectorHandles {array}
	**/
	this.connectorHandles = [];

	/**
	Opacity of soldermask

	@property _maskOpacity {number}
	@default 0.8
	@private
	**/
	this._maskOpacity = params.maskOpacity || 0.8;

	/**
	Material shader to use.

	@property material {function}
	@default THREE.MeshPhongMaterial
	**/
	params.material = typeof params.material === "string" ?
		params.material : "phong";
	params.material = params.material.toLowerCase();
	this.material = params.material === "phong" ?
		THREE.MeshPhongMaterial : params.material === "lambert" ?
		THREE.MeshLambertMaterial :
		THREE.MeshBasicMaterial;

	/**
	Shininess of 3D components

	@property _shininess {number}
	@default 128
	@private
	**/
	this._shininess = 128;

	/**
	Microns per pixel. A higher pixelMicrons value produces a smaller board.

	@property pixelMicrons {number}
	@default 35
	**/
	this.pixelMicrons =
		isNaN( params.pixelMicrons ) ? 35 : params.pixelMicrons;

	/**
	Root THREE.js transform, containing board elements

	@property root {THREE.Object3D}
	**/
	this.root = new THREE.Object3D();

	/**
	Total board thickness, including solderpaste and mask layers.
	Does not actually check for presence of solderpaste or mask.

	This figure is measured in pixels relative to the board.
	To find the distance in microns, multiply by `this.pixelMicrons`.

	By default, this is computed from BRD data. If specified in
	the params, it will override that value.

	@property thickness {number}
	**/
	this.thickness = params.thickness ?
		params.thickness * 1000 / this.pixelMicrons :
		undefined;

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

	/**
	Scale factor for converting from millimeters to pixels.
	Coords in the XML should be multiplied by this before drawing.

	@property coordScale {number}
	@default 28.57
	**/
	this.coordScale = 1000 / this.pixelMicrons;

	/**
	List of all the "component package name" to "model file path"
	mappings to be searched when locating a component package model.

	@property _componentMaps {array}
	@private
	**/
	this._componentMaps = [];

	/**
	Hash of component names (e.g. `J1`, `LED1`) and whether the
	associated model should be displayed or not. Overrides the
	default heuristics.

	@property _shouldPopulateOverride {object}
	@private
	**/
	this._shouldPopulateOverride = params.shouldPopulate || {};

	this._parseDesignRules();

	this._populateLayers();

	// Determine dimensions of board and derived textures.
	this._parseBounds();

	this.renderBounds();
	this.renderCopper();
	this.renderSolderMask();
	this.renderSolderpaste();
	this.renderIsolate();

	// Generate geometry
	if ( params.composite === false ) {
		this._buildLayerGeometry();
		this._buildDepthElements();
	} else {
		this._buildCompositeGeometry();
	}

	// Finalize element connectors
	this._finalizeElementConnectors();

	// Optional visualizations
	this.buildGhostPackages();
	this.viewConnectors( !!params.viewConnectors );
	this.viewGhosts( !!params.viewGhosts );
	this.viewComponents( !!params.viewComponents, params.componentMapCfg );
};


EagleBrdRenderer.prototype._buildCompositeGeometry = function( add ) {

	/**
	Construct THREE.js geometry, bearing composited textures from all layers.

	@method _buildCompositeGeometry
	@param [add=true] {boolean} Whether to add geometry to the board root
	@private
	**/

	var ctx, i;

	add = add === false ? false : true;



	/**
	Composite of all layer textures, top-oriented.

	@property layerCompositeTop {EagleBrdRenderer.Layer}
	**/
	this.layerCompositeTop = new EagleBrdRenderer.Layer( {
		board: this,
		name: "Composite Top",
		thickness: 1,
		tags: "Top",
		height: 1
	} );

	this.layerCompositeTop.initBuffer();
	ctx = this.layerCompositeTop.ctx;

	// Composite all textures
	ctx.save();
	ctx.translate( -this.offsetX, this.height - this.offsetY );
	ctx.scale( 1, -1 );
	for ( i = this.layers.length - 1; i >= 0; i-- ) {
		if ( this.layers[ i ].visible ) {
			ctx.drawImage( this.layers[ i ].buffer, 0, 0 );
		}
	}
	ctx.restore();

	this.layerCompositeTop.buildGeometry();
	this.layerCompositeTop.geometry.faces.splice( 2, 2 );
	this.layerCompositeTop.material.shininess = this._shininess;



	/**
	Composite of all layer textures, bottom-oriented.

	@property layerCompositeBottom {EagleBrdRenderer.Layer}
	**/
	this.layerCompositeBottom = new EagleBrdRenderer.Layer( {
		board: this,
		name: "Composite Bottom",
		thickness: 1,
		tags: "Bottom",
		height: this.thickness - 1
	} );

	this.layerCompositeBottom.initBuffer();
	ctx = this.layerCompositeBottom.ctx;

	// Composite all textures
	ctx.save();
	ctx.translate( -this.offsetX, this.height - this.offsetY );
	ctx.scale( 1, -1 );
	for ( i = 0; i < this.layers.length; i++ ) {
		if ( this.layers[ i ].visible ) {
			ctx.drawImage( this.layers[ i ].buffer, 0, 0 );
		}
	}
	ctx.restore();

	this.layerCompositeBottom.buildGeometry();
	this.layerCompositeBottom.geometry.faces.splice( 0, 2 );
	this.layerCompositeBottom.geometry.faceVertexUvs[ 0 ].splice( 0, 2 );
	this.layerCompositeBottom.material.shininess = this._shininess;



	if ( add ) {
		this.root.add( this.layerCompositeTop.mesh );
		this.root.add( this.layerCompositeBottom.mesh );
	}


	this._buildDepthElements( add );
};


EagleBrdRenderer.prototype._buildDepthElements = function( add ) {

	/**
	Construct THREE.js geometry representing depth elements,
	such as holes and edges.

	This grouping also includes element connectors,
	to keep them out of the root child space.

	@method _buildDepthElements
	@param [add=true] {boolean} Whether to add geometry to the board root
	@private
	**/

	add = add === false ? false : true;

	/**
	Collection of THREE.js geometry representing depth elements.

	@property depthElements {THREE.Object3D}
	**/
	this.depthElements = new THREE.Object3D();
	if ( add ) {
		this.root.add( this.depthElements );
	}
	this.depthElements.position.x -= this.width / 2 - this.offsetX;
	this.depthElements.position.y -= this.height / 2 - this.offsetY;


	this._buildDepthEdges( add );
	this._buildDepthHoles( add );
};


EagleBrdRenderer.prototype._buildDepthEdges = function( add ) {

	/**
	Construct THREE.js geometry representing depth edges.

	This uses `THREE.Shape` to define the edge paths.
	As `THREE.ExtrudeGeometry` does not properly skip `Shape.moveTo`
	adjustments, we generate an individual mesh for each continuous loop.

	@method _buildDepthEdges
	@param [add=true] {boolean} Whether to add geometry to the board root
	@private
	**/

	var chordData, ctx, firstX, firstY,
		i, j, lastX, lastY,
		mat, mesh, shape, wire,
		x, x1, x2, y, y1, y2,
		bevel = 8,
		wireGrp = [],
		wireGrps = [],
		wires = this.getLayer( "Bounds" ).getElements( "wire" );

	/**
	Texture buffer to create bevel effect on edges

	@property bufferEdge {HTMLCanvasElement}
	**/
	this.bufferEdge = document.createElement( "canvas" );
	this.bufferEdge.width = 1;
	this.bufferEdge.height = this.thickness;

	ctx = this.bufferEdge.getContext( "2d" );

	ctx.save();
	for ( i = 0; i < bevel; i++ ) {
		x = 1 - ( ( bevel - i ) / bevel );
		x = Math.cos( ( 1 - x ) * Math.PI / 2 );
		x = Math.round( 255 * x );
		ctx.fillStyle = "rgb( " + x + ", " + x + ", " + x + " )";
		ctx.fillRect(
			0, i, this.bufferEdge.width, this.bufferEdge.height - i * 2 );
	}
	ctx.restore();


	/**
	THREE.js texture for beveled edges

	@property textureEdge {THREE.Texture}
	**/
	this.textureEdge = new THREE.Texture( this.bufferEdge );
	this.textureEdge.needsUpdate = true;


	// Order wires
	// Wire entities may be out of order in the BRD.
	// This will cause fills to operate badly.
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
		wireGrps[ i ] = this.sortWires( wireGrps[ i ] );
	}


	// Draw wires
	mat = new this.material( {
		color: this.colors.prepreg,
		// map: this.textureEdge,
		// normalMap: this.textureEdge,
		bumpMap: this.textureEdge,
		side: THREE.DoubleSide,
		shininess: this._shininess,
		// wireframe: true
	} );

	for ( i = 0; i < wireGrps.length; i++ ) {

		shape = new THREE.Shape();

		// Begin path
		if ( wireGrps[ i ].length ) {
			x = this.parseCoord( wireGrps[ i ][ 0 ].getAttribute( "x1" ) );
			y = this.parseCoord( wireGrps[ i ][ 0 ].getAttribute( "y1" ) );
			shape.moveTo( x, y );
			lastX = x;
			lastY = y;
			firstX = x;
			firstY = y;
		}

		for ( j = 0; j < wireGrps[ i ].length; j++ ) {

			wire = wireGrps[ i ][ j ];
			x1 = this.parseCoord( wire.getAttribute( "x1" ) );
			y1 = this.parseCoord( wire.getAttribute( "y1" ) );
			x2 = this.parseCoord( wire.getAttribute( "x2" ) );
			y2 = this.parseCoord( wire.getAttribute( "y2" ) );

			// Path discontinuities
			if ( x1 !== lastX || y1 !== lastY ) {

				shape.lineTo( firstX, firstY );

				// Generate edge unit
				mesh = this._buildDepthEdge(
					shape,
					mat,
					wireGrps[ i ][ 0 ].elementParent );
				if ( add ) {
					this.depthElements.add( mesh );
				}

				// Begin new shape
				shape = new THREE.Shape();

				shape.moveTo( x1, y1 );
				firstX = x1;
				firstY = y1;
			}

			if ( wire.hasAttribute( "curve" ) ) {
				chordData = new EagleBrdRenderer.ChordData( wire );
				shape.absarc(
					chordData.x * this.coordScale,
					chordData.y * this.coordScale,
					chordData.radius * this.coordScale,
					chordData.bearing1,
					chordData.bearing2,
					chordData.curve < 0 );
			} else {
				shape.lineTo( x2, y2 );
			}

			lastX = x2;
			lastY = y2;
		}

		// Generate edge unit
		mesh = this._buildDepthEdge(
			shape,
			mat,
			wireGrps[ i ][ 0 ].elementParent );

		if ( add ) {
			this.depthElements.add( mesh );
		}
	}
};


EagleBrdRenderer.prototype._buildDepthEdge = function(
	shape, material, parentElement ) {

	/**
	Assemble a single continuous extruded edge from a shape.

	@method _buildDepthEdge
	@param shape {THREE.Shape} Shape path to use for extrusion
	@param material {THREE.Material} Material to use for mesh
	@param [parentElement] {Element} Parent space used to align edge mesh
	@private
	@return {THREE.Mesh}
	**/

	var angleData, geo, i, mesh, parent;

	// Extrude from path
	geo = new THREE.ExtrudeGeometry( shape, {
		amount: this.thickness,
		bevelEnabled: false,
		curveSegments: 32,
		// steps: 3
	} );

	// Cull top and bottom faces
	for ( i = geo.faces.length - 1; i >= 0; i-- ) {
		if ( Math.abs( geo.faces[ i ].normal.z ) > 0.5 ) {
			geo.faces.splice( i, 1 );
		}
	}

	// Perform Z-reliant UV mapping
	for ( i = 0; i < geo.faces.length; i++ ) {

		// Vertex A
		geo.faceVertexUvs[ 0 ][ i ][ 0 ].x = 0;
		geo.faceVertexUvs[ 0 ][ i ][ 0 ].y =
			geo.vertices[ geo.faces[ i ].a ].z / this.thickness;

		// Vertex B
		geo.faceVertexUvs[ 0 ][ i ][ 1 ].x = 0;
		geo.faceVertexUvs[ 0 ][ i ][ 1 ].y =
			geo.vertices[ geo.faces[ i ].b ].z / this.thickness;

		// Vertex C
		geo.faceVertexUvs[ 0 ][ i ][ 2 ].x = 0;
		geo.faceVertexUvs[ 0 ][ i ][ 2 ].y =
			geo.vertices[ geo.faces[ i ].c ].z / this.thickness;
	}


	mesh = new THREE.Mesh( geo, material );
	mesh.position.z -= this.thickness;

	// Reorient per parent transforms
	if ( parentElement ) {
		parent = new THREE.Object3D();
		parent.position.x = this.parseCoord(
			parentElement.getAttribute( "x" ) );
		parent.position.y = this.parseCoord(
			parentElement.getAttribute( "y" ) );
		if ( parentElement.hasAttribute( "rot" ) ) {
			angleData = new EagleBrdRenderer.AngleData(
				parentElement.getAttribute( "rot" ) );
			parent.rotation.z = angleData.angle;
			parent.scale.x = angleData.spin ? -1 : 1;
			parent.scale.y = angleData.mirror ? -1 : 1;
		}

		// Extract
		this.depthElements.add( parent );
		parent.add( mesh );
		parent.updateMatrixWorld();
		THREE.SceneUtils.detach( mesh, parent, this.depthElements );
		this.depthElements.remove( mesh );
		this.depthElements.remove( parent );
	}

	return mesh;
};


EagleBrdRenderer.prototype._buildDepthHoles = function( add ) {

	/**
	Construct THREE.js geometry representing depth elements,
	including drills in holes, vias, and pads.

	This includes `Connector` objects for holes and pads,
	to allow the PCB to become part of an assembly.
	These are listed in `connectHoles`.

	NOTE: Currently, all holes are assumed to be copper-coated.

	@method _buildDepthHoles
	@param [add=true] {boolean} Whether to add geometry to the board root
	@private
	**/

	var angData, connector, drill, drills, geo, i, j,
		mat, mesh, parent, parent2,
		x1, x2, y1, y2,
		cylDetail = 16;

	add = add === false ? false : true;


	// Gather drills
	drills = [];
	for ( i = 0; i < this.layers.length; i++ ) {
		for ( j = 0; j < this.layers[ i ].elements.length; j++ ) {
			drill = this.layers[ i ].elements[ j ];
			if (
					drill.tagName !== "via" &&
					drill.tagName !== "hole" &&
					drill.tagName !== "pad" ) {
				continue;
			}
			drills.push( drill );
		}
	}


	// Cull duplicate drills
	// This will look for elements with the same parent element
	// and the same spatial coordinates.
	for ( i = drills.length - 1; i > 0; i-- ) {
		x1 = drills[ i ].getAttribute( "x" );
		y1 = drills[ i ].getAttribute( "y" );
		parent = drills[ i ].elementParent;
		for ( j = i - 1; j >= 0; j-- ) {
			x2 = drills[ j ].getAttribute( "x" );
			y2 = drills[ j ].getAttribute( "y" );
			parent2 = drills[ j ].elementParent;
			if ( ( parent && parent === parent2 ) ||
					( !parent && !parent2 ) ) {
				if ( x1 === x2 && y1 === y2 ) {
					drills.splice( i, 1 );
					break;
				}
			}
		}
	}


	// Create drills

	// Create material; this should only run once, so it's OK here.
	// If we were calling "_buildDepthHoles()" more than once,
	// we'd want to make this a property of the `EagleBrdRenderer` itself.
	//
	// Note also that we use `textureEdge`, which should have been generated
	// moments ago during edge creation.
	mat = new this.material( {
		color: new THREE.Color( this.colors.copper ),
		side: THREE.BackSide,
		specular: new THREE.Color( this.colors.copper ),
		shininess: this._shininess,
		bumpMap: this.textureEdge,
	} );

	for ( i = 0; i < drills.length; i++ ) {
		drill = this.parseCoord( drills[ i ].getAttribute( "drill" ) ) / 2;
		geo = new THREE.CylinderGeometry(
			drill, drill, this.thickness, cylDetail, 1, true );
		mesh = new THREE.Mesh( geo, mat );

		// Orient drillmesh
		mesh.rotation.x = Math.PI / 2;
		mesh.position.z -= this.thickness / 2;

		// Base positioning
		mesh.position.x =
			this.parseCoord( drills[ i ].getAttribute( "x" ) );
		mesh.position.y =
			this.parseCoord( drills[ i ].getAttribute( "y" ) );
		this.depthElements.add( mesh );

		// Optional parent positioning
		if ( drills[ i ].elementParent ) {
			parent = new THREE.Object3D();

			parent.position.x = this.parseCoord(
				drills[ i ].elementParent.getAttribute( "x" ) );
			parent.position.y = this.parseCoord(
				drills[ i ].elementParent.getAttribute( "y" ) );
			if ( drills[ i ].elementParent.hasAttribute( "rot" ) ) {
				angData = new EagleBrdRenderer.AngleData(
					drills[ i ].elementParent.getAttribute( "rot" ) );
				parent.rotation.z = angData.angle;
				parent.scale.x = angData.mirror ? -1 : 1;
				parent.scale.y = angData.spin ? -1 : 1;

				// Scaling can break THREE's backside detection, so re-invert
				mesh.scale.x = angData.mirror ? -1 : 1;
				mesh.scale.y = angData.spin ? -1 : 1;
			}

			parent.add( mesh );
			this.depthElements.add( parent );

			parent.updateMatrixWorld();
			THREE.SceneUtils.detach( mesh, parent, this.depthElements );
			this.depthElements.remove( parent );
		}

		// Register connectors for holes and pads
		if ( drills[ i ].tagName === "hole" ||
				drills[ i ].tagName === "pad" ) {

			// Top connector
			connector = new THREE.Connector();
			mesh.add( connector );
			connector.master = this.root;
			connector.position.y = this.thickness / 2;
			this.connectHoles.push( connector );

			this.visualizeConnector( connector );

			connector.userData.drill = drills[ i ];
			if ( drills[ i ].elementParent ) {
				connector.userData.element = drills[ i ].elementParent;
			}

			// Bottom connector
			connector = new THREE.Connector();
			mesh.add( connector );
			connector.master = this.root;
			connector.position.y = -this.thickness / 2;
			connector.rotation.x = Math.PI;
			this.connectHoles.push( connector );

			this.visualizeConnector( connector );
		}

		// TODO: Merge geometries. This will render more efficiently.
	}
};


EagleBrdRenderer.prototype._buildLayerGeometry = function( add ) {

	/**
	Construct THREE.js geometry bearing the generated textures.
	This is probably too detailed for everyday use,
	but might have some utility in generating exploded layer views.

	@method _buildLayerGeometry
	@param [add=true] {boolean} Whether to add geometry to the board root
	@private
	**/

	var i;

	add = add === false ? false : true;

	for ( i = 0; i < this.layers.length; i++ ) {
		this.layers[ i ].buildGeometry();
		if ( this.layers[ i ].visible && add ) {
			this.root.add( this.layers[ i ].mesh );
		}
	}
};


EagleBrdRenderer.prototype._finalizeElementConnectors = function() {

	/**
	Apply offset to element connectors generated before that information
	was available.

	@method _finalizeElementConnectors
	@private
	**/

	var i;

	for ( i = 0; i < this.connectElements.length; i++ ) {
		this.depthElements.add( this.connectElements[ i ] );
	}
};


EagleBrdRenderer.prototype._parseBounds = function() {

	/**
	Determine and record the boundaries of the board surface.
	This is derived from `eagle.drawing.board.plain` elements.

	@method _parseBounds
	@private
	**/

	var chordPoints, circles, layer, polys,
		radius, rects, verts, wire, wires,
		i, j, x, y, x1, y1, x2, y2,
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


	// Transmute non-wire bound definitions into wires.
	// This might not be the perfect solution, but it works.

	// Circles must be created in quarter-arcs to preserve radius
	circles = layer.getElements( "circle" );
	for ( i = 0; i < circles.length; i++ ) {
		x = parseFloat( circles[ i ].getAttribute( "x" ) );
		y = parseFloat( circles[ i ].getAttribute( "y" ) );
		radius = parseFloat( circles[ i ].getAttribute( "radius" ) );
		x1 = x - radius;
		x2 = x + radius;
		y1 = y - radius;
		y2 = y + radius;

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x1 );
		wire.setAttribute( "y1", y );
		wire.setAttribute( "x2", x );
		wire.setAttribute( "y2", y1 );
		wire.setAttribute( "curve", 90 );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x );
		wire.setAttribute( "y1", y1 );
		wire.setAttribute( "x2", x2 );
		wire.setAttribute( "y2", y );
		wire.setAttribute( "curve", 90 );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x2 );
		wire.setAttribute( "y1", y );
		wire.setAttribute( "x2", x );
		wire.setAttribute( "y2", y2 );
		wire.setAttribute( "curve", 90 );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x );
		wire.setAttribute( "y1", y2 );
		wire.setAttribute( "x2", x1 );
		wire.setAttribute( "y2", y );
		wire.setAttribute( "curve", 90 );
	}

	// Create poly segments
	polys = layer.getElements( "polygon" );
	for ( i = 0; i < polys.length; i++ ) {
		verts = polys[ i ].getElementsByTagName( "vertex" );
		if ( verts.length < 3 ) {
			continue;
		}
		for ( j = 1; j < verts.length; j++ ) {
			wire = this.xml.createElement( "wire" );
			layer.elements.push( wire );
			wire.setAttribute( "x1", verts[ j - 1 ].getAttribute( "x" ) );
			wire.setAttribute( "y1", verts[ j - 1 ].getAttribute( "y" ) );
			wire.setAttribute( "x2", verts[ j ].getAttribute( "x" ) );
			wire.setAttribute( "y2", verts[ j ].getAttribute( "y" ) );
			if ( verts[ j - 1 ].hasAttribute( "curve" ) ) {
				wire.setAttribute(
					"curve", verts[ j - 1 ].getAttribute( "curve" ) );
			}
		}
	}

	// Create rects
	rects = layer.getElements( "rectangle" );
	for ( i = 0; i < rects.length; i++ ) {
		x1 = parseFloat( rects[ i ].getAttribute( "x1" ) );
		y1 = parseFloat( rects[ i ].getAttribute( "y1" ) );
		x2 = parseFloat( rects[ i ].getAttribute( "x2" ) );
		y2 = parseFloat( rects[ i ].getAttribute( "y2" ) );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x1 );
		wire.setAttribute( "y1", y1 );
		wire.setAttribute( "x2", x2 );
		wire.setAttribute( "y2", y1 );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x2 );
		wire.setAttribute( "y1", y1 );
		wire.setAttribute( "x2", x2 );
		wire.setAttribute( "y2", y2 );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x2 );
		wire.setAttribute( "y1", y2 );
		wire.setAttribute( "x2", x1 );
		wire.setAttribute( "y2", y2 );

		wire = this.xml.createElement( "wire" );
		layer.elements.push( wire );
		wire.setAttribute( "x1", x1 );
		wire.setAttribute( "y1", y2 );
		wire.setAttribute( "x2", x1 );
		wire.setAttribute( "y2", y1 );
	}


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

	// Probe wires
	for ( i = 0; i < wires.length; i++ ) {

		// Simple minmax point test
		for ( j = 1; j <= 2; j++ ) {
			x = parseFloat( wires[ i ].getAttribute( "x" + j ) );
			y = parseFloat( wires[ i ].getAttribute( "y" + j ) );
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

	This will also register the element as a `Connector` object
	in `connectElements`.

	@method _parseElement
	@param el {Element} `<element>` element to parse
	@private
	**/

	var angle, connector, i, lib, libs, pack, packs,
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

	@property _elementCurrent {Element}
	@default undefined
	@private
	**/
	this._elementCurrent = el;

	// Parse the package into the layers
	this._parseCollection( pack );


	// Add element Connector
	connector = new THREE.Connector();
	connector.master = this.root;
	this.connectElements.push( connector );

	// Append library data
	connector.userData.element = el;
	connector.userData.package = pack;

	// Transform is not final here, because offset has not been computed.
	connector.position.x =
		this.parseCoord( el.getAttribute( "x" ) );
	connector.position.y =
		this.parseCoord( el.getAttribute( "y" ) );
	connector.rotation.x += Math.PI / 2;
	if ( el.hasAttribute( "rot" ) ) {
		angle = new EagleBrdRenderer.AngleData( el.getAttribute( "rot" ) );
		connector.rotation.y = angle.angle;
		if ( angle.mirror ) {
			connector.rotation.x += Math.PI;
			connector.rotation.y += Math.PI;
			connector.position.z = -this.thickness;
		}
	}

	this.visualizeConnector( connector, "rgb( 255, 0, 0 )" );


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
	@private
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
	offset = -thickSolder;
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
		if ( iso ) {
			layer.tags.push( "Isolate" );
		}
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

	// Do not incorporate solder into board thickness
	// offset += thickSolder;

	// Create board dimensions
	this.layers.push( new EagleBrdRenderer.Layer( {
		board: this,
		height: offset,
		layers: [ 20 ],
		name: "Bounds",
		tags: [ "Bounds" ],
		thickness: 1,
		visible: false
	} ) );

	this.thickness = this.thickness || offset;

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


EagleBrdRenderer.prototype.buildGhostPackages = function() {

	/**
	Create ghost versions of the library components on the PCB.
	These are not very accurate, as the library is purely a schematic,
	but they'll serve as stand-ins.

	@method buildGhostPackages
	**/

	var angle, child, el, geo, i, j, mat, mesh, pack, parent,
		dx, dy, maxX, maxY, minX, minY, x, y;

	/**
	Grouping of ghost package meshes.

	@property ghostPackages {THREE.Object3D}
	**/
	this.ghostPackages = new THREE.Object3D();
	this.ghostPackages.position.x -= this.width / 2 - this.offsetX;
	this.ghostPackages.position.y -= this.height / 2 - this.offsetY;
	this.root.add( this.ghostPackages );

	mat = new THREE.MeshBasicMaterial( {
		color: "rgb( 255, 255, 255 )",
		wireframe: true
	} );

	for ( i = 0; i < this.connectElements.length; i++ ) {
		el = this.connectElements[ i ].userData.element;

		// Create offset frame
		parent = new THREE.Object3D();
		parent.position.x = this.parseCoord( el.getAttribute( "x" ) );
		parent.position.y = this.parseCoord( el.getAttribute( "y" ) );
		if ( el.hasAttribute( "rot" ) ) {
			angle = new EagleBrdRenderer.AngleData( el.getAttribute( "rot" ) );
			parent.rotation.z = angle.angle;
			if ( angle.mirror ) {
				parent.rotation.y = Math.PI;
				parent.position.z = -this.thickness;
			}
			if ( angle.spin ) {
				parent.rotation.x = Math.PI;
			}
		}

		pack = this.connectElements[ i ].userData.package;

		minX = Infinity;
		maxX = -Infinity;
		minY = Infinity;
		maxY = -Infinity;
		for ( j = 0; j < pack.children.length; j++ ) {
			child = pack.children[ j ];
			if ( child.tagName === "pad" || child.tagName === "smd" ) {
				x = child.getAttribute( "x" );
				y = child.getAttribute( "y" );
				minX = Math.min( x, minX );
				maxX = Math.max( x, maxX );
				minY = Math.min( y, minY );
				maxY = Math.max( y, maxY );
			}
		}

		// console.log( "Element", minX, minY, maxX, maxY );

		if (
				minX !== Infinity && maxX !== -Infinity &&
				minY !== Infinity && maxX !== -Infinity ) {
			dx = this.parseCoord( maxX - minX );
			dy = this.parseCoord( maxY - minY );
			if ( dx !== 0 && dy !== 0 ) {
				geo = new THREE.BoxGeometry( dx, dy, 20 );
				mesh = new THREE.Mesh( geo, mat );
				parent.add( mesh );
				mesh.position.x = minX;
				mesh.position.y = minY;
				mesh.position.z = 10;
			}
		}

		if ( parent.children.length > 0 ) {
			this.ghostPackages.add( parent );
		}
	}
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
		@param [params.fill=false] {boolean} Whether to fill circles
		@param [params.stroke=false] {boolean} Whether to stroke circles
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
		radius = this.parseCoord( circle.getAttribute( "radius" ) ) + offset;

		ctx.save();

		// Account for objects created by elements
		if ( circle.elementParent ) {
			layer.orientContext( circle.elementParent, this.coordScale );
		}

		ctx.lineWidth = offset +
			this.parseCoord( circle.getAttribute( "width" ) );

		ctx.beginPath();
		ctx.arc( x, x, radius, 0, Math.PI * 2 );

		if ( params.stroke ) {
			ctx.stroke();
		}
		if ( params.fill ) {
			ctx.fill();
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
			x = this.parseCoord( verts[ j ].getAttribute( "x" ) );
			y = this.parseCoord( verts[ j ].getAttribute( "y" ) );
			if ( verts[ j ].hasAttribute( "curve" ) ) {

				// Analyse arc
				chordData = new EagleBrdRenderer.ChordData( {
					curve: parseFloat( verts[ j ].getAttribute( "curve" ) ),
					x1: this.parseCoord( verts[ j ].getAttribute( "x" ) ),
					y1: this.parseCoord( verts[ j ].getAttribute( "y" ) ),
					x2: this.parseCoord(
						verts[ ( j < verts.length - 1 ) ? j + 1 : 0 ]
						.getAttribute( "x" ) ),
					y2: this.parseCoord(
						verts[ ( j < verts.length - 1 ) ? j + 1 : 0 ]
						.getAttribute( "y" ) )
				} );

				// Draw arc
				ctx.arc(
					chordData.x,
					chordData.y,
					chordData.radius,
					chordData.bearing1,
					chordData.bearing2,
					chordData.curve < 0 );
			} else {
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

	var angData, flip, fontSize, i, j, spin, text,
		textAlign, textAlignX, textAlignY, textText,
		ctx = params.layer.ctx,
		fontScale = 1,
		layer = params.layer,
		localRot = 0,
		texts = params.texts;

	for ( i = 0; i < texts.length; i++ ) {
		text = texts[ i ];

		textText = "" + text.innerHTML;

		if ( params.layerMatch &&
				parseInt( text.getAttribute( "layer" ), 10 ) !==
				params.layerMatch ||
				!textText ) {
			continue;
		}

		// Sanitize text
		textText = textText.replace( /&gt;\w*/, "" );
		textText = textText.replace( /&lt;\w*/, "" );
		textText = textText.replace( /&amp;\w*/, "&" );

		x = this.parseCoord( text.getAttribute( "x" ) );
		y = this.parseCoord( text.getAttribute( "y" ) );

		ctx.save();

		// Account for objects created by elements
		if ( text.elementParent ) {
			layer.orientContext( text.elementParent, this.coordScale );
		}

		ctx.translate( x, y );

		// Rotations

		// Restore right-way-up
		// as coordinate system of BRD doesn't match canvas conventions
		ctx.scale( 1, -1 );

		// Base rotation
		angData = null;
		localRot = 0;
		flip = false;
		spin = false;
		if ( text.hasAttribute( "rot" ) ) {
			angData = new EagleBrdRenderer.AngleData(
				text.getAttribute( "rot" ) );
			spin = angData.spin;
			localRot = angData.angle;

			// Perform X-mirror
			if ( angData.mirror ) {
				ctx.scale( -1, 1 );
			}
		}

		// Face top
		// EAGLE text is never upside-down, unless `spin` is true.
		if ( text.elementParent ) {
			localRot += ( new EagleBrdRenderer.AngleData(
				text.elementParent ) ).angle;
		}
		localRot %= Math.PI * 2;
		if (
			( localRot < -Math.PI / 2 && localRot >= -Math.PI * 3 / 2 ) ||
			( localRot > Math.PI / 2 && localRot <= Math.PI * 3 / 2 ) ) {

			flip = !spin;
		}

		// Derive apparent size
		fontSize = Math.round(
			this.parseCoord( text.getAttribute( "size" ) * fontScale ) );


		// Set font
		// Note: Other fonts may be set.
		// Default/vector is a monospace font, currently an approximation
		// of a font unique to EAGLE.
		// "Proportional" is said to be generally Helvetica.
		// "Fixed" is said to be generally Courier.
		// TODO: Discern other fonts from BRD data, and ensure they are loaded.
		// TODO: Get the EAGLE font, if it can be identified and exists.
		ctx.font = fontSize + "px " + "Vector, monospace";

		// Set alignment
		textAlign = text.getAttribute( "align" ) || "bottom-left";
		textAlignX = textAlign.replace( /\w*-(\w*)/, "$1" );
		textAlignY = textAlign.replace( /(\w*)-\w*/, "$1" );
		if ( flip ) {
			ctx.scale( -1, -1 );
			if ( textAlignY === "bottom" ) {
				textAlignY = "top";
			} else if ( textAlignY === "top" ) {
				textAlignY = "bottom";
			}
			if ( textAlignX === "left" ) {
				textAlignX = "right";
			} else if ( textAlignX === "right" ) {
				textAlignX = "left";
			}
		}
		if ( textAlignY === "center" ) {
			textAlignY = "middle";
		}
		ctx.textAlign = textAlignX;
		ctx.textBaseline = textAlignY;


		// Rotate text
		ctx.rotate( -localRot );


		// Render text into multiple lines if necessary
		textText = textText.split( "\n" );
		ctx.translate( 0, ( textText.length - 1 ) * fontSize * -0.5 );
		for ( j = 0; j < textText.length; j++ ) {
			ctx.fillText( textText[ j ], 0, 0 );
			ctx.translate( 0, fontSize );
		}

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


EagleBrdRenderer.prototype.getChordPoints = function( el ) {

	/**
	Return a list of `[ x, y ]` coordinate pairs
	representing the cardinal points of a circle described by the
	curvature of the parameter.

	The parameter may be a wire or polygon vertex element.

	This list may be length 0.

	@method getChordPoints
	@param el {Element} Wire or vertex element to assess
	@return array
	**/

	var centroidX, centroidY, chordData, radius, sweepMin, sweepMax,
		points = [];

	// Analyze chord
	chordData = new EagleBrdRenderer.ChordData( el );

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
	// as this indicates the element point is on that cardinal point.
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
		i, x, y, firstX, firstY, lastX, lastY,
		wireGrps, wireGrp, wire,
		layer = this.getLayer( "Bounds" ),
		wires = layer.getElements( "wire" );

	layer.initBuffer();

	// Setup draw style
	layer.ctx.fillStyle = this.colors.bounds;
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
		wireGrps[ i ] = this.sortWires( wireGrps[ i ] );
	}

	// Connect wires into single series
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

	var ctx,
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
	ctx.fillStyle = this.colors.copper;
	ctx.strokeStyle = this.colors.copper;
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


EagleBrdRenderer.prototype.renderIsolate = function() {

	/**
	Render all isolate textures, including prepreg and core.

	@method renderIsolate
	**/

	var i;

	for ( i = 0; i < this.layers.length; i++ ) {
		if ( this.layers[ i ].hasTag( "Isolate" ) ) {
			this.renderIsolateLayer( this.layers[ i ], this.layers[ i - 1 ] );
		}
	}
};


EagleBrdRenderer.prototype.renderIsolateLayer = function( layer, viaSource ) {

	/**
	Render an isolate layer, either prepreg or core.

	@method renderIsolateLayer
	@param layer {EagleBrdRenderer.Layer} Layer to initialize and parse
	@param viaSource {EagleBrdRenderer.Layer} Layer with vias to use
	**/

	var ctx;

	layer.initBuffer();
	ctx = layer.ctx;
	ctx.save();

	// Stylize isolate
	ctx.fillStyle = this.colors.prepreg;


	// Fill with material
	// Alpha makes thicker isolate transmit less light in non-linear fashion;
	// this is a crude approximation of subsurface scattering in
	// resin-impregnated materials.
	ctx.save();
	ctx.globalAlpha = 1 - ( 1 / ( 1 + Math.pow( layer.thickness, 1 ) ) );
	ctx.fillRect( -this.offsetX, -this.offsetY, this.width , this.height );
	ctx.restore();

	// Cut vias
	ctx.globalCompositeOperation = "destination-out";
	this.drawHoles( {
		layer: layer,
		holes: viaSource.getElements( "via" )
	} );


	ctx.restore();


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

	var ctx, i, layerMatch, probeLayer, smds, vias,
		margin = this.parseDistanceMm( this.designRules.mlMinStopFrame ) *
			this.coordScale;

	// NOTE: This uses an inaccurate margin.
	// Offset should be derived from smd dimensions per designrules.
	// As I'm just reusing draw methods, I can't do that,
	// so I'm using the min mask values.

	layer.initBuffer();
	ctx = layer.ctx;


	// Derive associated copper layer
	for ( i = 0; i < this.layers.length; i++ ) {
		probeLayer = this.layers [ i ];
		if ( ( layer.hasTag( "Bottom" ) && probeLayer.hasTag( "Bottom" ) ) ||
				( layer.hasTag( "Top" ) && probeLayer.hasTag( "Top" ) ) &&
				probeLayer.hasTag( "Copper" ) ) {
			break;
		}
	}


	ctx.save();


	// Mask styles
	ctx.fillStyle = this.colors.solderMask;
	ctx.strokeStyle = this.colors.solderMask;
	ctx.lineCap = "round";


	// Fill with mask
	ctx.save();
	ctx.globalAlpha = this._maskOpacity;
	ctx.fillRect( -this.offsetX, -this.offsetY, this.width , this.height );
	ctx.restore();

	// Reveal traces
	ctx.save();
	ctx.globalCompositeOperation = "destination-out";
	ctx.globalAlpha = this._maskOpacity / 2;
	ctx.translate( -this.offsetX, this.height - this.offsetY );
	ctx.scale( 1, -1 );
	ctx.drawImage( probeLayer.buffer, 0, 0 );
	ctx.restore();




	// Silkscreen layer
	ctx.save();

	// Silkscreen styles
	ctx.fillStyle = this.colors.silkscreen;
	ctx.strokeStyle = this.colors.silkscreen;
	ctx.lineCap = "round";

	layerMatch = layer.hasTag( "Top" ) ?
		[ 21, 25, 27, 51 ] :
		[ 22, 26, 28, 52 ];
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
			layerMatch: layerMatch[ i ],
			stroke: true,
			fill: false
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

	layerMatch = layer.hasTag( "Top" ) ? 29 : 30;

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
		layerMatch: layerMatch,
		fill: true,
		stroke: false
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


EagleBrdRenderer.prototype.renderSolderpaste = function() {

	/**
	Render all solder paste textures.

	@method renderSolderpaste
	**/

	var i;

	for ( i = 0; i < this.layers.length; i++ ) {
		if ( this.layers[ i ].hasTag( "Solderpaste" ) ) {
			this.renderSolderpasteLayer( this.layers[ i ] );
		}
	}
};


EagleBrdRenderer.prototype.renderSolderpasteLayer = function( layer ) {

	/**
	Render a solderpaste layer, also known as a cream layer.

	@method renderSolderpasteLayer
	@param layer {EagleBrdRenderer.Layer} Layer to initialize and parse
	**/

	var ctx;

	layer.initBuffer();
	ctx = layer.ctx;
	ctx.save();

	// Stylize solder
	ctx.fillStyle = this.colors.solderPaste;


	// Draw rects
	this.drawRectangles( {
		layer: layer,
		rects: layer.getElements( "rectangle" )
	} );

	// Draw circles
	this.drawCircles( {
		layer: layer,
		circles: layer.getElements( "circle" )
	} );

	// Draw polys
	this.drawPolygons( {
		layer: layer,
		polys: layer.getElements( "polygon" )
	} );


	ctx.restore();


	// Apply bounds mask
	ctx.save();
	ctx.globalCompositeOperation = "destination-in";
	ctx.translate( -this.offsetX, this.height - this.offsetY );
	ctx.scale( 1, -1 );
	ctx.drawImage( this.getLayer( "Bounds" ).buffer, 0, 0 );
	ctx.restore();
};


EagleBrdRenderer.prototype.sortWires = function( wires ) {

	/**
	Sort the wires in a list so that they connect end-to-end
	whenever possible.

	Wires may be reversed to fit into sequence.

	Duplicate wires will be discarded. Note that duplication only considers
	endpoints, not curvature.

	@method sortWires
	@param wires {array} List of wires to sort
	@return {array} Sorted list
	**/

	var connected, duplicated, i, j, wire, wires2, x0, x1, x2, y0, y1, y2;

	// Copy original array for destructive operations
	wires = wires.slice();
	wires2 = [];


	// Eliminate duplicate wires
	for ( i = 0; i < wires.length; i++ ) {

		x1 = wires[ i ].getAttribute( "x1" );
		x2 = wires[ i ].getAttribute( "x2" );
		y1 = wires[ i ].getAttribute( "y1" );
		y2 = wires[ i ].getAttribute( "y2" );

		duplicated = false;

		for ( j = i + 1; j < wires.length; j++ ) {

			if (
				(

					// Test for direct duplicates
					x1 === wires[ j ].getAttribute( "x1" ) &&
					x2 === wires[ j ].getAttribute( "x2" ) &&
					y1 === wires[ j ].getAttribute( "y1" ) &&
					y2 === wires[ j ].getAttribute( "y2" )
				) ||
				(

					// Test for reversed duplicates
					x1 === wires[ j ].getAttribute( "x2" ) &&
					x2 === wires[ j ].getAttribute( "x1" ) &&
					y1 === wires[ j ].getAttribute( "y2" ) &&
					y2 === wires[ j ].getAttribute( "y1" )
				) ) {

				duplicated = true;
			break;
			}
		}

		if ( !duplicated ) {
			wires2.push( wires[ i ] );
		} else {
			// console.log( "DEBUG: Removed duplicate wire" );
		}
	}
	wires = wires2;
	wires2 = [];




	// Order wires
	while ( wires.length ) {

		// console.log( "DEBUG: Starting wire loop" );

		// Seed arbitrary loop member
		wire = wires.shift();
		wires2.push( wire );

		// Collect connectable wire segments
		while ( true ) {

			// Update wire terminus
			x2 = wire.getAttribute( "x2" );
			y2 = wire.getAttribute( "y2" );

			// Update wire origin
			x0 = wires2[ 0 ].getAttribute( "x1" );
			y0 = wires2[ 0 ].getAttribute( "y1" );

			connected = false;

			for ( i = 0; i < wires.length; i++ ) {

				// Check near end of wire
				x1 = wires[ i ].getAttribute( "x1" );
				y1 = wires[ i ].getAttribute( "y1" );

				if ( x1 === x2 && y1 === y2 ) {

					// console.log( "DEBUG: Wire to end" );

					// Wire K connects
					wire = wires.splice( i, 1 )[ 0 ];
					wires2.push( wire );
					connected = true;

					break;
				}

				if ( x1 === x0 && y1 === y0 ) {

					// console.log( "DEBUG: Wire to start, inverted" );

					// Wire K connects to start of queue when inverted
					wires2.unshift( wires.splice( i, 1 )[ 0 ] );
					connected = true;

					// Swap ends
					wires2[ 0 ].setAttribute(
						"x1", wires2[ 0 ].getAttribute( "x2" ) );
					wires2[ 0 ].setAttribute(
						"y1", wires2[ 0 ].getAttribute( "y2" ) );
					wires2[ 0 ].setAttribute(
						"x2", x1 );
					wires2[ 0 ].setAttribute(
						"y2", y1 );
					if ( wires2[ 0 ].hasAttribute( "curve" ) ) {
						wires2[ 0 ].setAttribute(
							"curve",
							"" +
							-parseFloat( wires2[ 0 ].getAttribute( "curve" ) )
						);
					}

					break;
				}

				// Check far end of wire
				x1 = wires[ i ].getAttribute( "x2" );
				y1 = wires[ i ].getAttribute( "y2" );

				if ( x1 === x2 && y1 === y2 ) {

					// console.log( "DEBUG: Wire to end, inverted" );

					// Wire K connects when inverted
					wire = wires.splice( i, 1 )[ 0 ];
					wires2.push( wire );
					connected = true;

					// Swap ends
					wire.setAttribute( "x2", wire.getAttribute( "x1" ) );
					wire.setAttribute( "y2", wire.getAttribute( "y1" ) );
					wire.setAttribute( "x1", x1 );
					wire.setAttribute( "y1", y1 );
					if ( wire.hasAttribute( "curve" ) ) {
						wire.setAttribute(
							"curve",
							"" +
							-parseFloat( wire.getAttribute( "curve" ) ) );
					}

					break;
				}

				if ( x1 === x0 && y1 === y0 ) {

					// console.log( "DEBUG: Wire to start" );

					// Wire K connects to start of queue
					wires2.unshift( wires.splice( i, 1 )[ 0 ] );
					connected = true;

					break;
				}
			}

			// Break if nothing could be connected
			if ( connected === false ) {
				break;
			}
		}
	}

	return wires2;
};


EagleBrdRenderer.prototype.viewConnectors = function( show ) {

	/**
	Set connector handle visibility.

	@method viewConnectors
	@param [show=true] {boolean} Whether to show connectors or not
	**/

	var i;

	show = show === false ? false : true;

	for ( i = 0; i < this.connectorHandles.length; i++ ) {
		this.connectorHandles[ i ].visible = show;
	}
};


EagleBrdRenderer.prototype.viewGhosts = function( show ) {

	/**
	Set ghost device visibility. These are just an approximation of
	possible devices, inferred from pad positions.

	@method viewGhosts
	@param [show=true] {boolean} Whether to show ghosts or not
	**/

	show = show === false ? false : true;

	this.ghostPackages.visible = show;
};


EagleBrdRenderer.prototype.visualizeConnector = function( connector, color ) {

	/**
	Put a wireframe dome over a `Connector` object to indicate its position.
	This method will not create geometry unless `params.visualize` was set
	to `true`.

	@method visualizeConnector
	@param connector {Object3D} Connector to which to append geometry
	@param [color="rgb( 255, 255, 0 )"] {string} Color of wireframe
	@return {THREE.Mesh} Wireframe entity
	**/

	var mesh;

	color = color || "rgb( 255, 255, 0 )";

	mesh = new THREE.Mesh(
			new THREE.SphereGeometry(
				32, 8, 2, 0, Math.PI * 2, 0, Math.PI / 2 ),
			new THREE.MeshBasicMaterial( {
				color: color,
				wireframe: true
			} ) );

	connector.add( mesh );

	this.connectorHandles.push( mesh );

	return mesh;
};


EagleBrdRenderer.prototype.viewComponents = function( show, componentMapCfg ) {

	/**
	Set electronic components visibility.

	@method viewComponents
	@param [show=false] {boolean} Whether to load and
	   display models of the components on the PCB or not.
	@param [componentMapCfg] {object/Array of objects} One or more
	   model library map configuration(s) to use instead of the default
	   standard library map. Including an empty object `{}` will cause
	   the default standard library map to be loaded at that point.
	   Earlier maps override later maps if they share a package name.
	   This makes it possible to override a model in the standard library
	   if desired, e.g. a board is using an outdated footprint.
	@param [componentMapCfg.mapUrl] {string} URL for the file that
	   contains the "component package name" to "model file path" mapping.
	@param [componentMapCfg.urlPrefix] {string} (Optional) URL
	   prefix to prepend to the model file path when loading model file.
	**/

	const DEFAULT_MAP_URL = "components.json"; // TODO: Make hosted version the default?
	var mapsToLoad = [];

	if (!show) {
		return;
	}

	this.components = new THREE.Object3D();
	this.root.add(this.components);

	if (componentMapCfg) {
		mapsToLoad = mapsToLoad.concat(componentMapCfg); // Works for single map or array of maps.
	} else {
		mapsToLoad.push({mapUrl: DEFAULT_MAP_URL});
	}

	var self = this;

	mapsToLoad.forEach(function(mapCfg) {
		// Note: This implementation allows multiple model URL prefixes to be
		//       supplied for the default map URL, which might be bad, useful or useless.
		// Note: This implementation also allows the default standard library to be loaded
		//       by supplying an empty object.
		self.loadComponentMap(mapCfg.mapUrl || DEFAULT_MAP_URL, mapCfg.urlPrefix);
	});
};


EagleBrdRenderer.prototype.loadComponentMap = function( url, modelUrlPrefix ) {

	/**
	Load a "Component Map" file from supplied URL and add the
	mapping to the list of mappings we search to locate the
	model file for a component package.

	The "Component Map" file contains the "component package
	name" to "model file path" mapping required to locate the
	model file.

	Loading a component map triggers population of all footprints
	with matching component package names.

	Can be used to supply additional component mappings to
	supplement the "standard library" mapping shipped with Eagle-Loader.

	@method loadComponentMap
	@param [url] {string} URL for the "Component Map" file
	   to load.
	@param [modelUrlPrefix] {string} (Optional) URL prefix to
	   prepend to the model file path when loading model file.
	**/

	var self = this;

	var loader = new THREE.XHRLoader();
	loader.responseType = "json";
	loader.load(url, function (response) {
		// TODO: Ensure values in more recent maps override older maps?
		self._componentMaps.push({"meta": {"urlPrefix": modelUrlPrefix},
				          "map": response}); // TODO: Do some additional validation of the response?
		self._populateAllFootprints();
	});
}


EagleBrdRenderer.prototype._getModelInfo = function( packageName ) {

	/**
	Retrieve URL (and related information) of the model file
	mapped to the supplied component package name (if found).

	Searches all the loaded component maps.

	The related information returned is that which is found in
	the component mapping file (e.g. rotation & scale modifications
	required to display the model correctly) and varies with
	each component.

	@method _getModelInfo
	@param [packageName] {string} Name of the component package to find.
	@return {object} `.url` contains the full URL. Also `.rotation` & `.scale` etc may be present.
	@private
	**/

	var modelInfo = undefined;
	var activeComponentMapCfg = undefined;

	// Use of `.some()` is ill-advised workaround for lack of
	// ability to break out of `forEach()`.
	// See: <http://stackoverflow.com/questions/2641347/how-to-short-circuit-array-foreach-like-calling-break>
	this._componentMaps.some( function ( componentMapCfg ) {
		activeComponentMapCfg = componentMapCfg;
		modelInfo = componentMapCfg.map[packageName];
		return modelInfo;
	});

	if (modelInfo) {
		if (!modelInfo.hasOwnProperty("packageName")) {
			modelInfo.packageName = packageName;
		}
		if (!modelInfo.hasOwnProperty("url")) {
			modelInfo.url = (activeComponentMapCfg.meta.urlPrefix || "") + modelInfo.filename;
		}
	}
	return modelInfo;
}


EagleBrdRenderer.prototype._populateAllFootprints = function() {

	/**
	Triggered when a component map file is successfully loaded.

	Ensures all the required & available component package model
	files are loaded.

	Then triggers actual placement of component package models
	for matching footprints on the board.

	@method _populateAllFootprints
	@private
	**/


	var self = this;

	var stlloader = new THREE.STLLoader();

	this._componentMaterial = new THREE.MeshPhongMaterial({
		color: 0xAAAAAA,
		specular: 0x111111,
		shininess: 200
	} );

	// TODO: Handle model loading and footprint populating separately?

	// The first time a component package type is encountered
	// loading of the associated model occurs. When the model is
	// successfully loaded all component footprints using that
	// package are populated.
	this.connectElements.forEach(function (connector) {
		var packageName = connector.userData.package.getAttribute("name");
		var modelInfo = self._getModelInfo(packageName);
		if (modelInfo && !modelInfo.hasOwnProperty("_cache")) {
			modelInfo._cache = null; // Indicates model is in process of being loaded.
			stlloader.load(modelInfo.url, function ( geometry ) {
				self._populateFootprintsWithModel(geometry, modelInfo);
			});
		};
	});
};


EagleBrdRenderer.prototype._shouldPopulate = function(element) {

	/**
	Determine if a particular component footprint should be
	populated. Used to determine if a component package model
	should be displayed.

	Factors used to determine whether a component should be
	populated are based on observed conventions in sample
	`.brd` files. These heuristics are fallible, not least
	because humans aren't known for their consistency...

	The heuristic can be overridden for a specific element
	by supplying a `shouldPopulate` hash to `EagleBrdRenderer`
	constructor.

	@method _shouldPopulate
	@param [element] {Element} Eagle `element` instance.
	@return {boolean} Whether model should be displayed.
	@private
	**/

	var status = true;

	var elementName = element.getAttribute("name");

	if (this._shouldPopulateOverride.hasOwnProperty(elementName)) {
		status = this._shouldPopulateOverride[elementName];
	} else {
		var elementValue = element.getAttribute("value");

		// SparkFun sometimes specifies a value in `PROD_ID` Eagle attribute.
		// TODO: Actually check the attribute is `PROD_ID`?
		var eagleAttributes = element.getElementsByTagName("attribute")

		status = (elementValue != "DNP") // "Do Not Place"
			&& (!!elementValue || (eagleAttributes.length && !!eagleAttributes[0].getAttribute("value")));
	}

	return status;
}


EagleBrdRenderer.prototype._populateFootprintsWithModel = function( geometry, modelInfo ) {

	/**
	Actually place component package models for all the matching footprints
	on the board that the design indicates should be populated.

	@method _populateFootprintsWithModel
	@param [geometry] {THREE.Geometry} Loaded geometry of component
	   package model specified by `modelInfo`.
	@param [modelInfo] {object} See `_getModelInfo` for properties.
	@private
	**/

	// "Normalise" scale, orientation and position of model
	// TODO: Implement other properties.
	if (modelInfo.rotation) {
		// Angles in the component map JSON file are expressed in degrees,
		// so are converted to radians before use.
		geometry.rotateX(modelInfo.rotation.x * (Math.PI / 180) || 0);
		geometry.rotateY(modelInfo.rotation.y * (Math.PI / 180) || 0);
		geometry.rotateZ(modelInfo.rotation.z * (Math.PI / 180) || 0);
	}

	if (modelInfo.scale) {
		geometry.scale(modelInfo.scale.x || 1.0, modelInfo.scale.y || 1.0, modelInfo.scale.z || 1.0);
	}

	// Our default behaviour is to center models (on X & Y axis) around the
	// origin (0, 0) as most footprints have their origins at their center.
	// Since many models are already centered this is frequently redundant
	// but there seems little benefit from handling those cases separately.
	//
	// If a footprint has an origin that is not at its center then we assume
	// the model is correctly non-centered also & thus we indicate the library
	// should not center the model by specifying `"center": false` in the
	// component map file.
	//
	// While we could attempt to handle these variations "automatically" the
	// footprint file format seems to require us to calculate the origin point
	// which is non-trivial. Additionally, for the moment, manually specifying
	// that a model shouldn't be centered seems easier than automatic detection.
	//
	// Note also: The footprint origin issue also impacts on the positioning
	//            of Connectors on component models.
	if (!(modelInfo.hasOwnProperty("center") && (modelInfo.center == false))) {
		// Based on `THREE.Geometry.center()` but ignoring Z axis.
		geometry.computeBoundingBox();
		var offset = geometry.boundingBox.center().negate();
		geometry.translate(offset.x, offset.y, 0);
	}

	// TODO: Document required scale in models for this to work.
	geometry.scale(this.coordScale, this.coordScale, this.coordScale);
	geometry.computeBoundingBox();

	var mesh =  new THREE.Mesh(geometry, this._componentMaterial);
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	modelInfo._cache = mesh;

	var self = this;

	// Now that model is loaded, actually populate the footprints (except those marked "Do Not Populate").
	this.connectElements.forEach(function (footprintConnector) {
		if ((footprintConnector.userData.package.getAttribute("name") == modelInfo.packageName) &&
		    (self._shouldPopulate(footprintConnector.userData.element))) {
			var cachedRotation = self.root.rotation; // Workaround due to Connector not
			self.root.rotation.set(0,0,0);           // handling rotation of PCB correctly.

			var component = modelInfo._cache.clone();
			self.components.add(component);

			component.connector = new THREE.Connector();
			component.connector.master = component;

			component.connector.rotation.x = Math.PI / 2; // Horizontal

			// The footprint Connector is positioned at the origin (0, 0)
			// which is usually, but not always, the center of the footprint.
			//
			// We position the component model connector at the origin (0, 0)
			// of the model--which by default is the center of the model
			// (because we center the model by default) but will not be the
			// center of correctly modeled components for non-centered
			// footprints.
			//
			// This should result in the correct placement of a component model
			// in relation to its footprint--if placement is not correct,
			// either the model needs to be repositioned to match the footprint
			// or we need to add more sophisticated detection of correct placement.
			component.connector.position.x = 0;
			component.connector.position.y = 0;

			component.add(component.connector);
			component.connector.connectTo(footprintConnector);

			self.root.rotation.copy(cachedRotation); // Second part of workaround.
		}
	});
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

	/**
	Angle measurement in radians

	@property angle {number}
	**/
	this.angle = parseFloat( ang.match( /[0-9.]+/ ) ) * Math.PI / 180;

	/**
	Whether the angle includes a horizontal mirror

	@property mirror {boolean}
	@default false
	**/
	this.mirror = ang.indexOf( "M" ) === -1 ? false : true;

	/**
	Whether the angle includes a vertical spin

	@property spin {boolean}
	@default false
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

	var ang, chordIndex, chordPrecedent, verts,
		curve, x1, x2, y1, y2;

	// Parse feed
	if ( chord.getAttribute ) {
		if ( chord.tagName === "wire" ) {
			curve = parseFloat( chord.getAttribute( "curve" ) );
			x1 = parseFloat( chord.getAttribute( "x1" ) );
			x2 = parseFloat( chord.getAttribute( "x2" ) );
			y1 = parseFloat( chord.getAttribute( "y1" ) );
			y2 = parseFloat( chord.getAttribute( "y2" ) );
		} else if ( chord.tagName === "vertex" ) {
			verts = chord.parentNode.getElementsByTagName( "vertex" );
			chordIndex = verts.indexOf( chord );
			chordPrecedent = verts[ chordIndex - 1 ];
			if ( !chordPrecedent ) {
				console.warn( "No prior vertex, aborting ChordData" );
				return;
			}
			curve = parseFloat( chord.getAttribute( "curve" ) ) || 0;
			x1 = parseFloat( chordPrecedent.getAttribute( "x" ) );
			y1 = parseFloat( chordPrecedent.getAttribute( "y" ) );
			x2 = parseFloat( chord.getAttribute( "x" ) );
			y2 = parseFloat( chord.getAttribute( "y" ) );
		}
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

	ang = this.bearing + Math.PI / 2 - this.curve / 2;

	/**
	Radius of chord arc. Per chord identity,
	chord = 2 * radius * sin( angle / 2 ), rearranged to acquire radius.

	@property radius {number}
	**/
	this.radius = this.chord / ( 2 * Math.sin( this.curve / 2 ) );

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

	if ( this.curve > 0 && this.bearing2 < this.bearing1 ) {
		this.bearing2 += Math.PI * 2;
	}
	if ( this.curve < 0 && this.bearing2 > this.bearing1 ) {
		this.bearing2 -= Math.PI * 2;
	}
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
		@param [params.visible=true] {boolean} Whether this layer is
			part of the physical board
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

	/**
	Depth displacement of layer relative to board origin.
	Note that greater height will position the layer further from the camera.

	@property height {number}
	@default 0
	**/
	this.height = params.height || 0;

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

	/**
	Whether this layer is part of the physical board

	@property visible
	@default true
	**/
	this.visible = params.visible === false ? false : true;
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

	var extent1, extent2, i, oldLayer,
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
				case 27:
					el.setAttribute( "layer", "28" );
					layer = 28;
					break;
				case 28:
					el.setAttribute( "layer", "27" );
					layer = 27;
					break;
				case 51:
					el.setAttribute( "layer", "52" );
					layer = 52;
					break;
				case 52:
					el.setAttribute( "layer", "51" );
					layer = 51;
					break;
			}
		};

	if ( layer ) {

		// NOTE: This doesn't respect layer visibility yet.

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


EagleBrdRenderer.Layer.prototype.buildGeometry = function() {

	/**
	Construct layer geometry. Paste the texture onto a rectangle.

	@method buildGeometry
	**/

	var i, j, x, y,
		matOptions = {
			transparent: true,
			bumpScale: 1,
			// side: THREE.DoubleSide
		};

	/**
	Geometry for layer, consisting of two flat planes

	@property geometry {THREE.BoxGeometry}
	**/
	this.geometry = new THREE.BoxGeometry(
		this.board.width, this.board.height, this.thickness );

	// Just use faces 8-11 for the top and bottom
	this.geometry.faces = this.geometry.faces.slice( 8, 12 );
	this.geometry.elementsNeedUpdate = true;

	// Flip bottom face UVs
	for ( i = 2; i < 4; i++ ) {
		for ( j = 0; j < this.geometry.faceVertexUvs[ 0 ][ i ].length; j++ ) {
			x = this.geometry.faceVertexUvs[ 0 ][ i ][ j ].x;
			y = this.geometry.faceVertexUvs[ 0 ][ i ][ j ].y;
			this.geometry.faceVertexUvs[ 0 ][ i ][ j ] =
				new THREE.Vector2( 1 - x, y );
		}
	}
	this.geometry.uvsNeedUpdate = true;


	/**
	Texture for layer

	@property texture {THREE.Texture}
	**/
	this.texture = new THREE.Texture( this.buffer );
	this.texture.needsUpdate = true;

	matOptions.map = this.texture;
	matOptions.bumpMap = this.texture;
	if ( this.hasTag( "Copper" ) || this.hasTag( "Solderpaste" ) ) {
		matOptions.specularMap = this.texture;
		matOptions.shininess = this._shininess;
	}

	/**
	Material for layer

	@property material {THREE.Material}
	**/
	this.material = new this.board.material( matOptions );

	/**
	Mesh for layer; THREE scene component

	@property mesh {THREE.Mesh}
	**/
	this.mesh = new THREE.Mesh( this.geometry, this.material );

	this.mesh.position.z -= this.height + this.thickness / 2;
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

	if ( ang.mirror ) {
		this.ctx.scale( -1, 1 );
	}
	if ( ang.spin ) {
		this.ctx.scale( 1, -1 );
	}

	this.ctx.rotate( ang.angle );
};
;THREE.BRDLoader = function ( manager ) {

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

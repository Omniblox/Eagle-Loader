/*

EAGLE .BRD Loader for THREE.js

David ten Have, St. Zeno Exploration Ltd.

This script is a helper for loading the output of EagleBrdRenderer into a THREE.js environment

*/



THREE.BRDLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

/**
@class THREE.BRDLoader
**/

THREE.BRDLoader.prototype = {

	constructor: THREE.BRDLoader,

  /**
  The load call for the .brd loader

  @method THREE.BRDLoader.load
	@param url {String} .brd file URL
	@param brdParams {object} Composite parameter object describing params for rendering the .brd file
		@param [brdParams.color] {object} Define custom colors; see `this.colors`
		@param [brdParams.composite=true] {boolean} Whether to composite layers,
			or render them as individual geometries. Warning: individual
			layers are very slow.
		@param [brdParams.maskOpacity=0.8] {number} Opacity of solder mask;
			opacity is halved over copper traces
		@param [brdParams.pixelMicrons=35] {number} Resolution of texture maps.
			By default, this is 35 microns, equal to the thickness
			of a default copper layer. Note that this will affect the
			size of the board geometry.
		@param [brdParams.material="phong"] {string} Material shader to use.
			Options include `"phong"` for realistic lighting,
			`"lambert"` for flat lighting, and `"basic"` for no lighting.
		@param [brdParams.viewConnectors=false] {boolean} Whether to visualize
			Connector objects
		@param [brdParams.viewGhosts=false] {boolean} Whether to draw
			approximate ghosts of on-board devices
  @param onLoad {function} Will be called when load completes. The argument will be the loaded Object3D.
  @param [onProgress] {function} Will be called while load progresses. The argument will be the XmlHttpRequest instance, that contain .total and .loaded bytes.
  @param [onError] {function} Will be called when load errors.
	**/

	load: function ( url, brdParams, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		//loader.setCrossOrigin( this.crossOrigin );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text, brdParams ) );

		}, onProgress, onError );

	},

  /**
	Construct the EagleBrdRenderer object THREE.js geometry (brd.root), bearing composited textures from all layers.

  @method THREE.BRDLoader.parse
  @param data {String} The contents of the .brd file as a string
  @param brdParams {object} Composite parameter object describing params for rendering the .brd file
    @param [brdParams.color] {object} Define custom colors; see `this.colors`
    @param [brdParams.composite=true] {boolean} Whether to composite layers,
      or render them as individual geometries. Warning: individual
      layers are very slow.
    @param [brdParams.maskOpacity=0.8] {number} Opacity of solder mask;
      opacity is halved over copper traces
    @param [brdParams.pixelMicrons=35] {number} Resolution of texture maps.
      By default, this is 35 microns, equal to the thickness
      of a default copper layer. Note that this will affect the
      size of the board geometry.
    @param [brdParams.material="phong"] {string} Material shader to use.
      Options include `"phong"` for realistic lighting, `"lambert"` for flat lighting, and `"basic"` for no lighting.
    @param [brdParams.viewConnectors=false] {boolean} Whether to visualize Connector objects
    @param [brdParams.viewGhosts=false] {boolean} Whether to draw approximate ghosts of on-board devices
  @private
	**/

	parse: function ( data, brdParams ) {

    var parser = new DOMParser();
    var xmlBrd = parser.parseFromString(data, "text/xml");
    brd = new EagleBrdRenderer( xmlBrd, brdParams );

    return brd;
  }

}

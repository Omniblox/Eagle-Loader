# EAGLE .brd Renderer

Benjamin D. Richards,
Gamelab

David ten Have,
St Zeno Exploration Ltd

Copyright (c) 2016, St. Zeno Exploration Ltd.

## About Script

This script loads and renders a visualisation of a PCB (printed circuit board). It uses a `.brd` file created by CadSoft EAGLE, version 6.0 or later. These versions store the board details as XML.

The script visualizes the PCB as a THREE.js model. It incorporates `Connector` objects, allowing it to be connected to other geometric objects. There are several options for generating the PCB.

The script is not 100% accurate, and should not be used for critical applications. It is intended as a visualization aid only. Every opportunity has been taken to indicate where more work is needed.


## Files and Folders

	docs/						Auto-generated API documentation.
	eagle/						Example `.brd` files
		eagle.dtd				Explanation of EAGLE XML format
		eagle-xml-notes.md				Notes on the structure of EAGLE XML format
	examples/				Examples
	lib/						Files necessary for the script to run
	src/						The script
	gruntfile.js				Build systems
	package.json				Build systems
	README.md					This file


## Using Script

First, copy the THREE.js library and Connector script from `lib/`, and the eagle-brd-renderer script from `src/`. Ensure that you load them in this order: THREE, Connector, eagle-brd-renderer. See the examples for examples.

To create a PCB model using default options, use the following:

```js
var brd = new EagleBrdRenderer( xml );
```

where `xml` is an XML document loaded from a `.brd` file.

To display the PCB model in your THREE.js scene, do as follows:

```js
scene.add( brd.root );
```

You may customize the PCB model upon generation; for example:

```js
var brd = new EagleBrdRenderer( xml, {
	color: {
		solderMask: "rgb( 32, 168, 64 )"
	},
	pixelMicrons: 70,
	material: "basic",
	viewConnectors: true
} );
```

This will create a PCB with green masking, at half the standard resolution (of 35 microns per pixel), using a basic flat material instead of Phong lighting, with handles displayed for the auto-generated connectors.

You may also toggle connector and ghost visibility with `brd.viewConnectors( true )` and `brd.viewGhosts( true )`. Ghosts are approximations of certain mounted devices on the PCB.

You can use the BRDLoader (src/BRDLoader.js) in a similar manner. First, copy the THREE.js library and Connector script from `lib/`. Then take the eagle-brd-renderer and BRDLoader script from `src/`. Ensure that you load them in this order: THREE, Connector, eagle-brd-renderer, BRDLoader. To load the .brd file into an existing script do the following:

```js
var url = 'path/to/file.brd';
var brdParams = {
	color: {
		solderMask: "rgb( 32, 168, 64 )"
	},
	pixelMicrons: 70,
	material: "basic",
	viewConnectors: true
}

var loader = new THREE.BRDLoader();
loader.load( url, brdParams, function ( brd ) {
	product.boardData = brd;
	showMesh(product);
} );
```

This will create a PCB with green masking, at half the standard resolution (of 35 microns per pixel), using a basic flat material instead of Phong lighting, with handles displayed for the auto-generated connectors.

For more details and examples, consult the API documentation in `docs/` and the examples folders.


## Future Development

The following improvements would be most useful:

* Generate full bump and specular map passes as well as color.
* Generate texture maps using `<signal>` elements, rather than collections of components. This will allow the script to correctly layer copper traces, connect to ground planes, and process orphans.
* Ensure that copper polygons may fuse properly with pads according to EAGLE rules.
* Investigate the method whereby thermals are generated. Does it involve `<pin>` elements?
* The current board edges are defined by wire cuts. If these are not present, no bounds will be generated. A `<polygon>` element tagged as OUTLINES may be a valid alternative, but this has not been implemented or tested yet.
* Text orientation is sometimes different to physical board samples.
* Gold coating is not interpreted.

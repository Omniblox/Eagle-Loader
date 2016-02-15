# EAGLE .brd Renderer

Benjamin D. Richards
Gamelab


## About Script

This script loads and renders a visualisation of a PCB (printed circuit board). It uses a `.brd` file created by CadSoft EAGLE, version 6.0 or later. These versions store the board details as XML.

The script visualizes the PCB as a THREE.js model. It incorporates `Connector` objects, allowing it to be connected to other geometric objects. There are several options for generating the PCB.


## Files and Folders

	brd/						Example `.brd` files
		eagle.dtd				Explanation of EAGLE XML format
	docs/						Auto-generated API documentation.
	example-view-connections/	See an example of connected PCBs
	example-view-model/			See an example of a rendered PCB
	example-view-textures/		See an example of PCB textures
	lib/						Files necessary for the script to run
	src/						The script
	eagle-xml-notes.md			Notes on the structure of EAGLE XML format
	gruntfile.js				Build systems
	package.json				Build systems
	README.md					This file


## Using Script

First, copy the THREE.js library and Connector script from `lib/`, and the visualizer script from `src/`. Ensure that you load them in this order: THREE, Connector, visualizer. See the examples for examples.

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

For more details and examples, consult the API documentation in `docs/` and the examples folders.

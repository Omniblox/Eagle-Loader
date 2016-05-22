# EAGLE .brd Loader

Benjamin D. Richards,
Gamelab

David ten Have,
St. Zeno Exploration Ltd

Copyright (c) 2016, St. Zeno Exploration Ltd.

## About Script

Looking to create printed circuit boards (PCBs)? Look no further. This script loads and renders them visually using a .brd file: created by CadSoft EAGLE (version 6.0 or later).

There are a number of ways to create PCBs, but this script visualizes them as THREE.js models -- which incorporates Connector objects; allowing PCBs to sync with other geometric objects. Board details are stored as XML.

We’re still working on this, so the script isn’t 100% accurate. With that in mind, it’s probably best to use this as a visualization aid only -- so don’t use it for to build anything ‘mission critical’ (for now...). And we’ve done our best to flag stuff that needs sorting.


## Files and Folders

	dist/EagleLoader.js          This is the file you're looking for
	docs/						Auto-generated API documentation
	eagle/					   Example `.brd` files
		eagle.dtd				Explanation of EAGLE XML format
		eagle-xml-notes.md	   Notes on the structure of EAGLE XML format
	examples/				    Examples
	lib/						 Files necessary for the script to run
	src/						 The script
	gruntfile.js		         Build systems
	package.json				 Build systems
	README.md					This file


## Using Script

Start by copying the `THREE.js` library `lib/` -- then load the `EagleLoader.js` script from `dist/`.

Here’s how to load the .brd file into an existing THREE.js scene:

```javascript
var url = 'path/to/file.brd';
var brdParams = {
    colors: {
        solderMask: "rgb( 32, 168, 64 )"
    },
    pixelMicrons: 70,
    material: "basic",
    viewConnectors: true
}

var loader = new THREE.BRDLoader();
loader.load( url, brdParams, function ( brd ) {
    scene.add(brd.root);
} );
```

This will create a PCB with green masking -- at half the standard resolution (of 35 microns per pixel) -- using a basic flat material instead of Phong lighting, displayed with auto-generated connector handles.

For more details and examples, take a closer look at the API documentation in `docs/` and the `examples/` folders.

## Future Development

We know these features would be great; so we’re working on them:
* Generate full bump and specular map passes -- as well as color.
* Generate texture maps using `<signal>` elements, rather than collections of components. This will allow the script to correctly layer copper traces, connect to ground planes, and process orphans.
* Ensure that copper polygons fuse properly with pads according to EAGLE rules.
* Investigate how thermals are generated. Does it involve <pin> elements?
* The current board edges are defined by wire cuts. If these are not present, no bounds will be generated. A `<polygon>` element tagged as OUTLINES may be a valid alternative, but this has not been implemented or tested yet.
* Text orientation is sometimes different to physical board samples.
* Gold coating can’t be interpreted.

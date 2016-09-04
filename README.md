# EAGLE .brd Loader

Benjamin D. Richards,
[Gamelab](http://gamefroot.com/)

David ten Have,
St. Zeno Exploration Ltd

Copyright (c) 2016, St. Zeno Exploration Ltd.

## About Script

Looking to render printed circuit boards (PCBs)? Look no further. This script loads and renders them visually using a .brd file created by CadSoft EAGLE (version 6.0 or later).

There are a number of ways to render PCBs, but this script visualizes them as [THREE.js](http://threejs.org/) models.

We’re still working on this, so the script isn’t 100% accurate. With that in mind, it’s probably best to use this as a visualization aid only -- so don’t use it for to build anything ‘mission critical’ (for now...). And we’ve done our best to flag stuff that needs sorting.

This script assumes **one circuit board per .brd file**.

This script works best with THREE.js r76 or later.

## Files and Folders

File| Description
----|------------
`dist/EagleLoader.js` | This is the file you're looking for
`docs/` | Auto-generated API documentation
`eagle/`|Notes on the structure of EAGLE XML format
`examples/`|Examples
`examples/brd-files`| Example files from [adafruit](http://adafru.it) and [SparkFun](http://sparkfun.com)
`lib/`|Files necessary for the script to run
`src/`|The source code
`gruntfile.js`|Build systems
`package.json`|Build systems
`README.md`	| This file

## Using Script

Start by copying the `THREE.js` library from `lib/` then load the `EagleLoader.js` script from `dist/`.

Here’s how to load the .brd file into an existing THREE.js scene:

```javascript
var url = 'path/to/file.brd';
var brdParams = {
    colors: {
        solderMask: "rgb( 32, 168, 64 )"
    },
    pixelMicrons: 70,
    material: "basic"
}

var loader = new THREE.BRDLoader();
loader.load(
    url,
    brdParams,
    function ( brd ) {
        scene.add(brd.root);
    },
    undefined,
    undefined,
    [ "./OCRA.woff", "./OCRA.otf" ] );
```

This will create a PCB with green masking -- at half the standard resolution (of 35 microns per pixel) -- using a basic flat material instead of Phong lighting, displayed with auto-generated connector handles.

For more details and examples, take a closer look at the API documentation in `docs/` and the `examples/` folders.

### Using Fonts

For correct board display, you must include the OCR-A font. Find `OCRA.woff` and `OCRA.otf` in the `dist/` folder, alongside the main script.

You may place these files in any folder, but ensure that you call `load()` with the `fontPath` parameter set.

This version of the OCR-A font was created by Matthew Skala and is public domain. See `assets/fonts/ocr-0.2/` for more information.

If you do not want to load the font files, you must specify `fontPath` as `null`. Otherwise the loader will wait forever, trying to validate nonexistent files.

## Future Development

We know these features would be great; so we’re working on them:
* Sort out board thicknesses
* Generate full bump and specular map passes -- as well as color.
* Generate texture maps using `<signal>` elements, rather than collections of components. This will allow the script to correctly layer copper traces, connect to ground planes, and process orphans.
* Ensure that copper polygons fuse properly with pads according to EAGLE rules.
* Investigate how thermals are generated. Does it involve <pin> elements?
* The current board edges are defined by wire cuts. If these are not present, no bounds will be generated. A `<polygon>` element tagged as OUTLINES may be a valid alternative, but this has not been implemented or tested yet.
* Text orientation is sometimes different to physical board samples.
* Fonts need tweaking
* Gold coating can’t be interpreted.

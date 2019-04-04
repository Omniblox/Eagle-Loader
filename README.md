# EAGLE .brd Loader

Benjamin D. Richards,
[Gamelab](http://gamefroot.com/)

David ten Have,
[omniblox.io](https://omniblox.io)

Philip Lindsay,
[RancidBacon.com](http://rancidbacon.com/)

Copyright (c) 2016, Omniblox Ltd.

## About Script

Looking to render printed circuit boards (PCBs)? Look no further. This script loads and renders them visually using a .brd file created by CadSoft EAGLE (version 6.0 or later).

There are a number of ways to render PCBs, but this script visualizes them as [THREE.js](http://threejs.org/) models.

We’re still working on this, so the script isn’t 100% accurate. With that in mind, it’s probably best to use this as a visualization aid only -- so don’t use it for to build anything ‘mission critical’ (for now...). And we’ve done our best to flag stuff that needs sorting.

This script assumes **one circuit board per .brd file**.

This script is designed for THREE.js r79 or later.

## Files and Folders

File| Description
----|------------
`dist/EagleLoader.js` | This is the file you're looking for
`dist/OCRA.otf`, `dist/OCRA.woff` | Required font files
`assets/` | Source files for fonts and other assets required to run this script
`docs/` | Auto-generated API documentation
`eagle/`| Notes on the structure of EAGLE XML format
`examples/`| Examples
`examples/brd-files/`| Example files from [adafruit](http://adafru.it) and [SparkFun](http://sparkfun.com)
`lib/`| Files necessary for the script to run
`src/`| The source code
`gruntfile.js`| Build systems
`package.json`| Build systems
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

Currently, we do not have access to the vector font used by EAGLE software. We allow you to specify your own font for text elements on the board, or default to a system monospace font.

For an approximate board display, you may include the OCR-A font. Find `OCRA.woff` and `OCRA.otf` in the `dist/` folder, alongside the main script. You may place these files in any folder, but ensure that you call `load()` with the `fontPath` parameter set.

This version of the OCR-A font was created by Matthew Skala and is public domain. See `assets/fonts/ocr-0.2/` for more information.

## Showing Components

This library has the ability to place components on the rendering of the BRD file. To do that you need to provide the BRD file, a directory of STL models and a component map. The file `examples/components.html` shows how to arrange this correctly.

Start by copying the `THREE.js` library and the `STLLoader.js` library from `lib/` then load the `EagleLoader.js` script from `dist/`.

Here’s how to load the .brd file with components into an existing THREE.js scene:

```javascript
var url = 'path/to/file.brd';

var brdParams = {
  colors: {
    solderMask: "rgb( 255, 0, 0 )"
  },
  viewComponents: true,
  componentMapCfg: {mapUrl: "path/to/components/map.json"},
};

loader = new THREE.BRDLoader();
loader.load(
  url,
  brdParams,
  function ( board ) {
    addToScene(board);
  });
```

The component map is a list that maps package names to geometry files. At present these are only STL files. The basic example is:

 ```javascript
 {
  "0603-CAP": {
   "filename": "models/sparkfun/redstick/passive/ceramic_smd/0603/0603-CAP.stl"
  },
  "0603-RES": {
   "filename": "models/sparkfun/redstick/passive/resistors/0603/0603-RES.stl"
  }
}
```

To orient component geometry correctly you can rotate and scale it.

```javascript
{
  "SOT23-3": {
    "filename": "models/sparkfun/redstick/semiconductors/IC_SMD/SOT/SOT23-3.STL",
    "rotation": {
      "x": 90,
      "z": 180
    }
  },
  "TQFP32-08": {
    "filename": "models/sparkfun/redstick/semiconductors/IC_SMD/TQFP/TQFP32-08/TQFP32-08.stl",
    "scale": {
      "x": 0.001,
      "y": 0.001,
      "z": 0.001
    }
  }
}
```

NOTE: If you don't include the STLLoader the BRD file will still render - but no components will display. Look for the following error in your javascript console: `You need to add THREE.STLLoader to see components on your BRD file.`


## Development

Want to make your own modifications to the library? Here's how to get
started...

### Setup the development environment

 * Get the source code:

        git clone https://github.com/Omniblox/Eagle-Loader.git

 * Install the build system (we use Grunt, for more details see <http://gruntjs.com/getting-started#installing-the-cli>):

        npm install -g grunt-cli

 * Install the dependencies for the project (see <http://gruntjs.com/getting-started#working-with-an-existing-grunt-project>):

        cd Eagle-Loader
        npm install

 * Trigger a build with:

        grunt

   This will place the updated library in the `dist/` subdirectory.

   Note: You will need to re-run the `grunt` command whenever you edit
         the source code in `src` in order for your changes to be
         available to the included examples.


## Future Development

We know these features would be great; so we’re working on them:

* Generate full bump and specular map passes -- as well as color.
* Generate texture maps using `<signal>` elements, rather than collections of components. This will allow the script to correctly layer copper traces, connect to ground planes, and process orphans.
* Ensure that copper polygons fuse properly with pads according to EAGLE rules.
* Investigate how thermals are generated. Does it involve <pin> elements?
* The current board edges are defined by wire cuts. If these are not present, no bounds will be generated. A `<polygon>` element tagged as OUTLINES may be a valid alternative, but this has not been implemented or tested yet.
* Fonts need tweaking: we can't use the built-in vector font from EAGLE.
* Gold coating can’t be interpreted.

# Geometric Approach Proposal

Benjamin D. Richards
Gamelab

## Objective

Render an Eagle BRD file as a PCB (printed circuit board) in 3D, with connection data provided for those devices that should be mounted on the PCB.

## Development

I had initially thought to construct the PCB as a piece of composite geometry. Copper layers would be built as super-thin prisms carved out of a single monolithic layer.

However, this seems likely to create massively heavy geometry, resulting in unmanageably slow scenes and a lot of complicated geometrical computations on my end. Further, it is ignoring the great strength of a PCB.

A PCB is essentially an _image_.

I've been researching the manufacture process, and it really is a complex, very clever, printing process. Layers of copper are specifically treated as layered images, with care taken to avoid any variance with depth, and thus are essentially two-dimensional. Only holes are exempt to this rule.

The PCB is thus a stack of 2D images, with a few 3D holes.

## Proposed Approach

### Summary

A PCB is rendered as a series of textured slices. Board edges and holes are represented as 3D geometry. Devices are indicated as Connectors. All other board features are represented by texture information.

### Specification

A given layer of PCB is rendered to a texture. Texture resolution is reasonably high. This texture is applied to a layer geometry, which is a highly flattened cuboid. Texture is applied to top and bottom of the cuboid, so that the PCB may be viewed in layers if desired. The sides of the cuboid will not be textured, and may be discarded.

Layer cuboids are stacked to form the composite PCB. This is very similar to the standard PCB manufacture process.

The boundaries of the board are generally indicated in a "Dimension" layer of the BRD. These may be used as a draw mask. In this way, the textures will become transparent around the edges, in whatever pattern the board designer specified.

As transparent edges would permit viewers to look into the interior of a layer around the edges, we also use the boundary data in "Dimension" to generate a strip of boundary geometry. This is a simple strip of quads. It is likely to contain most of the geometry for the layer, particularly if there are curved corners.

"Via" and "Hole" components can punch through the entire board. These are represented by cylinders, textured on the interior with the appropriate material (coated or uncoated). All layer textures will have a transparent section applied over holes and vias.

As textures have a minimum resolution, but geometry does not, some overlap or fuzziness may occur around the edges of boards or holes. This may be resolved by adding a small geometric lip. The lip direction is easy to calculate for holes. It may be very difficult to compute for board edges; the overall curvature of the initial edge is easy, but cutout slots inside the board pose a problem. It is simplest to generate the edge border with some thickness, rather than a simple strip.

Textures will be drawn to an HTML5 canvas. This is a good tool for the task. It is a path-oriented system, much like the Gerber Format to which BRD is exported for manufacture. It supports masks, filled polygons, and direct pixel manipulation, which will all be important for tasks such as copper fill areas and safe zones around signal paths.

PCBs are slightly transparent. The texture layers will be rendered with this slight transparency, depending on the material at any given point, allowing viewers to see copper beneath the solder mask, etc. (The PCB can also be exploded into layers, to provide a better look.) This will look pretty boss, as the layers are sufficiently thin to give the impression of volumetric depth.

Textures for the border and uncoated hole elements are taken directly from the layer texture. UV coordinates for the texture are functionally equivalent to XY coordinates of the vertices. Although this means Z-oriented polygons are rendered with stretchy textures, this is actually an accurate depiction of a slice through a board.

Specular highlights are an important part of observing board function. Users should be able to distinguish metal from mask. Some level of aesthetic styling goes into the texturing.

Devices placed upon the board are represented by "Connector" objects, with some metadata concerning the element specified in the BRD.

### Issues

Circuit data will be represented by textures on invisible cuboids. This means that the geometric boundaries of the PCB will not be the visual boundaries. Collision detection will be a considerably more complex issue, should it become necessary.

I feel that the speed and comprehensibility advantages gained from the texture approach outweight this issue. In addition, the border geometry is available for more advanced collision detection, although extra work would be required.

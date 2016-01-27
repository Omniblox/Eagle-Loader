# EAGLE XML Notes

I'm looking at the BRD file for the [Adafruit CC3000](https://github.com/adafruit/Adafruit-CC3000-Breakout-PCB/blob/master/Adafruit%20CC3000%20Breakout.brd).

## Main sections

* eagle
	- drawing
		+ settings
			* setting
			* ...
		+ grid
		+ layers
			* layer
			* ...
		+ board
			* plain
				- wire, text, etc
				- ...
			* libraries
				- library
					+ description
					+ packages
						* package
							- description
							- smd, wire, text, circle...
							- ...
						* ...
			* attributes
			* variantdefs
			* classes
				- class
			* designrules
				- description
				- ...
				- param
				- ...
			* autorouter
				- pass
					+ param etc
					+ ...
			* elements
				- element
					+ attribute
					+ ...
				- ...
			* signals
				- signal
					+ contactref
					+ ...
					+ wire, via, polygon etc
						* vertex (for polygon)
						* ...
					+ ...
	- compatibility
		+ note
		+ ...

## Design Rules

As found in `eagle.drawing.board.designrules`:

Param					|	Description
------------------------|---
layerSetup				|	Layer combination process. Complex rules.
mtCopper				|	Thickness of copper layers in order.
mtIsolate				|	Thickness of isolation layers in order.
mdWireWire				|	**Layout**. Min clearance between signal wires.
mdWirePad				|	"
mdWireVia				|	"
mdPadPad				|	"
mdPadVia				|	"
mdViaVia				|	"
mdSmdPad				|	"
mdSmdVia				|	"
mdSmdSmd				|	"
mdViaViaSameLayer		|	"
mnLayersViaInSmd		|	???
mdCopperDimension		|	**Layout**. Min dist between copper and board edge.
mdDrill					|	**Layout**. Min dist between drill holes.
mdSmdStop				|	???
msWidth					|	Min signal wire width. Override by "net classes".
msDrill					|	Min drill. Override by "net classes".
msMicroVia				|	Min micro via. May be undefined.
msBlindViaRatio			|	Min blind via drill ratio to layer thickness.
rvPadTop				|	Rest ring around holes: percentage of drill.
rvPadInner				|	"
rvPadBottom				|	"
rvViaOuter				|	"
rvViaInner				|	"
rvMicroViaOuter			|	"
rvMicroViaInner			|	"
rlMinPadTop				|	Rest ring min.
rlMaxPadTop				|	Rest ring max. Ignored if outers are set larger.
rlMinPadInner			|	"
rlMaxPadInner			|	"
rlMinPadBottom			|	"
rlMaxPadBottom			|	"
rlMinViaOuter			|	"
rlMaxViaOuter			|	"
rlMinViaInner			|	"
rlMaxViaInner			|	"
rlMinMicroViaOuter		|	"
rlMaxMicroViaOuter		|	"
rlMinMicroViaInner		|	"
rlMaxMicroViaInner		|	"
psTop					|	Shapes: Pads. May default.
psBottom				|	"
psFirst					|	"
psElongationLong		|	Long pad. Percentage of diameter, both sides.
psElongationOffset		|	Offset pad. Percentage of diameter, "right" side.
mvStopFrame				|	Mask stop. Exclusion around pads, vias, SMDs.
mvCreamFrame			|	Cream stop. Internal around SMDs only.
mlMinStopFrame			|	"
mlMaxStopFrame			|	"
mlMinCreamFrame			|	"
mlMaxCreamFrame			|	"
mlViaStopLimit			|	Stop masks only for drills larger than this.
srRoundness				|	SMD corner roundness.
srMinRoundness			|	"
srMaxRoundness			|	"
slThermalIsolate		|	Supply. Thermal length subtracting pad from poly.
slThermalsForVias		|	Whether to create thermals. 0/1.
dpMaxLengthDifference	|	**Layout**.
dpGapFactor				|	**Layout**.
checkGrid				|	**Layout**.
checkAngle				|	**Layout**.
checkFont				|	**Layout**.
checkRestrict			|	**Layout**.
useDiameter				|	Appears to correspond to rest ring inner diameters.
maxErrors				|	???

There are 3 terms I can't find a correspondence to in EAGLE 7.5.0 Light:

	mnLayersViaInSmd
	mdSmdStop
	maxErrors

I shall have to assume they're obsolete data and can be ignored.

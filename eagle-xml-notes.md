# EAGLE XML Notes

I'm looking at the BRD file for the [Adafruit CC3000](https://github.com/adafruit/Adafruit-CC3000-Breakout-PCB/blob/master/Adafruit%20CC3000%20Breakout.brd).

Main sections:

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
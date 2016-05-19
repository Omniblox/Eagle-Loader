module.exports = function( grunt ) {

	grunt.initConfig( {

		pkg: grunt.file.readJSON( "package.json" ),

		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src: ['lib/connector.js', 'src/eagle-brd-renderer.js', 'src/BrdLoader.js'],
				dest: 'dist/<%= pkg.name %>.js'
			}
		},
		clean: {
			docs: {
				src: [ "docs" ]
			}
		},

		copy: {
			temp: {
				expand: true,
				cwd: "src/",
				src: "**",
				dest: "temp/"
			}
		},

		yuidoc: {
			compile: {
				name: "<%= pkg.name %>",
				description: "<%= pkg.description %>",
				version: "<%= pkg.version %>",
				url: "<%= pkg.homepage %>",
				options: {
					extension: ".js",
					paths: "src/",
					outdir: "docs/"
				}
			}
		}

	} );


	/*
	To install new tasks in the terminal:
	`npm install grunt-contrib-clean --save-dev`
	*/
	grunt.loadNpmTasks( "grunt-contrib-clean" );
	grunt.loadNpmTasks( "grunt-contrib-copy" );
	grunt.loadNpmTasks( "grunt-contrib-yuidoc" );
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.registerTask(
		"default",
		[
			"all"
		] );
	grunt.registerTask(
		"docs",
		[
			"clean:docs",
			"yuidoc:compile"
		] );
	grunt.registerTask(
		"all",
		[
			"docs",
			"concat"
		] );
};

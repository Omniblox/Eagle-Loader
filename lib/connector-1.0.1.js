var Connector = function() {

	/**
	* The Connector is a spatial alignment tool. It can be used to align a "master" `Object3D` such that both Connectors have the same position and orientation.
	*
	* Use `connectTo` in order to align the current master to another Connector. You may mirror or rotate the alignment at this time.
	*
	* By default, the Connector is its own master. You may set the `master` property to an `Object3D` to change this behaviour, or to `null` to restore default behaviour. Note that the Connector should be a child or sub-child of such an external master, so that their spatial relationship does not change upon alignment.
	*
	* Connector has a property called `normalVector`. This is linked to the object's rotation information. Consult this vector to see what direction the Connector is pointing, or set it using a `THREE.Vector3` to set the Connector's orientation by vector.
	*
	* Important note: Connector expects to be oriented in the same space as its master. If the master becomes the child of another object, which has non-zero rotations, Connector will not behave as expected. In addition, if a child between the master and the connector has non-zero rotations, similar unexpected results will occur. Please keep the Connector oriented to the master, and keep the master away from rotated spaces.
	*
	* Change log:
	* 1.0.1:
	* - Overcome degenerate quaternions when vector aligns with up axis. No longer a limitation.
	* 1.0.0: Initial release
	*
	* @class Connector
	* @constructor
	*/

	THREE.Object3D.call( this );

	this.type = "Connector";

	/**
	* Internal record of master
	*
	* @property _master
	* @type THREE.Object3D
	* @default null
	* @private
	*/
	this._master = null;
};


Connector.prototype = Object.create( THREE.Object3D.prototype );
Connector.prototype.constructor = Connector;


Object.defineProperties(
	Connector.prototype,
	{
		master: {

			/**
			* Current master of this Connector
			*
			* @property master
			* @type THREE.Object3D
			* @default null
			*/

			get: function() {
				if ( this._master == null ) {
					return this;
				} else {
					return this._master;
				}
			},
			set: function( value ) {
				if ( value instanceof THREE.Object3D ) {
					this._master = value;

					// TODO - perhaps check whether scene hierarchy
					// would advise this relationship.
					// If master is a child of the Connector,
					// things might get screwy.
					// If Connector is not a child of the master,
					// a warning may be appropriate.
				} else if ( value == null ) {
					this._master = null;
				} else {
					console.error(
						"Master must be instance of THREE.Object3D" );
				}
			}
		},
		normalVector: {

			/**
			* Vector describing the orientation of this Connector.
			* Should not be parallel to the `up` vector.
			*
			* @property normalVector
			* @type THREE.Vector3
			*/

			get: function() {
				return this.up.clone().applyEuler( this.rotation );
			},
			set: function( value ) {
				if ( value instanceof THREE.Vector3 ) {
					this.quaternion.setFromAxisAngle(
						axis.clone().normalize(), 0 );
				} else {
					console.error( "Axis must be instance of THREE.Vector3" );
				}
			}
		}
	} );


// Axial offset used to enable mirroring when axes are aligned
Connector.prototype.offsetQuaternionAxes = new THREE.Quaternion();
Connector.prototype.offsetQuaternionAxes.set(
	Math.SQRT1_2, 0, 0, Math.SQRT1_2 );
Connector.prototype.offsetQuaternionAxesInverse = new THREE.Quaternion();
Connector.prototype.offsetQuaternionAxesInverse.copy(
	Connector.prototype.offsetQuaternionAxes );
Connector.prototype.offsetQuaternionAxesInverse.inverse();


Connector.prototype.connectTo = function( connector, mirror, rotation ) {

	/**
	* Align the master to the specified Connector.
	*
	* @method connectTo
	* @param connector {Connector} Connector to which to align
	* @param [mirror=false] {boolean} Whether to reverse the direction of this
	*	Connector
	* @param [rotation=0] {number} How far to rotate about the up-axis of this
	*	Connector
	* @return {Connector} This object
	*/

	var axis, norm, slaveQuat,
		offset = new THREE.Quaternion(),
		offsetInverse = new THREE.Quaternion();

	// Update matrices in case method was called before rendering began
	this.master.updateMatrixWorld( true );
	connector.master.updateMatrixWorld( true );

	// Get inverse slave quaternion
	slaveQuat = this.quaternion.clone().inverse();

	// Get Connector vector
	if ( mirror === true || !isNaN( rotation ) ) {
		norm = this.normalVector;
	}

	// Apply mirror
	// This could be set up by the user, but it's not always trivial to reverse a rotation in three dimensions.
	if ( mirror === true ) {
		if ( norm.equals( this.up ) ) {

			// That is, this is axis-aligned and thus degenerate
			// Fix this by temporarily offsetting by a known quaternion
			offset = this.offsetQuaternionAxes;
			offsetInverse = this.offsetQuaternionAxesInverse;
		}

		// Define axis of rotation as orthogonal to the plane formed by the up vector and the rotations, i.e. `norm`. Rotate a half-turn.
		axis = new THREE.Vector3();
		axis.copy( norm );
		axis.applyQuaternion( offset );
		axis.cross( this.up );
		axis.applyQuaternion( offsetInverse );
		slaveQuat.multiply(
			new THREE.Quaternion().setFromAxisAngle( axis, Math.PI ) );
	}

	// Apply rotation
	// This could be incorporated into the Connector's own spatial orientation, but there are use scenarios where the Connector should be rigid while its alignment changes.
	// The Connector's `up` vector is used as the axis of rotation.
	// This must be modified by the local rotation of the Connector.
	if ( !isNaN( rotation ) ) {
		slaveQuat.multiply(
			new THREE.Quaternion().setFromAxisAngle( norm, rotation ) );
	}

	// Quaternion connection
	this.master.quaternion.copy( connector.getWorldQuaternion() )
		.multiply( slaveQuat );

	// Update matrix so as to have correct positions to the newly rotated connector
	this.master.updateMatrixWorld( true );

	// Reposition
	this.master.position.add(
		connector.getWorldPosition().sub( this.getWorldPosition() ) );

	// One final update, so everything is guaranteed to be aligned for further operations
	this.master.updateMatrixWorld( true );

	return this;
};


Connector.prototype.clone = function() {

	/**
	* Return a duplicate of this Connector.
	*
	* @method clone
	* @return Connector
	*/

	return new this.constructor().copy( this );
};


Connector.prototype.copy = function( source ) {

	/**
	* Copy properties of this Connector from another Connector.
	*
	* @method copy
	* @param source [Connector] Target connector
	* @return {Connector} This Connector
	*/

	THREE.Object3D.prototype.copy.call( this, source );

	this._master = source._master;

	return this;
};

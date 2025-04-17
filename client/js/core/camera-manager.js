// Camera Manager for handling camera initialization and view modes

function CameraManager() {
    this.camera = null;
    this.viewMode = 'firstPerson'; // Default to first-person view
    this.playerHeight = 2.0;

    this.init = function() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.rotation.order = 'YXZ'; // Important for correct rotation order
        this.setFirstPersonView();
        console.log("Camera initialized at position:", this.camera.position);
        return this.camera;
    };

    this.setFirstPersonView = function() {
        this.viewMode = 'firstPerson';
        window.isFirstPerson = true;
        window.viewMode = 'firstPerson';
        this.camera.position.set(0, this.playerHeight, 5); // Start slightly above ground
        this.camera.lookAt(0, this.playerHeight, 0); // Look forward to ensure terrain visibility
        console.log("First-person view set with camera at:", this.camera.position);
    };

    this.setThirdPersonView = function() {
        this.viewMode = 'thirdPerson';
        window.isFirstPerson = false;
        window.viewMode = 'thirdPerson';
        // Additional third-person camera setup can be added here if needed
        console.log("Third-person view set");
    };

    this.setFreeCameraView = function() {
        this.viewMode = 'freeCamera';
        window.isFirstPerson = false;
        window.viewMode = 'freeCamera';
        window.isFreeCameraMode = true;
        console.log("Free camera view set");
    };

    this.setRTSView = function() {
        this.viewMode = 'rtsView';
        window.isFirstPerson = false;
        window.viewMode = 'rtsView';
        window.isRTSMode = true;
        this.camera.position.set(0, window.rtsCameraHeight, 0);
        this.camera.lookAt(0, 0, 0);
        console.log("RTS view set with camera at:", this.camera.position);
    };

    this.getCamera = function() {
        return this.camera;
    };

    this.updateCameraAspect = function(width, height) {
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    };

    this.updateCameraPosition = function(position) {
        if (this.camera) {
            this.camera.position.copy(position);
        }
    };

    this.updateCameraQuaternion = function(quaternion) {
        if (this.camera) {
            this.camera.quaternion.copy(quaternion);
        }
    };
}

// Instantiate Camera Manager and make it globally available
window.cameraManager = new CameraManager();
console.log("CameraManager initialized and available as window.cameraManager");

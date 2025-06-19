document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('helloBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            alert('Привет!');
        });
    }
});

// Вращающийся куб с помощью Three.js
const cubeContainer = document.getElementById('cube-container');
if (cubeContainer && window.THREE) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 300/200, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(300, 200);
    cubeContainer.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 3;

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
} 
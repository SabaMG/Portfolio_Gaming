import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Reflector } from 'three/examples/jsm/objects/Reflector';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const ThreeScene: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());

    useEffect(() => {
        const scene = new THREE.Scene();
        // Create a GLTFLoader instance
        const loader = new GLTFLoader();

        // Load the GLB model
        loader.load(
            '/models/Gaming Room PSD Pro.glb', // Path to the model file
            (gltf) => {
                const model = gltf.scene;
                model.position.set(0, -0.16, 0); // Adjust position as needed
                scene.add(model);
            },
            undefined,
            (error) => {
                console.error('An error occurred while loading the model', error);
            }
        );

        scene.background = new THREE.Color(0x111111);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(-5, 5, 10);
        cameraRef.current = camera;
        // Disable right-click context menu
        window.addEventListener('contextmenu', (event) => event.preventDefault());



        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current?.appendChild(renderer.domElement);

        // Ground with fading, glossy reflection
        const groundGeometry = new THREE.PlaneGeometry(500, 500);

        // Create the Reflector
        const groundMirror = new Reflector(groundGeometry, {
            color: 0x888888, // Base gray color for the reflection
            textureWidth: window.innerWidth * 2,
            textureHeight: window.innerHeight * 2,
            clipBias: 0.003,
        });
        groundMirror.rotation.x = -Math.PI / 2;
        groundMirror.position.y = 0.01; // Slightly above ground
        scene.add(groundMirror);

        // Create a gradient overlay to fade the reflection
        function createGradientTexture() {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 512;
        
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Failed to get 2D context");
            }
        
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, "rgba(0, 0, 0, 1)"); // Black at the top
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Transparent at the bottom
        
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            // Convert the canvas to a texture
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }
        
        
        const gradientTexture = createGradientTexture();
        gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
        gradientTexture.wrapT = THREE.ClampToEdgeWrapping;

        const groundOverlayMaterial = new THREE.MeshBasicMaterial({
            map: gradientTexture,
            transparent: true,
            opacity: 0.5, // Adjust opacity for subtlety
        });
        const groundOverlay = new THREE.Mesh(groundGeometry, groundOverlayMaterial);
        groundOverlay.rotation.x = -Math.PI / 2;
        groundOverlay.position.y = 0.015; // Slightly above the mirror for blending
        scene.add(groundOverlay);




        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Reduced intensity to 0.2
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.6); // Reduced intensity to 0.6
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);


        // Panel and Buttons
        const panelGeometry = new THREE.PlaneGeometry(2, 3);
        const panelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(-5, 3, 0);
        scene.add(panel);

        // Function to create a colorful button with outline and text
        function createStyledButton(text: string, color: number, outlineColor: number, font: Font) {
            const buttonGroup = new THREE.Group();

            // Button background
            const buttonGeometry = new THREE.BoxGeometry(1.5, 0.5, 0.1);
            const buttonMaterial = new THREE.MeshBasicMaterial({ color });
            const button = new THREE.Mesh(buttonGeometry, buttonMaterial);

            // Outline (dark border)
            const outlineGeometry = new THREE.BoxGeometry(1.55, 0.55, 0.1);
            const outlineMaterial = new THREE.MeshBasicMaterial({ color: outlineColor });
            const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
            outline.position.z = -0.01;

            // Text
            const textGeometry = new TextGeometry(text, {
                font: font,
                size: 0.15,
                height: 0.02,
            });
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const buttonText = new THREE.Mesh(textGeometry, textMaterial);
            buttonText.position.set(-0.6, -0.1, 0.06);

            buttonGroup.add(outline);
            buttonGroup.add(button);
            buttonGroup.add(buttonText);

            return buttonGroup;
        }

        // Define camera positions and focus points for each button
        const cameraPositions = [
            { position: { x: 0, y: 2, z: 0 }, target: { x: 0, y: -10, z: -50 } },    // Projects - Camera near the TV
            { position: { x: 0, y: 4.3, z: 0 }, target: { x: 0, y: -10, z: -50 } }, // Articles - Focus on center
            { position: { x: -1, y: 4, z: -10 }, target: { x: 45, y: -15, z: -1 } },   // About Me - Focus on desk
            { position: { x: 0, y: 10, z: 0 }, target: { x: 0, y: 0, z: 0 } }, // Crédit - Focus on center
        ];

        // Updated function to animate both position and focus point
        const changeCameraAngle = (index: number) => {
            if (cameraRef.current) {
                const { position, target } = cameraPositions[index];
                
                // Group both animations in a gsap.timeline to ensure they run together
                const timeline = gsap.timeline();
        
        
                // Animate the controls target (focus point) at the same time
                timeline.to(controls.target, {
                    x: target.x,
                    y: target.y,
                    z: target.z,
                    duration: 2, // Same duration to keep the animations in sync
                    onUpdate: () => {controls.update()}, // Update controls at each step
                }); // Start both animations at the same time

                // Animate camera position
                timeline.to(cameraRef.current.position, {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    duration: 2,
                    onUpdate: () => {controls.update()}, // Update controls to reflect the current target position
                }, 0);
            }
        };
        



        // Load Font and Add Styled Buttons to Panel
        const fontLoader = new FontLoader();
        let buttons: THREE.Group[] = []; // Store button groups for click detection

        fontLoader.load(
            'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
            (font) => {
                // Define panel button configurations
                const buttonConfigs = [
                    { text: "Projects", color: 0xff0055, outline: 0x000000 },
                    { text: "Articles", color: 0xffaa00, outline: 0x000000 },
                    { text: "About Me", color: 0x00aaff, outline: 0x000000 },
                    { text: "Credits", color: 0xffcc33, outline: 0x000000 },
                ];

                // Create and position each button on the panel
                buttonConfigs.forEach((btn, index) => {
                    const button = createStyledButton(btn.text, btn.color, btn.outline, font);
                    button.position.set(0, (index-1.5) * -0.7, 0.05);
                    panel.add(button);
                    buttons.push(button); // Add to buttons array for click detection
                });
            }
        );



        // Detect Mouse Clicks on Buttons
        const onMouseClick = (event: MouseEvent) => {
            if (!mountRef.current) return;

            // Convert mouse position to normalized device coordinates
            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.current.setFromCamera(mouse.current, cameraRef.current!);
            const intersects = raycaster.current.intersectObjects(buttons, true);

            if (intersects.length > 0) {
                const clickedButtonIndex = buttons.findIndex((btn) => btn === intersects[0].object.parent);
                if (clickedButtonIndex !== -1) {
                    changeCameraAngle(clickedButtonIndex);
                }
            }
        };

        window.addEventListener('click', onMouseClick);

        // Orbit Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        // Enable only rotation (orbit) around the target
        controls.enablePan = false; // Disable panning, so the camera position cannot change


        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.maxPolarAngle = Math.PI / 2.2; // Prevents camera from going below the ground
        controls.minPolarAngle = 0; // Prevents camera from looking straight up
        // Optional horizontal rotation limits
        controls.minAzimuthAngle = -Math.PI / 2; // Left boundary
        controls.maxAzimuthAngle = Math.PI / 10;  // Right boundary
        controls.minDistance = 5;
        controls.maxDistance = 50;

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            // Update controls
            controls.update();
        
            // Constrain camera position within bounds
            const maxX = 10, minX = -10;
            const maxY = 10, minY = 1;
            const maxZ = 10, minZ = -10;
        
            camera.position.x = Math.max(minX, Math.min(maxX, camera.position.x));
            camera.position.y = Math.max(minY, Math.min(maxY, camera.position.y));
            camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
            renderer.render(scene, camera);
        }

        animate();


        // Fonction pour gérer le redimensionnement
        const onWindowResize = () => {
            if (cameraRef.current && renderer) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                
                // Met à jour le rapport d'aspect de la caméra et la matrice de projection
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();

                // Redimensionne le renderer
                renderer.setSize(width, height);
                renderer.setPixelRatio(window.devicePixelRatio);
            }
        };

        // Ajoute un écouteur d'événement pour le redimensionnement de la fenêtre
        window.addEventListener('resize', onWindowResize);



        // Cleanup on unmount
        return () => {
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
            window.removeEventListener('click', onMouseClick);
            window.removeEventListener('resize', onWindowResize); // Nettoyage de l'écouteur resize
        };
    }, []);

    return <div ref={mountRef} />;
};

export default ThreeScene;

// class manages the webGL graphics pipleline
// responsible for shader compilation, buffer management and rendering of bodies in 3D space

export class srenderer {
    constructor(canvas) {

        // initialises the WebGl rendering context for the provided HTML canvas
        this.gl = canvas.getContext('webgl');
        
        // error handling for legacy browsers or systems without gpu acceleration
        if (!this.gl) {
            alert("WebGL not supported");
            return;
        }
        // ensures that closer objects hide objects behind them
        this.gl.enable(this.gl.DEPTH_TEST);

        // vertex Shader: handles 3D coordinate transformations per vertex
        // turns 3D coords into 2D clip space using matrix multiplication
        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;

            uniform mat4 uModelViewMatrix;         //combined worlds and camera transforms
            uniform mat4 uProjectionMatrix;        // handles field of view

            varying vec3 vNormal;                  // pass normal to fragment shader for lighting
            varying vec3 vPosition;                 // pass position for distance-based calculations

            void main() {

                // calculates position relative to camera
                vec4 viewPosition = uModelViewMatrix * aVertexPosition;
                gl_Position = uProjectionMatrix * viewPosition;

                vNormal = aVertexNormal;
                vPosition = viewPosition.xyz;
            }
        `;

        // fragment shader: determines the colour and lightin of each pixel
        const fsSource = `
            precision mediump float;
            varying vec3 vNormal;
            uniform vec3 uColour;
            varying vec3 vPosition;
            uniform float uIsSun;
            
            void main() {
                if (uIsSun > 0.5){
                    // the sun has no shading as it's the sun
                    gl_FragColor = vec4(uColour, 1.0);

                } else  {
                    // direction vector from current fragment to the origin (the Sun)
                    vec3 lightDir = normalize(vec3(0.0, 0.0, 0.0) - vPosition);

                    float intensity = 3.0;

                    // calculates diffuse lighting using the dot product (lambertian reflection)
                    float light = max(dot(normalize(vNormal), lightDir), 0.2) * intensity; // minimum ambient light level of 0.2

                    gl_FragColor = vec4(uColour * light, 1.0); 
                }   
            }
        `;
        
        // compiles shaders and links them into a usable gpu program
        this.programInfo = this.initShaderProgram(vsSource, fsSource);

        //stores coordinate history
        this.trailPos = {};
        this.trailBuffer = this.gl.createBuffer();
        
        // generates sphere geomentry (unit radius)
        this.sphereData = this.createSphere(1, 24, 24);

        // loads the generated geometry into VRAM
        this.setupBuffers();
    }
    
    // The Graphics Pipeline
    // compiles shader source and links them into a single executable program on the GPU
    initShaderProgram(vsSource, fsSource) {

        // Helper function to compile individual shader source code 
        const loadShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        // Links fragment and vertex shaders into a single pipline
        const gl = this.gl;
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();

        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);  
        
        // checks for linking errors - helps debugging GLSL code
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialise the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        
        // stores attribute and uniform locations for efficient lookup during render
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                uIsSun: gl.getUniformLocation(shaderProgram, 'uIsSun'), 
            },
        };
    }
    //generates a sphere using spherical coordinates (longitude and latiitude)
    createSphere(radius, latBands, lonBands) {
        const positions = [];
        const normals = [];
    
        for (let lat = 0; lat <= latBands; lat++) {
            let theta = lat * Math.PI / latBands; //angle from vertical axis
            let sinTheta = Math.sin(theta);
            let cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= lonBands; lon++) {
                let phi = lon * 2 * Math.PI / lonBands; //angle around horizontal axis

                // convert spherical coords to cartesian
                let x = Math.cos(phi) * sinTheta;
                let y = cosTheta;
                let z = Math.sin(phi) * sinTheta;
            
                positions.push(radius * x, radius * y, radius * z);
                normals.push(x, y, z); //unit vector normal for lighting 
            } 
        }
        return { 
            positions: new Float32Array(positions), 
            normals: new Float32Array(normals), 
        };
    }
     // initialises vertex buffer objects (VBOs) and maps them to GPU memory
    setupBuffers() {
        const gl = this.gl;

        // create and populate position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphereData.positions, gl.STATIC_DRAW);
        
        // create and populate normal buffer
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphereData.normals, gl.STATIC_DRAW);
  
    }

    //binds buffers to shader attributes before a draw call
    bindBuffers() {

        const gl = this.gl;
        
        // connects position VBO to the 'aVertexPosition' shader attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

        // connects normal VBO to the 'aVertexNormal' shader attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
    }

    //the main render loop - iterates through sim state and draws each object
    render(state, scale, cameraX, cameraY, cameraZ, showTrails) {
        const gl = this.gl;
        
        //adjusts canvas to predefined canvas
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear depth buffer and resets canvas background
        gl.clearColor(0.0, 0.0, 0.05, 1.0); // Dark space blue
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //setup perspective projection matrix (field of view, aspect ratio, near far clippings )
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 10000.0);

        gl.useProgram(this.programInfo.program);

        const view = - cameraZ;

        // loops through each body in the sim state
        state.bodies.forEach(body => {
        
            if (!this.trailPos[body.name]) {
                this.trailPos[body.name] = [];
            }

            // Push current scaled position into history
            this.trailPos[body.name].push(
                body.position.x * scale, 
                body.position.y * scale, 
                body.position.z * scale
            );

            // Limit trail length to 500 points to prevent memory leaks
            if (this.trailPos[body.name].length > 1500) { // 500 points * 3 coords
                this.trailPos[body.name].splice(0, 3);
            }

            //draws trails if enabled
            if (showTrails) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.trailBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.trailPos[body.name]), gl.DYNAMIC_DRAW);
                
                // Re-use the modelViewMatrix but reset it to just Camera transformations
                const trailMVMatrix = mat4.create();
                mat4.translate(trailMVMatrix, trailMVMatrix, [cameraX, cameraY, -cameraZ]);

                gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, trailMVMatrix);
                gl.uniform3fv(gl.getUniformLocation(this.programInfo.program, "uColour"), body.colour || [1, 1, 1]);

                // Set the position attribute for the lines
                gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

                // Draw as a connected strip of lines
                gl.drawArrays(gl.LINE_STRIP, 0, this.trailPos[body.name].length / 3);
            }

            const modelViewMatrix = mat4.create();
            
            // Moves the planet based on Python coordinates
            // multiplies coords by 'scale' to make sure they fit on screen
            mat4.translate(modelViewMatrix, modelViewMatrix, [
                body.position.x * scale + cameraX, 
                body.position.y * scale + cameraY, 
                body.position.z * scale + view // Pushes it back so the camera can see it
            ]);

            //gets the 4D clip space position
            const clipSpacePos = vec4.create();
            vec4.transformMat4(clipSpacePos, [0,0,0,1], modelViewMatrix); // Get centre of planet
            vec4.transformMat4(clipSpacePos, clipSpacePos, projectionMatrix);

            // converts to normalised coords (range -1 to 1)
            const coordsX = clipSpacePos[0] / clipSpacePos[3];
            const coordsY = clipSpacePos[1] / clipSpacePos[3];

            // map to actual pixel coordinates on the canvas
            body.screenX = (coordsX + 1) * gl.canvas.width / 2;
            body.screenY = (-coordsY + 1) * gl.canvas.height / 2; // Invert Y for screen space
                    
            // stores the real radius from the JSON
            const rad = body.radius;

            // logarithmic scaling formula
            let logScale = Math.log10(rad);

            // 'strength' controls how much the sizes are squashed together.
            const strength = 1.35; 

            // 'base' is a multiplier to make them visible at current depth.
            const base = 0.0075;
            let visualScale = Math.pow(logScale, strength) * base;
            mat4.scale(modelViewMatrix, modelViewMatrix, [visualScale, visualScale, visualScale]);

            //Tells the GPU which buffers to use
            this.bindBuffers();
    
            // Set uniform colour for this specific body
            const uColourLoc = gl.getUniformLocation(this.programInfo.program, "uColour");
            gl.uniform3fv(uColourLoc, body.colour || [1, 1, 1]);

            // setting the sun toggle
            const uIsSunLoc = this.programInfo.uniformLocations.uIsSun;
            if (body.name === "Sun") {
                gl.uniform1f(uIsSunLoc, 1.0); // Disable shading so the sun glows
            } else {
                gl.uniform1f(uIsSunLoc, 0.0); // Enable shading
            }

            // uploads the final matrices to the GPU
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            
            // executes the draw call on the GPU
            gl.drawArrays(gl.TRIANGLES, 0, this.sphereData.positions.length / 3);
        });
    }
}

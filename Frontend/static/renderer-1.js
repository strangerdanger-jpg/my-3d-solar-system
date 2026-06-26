// class manages the webGL2 graphics pipleline
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

            void main() {
                // direction vector from current fragment to the origin (the Sun)
                vec3 lightDir = normalize(vec3(0.0, 0.0, 0.0) - vPosition);

                // calculates diffuse lighting using the dot product (lambertian reflection)
                float light = max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.2); // minimum ambient light level of 0.2

                gl_FragColor = vec4(uColour * light, 1.0);    
            }
        `;
        
        // compiles shaders and links them into a usable gpu program
        this.programInfo = this.initShaderProgram(vsSource, fsSource);
        
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
            },
        };
    }
    //generates a sphere using spherical coordinates (longitude and latiitude)
    createSphere(radius, latBands, lonBands) {
        const positions = [];
        const normals = [];
        const uv = []; //
        const indices = [];//

        // generates vertex positions
        for (let lat = 0; lat <= latBands; lat++) {
            let theta = lat * Math.PI / latBands;
            let sinTheta = Math.sin(theta);
            let cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= lonBands; lon++) {
                let phi = lon * 2 * Math.PI / lonBands;
                let x = Math.cos(phi) * sinTheta;
                let y = cosTheta;
                let z = Math.sin(phi) * sinTheta;
                let u = 1 - (lon/ lonBands);
                let v = 1 - (lat/ latBands);
            
                normals.push(x, y, z);
                uv.push(u, v);
                positions.push(radius * x, radius * y, radius * z);
                }
        }
         // Generate Indices for Triangles
        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < lonBands; lon++) {
                let first = (lat * (lonBands + 1)) + lon;
                let second = first + lonBands + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        return { 
            positions: new Float32Array(positions), 
            normals: new Float32Array(normals), 
            uvs: new Float32Array(uv),
            indices: new Uint16Array(indices)
        };
    }

    setupBuffers() {
        const gl = this.gl;
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphereData.positions, gl.STATIC_DRAW);
        
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphereData.normals, gl.STATIC_DRAW);
  
    }

    bindBuffers() {
        const gl = this.gl;
        // Bind Position Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

        // Bind Normal Buffer (for lighting)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
    }

    render(state, scale) {
    
        const gl = this.gl;

        //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear screen and depth buffer
        gl.clearColor(0.0, 0.0, 0.05, 1.0); // Dark space blue
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = mat4.create();

        mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 10000.0);
        gl.useProgram(this.programInfo.program);

        state.bodies.forEach(body => {
            const modelViewMatrix = mat4.create();
            
            // Moves the planet based on Python coordinates
            // multiplies coords by 'scale' to make sure they fit on screen
            mat4.translate(modelViewMatrix, modelViewMatrix, [
                body.position.x * scale, 
                body.position.y * scale, 
                body.position.z - 10.0 // Pushes it back so the camera can see it
            ]);

            // using radius property from JSON to scale the sphere
            const visualScale = body.radius ? (body.radius * scale * 100) : 1.0; 
            mat4.scale(modelViewMatrix, modelViewMatrix, [visualScale, visualScale, visualScale]);

            //Tells the GPU which buffers to use
            this.bindBuffers();
    
            // Set uniform colour
            const uColourLoc = gl.getUniformLocation(this.programInfo.program, "uColour");
            gl.uniform3fv(uColourLoc, body.colour || [1, 1, 1]);

            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            gl.drawArrays(gl.TRIANGLES, 0, this.sphereData.positions.length / 3);
        });
    }
}
import { srenderer } from './renderer1.js';
import { bodyinfo } from './info_panel.js';

let cameraX = 0;
let cameraY = 0;
let cameraZ = 2.0;
let panning = false;
let myChart = null;
let graphData = { labels: [], values: [] };
let frameCount = 0;

const minZoom = 0.1;
const maxZoom = 20.0;

// for debugging
const elX = document.getElementById('camX');
const elY = document.getElementById('camY');
const elZ = document.getElementById('camZ');

let currentdt = 10000;
let selectedname = null;
let massmultiplier = 1.0;
let currentstates = []; // to store planet positions for clicking 


// Wait for the DOM to fully load before running the code
document.addEventListener('DOMContentLoaded', function () {
    console.log('JS loaded and DOM ready');


    // Define initial scale and panning offsets for drawing the sim
    let scale = 5e-12;          // make scale to fit on canvas

    // Get the canvas element where the simulation will be drawn
    const canvas = document.getElementById('simulationcanvas');
    if (!canvas) {
        console.error('Canvas not found.');
        return;
    }

    // Set the canvas size relative to the browser window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;


    // Get 2D drawing context for the canvas
    const renderer = new srenderer(canvas);
   
    // Fetch the current simulation state from the server
    async function fetchState() {
        try {
            const response = await fetch('/state'); // Request current state
            if (!response.ok) {
                console.error('Bad response:', response.status);
                return null;
            }
            return await response.json(); //Parse and return JSON data
        } catch (error) {
            console.error('Fetch failed:', error);
            return null;
        }
    }

    // making the graph
    function initChart(label, xtitle, ytitle) {

        //initialises the chart.js instance
        const graph = document.getElementById('planetGraph').getContext('2d');

        // removes the previous graph
        if (myChart) myChart.destroy(); 
        myChart = new Chart(graph, {
            type: 'scatter', //scatter allows for non-uniform x axis values 
            data: {
                datasets: [{
                    label: label,
                    data: graphData.values,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    showLine: true, //connects the dots to show pattern
                    borderWidth: 2,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true, // ensures the graph scales with the side panel
                scales: {
                    // formats axes for visibility
                    x: { 
                        title: { display: true, text: xtitle, color: 'white' }, 
                        ticks: { color: 'white' } },
                    y: { title: { display: true, text: ytitle, color: 'white' },
                     ticks: { color: 'white' } }
                },
                plugins: { legend: { labels: { color: 'white' } } }
            }
        });
    }


   // fetches real-time data from the flask backen and updates the graph
   async function updateGraphData() {
        // doesnt graph data if the sun or no body is selected 
        if (!selectedname || selectedname === "Sun") return;

        const typeSelect = document.getElementById('graphType');
        if (!typeSelect) return;
        const type = typeSelect.value;

        try {
            // asynchronously fetch energy/physics data for the specific body
            const response = await fetch(`/energy?body1=${selectedname}&body2=Sun`);
            const data = await response.json();
            
            // Find the actual body object to get its mass
            const body = currentstates.find(b => b.name === selectedname);
            if (!body) return;

            // calculate the appropriate Y-axis value based on the selected graph type
            let x_value = frameCount; // def
            let y_value;

            //branching depending on the graph selected
            if (type === "speed") {
                // rearranges the kinetic energy forula to approximate speed
                y_value = Math.sqrt((data.kinetic_energy || 0) * 2 / body.mass);  // speed approximation
                if (!myChart) initChart("Speed (m/s) vs Time", "Time (s)", "Speed (m/s)");
            } 
            else if (type === "force") {
                // Calculate the scalar magnitude of the force vector
                const fx = body.force.x;
                const fy = body.force.y;
                const fz = body.force.z;

                //calculates the distance using pythag
                const r = Math.sqrt(Math.pow(body.position.x, 2) + Math.pow(body.position.y, 2) + Math.pow(body.position.z, 2));
                
                // assigning x and y attributes
                x_value = r
                y_value = Math.sqrt(fx*fx + fy*fy + fz*fz);

                if (!myChart) initChart("Force vs Distance", "Distance (m)", "Force Magnitude (N)");
            }
            else if (type === "kepler") {
                // calculates the distance between the body and the Earth
                const r = Math.sqrt(Math.pow(body.position.x, 2) + Math.pow(body.position.y, 2) + Math.pow(body.position.z, 2));
                // calculates the speed using the kinetic energy 
                const v = Math.sqrt((data.kinetic_energy || 0) * 2 / body.mass);
                // calculates the time period using the distance and time 
                const T = (2 * Math.PI * r) / v;

                // values for the axis 
                x_value = r **3; 
                y_value = T **2;

                if (!myChart) initChart("Kepler's Third Law (T² vs r³)", "r³ (m³)", "T² (s²)");

            }
            
        
            //buffer the new data point
            if (y_value !== undefined) {
                graphData.values.push({x: x_value, y: y_value});
            }

            // keeps the graph from lagging by limiting to 50 points
            if (graphData.values.length > 50) {
                graphData.values.shift();
            }

            // update chart all the time
            if (myChart) {
                myChart.data.datasets[0].data = graphData.values;
                myChart.data.datasets[0].label = type === "kepler" ? "T² vs r³" : type;

                //'none' mode disables animations for better performance during high-frequency updates
                myChart.update('none');
            }
        } catch (err) {
            console.error("Graph Update Error:", err);
        }
    }

    async function animate() {
        try {
            // Tell the backend to progress the physics
            await fetch('/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },

                // passing the dynamic current dt and the mass multiplier
                body: JSON.stringify({ 
                    dt: currentdt,
                    targetbody: selectedname,
                    multiplier: massmultiplier
                 })
            });
            
            const state = await fetchState();
            if (state && state.bodies){
                // saves the state so can be used for click detection later
                currentstates = state.bodies;
                renderer.render(state, scale, cameraX, cameraY, cameraZ, showTrails);

                // updates graph data every 30 frames
                frameCount++;
                if (frameCount % 30 === 0 && selectedname) {
                    updateGraphData();
                }
            }
        } catch (e) {
            console.error('Render error:', e);
        }
        elX.textContent = cameraX.toFixed(2);
        elY.textContent = cameraY.toFixed(2);
        elZ.textContent = cameraZ.toFixed(2);

        requestAnimationFrame(animate)
    }

    // Zoom function
    canvas.addEventListener('wheel', function(event) { // checks wheel/ pad movement

        event.preventDefault(); // prevents default scroll behaviour

        const zoomIntensity = 0.1; // Increased for better feel with camera movement
        // Adjust cameraZ instead of scale
        if (event.deltaY < 0) {
            cameraZ -= zoomIntensity; // Zoom in
        } else {
            cameraZ += zoomIntensity; // Zoom out
        }
        // Constraints to stop the camera from going through the Sun or too far away
        cameraZ = Math.max(minZoom, Math.min(cameraZ, maxZoom));
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2 || (e.button === 0 && e.ctrlKey)) panning = true; // Right click or to pan
    });

    window.addEventListener('mouseup', () => {
        panning = false;
    });
    
    const hoverLabel = document.getElementById('hover-label');

    canvas.addEventListener('mousemove', (e) => {
        if (panning) {
            // sensitivity helps match mouse movement to world coordinates
            const sensitivity = 0.01 * (cameraZ / 10); 
            cameraX += e.movementX * sensitivity;
            cameraY -= e.movementY * sensitivity; // Y is usually inverted in screen space
            console.log(`Panning! X: ${cameraX}, Y: ${cameraY}`);
        }

        //calculates mouse coords relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let hoveredBody = null;

        // Check if mouse is within 30 pixels of any planet's screen position
        currentstates.forEach(body => {
            const dx = mouseX - body.screenX;
            const dy = mouseY - body.screenY;
            if (Math.sqrt(dx*dx + dy*dy) < 30) {
                hoveredBody = body;
            }
        });

        // updates UI based on whether a planet is being hover
        if (hoveredBody) {
            // position and reveal the html tooltip at the mouse coords
            hoverLabel.style.display = 'block';
            hoverLabel.style.left = `${mouseX}px`;
            hoverLabel.style.top = `${mouseY}px`;
            hoverLabel.textContent = hoveredBody.name;

            // changes cursor to pointer to provide visual affordance that the object is clickable
            canvas.style.cursor = 'pointer';
        } else {
            // hide tooltip and reverts cursor whent he mouse is over empty space
            hoverLabel.style.display = 'none';
            canvas.style.cursor = 'default';
        }
    });

    // Prevent the context menu from popping up on right-click
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    //Time Slider logic
    //selects the slider input and the label that displayes the value
    const timeSlider = document.getElementById('timeslider');
    const speedVal = document.getElementById('speedValue');

    // updates the sim speed whenever the slider is moved
    timeSlider.addEventListener('input', (e) => {
        const secpframe = parseFloat(e.target.value);
        currentdt = secpframe;
        // conversion from calculation
        const daypsec  = (secpframe * 60) / 86400;
        // rounded to 2 dp
        speedVal.textContent = daypsec.toFixed(2)
    });

    // Mass slider logic
    // selects the mass slider and its corresponding value
    const mSlider = document.getElementById('massSlider');
    const mVal = document.getElementById('massValue');

    // updates the vlaue of the mass whenever the slider is moved 
    mSlider.addEventListener('input', (e) => {
        // converts the slider value to a float for decimal precision
        massmultiplier = parseFloat(e.target.value);
        // updates the UI text to one d.p.
        mVal.textContent = massmultiplier.toFixed(1);
    });

    // Close Panel Logic
    // handles the closing of the information side panel
    document.getElementById('close-panel').addEventListener('click', () => {
        // hides the panel by setting CSS display to none
        document.getElementById('info-panel').style.display = 'none';

        // clear the currently selected object
        selectedname = null;
        // resets the multipler to 1.0
        massmultiplier = 1.0;
    });

    canvas.addEventListener('click', (e) => {
        // Prevent selection if the user is holding Ctrl (likely panning/moving the camera)
        if (e.ctrlKey) return;

        //gets canvas position to calculate relative mouse coords
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let clickedBody = null;
        let minDistance = 25; // defines the clickable bitbox radius in pixels 

        //loops thru all active celestial bosides to check for a click
        currentstates.forEach(body => {
            // Calculate distance between mouse and planet centre
            const dx = mouseX - body.screenX;
            const dy = mouseY - body.screenY;
            const distance = Math.sqrt(dx * dx + dy * dy);// using pythag

            //if the click is within 25px radius, the body is amrked as clicked
            if (distance < minDistance) {
                clickedBody = body;
            }
        });

        if (clickedBody) {
            console.log("Clicked:", clickedBody.name)
            showInfoPanel(clickedBody);
        }
    });

    function showInfoPanel(body) {
        selectedname = body.name;
        // reset graph for a new planet
        graphData.values = [];
        graphData.labels = [];
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        // Fetch data from bodyinfo object
        const info = bodyinfo[body.name] || { 
            description: "No data available.", 
            fact: "Unknown",
            colour: "Unknown",
            diameter: "Unknown",
            moons: 0,
            orbitalperiod: "Unknown",
            axialtilt: "Unknown",
            apparentmagnitude: "Unknown",
            absolutemagnitude: "Unknown"
        };

        //shows the panel
        document.getElementById('info-panel').style.display = 'block';

        // updates the sim data
        document.getElementById('selected-name').textContent = body.name;
        document.getElementById('current-mass-display').textContent = body.mass.toExponential(2);
        
        //update astonomical data
        document.getElementById('info-description').textContent = info.description;
        document.getElementById('info-fact').textContent = info.fact;
        document.getElementById('info-colour').textContent = info.colour;
        document.getElementById('info-diameter').textContent = info.diameter;
        document.getElementById('info-moons').textContent = info.moons;
        document.getElementById('info-period').textContent = info.orbitalperiod;
        document.getElementById('info-tilt').textContent = info.axialtilt;
        document.getElementById('info-apparent').textContent = info.apparentmagnitude;
        document.getElementById('info-absolute').textContent = info.absolutemagnitude;

        const absoluteEl = document.getElementById('info-absolute');
        if (absoluteEl) absoluteEl.textContent = info.absolutemagnitude;
        // reset mass slider logic
        massmultiplier = 1.0;
        document.getElementById('massSlider').value = 1.0;
        document.getElementById('massValue').textContent = "1.0";
    }

    function resetCamera(){
        cameraX = 0;
        cameraY = 0;
        cameraZ = 2.0;
    }
    
    //Pause button logic
    const pauseBtn = document.getElementById('pausebtn');

    pauseBtn.addEventListener('click', () => {
        // Send a request to the Flask /pause route
        fetch('/pause')
            .then(response => response.json())
            .then(data => {
                // Update the button text based on the "running" boolean returned by Flask
                pauseBtn.textContent = data.running ? "Pause" : "Resume";
                console.log("Simulation running:", data.running);
            })
            .catch(err => console.error("Error pausing:", err));
    });

    
    // Reset button logic
    const resetBtn = document.getElementById('resetbtn');

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset the simulation?")) {
                fetch('/reset')
                    .then(response => response.json())
                    .then(data => {
                        console.log(data.message);
                        // variables for the sliders and the panel are reset
                        currentdt = 10000;
                        massmultiplier = 1.0;
                        selectedname = null;

                        // UI sliders are shifted to initial value
                        const timeSlider = document.getElementById('timeslider');
                        const speedVal = document.getElementById('speedValue');
                        timeSlider.value = 10000;
                        speedVal.textContent = "6.94";

                        const mSlider = document.getElementById('massSlider');
                        const mVal = document.getElementById('massValue');
                        if (mSlider) mSlider.value = 1.0;
                        if (mVal) mVal.textContent = "1.0";

                        // the panel is hidden if it is open
                        document.getElementById('info-panel').style.display = 'none';

                        //camera resets as well
                        resetCamera(); 
                        renderer.trailPos = {}; //clears all paths
                    })
                    .catch(err => console.error("Error resetting:", err));
            }
        });
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Track if the button for trails is on
    let showTrails = false; 

    const trailBtn = document.getElementById('trailbtn');
    trailBtn.addEventListener('click', () => {
        showTrails = !showTrails;
        trailBtn.textContent = showTrails ? "Hide Trails" : "Show Trails";
        
        // adds a glow if active
        if (showTrails) {
            trailBtn.style.boxShadow = "0 0 15px rgba(0, 212, 255, 0.8)";
        } else {
            trailBtn.style.boxShadow = "none";
        }
    });

    const exportBtn = document.getElementById('exportgraph');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `${selectedname}_analysis.png`;
            link.href = document.getElementById('planetGraph').toDataURL('image/png');
            link.click();
        });
    }

    const gType = document.getElementById('graphType');
    if (gType) {
        gType.addEventListener('change', () => {
            graphData.values = [];
            graphData.labels = [];
            if (myChart) {
                myChart.destroy();
                myChart = null;
            }
        });
    }

    animate();
});
# My 3D Solar System

An interactive, browser-based 3D solar system simulation built to help visualise and explore orbital mechanics and fundamental astrophysics concepts.

Developed as my A-Level Computer Science NEA, this project combines a custom Python physics engine with a Flask backend and an interactive JavaScript-based frontend. Rather than relying on a third-party graphics engine, the project implements its own rendering and simulation logic to provide greater control over the graphics pipeline and physical modelling.

## Overview

Understanding orbital mechanics can be difficult when concepts are presented only through equations, static diagrams, or simplified animations.

My 3D Solar System provides an interactive environment where users can explore planetary motion, gravitational interactions, and relationships described by physical laws.

The application models celestial bodies in three-dimensional space and allows users to interact with the simulation through camera controls, time manipulation, planetary selection, and data visualisation.

The project was designed as an educational tool for GCSE and A-Level Physics students.

## Features

### 3D Solar System Simulation

* Interactive visualisation of the solar system
* Real-time planetary motion
* 3D positioning of celestial bodies
* Custom camera controls
* Zooming and navigation around the simulation

### Physics Engine

The simulation includes a custom physics engine written in Python.

Core functionality includes:

* Vector mathematics
* Position and velocity calculations
* Gravitational force calculations
* Numerical simulation updates
* Orbital motion
* Configurable simulation time

Celestial bodies are represented using object-oriented programming, allowing properties such as mass, radius, position, and velocity to be encapsulated within reusable classes.

### Interactive Controls

Users can interact with the simulation through:

* Zoom and camera controls
* Simulation speed controls
* Pause functionality
* Reset functionality
* Planet selection
* Hover labels

Clicking on a celestial body displays an information panel containing relevant facts and data about the selected object.

### Kepler's Third Law

The project also includes data collection and graphing functionality to investigate the relationship described by Kepler's Third Law.

The simulation can generate and visualise relationships such as:

$$
T^2 \propto R^3
$$

This allows users to connect the visual simulation with quantitative analysis.

## Technical Architecture

The application is divided into backend and frontend components.

```text
planet_sim/
│
├── backend/
│   ├── app.py
│   │
│   └── physics/
│       ├── vector.py
│       ├── body.py
│       ├── gravity.py
│       └── system.py
│
├── frontend/
│   ├── templates/
│   │   └── index.html
│   │
│   └── static/
│       ├── style.css
│       ├── main.js
│       ├── renderer.js
│       └── info-panel.js
│
└── tests/
```

## Technologies Used

### Backend

* Python
* Flask

### Frontend

* HTML5
* CSS3
* JavaScript
* Browser-based rendering

## Key Components

### `vector.py`

Provides a custom 3D vector implementation used throughout the simulation.

The vector class supports operations including:

* Vector addition and subtraction
* Scalar multiplication and division
* Magnitude calculations
* Vector normalisation
* Conversion for transferring data to the frontend

### `body.py`

Represents celestial bodies within the simulation.

Each body contains physical properties such as:

* Name
* Mass
* Radius
* Position
* Velocity

The class also provides methods for updating motion based on forces acting on the body.

### `system.py`

Acts as the central controller for the simulation.

Responsibilities include:

* Managing celestial bodies
* Updating the simulation state
* Controlling simulation time
* Pausing the simulation
* Resetting the simulation
* Coordinating physics updates

### `app.py`

Provides the Flask application and acts as the connection between the physics engine and browser-based frontend.

The backend exposes simulation data to the frontend, allowing the rendering system to display the current state of celestial bodies.

### `renderer.js`

Responsible for transforming simulation data into a visual representation.

A key part of the renderer is the conversion of 3D world coordinates into 2D screen coordinates, allowing moving celestial bodies to be displayed and interacted with through the browser interface.

### `main.js`

Controls the main interaction logic for the application.

This includes:

* User input
* Planet selection
* Click detection
* Simulation controls
* Synchronising the user interface with the simulation state

## How It Works

The simulation follows a continuous update cycle:

```text
Initialise celestial bodies
        ↓
Calculate gravitational forces
        ↓
Calculate acceleration
        ↓
Update velocity
        ↓
Update position
        ↓
Send simulation state to frontend
        ↓
Render celestial bodies
        ↓
Process user interaction
        ↓
Repeat
```

## Running the Project

### Prerequisites

You will need:

* Python 3
* Flask
* A modern web browser

### Installation

Clone the repository:

```bash
git clone https://github.com/strangerdanger-jpg/my-3d-solar-system.git
cd my-3d-solar-system
```

Install the required Python dependency:

```bash
pip install flask
```

Run the Flask application:

```bash
python app.py
```

Then open the local address displayed in your terminal in a web browser.

This project can also be seen using this link: https://my-3d-solar-system.onrender.com (copy & paste the link)

## Educational Purpose

This project was designed to support the visual understanding of concepts including:

* Newtonian gravitation
* Orbital motion
* Velocity and acceleration
* Three-dimensional spatial relationships
* Kepler's Laws of Planetary Motion

The goal was to create a simulation that balances scientific modelling with accessibility and interactivity.

## Design Principles

The project was developed with several core principles in mind:

* **Modularity** - physics, rendering, and user interface logic are separated
* **Interactivity** - users can directly explore the simulation
* **Scientific modelling** - physical relationships drive the behaviour of celestial bodies
* **Educational usability** - the interface is designed to make complex concepts easier to explore
* **Extensibility** - the object-oriented structure allows additional celestial bodies and features to be added

## Future Improvements

Potential future developments include:

* Additional celestial bodies
* More advanced orbital mechanics
* Moon phase visualisation
* Eclipse simulation
* Seasonal variation
* Redshift and blueshift visualisation
* Additional physics data visualisations
* Expanded accessibility features

## Author
**Jemimah Esan**

*Built to explore the intersection of computer science, physics, mathematics, and interactive visualisation.*

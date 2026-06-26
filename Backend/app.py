from flask import Flask, jsonify, request, render_template
from physics.body import body, star, moon, planet
from physics.system import system
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
template_dir = os.path.join(base_dir, "frontend", "templates")
static_dir = os.path.join(base_dir, "frontend", "static")

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

sun = star("Sun", 1.989e30, 6.96e8, [1.0, 1.0, 0.0], (0, 0, 0), (0, 0, 0))
mercury = planet("Mercury", 3.301e23, 2.44e6, [0.6, 0.6, 0.6], (5.79e10, 0, 0), (0, 4.70e4, 5.8e3))
venus = planet("Venus", 4.867e24, 6.052e6, [0.95, 0.9, 0.7], (1.08e11, 0, 0), (0, 3.49e4, 2.1e3))
earth = planet("Earth", 5.972e24, 6.37e6, [0.0, 0.46, 0.74], (1.5e11, 0, 0), (0, 2.98e4, 0))
mars = planet("Mars", 6.39e23, 3.389e6, [0.8, 0.2, 0.0], (2.28e11, 0, 0), (0, 2.41e4, 0.77e3))
jupiter = planet("Jupiter", 1.898e27, 6.991e7, [0.8, 0.7, 0.6], (7.78e11, 0, 0), (0, 1.31e4, 0.3e3))
saturn = planet("Saturn", 5.683e26, 5.823e7, [0.9, 0.8, 0.5], (1.43e12, 0, 0), (0, 9.67e3, 0.4e3))
uranus = planet("Uranus", 8.681e25, 2.536e7, [0.7, 0.9, 0.9], (2.87e12, 0, 0), (0, 6.81e3, 0.1e3))
neptune = planet("Neptune", 1.024e26, 2.462e7, [0.2, 0.4, 1.0], (4.50e12, 0, 0), (0, 5.43e3, 0.17e3))

sim = system([earth, sun, mars, jupiter, saturn, mercury, venus, uranus, neptune], 100, 1)


# converts objects into a dict which can be turned into JSON
def serialise(body):
	# initialises a dictionary
	data = {
		"name": body.name,
		"type": body.__class__.__name__,
		"mass": body.mass,
		"radius": body.radius,
		"colour": body.colour,
		"force": {
			"x": body.force.x,
			"y": body.force.y,
			"z": body.force.z
		},
		"position":{
			"x": body.position.x,
			"y": body.position.y,
			"z": body.position.z
		},
		"velocity":{
			"x": body.velocity.x,
			"y": body.velocity.y,
			"z": body.velocity.z
		}
	}

	if hasattr(body, "parent_planet"): # checks if the object has this attribute/ is a moon
		data["planet"] = body.parent_planet # add a new key-value pair to the dict

	return data

@app.route("/state")
def get_state():

	# takes in the dictionary and comverts intoa JSON string
	return jsonify({
		"time": sim.time, #sends current simulation time for time control slider
		"running": sim.running, # sends boolean for play/ pause
		"bodies": [serialise(b) for b in sim.bodies] # iterates through every object and passes it into the function
		})

@app.route("/update")
def update():
	sim.update()
	return jsonify({"time": sim.time})

@app.route("/reset")
def reset():
	sim.reset()
	return jsonify({"message": "Simulation reset"})

@app.route("/pause")
def pause():
	sim.pause()
	return jsonify({"running": sim.running })

@app.route("/set_time_scale/<value>")
def set_time_scale(value):
	sim.time_scale = float(value)
	return jsonify({"time_scale": sim.time_scale})

@app.errorhandler(404)
def not_found(error):
	return jsonify({"error": "Route not found"})

@app.route("/distance")
def get_distance():
	# extracts query parameters from the URL
	name1 = request.args.get("body1")
	name2 = request.args.get("body2")

	# Linear searches for the objects by name
	# returns None if the object doesn't exits
	body1 = next((b for b in sim.bodies if b.name == name1), None)
	body2 = next((b for b in sim.bodies if b.name == name2), None)

	# checks both bodies were successfully found before calculating
	if not body1 or not body2:
		# returns error code is input names are invalid
		return jsonify({"error": "Body not found"}), 404

	# calculates the displacement vector componments
	dx = body2.position.x - body1.position.x
	dy = body2.position.y - body1.position.y
	dz = body2.position.z - body1.position.z

	# 3D pythagorean theroem to find magnitude of displacemnt
	distance = (dx**2 + dy**2 + dz**2) ** 0.5

	# return a JSON object contating the calculated distance
	return jsonify({"body1": name1, "body2": name2, "distance": distance})

@app.route("/energy")
def get_energy():
	# extracts body neames from URL
    name1 = request.args.get("body1")
    name2 = request.args.get("body2")

	# linear search to find objects
    body1 = next((b for b in sim.bodies if b.name == name1), None)
    body2 = next((b for b in sim.bodies if b.name == name2), None)

	# ensures calculactions don't run on null objects
    if not body1 or not body2:
        return jsonify({"error": "Body not found"}), 404

    # calculates the displacement vector componments
    dx = body2.position.x - body1.position.x
    dy = body2.position.y - body1.position.y
    dz = body2.position.z - body1.position.z

	# 3D pythagorean theroem to find magnitude of displacement
    r = (dx**2 + dy**2 + dz**2) ** 0.5

    G = 6.6743e-11 # Gravitational constant

    # calculates the magnitude of the velocity and then squares it
    v_squ = (body1.velocity.x**2 + body1.velocity.y**2 + body1.velocity.z**2)

	# calculates the kinetic energy
    kinetic = 0.5 * body1.mass * v_squ

    # calculates the gravitational potential energy
    potential = -G * body1.mass * body2.mass / r

    total = kinetic + potential

    return jsonify({"body1": name1, "body2": name2, "kinetic_energy": kinetic, "potential_energy": potential, "total_energy": total})

@app.route("/")
def index(): # connects Flask to HTML page
	return render_template("index.html")

@app.route("/step", methods=["POST"])
def step():
    data = request.get_json()
    dt = data.get("dt", 1000)

    target_name = data.get("targetbody")
    multiplier = data.get("multiplier", 1.0)

    # Update the simulation time step
    sim.dt = dt

    # If a planet is selected, temporarily adjust its mass in the physics engine
    if target_name:
        for body in sim.bodies:
            if body.name == target_name:
                #multiplier is applied to the mass of the body
                body.mass = body.mass * multiplier

    sim.update()

    return jsonify({"status": "ok"})

if __name__ == "__main__":
	app.run(debug=True, use_reloader=False)
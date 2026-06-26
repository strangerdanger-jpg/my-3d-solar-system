from math import sqrt
from .vector import vector3
from .body import body

G = 6.6743e-11
epsilon = 1e-5


# Calculates the gravitational force of attraction between two bodies
def g_force(body1, body2):

	# Stores the distance between the bodies
	r_vec = body2.position - body1.position

	# Ensures the direction of the distance is not included
	r = max(r_vec.mag(), epsilon)

	# When the distance between two bodies is negligible
	if r == 0:
		return vector3(0,0,0)

	# Force calculated using Newton's law of gravitation
	f_mag = G * body1.mass * body2.mass / r **2

	# Turns the force into a vector that act in the direction of the displacement
	f_vec = r_vec.norm() * f_mag

	return f_vec

# Calculates the gravitational field streangth of the body at a distance
def g_field(body, position):

	# Stores the overall distance
	r_vec = position - body.position

	# Ensures the distance is a scalar
	r = max(r_vec.mag(), epsilon)

	# For edge-cases
	if r == 0:
		return vector3(0,0,0)

	# GFS is calculated using the radial field formula
	g_mag = G * body.mass / r**2

	# Ensured the GFS acts in the right direction
	return r_vec.norm() * g_mag


# Calculates the orbital speed
def orbital_velocity(body, position):

	# Stores the distance between the satellite and the primary
	r_vec = position - body.position

	# Ensures the distance is scalar, also prevents dividing negative numbers
	r = max(r_vec.mag(), epsilon)

	# For edge-cases
	if r == 0:
		return vector3(0,0,0)

	# Orbital speed is calculated
	o_speed = sqrt(G * body.mass / r )

	# Unit vector that represents one unit upwards
	upwards = vector3(0,0,1)

	# Vector perpendicular to the centripetal force
	tangent = r_vec.cross(upwards).norm()

	# Orbital velocity is calculated and acts in the direction of the displacment
	return tangent * o_speed

# Calculates the gravitational force acting on a test mass
def grav_force(body, test_mass, position):
	return g_field(body, position) * test_mass

if __name__ == "__main__":
	x = body("earth", 5.97e24, 1e6, (0,0,0), (0,0,0))
	y = body("moon", 7.35e22, 1e3, (10,0,0), (0,0,0))

	force = g_force(x, y)

	print(f"force vector = {force}, which has a magnitude of {force.mag()}")
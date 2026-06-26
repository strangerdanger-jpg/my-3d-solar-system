from .vector import vector3

mass_scale = 1e-24
radius_scale = 1e-3

class body:
	"""
	Represents a generic celestial body with mass, position,
    velocity, and force, used as the base class for planets,
    stars, and moons.
	"""

	# Initialise attributes of the bodies
	def __init__(self, name, mass, radius, colour, position, velocity):
		self.name = name

		self.check_mass(mass)
		self.mass = float(mass)
		self.initial_mass = float(mass)

		self.render_mass = self.mass * mass_scale        # scaled for visualisation

		self.radius = float(radius)
		self.render_radius = self.radius * radius_scale  # scaled for visualisation

		self.position = vector3(*position)
		self.velocity = vector3(*velocity)
		self.force = vector3(0,0,0)

		self.initial_position = vector3(*position)
		self.initial_velocity = vector3(*velocity)


		self.colour = colour ##added for aesthetics

	def check_mass(self, value):
		if value < 0:
			raise ValueError("Mass cannot be negative")

	# Acucumulate forces acting on the body
	def apply_force(self, force):
		self.force += force

	def update(self, dt):
		# Calculates acceleration using Newton's second law
		acc = self.force / self.mass

		# Update velocity and position using Euler integration
		self.velocity += acc * dt
		self.position += self.velocity * dt

	def reset_force(self):
		# Clear net force after each timestep
		self.force = vector3(0,0,0)

	def reset(self):

		# restores position to initial position
		self.position = self.initial_position

		# restores velocity to initial velocity
		self.velocity = self.initial_velocity

		# restores mass to initial mass
		self.mass = self.initial_mass

		# resets force to 0
		self.reset_force()

	def __repr__(self):
		return f"body(velocity='{self.velocity}')"

class planet(body):
	def __init__(self, name, mass, radius, colour, position, velocity):
		super().__init__(name, mass, radius, colour, position, velocity)

class star(body):
	def __init__(self, name, mass, radius, colour, position, velocity):
		super().__init__(name, mass, radius, colour, position, velocity)

class moon(body):
	def __init__(self, name, mass, radius, colour, position, velocity, parent_planet):
		super().__init__(name, mass, radius, colour, position, velocity)
		self.parent_planet = parent_planet

if __name__ == "__main__":

	for i in range(0,10):
		test = body("Earth", 10, 1e6, (0,0,0), (0,0,0))
		test.velocity = vector3(10, 0, 0)
		test.update(i)
		print(f"dt={i}s -> position={test.position.x}")

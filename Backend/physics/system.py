from .vector import vector3
from .body import body
from .gravity import g_force

class system:

	def __init__(self, bodies, dt, time_scale = 1.0):
		self.bodies = bodies if bodies is not None else []  # list of body objects
		self.time = 0.0				   # simulation time (s)
		self.dt = dt				   # base timestep
		self.time_scale = time_scale   # speed multiplier
		self.running = True            # pause / resume state

	def add_body(self, body):

		# Check if the object is an instance of the body class
		if not isinstance(body, Body):
			raise TypeError("Only Body instances can be added to the system.")

		self.bodies.append(body) # add the body to the list

	def remove_body(self, body):

		# checks if the body is in the list
		if body in self.bodies:
			self.bodies.remove(body) # removes the body from the list

	def compute_g_forces(self):

		# reset forces first
		for body in self.bodies:
			body.reset_force()

		# calculate pairwise forces
		for i in range(len(self.bodies)):    # for loops used to iterate through each combo
			for j in range(i + 1, len(self.bodies)):
				body1 = self.bodies[i]
				body2 = self.bodies[j]

				force = g_force(body1, body2) # using the gravitational force function to compute Newton's law

				body1.apply_force(force)
				body2.apply_force(-force) # body2 will receive the same force that acts in the opposite direction

	def update(self):

		if not self.running: # if sim is paused, then there are no updates
			return

		self.compute_g_forces() # forces are calculated

		for body in self.bodies:
			body.update(self.dt * self.time_scale) # updates with the times scaling

		self.time += self.dt * self.time_scale # time is updated


	def step(self):

		# gravity forces are calculated
		self.compute_g_forces()

		for body in self.bodies: # velocity and position are updated for each body
			body.update(self.dt)

		self.time += self.dt # time is updated


	def reset(self):

		# resets the time back to 0
		self.time = 0.0

		# iterates through the list and uses the reset function to restore initial conditions
		for body in self.bodies:
			body.reset()


	def pause(self):
		self.running = not self.running

if __name__ == "__main__":
	body1 = body("", 1e10, 1e2, (0,0,0), (0,0,0))
	body2 = body("", 1e10, 1e3, (0,0,0), (0,0,0))


	bodies = [body1, body2]

	system = system(bodies, 10)

	for i in range(5):
		system.update()
		print(system.time, body1.position, body2.position)



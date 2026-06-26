

class vector3:
	# attributes of the given class
	def __init__(self, x=0.0, y=0.0, z=0.0):
		self.x = float(x)
		self.y = float(y)
		self.z = float(z)

	def __add__(self, other): # when updating the vector quantities (velocity and position)
		return vector3(self.x + other.x, self.y + other.y, self.z + other.z)

	def __sub__(self, other): # when updating the vector quantities (velocity and position)
		return vector3(self.x - other.x, self.y - other.y, self.z - other.z)

	def __mul__(self, scalar): # when calculating the new velocities and positions
		return vector3(self.x * scalar, self.y * scalar, self.z * scalar)

	def __rmul__(self, scalar):
		return vector3(self.x * scalar, self.y * scalar, self.z * scalar)

	def __truediv__(self, scalar): # when calculating the new velocities and position
		return vector3(self.x / scalar, self.y / scalar, self.z / scalar)

	def __repr__(self): # for testing
		return f"vector3(x={self.x}, y={self.y}, z={self.z})"

	def __neg__(self):
		# allows the -force syntax to work
		return vector3(-self.x, -self.y, -self.z)

	def mag(self): # for distance and speed calculations
		return (self.x **2 + self.y **2 + self.z **2)**0.5

	def norm(self): # to show direction without magnitude
		mag = self.mag()
		if mag == 0:
			return vector3(0,0,0)
		else:
			return self / mag

	def cross(self, other): # to find othorganol vectors
		return vector3(self.y * other.z - self.z * other.y, self.z * other.x - self.x * other.z, self.x * other.y - self.y * other.x)

	def tuple(self): #for frontend transfer
		return (self.x, self.y, self.z)


if __name__ == "__main__":
	pass
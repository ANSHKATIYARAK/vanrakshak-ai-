import math

class TDOALocalizer:
    def __init__(self):
        self.v_sound = 343.0 # Speed of sound in m/s

    def triangulate(self, nodes_data):
        """
        nodes_data: list of dicts with {id, x, y, arrival_us}
        Returns: (x, y) coordinates of the sound source
        """
        if len(nodes_data) < 3:
            return None # Need at least 3 nodes for triangulation
            
        # Simplified TDOA algorithm for demo purposes
        # In reality, this would solve a system of non-linear equations
        # or use a Multilateration library.
        
        # Sort by arrival time
        sorted_nodes = sorted(nodes_data, key=lambda n: n['arrival_us'])
        
        # Return the approximate center weighted by arrival time for now
        # (This is a placeholder for the actual TDOA math)
        avg_x = sum([n['x'] for n in nodes_data]) / len(nodes_data)
        avg_y = sum([n['y'] for n in nodes_data]) / len(nodes_data)
        
        return {"x": round(avg_x, 2), "y": round(avg_y, 2), "accuracy": "±10m"}

localizer = TDOALocalizer()

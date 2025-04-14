import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class UserManager:
    def __init__(self):
        self.username = os.getenv("USERNAME")
        self.password = os.getenv("PASSWORD")

    def register(self, username: str, password: str):
        # In a real application, you would save this to a database
        if username == self.username:
            return "User already exists."
        else:
            # Here you would hash the password and save it
            return f"User {username} registered successfully."

    def login(self, username: str, password: str):
        if username == self.username and password == self.password:
            return "Login successful."
        else:
            return "Invalid credentials."

# Example usage
if __name__ == "__main__":
    user_manager = UserManager()
    print(user_manager.register("admin", "securepassword123"))  # Should indicate user already exists
    print(user_manager.login("admin", "securepassword123"))     # Should indicate login successful
    print(user_manager.login("admin", "wrongpassword"))         # Should indicate invalid credentials 
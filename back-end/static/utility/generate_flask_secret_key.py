import secrets

def generate_secret_key():
    return secrets.token_hex(16)

# Example usage:
secret_key = generate_secret_key()
print("Generated Flask Secret Key:", secret_key)
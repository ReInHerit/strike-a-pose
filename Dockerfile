# Use tiangolo/uwsgi-nginx-flask as the base image
FROM --platform=linux/amd64 tiangolo/uwsgi-nginx-flask:python3.11

# Set the working directory in the container
WORKDIR /app

# Install additional dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*
# Copy the contents of the back-end directory into the container
COPY ./back-end /app

# Install Flask application dependencies
COPY ./requirements.txt /app
RUN pip install --no-cache-dir -r requirements.txt

# Expose port 80 (Nginx default port)
EXPOSE 8000
#EXPOSE 80
ENV PORT 8000
ENV AM_I_IN_A_DOCKER_CONTAINER Yes
# Copy the script to the container
CMD ["python", "app.py"]

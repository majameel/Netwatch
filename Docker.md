# How to Deploy NetPulse with Docker

Containerizing the NetPulse application with Docker is the recommended way to deploy it. This ensures a consistent, portable, and easy-to-manage setup for all users, which is perfect for an open-source project. This guide provides a complete, working configuration using `docker-compose`.

## How It Works: Securely Handling the API Key

The frontend application needs a Gemini API key for its AI features. It's not secure to hardcode this key in the source code. This setup provides the key at runtime using a secure and standard pattern:

1.  **.env file:** You will create a local file named `.env` to securely store your personal API key. This file is ignored by version control (Git) and should never be shared.
2.  **docker-compose.yml:** This file reads the key from your `.env` file and passes it into the container as a secure environment variable when it starts.
3.  **entrypoint.sh:** This special script runs automatically inside the container at startup. It reads the `API_KEY` environment variable and dynamically creates a `config.js` file.
4.  **index.html:** The main HTML file is already set up to load this `config.js` script, which makes the API key available to the React application.
5.  **Dockerfile:** Defines the steps to build the application image, using Nginx as a lightweight web server and setting up the entrypoint script.
6.  **nginx.conf:** Configures Nginx to correctly serve the Single-Page Application (SPA), ensuring client-side navigation works as expected.

---

## Step 1: Make Sure You Have the Required Files

The following four files should be in the **root directory** of your project (the same directory as `index.html`). You can copy and paste the contents below to create them.

#### `Dockerfile`
```dockerfile
# Use a lightweight Nginx image as a base
FROM nginx:alpine

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Copy all the application source files to the Nginx web root directory
# This includes index.html, index.tsx, components, services, etc.
COPY . /usr/share/nginx/html

# Copy the entrypoint script that will inject the API key
COPY entrypoint.sh /entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /entrypoint.sh

# Set the entrypoint script to be executed when the container starts
ENTRYPOINT ["/entrypoint.sh"]

# Expose port 80, which is the default port for Nginx
EXPOSE 80

# The default command to start Nginx. This will be executed by our entrypoint script.
CMD ["nginx", "-g", "daemon off;"]
```

#### `entrypoint.sh`
```sh
#!/bin/sh
# This script is executed when the container starts.

# The path to the config file that will be generated inside the container.
# This file will be loaded by index.html.
CONFIG_JS_PATH="/usr/share/nginx/html/config.js"

echo "Entrypoint script started. Generating config.js..."

# Check if the API_KEY environment variable is set and not empty.
# This variable is passed in from the docker-compose.yml file.
if [ -z "${API_KEY}" ]; then
  # If the API_KEY is not set, create a config file with an empty key.
  # The application will see that the key is missing and disable AI features.
  echo "Warning: API_KEY environment variable is not set. Gemini AI features will be disabled."
  echo "window.process = { env: { API_KEY: '' } };" > ${CONFIG_JS_PATH}
else
  # If the API_KEY is set, create the config file.
  # This line creates a JavaScript snippet that mimics the Node.js 'process.env' object in the browser window.
  echo "API_KEY found. Writing to config.js."
  echo "window.process = { env: { API_KEY: '${API_KEY}' } };" > ${CONFIG_JS_PATH}
fi

echo "config.js generated successfully at ${CONFIG_JS_PATH}"
cat ${CONFIG_JS_PATH} # Print the content for debugging

echo "Starting Nginx..."
# Finally, execute the command that was passed to this script as arguments.
# In the Dockerfile, this is `nginx -g 'daemon off;'`. This starts the web server.
exec "$@"
```

#### `nginx.conf`
```nginx
server {
  listen 80;
  server_name localhost;
  root /usr/share/nginx/html;
  index index.html;

  # This location block is crucial for a Single-Page Application (SPA).
  # It tells Nginx to try serving the requested file ($uri), then a directory ($uri/),
  # and if neither exists, to fall back to serving /index.html.
  # This allows the React Router to handle all the page navigation on the client-side.
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

#### `docker-compose.yml`
```yaml
version: '3.8'

# This file defines the services, networks, and volumes for the Docker application.
# It makes it easy to run the multi-container application with a single command.

services:
  # Defines the main application service.
  netpulse-app:
    # Specifies that the Docker image should be built from the Dockerfile in the current directory.
    build: .
    # A friendly name for the container when it's running.
    container_name: netpulse_monitor
    # The container will restart automatically unless it is manually stopped.
    restart: unless-stopped
    # Maps port 8080 on the host machine to port 80 inside the container.
    # This means you can access the application at http://localhost:8080.
    ports:
      - "8080:80"
    # Tells Docker Compose to load environment variables from a file named `.env`
    # in the same directory. This is how the API_KEY is securely passed into the container.
    env_file:
      - .env
```

---

## Step 2: Create and Update Your `.env` file

This is where you will provide your personal Gemini API key.

1.  In the **root directory** of the project, create a new file named exactly `.env`.
2.  Open the file in a text editor and add the following line:
    ```
    # .env - Your secret API key goes here. This file should NOT be committed to Git.
    API_KEY=your_gemini_api_key_here
    ```
3.  **Replace** `your_gemini_api_key_here` with your actual Google Gemini API key.
4.  **If you don't have an API key** or don't want to use the AI features, you can leave it blank, like this: `API_KEY=`
5.  **Save the file.**
6.  **Crucial Security Step:** Ensure your `.gitignore` file contains a line with `.env` to prevent you from ever accidentally committing your secret key to a public repository. If the line doesn't exist, add it.

---

## Step 3: Run the Application

Now you're ready to launch NetPulse!

1.  **Prerequisites:** Make sure you have [Docker](https://www.docker.com/products/docker-desktop/) installed and running on your system. Docker Desktop for Windows and Mac includes `docker-compose`.

2.  **Start the Container:** Open a terminal or command prompt in the project's root directory and run the following command:
    ```bash
    docker-compose up --build
    ```
    *   `docker-compose up` reads your `docker-compose.yml` file and starts the services.
    *   The `--build` flag tells Docker to build the image from your `Dockerfile` before starting. You only need to use `--build` the first time or if you make changes to the source code or Docker-related files.

3.  **Access NetPulse:** Once the build is complete and the container is running, open your web browser and go to:
    ### **[http://localhost:8080](http://localhost:8080)**

Your NetPulse application is now running inside a secure, isolated Docker container!

---

## Managing the Container

Here are some useful commands to manage your running application:

-   **To stop the application and see live logs:** Press `CTRL+C` in the terminal where `docker-compose up` is running.
-   **To run in the background (detached mode):** `docker-compose up -d`
-   **To stop a background container:** `docker-compose stop`
-   **To stop and remove the container entirely:** `docker-compose down`
-   **To start it again later (without rebuilding):** `docker-compose up`
-   **To view logs of a running container:** `docker logs -f netpulse_monitor`
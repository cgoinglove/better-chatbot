# Using Docker

Docker provides a streamlined and efficient method for managing containerized applications, making it an ideal choice for deploying this project.

## Requirements

- **Architecture:** An x86-64 or ARM(64) based computer.
- **Operating System:** Linux, macOS (with Docker Desktop or equivalent), or Windows (with WSL).
- **Software:** Docker and Docker Compose installed and configured.

## Steps

1.  **Clone the Repository:**
    Navigate to the desired directory in your terminal and clone the project repository. If you're not already in the project directory after cloning, change into it:

    ```sh
    git clone https://github.com/cgoinglove/better-chatbot
    cd better-chatbot
    ```

2.  **Set up Environment Variables:**
    Run `pnpm initial:env` to generate the `.env` file.  
    Then, enter the API keys only for the LLM providers you plan to use.

    You can generate an authentication secret (`BETTER_AUTH_SECRET`) with the command:  
    `pnpx auth secret`

    For the database, Docker will handle all necessary configuration automatically,  
    so the default `docker/.env` file is sufficient.



1.  **Build and Start the Container:**
    From the project's root directory, build the Docker image and start the container in detached mode (running in the background):

    ```sh
    pnpm docker-compose:up
    ```

    Your application should now be running. You can access it by visiting `http://<ipofserver>:3000/` in your web browser. Replace `<ipofserver>` with the IP address of the server where Docker is running (this will likely be `localhost` if you're running it on your local machine).

## Using your own database

If you don't want to host your own db, here are some steps

1. Open up your docker compose file. `docker/compose.yml`
   Comment out the postgres section and the volume
2. Update `.env` change your DB url
3. Migrate the DB

```sh
pnpm db:migrate
```

4. Run the app

```sh
pnpm docker-compose:up
```

## What is possible in docker and what is not

- Full support for MCP stdio servers that work with bunx, uvx and npx.
- Full support for SSE,Streamable Remote servers.
- And everything else as you would expect.

## Managing the Container

### Stopping the Container

To stop the running container, ensure you are in the project's root directory and execute:

```sh
pnpm docker-compose:down
```

### Updating the Application

To update the application to the latest version:

```sh
pnpm docker-compose:update
```

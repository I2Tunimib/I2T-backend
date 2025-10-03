# SemTUI Backend

SemTUI's backend functions as an interface to external services (reconciliation and extension services) and it provides the ability to handle actions on tables and dataset data structures.

A full documentation of SemTUI is available [here](https://i2tunimib.github.io/I2T-docs/).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [Local Development Setup](#local-development-setup)
  - [Docker Setup](#docker-setup)
- [Optional: Python Notebook/Pipeline Generation](#optional-python-notebookpipeline-generation)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the SemTUI backend, ensure you have the following installed:

- **Node.js** (version 18 or higher recommended)
- **npm** (comes with Node.js)
- **Git** (for cloning repositories)

For Docker setup:
- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)

## Installation & Setup

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd I2T-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy the sample environment file:
     ```bash
     cp .env-sample .env
     ```
   - Edit the `.env` file with your configuration:
     ```bash
     nano .env  # or use your preferred editor
     ```
   - Key variables to configure:
     - `ENV=DEV` (for development)
     - `PORT=3003` (or your preferred port)
     - `JWT_SECRET=your-jwt-secret-key`
     - `JWT_EXPIRES_IN=24h`
     - `API_PORT=3003`
     - Additional API keys as needed for external services

4. **Create required directories:**
   The application will automatically create necessary directories and database files on first run, including:
   - `public/` directory for datasets
   - Database files for tables, datasets, and users
   - `tmp/` directory for temporary files

5. **Default User:**
   On first run, the system automatically creates a default test user:
   - **Username:** `test`
   - **Password:** `test`
   - **Email:** `test`

### Docker Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd I2T-backend
   ```

2. **Set up environment variables:**
   - Copy and configure the environment file:
     ```bash
     cp .env-sample .env
     ```
   - Edit the `.env` file with your Docker-specific configuration:
     ```bash
     nano .env
     ```
   - Ensure `API_PORT` is set (this will be used for port mapping)

3. **Build and run with Docker Compose:**
   ```bash
   # Build and start the containers
   docker-compose up --build

   # Or run in detached mode
   docker-compose up -d --build
   ```

4. **Access the application:**
   The backend will be available at `http://localhost:${API_PORT}` (where `${API_PORT}` is the port you configured in `.env`)

## Optional: Python Notebook/Pipeline Generation

If you want to enable Python notebook or pipeline generation functionality, you need to obtain the `semTParser` executable:

### Getting semTParser

1. **Clone the semTParser repository:**
   ```bash
   git clone https://github.com/I2Tunimib/semTParser.git
   ```

2. **Follow the semTParser installation instructions** in that repository to build the executable.

3. **Place the executable in the backend:**
   - Copy the built `semTParser` executable to the `public/` directory of this backend:
     ```bash
     cp /path/to/semTParser/executable ./public/semTParser
     ```
   - Make sure the executable has proper permissions:
     ```bash
     chmod +x ./public/semTParser
     ```

### For Docker Setup:

If using Docker, you'll need to modify the Dockerfile to include the semTParser executable:

1. Place the `semTParser` executable in the `public/` directory before building
2. The Dockerfile will copy it into the container during the build process

### What semTParser Enables:

With semTParser installed, users can:
- Generate Python scripts from their table processing workflows
- Export Jupyter notebooks for further analysis
- Create automated pipelines for data processing

**Note:** The backend will function normally without semTParser, but the Python notebook/pipeline export features will not be available.

## Running the Application

### Local Development

Choose one of the following commands based on your needs:

```bash
# Development mode with hot reload
npm run start-dev

# Development mode with debugging
npm run debug

# Production mode
npm run start-prod
```

### Docker

```bash
# Start containers
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Accessing the Application

Once running, the backend API will be available at:
- **Local development:** `http://localhost:3003` (or your configured PORT)
- **Docker:** `http://localhost:${API_PORT}` (from your .env file)

### Default Endpoints

- **Health check:** `GET /`
- **API documentation:** Available through the frontend interface
- **WebSocket connection:** Available for real-time updates

## Environment Variables

Here are the key environment variables you can configure:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENV` | Environment mode (`DEV` or `PROD`) | `DEV` | Yes |
| `PORT` | Application port | `3003` | No |
| `API_PORT` | Docker port mapping | `3003` | No (Docker only) |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` | No |
| `MANTIS` | Mantis service URL | - | No |
| `MANTIS_AUTH_TOKEN` | Mantis authentication token | - | No |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret key | - | No |

## API Documentation

The backend provides RESTful API endpoints for:

- **Dataset management:** Upload, manage, and process datasets
- **Table operations:** Create, update, and manipulate table data
- **Reconciliation services:** Entity linking and reconciliation
- **Extension services:** Data enrichment and extension
- **Export services:** Data export in various formats
- **User management:** Authentication and user operations

For detailed API documentation, refer to the [full documentation](https://i2tunimib.github.io/I2T-docs/).

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   Error: listen EADDRINUSE: address already in use :::3003
   ```
   - Change the `PORT` in your `.env` file to an available port
   - Or stop the process using that port

2. **Environment file not found:**
   ```bash
   ⚠️  Couldn't find '.env' file  ⚠️
   ```
   - Make sure you've copied `.env-sample` to `.env`
   - Ensure the `.env` file is in the root directory

3. **Permission denied for semTParser:**
   ```bash
   spawn EACCES
   ```
   - Make sure the semTParser executable has execute permissions:
     ```bash
     chmod +x ./public/semTParser
     ```

4. **Docker build fails:**
   - Make sure Docker is running
   - Try clearing Docker cache: `docker system prune -f`
   - Check that all required files exist

### Logs and Debugging

- **Development mode:** Logs are displayed in the console
- **Docker logs:** Use `docker-compose logs -f` to view container logs
- **Debug mode:** Use `npm run debug` for Node.js debugging capabilities

### Getting Help

- Check the [full documentation](https://i2tunimib.github.io/I2T-docs/)
- Review the issue tracker in the repository
- Ensure all prerequisites are properly installed

## Development Notes

- The application uses ES modules (`type: "module"` in package.json)
- Hot reload is enabled in development mode
- The `tmp/` directory is used for temporary file operations
- Database files are JSON-based and stored in the `public/` directory
- Services can be excluded from loading via the `config.js` file
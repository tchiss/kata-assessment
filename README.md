# Installation Guide

## Prerequisites
Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 18 or later)
- [Docker](https://www.docker.com/) (version 20.10 or later)
- [Docker Compose](https://docs.docker.com/compose/) (version 1.29 or later)

## Project Structure
This project consists of two main parts:

1. **Frontend**: Built with [Next.js](https://nextjs.org/) (port: `3000`)
2. **Backend**: Built with [NestJS](https://nestjs.com/) (port: `3400`)

The database is managed using a PostgreSQL instance running in a Docker container.

## Installation Steps

### 1. Clone the Repository
Clone the project repository to your local machine:
```bash
git clone <repository-url>
cd kata-assessment
```

### 2. Start the Docker Container
Ensure Docker and Docker Compose are installed, then start the PostgreSQL database:
```bash
docker-compose up -d
```
This will start a PostgreSQL instance with the necessary configuration.

### 4. Install Dependencies
Navigate to both the frontend and backend directories and install dependencies:

#### Backend:
```bash
cd ../backend
npm install
```

#### Frontend:
```bash
cd ../frontend
npm install
```

### 5. Run the Applications

#### Backend:
Start the NestJS API server:
```bash
npm run start:local
```
The API will be available at `http://localhost:3400`.

#### Frontend:
Start the Next.js development server:
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 6. Verify the Setup
- Open your browser and navigate to `http://localhost:3000` for the frontend.
- Access the API directly at `http://localhost:3400/docs` (e.g., Swagger documentation if enabled).
- Health check endpoint is available at `http://localhost:3400/health`.

## Additional Notes

- The PostgreSQL container exposes its port at `5432`. You can connect using a PostgreSQL client if needed.

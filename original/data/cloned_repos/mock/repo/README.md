# Aegis Core Mock System

## Description
A secure kernel mock repository.

## Installation
```bash
pip install -r requirements.txt
```

## Setup Instructions
Initialize settings in `.env` configuration file.

## Environment Variables
DATABASE_URL=postgresql://
JWT_SECRET=supersecret

## Usage Examples
```bash
uvicorn app.main:app
```

## API Documentation
GET /api/health
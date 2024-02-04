# FIFA Candy Betting App

Welcome to the FIFA Candy Betting App! This application allows users to bet on FIFA matches and track their bets.

## Table of Contents

- [Installation](#installation)
- [Technologies](#technologies)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Swagger Documentation](#swagger-documentation)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Bronid/FIFA_GoogleCloudDeploy.git
   ```

2. Install [Docker](https://docs.docker.com/get-docker/) and run it

3. Run this command in project directory:
  ```bash
   docker compose up --build
   ```

4. Go to the **localhost:80** in your browser
   
5. Done!

## Technologies
- Docker
- MongoDB
- Node Js

## Usage
- Register an account and log in.
- View upcoming FIFA matches and place bets.
- Track your betting history and account balance.
Also you can find this app deployed on Google Cloud [here](https://fifa-project-frontend-gur6ebemfq-ew.a.run.app/)

## API Endpoints
- POST /users/register: Register a new user.
- POST /users/login: Log in to the application.
- GET /users/getuser: Get user details.
- PUT /users/updateuser/:login: Update user information.
- GET /users/getallusers: Get details of all users (admin only).
- DELETE /users/deleteuser/:login: Delete a user (admin only).
- POST /users/dobet/:matchID: Place a bet on a match.
- POST /addmatch: Add a new match (admin only).
- PUT /updatematches/:nameparam: Update match details (admin only).
- GET /matches: Returns all matches
- GET /matches/:nameparam: Get matches by country name or id
- DELETE /matches/{matchId}: Delete matches by ID

## Swagger Documentation
Explore the API using Swagger documentation available at /api-docs when the app is running.
- localhost:8080/api-docs - Match API
- localhost:8081/api-docs - User API
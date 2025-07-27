
# 🚗 Car Rental System - Backend (Node.js + Express)

This is the **backend** for the Car Rental System, built using **Node.js**, **Express.js**, and **MongoDB**. It serves as the API layer for the frontend React app and handles routing, authentication, and data management.

## 🛠️ Features

- RESTful API for car rental system
- User authentication (JWT-based)
- Admin routes for managing cars and bookings
- Booking management system
- MongoDB integration with Mongoose

## 🔧 Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT for authentication
- Dotenv for environment variables
- CORS, body-parser, etc.

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/aqsa-abbas/car-rental-server.git
cd car-rental-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env` File

Create a `.env` file in the root folder and add:

```env
PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
```

### 4. Start the Server
```bash
npm run start
```

The server will run at `http://localhost:5000`.

## 📁 API Routes Overview (Sample)

| Route               | Method | Description              |
|--------------------|--------|--------------------------|
| `/api/cars`         | GET    | Get all cars             |
| `/api/cars/:id`     | GET    | Get car by ID            |
| `/api/bookings`     | POST   | Create booking           |
| `/api/users/login`  | POST   | User login               |
| `/api/users/signup` | POST   | User signup              |

## 🙋‍♀️ Developed By

**Aqsa Abbas**  
[LinkedIn](https://www.linkedin.com/in/your-link)

---

## 📁 Project Structure (Optional)
```
car-rental-server/
│
├── controllers/
├── models/
├── routes/
├── middleware/
├── config/
├── server.js
├── .env
└── README.md
```

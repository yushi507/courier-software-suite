# CourierApp - Full-Stack Delivery Management System

A comprehensive courier and delivery management application built with Node.js, Express, MongoDB, React, and TypeScript. Features real-time tracking, user authentication, order management, and separate interfaces for customers and couriers.

## 🚀 Features

### For Customers
- **User Registration & Authentication** - Secure account creation and login
- **Order Creation** - Create delivery orders with pickup and delivery locations
- **Real-time Tracking** - Track orders with live location updates
- **Order History** - View past and current orders
- **Rating System** - Rate couriers after delivery

### For Couriers
- **Courier Registration** - Register with vehicle information and license
- **Availability Management** - Toggle availability status
- **Order Assignment** - Accept available delivery orders
- **Real-time Location Updates** - Share location with customers during delivery
- **Earnings Tracking** - View delivery statistics and earnings
- **Status Updates** - Update order status throughout delivery process

### Technical Features
- **Real-time Communication** - WebSocket integration for live updates
- **Geolocation Services** - GPS tracking and location-based features
- **Responsive Design** - Mobile-friendly interface
- **Role-based Access Control** - Separate interfaces for customers and couriers
- **RESTful API** - Well-structured API endpoints
- **Data Validation** - Input validation and error handling
- **Security** - JWT authentication, password hashing, rate limiting

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.io Client** - Real-time updates
- **React Leaflet** - Maps integration

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (v4.4 or higher)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd courier-app
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env in /backend)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/courier_app
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment (.env in /frontend)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. Database Setup

Make sure MongoDB is running on your system:

```bash
# Start MongoDB (varies by OS)
# macOS with Homebrew:
brew services start mongodb-community

# Ubuntu:
sudo systemctl start mongod

# Windows:
# Start MongoDB service from Services or run mongod.exe
```

### 5. Start the Application

#### Option 1: Start Both Services Simultaneously (Recommended)
```bash
# From the root directory
npm run dev
```

#### Option 2: Start Services Separately
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 👥 Demo Accounts

For testing purposes, you can create demo accounts or use these example credentials:

### Customer Account
- Email: customer@demo.com
- Password: password123

### Courier Account
- Email: courier@demo.com  
- Password: password123

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user (customer or courier)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "customer", // or "courier"
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  // Courier-specific fields (required if role is "courier")
  "vehicle": "car", // "bike", "motorcycle", "car", "van"
  "licenseNumber": "ABC123"
}
```

#### POST /api/auth/login
Authenticate user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/auth/profile
Get current user profile (requires authentication)

#### PUT /api/auth/profile
Update user profile (requires authentication)

### Order Endpoints

#### POST /api/orders
Create a new order (customers only)

**Request Body:**
```json
{
  "pickupLocation": {
    "address": {
      "street": "123 Pickup St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    },
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    },
    "contactName": "John Doe",
    "contactPhone": "+1234567890",
    "instructions": "Ring doorbell"
  },
  "deliveryLocation": {
    "address": {
      "street": "456 Delivery Ave",
      "city": "New York",
      "state": "NY",
      "zipCode": "10002"
    },
    "coordinates": {
      "lat": 40.7589,
      "lng": -73.9851
    },
    "contactName": "Jane Smith",
    "contactPhone": "+0987654321"
  },
  "packageDetails": {
    "description": "Documents",
    "weight": 0.5,
    "fragile": false,
    "category": "documents"
  },
  "priority": "standard" // "standard", "express", "urgent"
}
```

#### GET /api/orders
Get orders (filtered by user role)

#### GET /api/orders/available
Get available orders for couriers

#### PATCH /api/orders/:id/assign
Assign order to courier (couriers only)

#### PATCH /api/orders/:id/status
Update order status

### Courier Endpoints

#### GET /api/couriers/nearby
Find nearby available couriers

**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude  
- `radius`: Search radius in kilometers (default: 10)

#### GET /api/couriers/:id/dashboard
Get courier dashboard statistics

### Tracking Endpoints

#### GET /api/tracking/:orderNumber
Get order tracking information (public endpoint)

#### PATCH /api/tracking/:orderNumber/location
Update courier location for an order

#### GET /api/tracking/:orderNumber/eta
Get estimated delivery time

## 🗂️ Project Structure

```
courier-app/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── server.js        # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utility functions
│   └── package.json
├── package.json         # Root package.json
└── README.md
```

## 🔧 Development

### Available Scripts

#### Root Directory
- `npm run dev` - Start both backend and frontend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run install-all` - Install all dependencies

#### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

#### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Code Style

The project uses ESLint and Prettier for code formatting. Make sure to follow the established patterns:

- Use TypeScript for type safety
- Follow React hooks patterns
- Use Material-UI components consistently
- Implement proper error handling
- Add input validation for all forms

## 🚀 Deployment

### Backend Deployment

1. Set up environment variables on your hosting platform
2. Ensure MongoDB is accessible
3. Update CORS settings for production domain
4. Set NODE_ENV to "production"

### Frontend Deployment

1. Update API URLs in environment variables
2. Build the project: `npm run build`
3. Deploy the build folder to your hosting platform

### Recommended Hosting Platforms

- **Backend**: Heroku, DigitalOcean, AWS EC2
- **Frontend**: Netlify, Vercel, AWS S3 + CloudFront
- **Database**: MongoDB Atlas, DigitalOcean Managed Databases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🐛 Known Issues & Limitations

- Maps integration requires additional setup for production use
- Real-time tracking requires WebSocket connection
- File upload for delivery proof is simplified (URLs only)
- Payment integration is not implemented (placeholder only)

## 🔮 Future Enhancements

- **Payment Integration** - Stripe/PayPal integration
- **Advanced Maps** - Route optimization, traffic data
- **Push Notifications** - Mobile app notifications
- **Admin Dashboard** - System administration interface
- **Analytics** - Detailed reporting and analytics
- **Multi-language Support** - Internationalization
- **Mobile Apps** - React Native mobile applications

## 📞 Support

For support or questions, please open an issue in the repository or contact the development team.

---

**Happy Coding! 🚚📦**
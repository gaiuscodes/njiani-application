# Njiani - Mizigo njiani

A real-time delivery marketplace connecting online shops with delivery riders (motorcycles, bicycles, foot porters) across Kenya.

## 🚀 Features

- **Real-time Tracking**: Live location updates every 10 seconds using browser geolocation and Socket.io
- **Bidding System**: Riders bid on orders with their price and estimated delivery time
- **Wallet System**: Integrated M-Pesa payments (sandbox) and wallet management
- **Multi-role Support**: Admin, Shop (Merchant), and Rider dashboards
- **Mobile Responsive**: Fully optimized for mobile devices
- **Secure Authentication**: JWT tokens with httpOnly cookies

## 🛠️ Technology Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router v6
- Axios
- Socket.io-client

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- JWT Authentication
- Socket.io
- Multer (file uploads)
- M-Pesa Daraja API (sandbox)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- M-Pesa Daraja API credentials (sandbox)
- Cloudinary account (optional, for image storage)
- Google Maps API key (for interactive maps and address autocomplete)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd njiani-apk
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Set up environment variables**

   Create `backend/.env` file:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/njiani
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=your_passkey
   MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback
   MPESA_ENVIRONMENT=sandbox
   FRONTEND_URL=http://localhost:5173
   ```

6. **Seed the database**
   ```bash
   cd backend
   npm run seed
   ```

   This creates:
   - Admin user (username: `admin`, password: `King2025`)
   - Pre-seeded riders:
     - Einstein Masaba (Phone: `0700412580`, Password: `akanda123`)
     - Peter Munyasia (Phone: `0724427780`, Password: `munyasia321`)

## 🚀 Running the Application

### Development Mode

From the root directory:
```bash
npm run dev
```

This starts both:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:5173`

### Production Mode

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start backend**
   ```bash
   cd backend
   npm start
   ```

## 📱 User Roles

### Admin
- **Login**: `/admin/login`
- **Credentials**: username: `admin`, password: `King2025`
- **Features**:
  - View all riders, shops, and orders
  - Approve/reject rider applications
  - View platform analytics and earnings
  - Monitor active deliveries

### Rider (Delivery Guy)
- **Signup**: `/rider/signup`
- **Login**: `/rider/login`
- **Features**:
  - Toggle availability status
  - View and bid on available orders
  - Real-time location tracking during delivery
  - Wallet management and payout requests
  - Upload delivery receipt photos

### Shop (Merchant)
- **Signup**: `/shop/signup`
- **Login**: `/shop/login`
- **Features**:
  - Create delivery orders
  - View and accept rider bids
  - Real-time tracking of deliveries
  - Wallet top-up via M-Pesa
  - Rate riders after delivery

## 🔄 Order Flow

1. Shop creates an order with pickup and delivery details
2. Order appears in all "Free" riders' dashboards
3. Riders place bids with price and estimated time
4. Shop accepts the best bid
5. Rider goes to shop → Shop marks "Goods Handed Over"
6. Live tracking starts (updates every 10 seconds)
7. Rider delivers → Uploads receipt photo → Marks "Delivered"
8. System automatically:
   - Deducts 13% platform fee
   - Credits rider wallet (87%)
   - Deducts delivery fee from shop wallet
9. Shop and rider can rate each other

## 💰 Payment System

- **Shop Wallet**: Top-up via M-Pesa STK push (sandbox)
- **Rider Wallet**: Earnings from deliveries (87% of delivery fee)
- **Platform Fee**: 13% of every successful delivery goes to admin wallet
- **Payout**: Riders can request payout to M-Pesa

## 📡 Real-time Features

- Live location tracking (updates every 10 seconds)
- New order notifications to riders
- Bid notifications to shops
- Delivery status updates
- Real-time map of active deliveries

## 🗺️ Location Tracking

The app uses browser geolocation API and Google Maps for interactive tracking:
- **Interactive Google Maps**: Full Kenyan map with zoom capability (down to street level like Jevanjee Gardens)
- **Real-time Updates**: Updates every 10 seconds during active delivery
- **Visual Tracking**: 
  - Green marker for pickup location
  - Red marker for delivery location
  - Blue animated marker for rider's current location
  - Orange polyline showing the delivery route
- **Address Autocomplete**: Shops can search and select addresses using Google Places API (restricted to Kenya)
- **Detailed Zoom**: Can zoom from country level (all of Kenya) to street level (20x zoom)
- Stores tracking history in database
- Broadcasts to shop and admin via Socket.io

## 🔒 Security Features

- JWT authentication with httpOnly cookies
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS configuration

## 📁 Project Structure

```
njiani-apk/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & upload middleware
│   ├── socket/          # Socket.io handlers
│   ├── scripts/         # Seed script
│   ├── utils/           # Utility functions
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── App.jsx      # Main app
│   └── vite.config.js
├── package.json
└── README.md
```

## 🌐 Deployment

### Vercel (Frontend)
1. Build the frontend: `cd frontend && npm run build`
2. Deploy to Vercel
3. Update `FRONTEND_URL` in backend `.env`

### Render/Heroku (Backend)
1. Set environment variables
2. Deploy backend
3. Update `MPESA_CALLBACK_URL` with your backend URL
4. Update CORS settings

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register/rider` - Register rider
- `POST /api/auth/register/shop` - Register shop
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Rider
- `GET /api/rider/profile` - Get rider profile
- `POST /api/rider/toggle-status` - Toggle availability
- `GET /api/rider/available-orders` - Get available orders
- `POST /api/rider/bid/:orderId` - Place bid
- `GET /api/rider/active-order` - Get active order
- `POST /api/rider/update-location` - Update location
- `POST /api/rider/order/:orderId/complete` - Complete delivery

### Shop
- `GET /api/shop/profile` - Get shop profile
- `POST /api/shop/orders` - Create order
- `GET /api/shop/orders` - Get shop orders
- `POST /api/shop/orders/:orderId/accept-bid` - Accept bid
- `POST /api/shop/orders/:orderId/handover` - Mark handover

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/riders` - Get all riders
- `POST /api/admin/riders/:riderId/approve` - Approve/reject rider

### Wallet
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/payout` - Request payout

### M-Pesa
- `POST /api/mpesa/stk-push` - Initiate STK push
- `POST /api/mpesa/callback` - M-Pesa callback handler

## 🐛 Troubleshooting

1. **MongoDB connection error**: Ensure MongoDB is running
2. **Socket.io connection issues**: Check CORS settings and frontend URL
3. **Location tracking not working**: Ensure browser permissions are granted
4. **M-Pesa errors**: Verify sandbox credentials and callback URL

## 📄 License

MIT

## 👨‍💻 Built by

Gaius

---

**Njiani - Mizigo njiani** - Connecting Kenya, one delivery at a time 🚀


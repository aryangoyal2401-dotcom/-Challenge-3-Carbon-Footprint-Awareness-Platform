# 🌿 EcoTrack — Carbon Footprint Awareness Platform

> **Hackathon Challenge 3**: Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

![EcoTrack](https://img.shields.io/badge/EcoTrack-Carbon%20Tracker-10b981?style=for-the-badge&logo=leaflet&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Google Sign-In + Email/Password via Firebase Auth |
| 📊 **Interactive Dashboard** | Real-time CO₂ stats, category donut chart, weekly trend line, eco-score |
| 📝 **Activity Logger** | Log transportation, energy, food, and shopping with auto-calculated emissions |
| 💡 **Personalized Insights** | AI-powered tips based on your highest-emission categories |
| 🎯 **Goal Setting** | Monthly CO₂ reduction targets with visual progress tracking |
| 🏆 **Eco Challenges** | 14 daily/weekly/monthly challenges with streak tracking |
| 🏅 **Badge System** | 16 unlockable badges for milestones and achievements |
| 👥 **Community Leaderboard** | Real leaderboard comparing users' eco-scores |
| 📈 **Historical Analytics** | Emission trends with interactive Chart.js visualizations |
| 🌳 **Impact Equivalencies** | See your footprint in trees, car-km, and smartphone charges |
| 📱 **Responsive Design** | Premium dark-theme glassmorphism UI, mobile-first |
| 📤 **Data Export/Import** | Export your data as JSON, import from backup |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | Firebase Auth (Google + Email/Password) |
| **Charts** | Chart.js 4.4 |
| **Font** | Inter (Google Fonts) |
| **Security** | Helmet.js, CORS, Firebase Admin SDK |

---

## 📁 Project Structure

```
├── server.js                  # Express server entry point
├── config/
│   └── db.js                  # MongoDB Atlas connection
├── middleware/
│   └── auth.js                # Firebase token verification
├── models/
│   ├── User.js                # User profile + gamification
│   ├── Activity.js            # Carbon activity logs
│   └── Challenge.js           # Challenge progress tracking
├── routes/
│   ├── auth.js                # Auth sync & profile management
│   ├── activities.js          # CRUD for activity logging
│   ├── dashboard.js           # Aggregated dashboard statistics
│   ├── insights.js            # Personalized insights engine
│   ├── challenges.js          # Challenge & badge management
│   └── leaderboard.js         # Community ranking
├── utils/
│   ├── emissionFactors.js     # EPA/DEFRA emission factor database
│   └── insightEngine.js       # Insight generation algorithms
├── public/                    # Static frontend (served by Express)
│   ├── index.html             # SPA shell (622 lines)
│   ├── css/
│   │   └── styles.css         # Premium dark glassmorphism (2053 lines)
│   └── js/
│       ├── app.js             # Main entry, Firebase init, routing
│       ├── auth.js            # Firebase Auth wrapper
│       ├── api.js             # Backend API client
│       ├── router.js          # SPA hash router
│       ├── charts.js          # Chart.js configurations
│       ├── pages/
│       │   ├── dashboard.js   # Dashboard page logic
│       │   ├── logActivity.js # Activity logging forms
│       │   ├── insights.js    # Insights & comparisons
│       │   ├── challenges.js  # Challenges & badges
│       │   ├── leaderboard.js # Community leaderboard
│       │   └── settings.js    # User settings & data management
│       └── utils/
│           ├── toast.js       # Toast notification system
│           └── helpers.js     # Formatting & utility functions
├── .env.example               # Environment variable template
├── .gitignore
└── package.json
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **MongoDB Atlas** free cluster ([create one here](https://www.mongodb.com/cloud/atlas/register))
- **Firebase Project** ([create one here](https://console.firebase.google.com/))

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/-Challenge-3-Carbon-Footprint-Awareness-Platform.git
cd -Challenge-3-Carbon-Footprint-Awareness-Platform
npm install
```

### 2. Set Up MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write access
3. Whitelist your IP (or use `0.0.0.0/0` for development)
4. Get your connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/ecotrack`

### 3. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create project
2. **Enable Authentication:**
   - Authentication → Sign-in method → Enable **Google** and **Email/Password**
3. **Get Web App Config:**
   - Project Settings → General → Your apps → Add web app
   - Copy the `firebaseConfig` object
4. **Get Admin SDK credentials:**
   - Project Settings → Service accounts → Generate new private key
   - Note the `project_id`, `client_email`, and `private_key`

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/ecotrack

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Server
PORT=5000
NODE_ENV=development
```

### 5. Update Firebase Client Config

Edit `public/js/app.js` and replace the placeholder Firebase config (lines 21-28):

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
```

### 6. Run

```bash
npm start
# or for development with auto-restart:
npm run dev
```

Open **http://localhost:5000** in your browser 🎉

---

## 🌐 Deployment

### Deploy to Render (Free Tier)

1. Push code to GitHub
2. Go to [Render](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Add all from `.env`
5. Deploy!

### Deploy to Railway

1. Go to [Railway](https://railway.app) → New Project
2. Connect GitHub repo
3. Add environment variables
4. Deploy automatically

---

## 📊 Emission Factors

Our emission calculations use data from **EPA**, **DEFRA**, and **IPCC** sources:

| Category | Sub-type | Factor | Unit |
|---|---|---|---|
| 🚗 Transportation | Gasoline Car | 0.21 | kg CO₂/km |
| 🚗 Transportation | Electric Car | 0.05 | kg CO₂/km |
| 🚗 Transportation | Bus | 0.089 | kg CO₂/km |
| 🚗 Transportation | Train | 0.041 | kg CO₂/km |
| ✈️ Transportation | Domestic Flight | 0.255 | kg CO₂/km |
| ⚡ Energy | Electricity (Global) | 0.45 | kg CO₂/kWh |
| ⚡ Energy | Electricity (India) | 0.82 | kg CO₂/kWh |
| 🍽️ Food | Beef Meal | 7.0 | kg CO₂/meal |
| 🍽️ Food | Vegan Meal | 0.3 | kg CO₂/meal |
| 🛍️ Shopping | Electronics | 0.06 | kg CO₂/$ |

---

## 🏗️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/sync` | Sync Firebase user with database |
| `GET` | `/api/auth/profile` | Get user profile |
| `PUT` | `/api/auth/profile` | Update profile settings |
| `POST` | `/api/activities` | Log a new activity |
| `GET` | `/api/activities` | Get activities (with filters) |
| `DELETE` | `/api/activities/:id` | Delete an activity |
| `GET` | `/api/dashboard/summary` | Dashboard statistics |
| `GET` | `/api/dashboard/category-breakdown` | Emissions by category |
| `GET` | `/api/dashboard/weekly-trend` | Last 7 days trends |
| `GET` | `/api/insights` | Personalized reduction tips |
| `GET` | `/api/insights/comparison` | User vs. national averages |
| `GET` | `/api/insights/equivalencies` | Tree/car-km equivalencies |
| `GET` | `/api/challenges/available` | Available challenges |
| `POST` | `/api/challenges/join/:id` | Join a challenge |
| `GET` | `/api/challenges/badges` | Badge collection |
| `GET` | `/api/leaderboard` | Top 20 eco-warriors |
| `GET` | `/api/health` | Health check |

---

## 📄 License

MIT License — Built with 💚 for a greener planet.

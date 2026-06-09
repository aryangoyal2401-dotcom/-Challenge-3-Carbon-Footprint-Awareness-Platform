# 🌿 EcoTrack — Carbon Footprint Awareness Platform

> **Hackathon Challenge 3**: Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

![EcoTrack](https://img.shields.io/badge/EcoTrack-Carbon%20Tracker-10b981?style=for-the-badge&logo=leaflet&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![neDB](https://img.shields.io/badge/neDB-Lightweight_DB-47A248?style=for-the-badge&logo=database&logoColor=white)
![JWT Auth](https://img.shields.io/badge/JWT-Local_Auth-FFCA28?style=for-the-badge&logo=jsonwebtokens&logoColor=black)

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔐 **Zero-Setup Local Auth** | Secure Email/Password registration powered by JWT & bcrypt, stored locally. |
| 🗄️ **Zero-Setup Database** | Embedded file-based `nedb` database. No cloud accounts needed! |
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
| **Database** | neDB (Embedded persistent storage) |
| **Authentication** | JWT (JSON Web Tokens) & bcrypt |
| **Charts** | Chart.js 4.4 |
| **Font** | Inter (Google Fonts) |
| **Security** | Helmet.js, CORS |

---

## ⚡ Quick Start

No database configuration, no API keys, no environment variables required! Everything runs locally right out of the box.

### Prerequisites

- **Node.js** 18+ installed

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ecotrack-carbon-platform.git
cd ecotrack-carbon-platform
npm install
```

### 2. Run the App

```bash
npm start
```

Open **http://localhost:5000** in your browser! 🎉 
Click **Sign Up** to create your first local account and start logging activities.

### Data Storage
All data is stored locally in the `data/` directory (which is auto-created on the first run). To reset the application, simply delete the `.db` files inside the `data/` folder.

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

## 📄 License

MIT License — Built with 💚 for a greener planet.

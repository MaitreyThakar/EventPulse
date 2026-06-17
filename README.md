#  EventPulse — Event Feedback Management System

EventPulse is a premium, full-stack event intelligence and feedback management platform designed for event organizers who want to capture attendee insights, visualize metrics, and build better experiences. 

The application is built using a modern **Node.js + Express** backend, an **SQLite** database, and a highly interactive, responsive frontend featuring a **Three.js** 3D animated hero section, dynamic stats, custom animations, and a secure multi-role authentication flow.

---

##  Key Features

###  Frontend & Design Aesthetics
* **Interactive 3D Hero:** A stunning, immersive landing experience powered by **Three.js** rendering floating geometric shapes and glowing orbital rings.
* **Dual Themes:** Clean Dark Mode and Light Mode, with theme preferences persisted in `localStorage`.
* **Dynamic Stats Counters:** Live figures (total reviews, unique events, registered members, average rating) are fetched from the SQLite database and animated on page load using custom counter logic.
* **Testimonials Carousel:** A smooth, interactive carousel with controls and dot indicators presenting user testimonials.
* **Category Filtering:** Filter past events instantly by tags (Tech, Music, Design, Business, Art) with micro-animations.

###  Smart Feedback System
* **Interactive Rating Selection:** A custom 5-star selector with hover animations and visual feedback.
* **Client-Side Validation:** Detailed error handling and client-side verification before submissions.
* **CSV Export Tool:** Download all reviews or filter by specific events and download targeted CSV sheets.
* **Search, Sort & Filter:** Clean dashboard to search reviews by keyword, filter by rating/event, sort by date/score, with client-side pagination (10 reviews per page).

###  Secure Authentication & Roles
* **JWT & Cryptography:** Secure user sessions using JSON Web Tokens and password hashing via `bcryptjs`.
* **Email Verification:** Account verification workflow sent through **Nodemailer** integration (configured for Ethereal dev SMTP).
* **Reset Password Flow:** Secure forgot/reset password mechanism with 1-hour link expiries.
* **Admin Dashboard:** Access reserved for administrators (`admin@eventpulse.com`) to manage registered members (promote, demote, delete users) and moderate event feedback.

---

##  Project Structure

```bash
├── css/                        # Shared stylesheets
│   └── style.css               # Main styling tokens and theme variables
├── js/                         # Backend utilities or helper scripts
│   └── main.js                 # Local JS hooks
├── public/                     # Static Web Assets (Frontend)
│   ├── index.html              # Main application entry point
│   ├── events.html             # Events overview page
│   ├── feedback.html           # Feedback submission form
│   ├── view-feedback.html      # Reviews wall with filters & pagination
│   ├── auth.html               # Sign Up / Sign In portal
│   ├── admin.html              # Admin Control Panel
│   ├── charts.html             # Analytics and charting page
│   ├── reset-password.html     # Password recovery lander
│   ├── verify.html             # Email verification lander
│   ├── css/                    # Specific stylesheets
│   │   ├── admin.css           # Admin styles
│   │   ├── auth.css            # Authentication styling
│   │   ├── home3d.css          # Three.js hero and carousel designs
│   │   └── style.css           # Global layout adjustments
│   └── js/                     # Frontend Javascript Modules
│       ├── admin.js            # Admin portal management
│       ├── auth.js             # User login, registration, verify flows
│       ├── hero3d.js           # Three.js 3D canvas renderer
│       └── main.js             # General app routines (search, stats, filters)
├── server.js                   # Node.js / Express backend entry point
├── database.sqlite             # Local SQLite database (Auto-created on start)
├── package.json                # Project dependencies and startup scripts
└── .gitignore                  # Ignored files (node_modules, database, etc.)
```

---

##  Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended)
* npm (Node Package Manager)

### Installation
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/MaitreyThakar/EventPulse.git
   cd EventPulse
   ```

2. Install all required dependencies:
   ```bash
   npm install
   ```

### Running the Application
To run the server in development/production mode, execute the startup script:
```bash
npm start
```

Once started, the backend server will automatically initialize a new `database.sqlite` file and log the status in your terminal:
```text
  EventPulse Server v3.0
  ──────────────────────────────────────
  Local:   http://localhost:3000
  Stats:   http://localhost:3000/api/stats
  Charts:  http://localhost:3000/api/charts/ratings
  Admin:   http://localhost:3000/admin.html
  ──────────────────────────────────────
  TIP: Register with admin@eventpulse.com to get admin access
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 📬 Email Previews in Development
EventPulse uses **Nodemailer** alongside **Ethereal Email** to simulate mail deliveries for account verification and password resets without configuration.
* When a user registers or triggers a password reset, check the terminal logs.
* A live preview URL is generated: `Preview: https://ethereal.email/message/...`
* Click the link to open the simulated inbox and click the verification or reset links.

---

##  Setting up Admin Access
1. Start the server.
2. Go to **[http://localhost:3000/auth.html](http://localhost:3000/auth.html)**.
3. Sign Up using the email **`admin@eventpulse.com`**.
4. The system automatically tags this email as an administrator.
5. Log in, click on your avatar dropdown, and choose **Admin Panel** to manage reviews and users.

---

## 📊 API Endpoints Quick Reference

### Authentication
* `POST /api/auth/register` — Register a new account
* `POST /api/auth/login` — Sign in and receive JWT token
* `GET /api/auth/verify?token=...` — Verify email via token
* `POST /api/auth/forgot-password` — Send reset password link
* `POST /api/auth/reset-password` — Update password using token
* `GET /api/auth/me` — Retrieve current session profile (authenticated)

### Feedback Management
* `POST /api/feedback` — Submit feedback
* `GET /api/feedback` — Fetch all submissions
* `GET /api/feedback/mine` — Retrieve feedback by logged-in user (authenticated)
* `GET /api/feedback/export/csv` — Download feedback list as CSV (optionally filter by `?event=slug`)
* `GET /api/feedback/:id` — Retrieve single feedback details

### Stats & Analytics
* `GET /api/stats` — Fetch database totals and average rating
* `GET /api/charts/ratings` — Fetch ratings grouped by event
* `GET /api/charts/timeline` — Fetch submission counts by date
* `GET /api/charts/rating-distribution` — Fetch ratings volume distribution

### Admin Actions (Require Admin Authorization)
* `GET /api/admin/overview` — Fetch admin control panel metrics
* `GET /api/admin/users` — Fetch full system user accounts list
* `DELETE /api/admin/feedback/:id` — Delete a feedback review
* `DELETE /api/admin/users/:id` — Delete a user account
* `PATCH /api/admin/users/:id/promote` — Grant admin rights to a user
* `PATCH /api/admin/users/:id/demote` — Demote admin rights from a user

---

## Technologies Used
* **Backend:** Node.js, Express, SQLite3 (persistent file storage)
* **Frontend:** Vanilla HTML5, Custom CSS3, ES6 JavaScript, Three.js (3D graphics library)
* **Authentication:** JSON Web Tokens (jsonwebtoken), bcryptjs (hashing)
* **Mailing:** Nodemailer, Ethereal SMTP test account

<img width="1920" height="999" alt="image" src="https://github.com/user-attachments/assets/f790d0b4-5e50-4fcc-a116-2ff20916d1ed" />
<img width="1920" height="966" alt="image" src="https://github.com/user-attachments/assets/c046ebc6-c01d-473e-8865-3a1551783b68" />
<img width="1920" height="961" alt="image" src="https://github.com/user-attachments/assets/74c44c45-c1f9-4b33-aaf4-bf8bd7cfd5d3" />
<img width="1920" height="964" alt="image" src="https://github.com/user-attachments/assets/4436d397-8b1f-4161-9983-03d4e0ebde34" />
<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/a198e66b-1519-4c31-b726-24bd7d4619a6" />
<img width="1917" height="964" alt="image" src="https://github.com/user-attachments/assets/464d57f9-5f67-4dd4-a7ea-6fdac4d0a0c4" />
<img width="1920" height="965" alt="image" src="https://github.com/user-attachments/assets/00e6ec7a-6fdc-4ca9-9bcc-94ecf760e578" />
<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/b98f4f84-e8a9-48e8-be90-3d7dec103da6" />
<img width="1275" height="784" alt="image" src="https://github.com/user-attachments/assets/3d651a98-67b9-4651-b478-c148d9fc60f6" />
<img width="1269" height="516" alt="image" src="https://github.com/user-attachments/assets/39fc162a-845f-4f1c-bd8a-6c5db193fe45" />
<img width="1275" height="576" alt="image" src="https://github.com/user-attachments/assets/c18548a9-89d8-4607-b477-1158492ab889" />
<img width="1241" height="910" alt="image" src="https://github.com/user-attachments/assets/2a7c3af5-e563-4fca-94f2-46813c4aa531" />
https://drive.google.com/file/d/1XLC-TWum1TTziDEPkwXYh4dxcUl5yMIa/view?usp=sharing


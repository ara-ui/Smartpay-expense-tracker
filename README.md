# Smart Pay

An AI-powered personal finance management platform built with Node.js, Express, MongoDB, and modern web technologies. The application helps users track expenses, manage budgets, understand spending patterns, receive intelligent insights, generate reports, and explore premium financial features.

## 🚀 Live Demo

**Live Application:** 


## 🎥 Demo Video

**Project Walkthrough:** 


## 📌 About the Project

Managing personal expenses is often more difficult than simply recording transactions. Users may know how much they spend without having a clear view of their spending patterns, budget usage, or areas where they can improve.

Smart Pay was built as a product-oriented capstone project to address this problem.

The application provides a single platform where users can:

- Record and categorize expenses
- Monitor overall and category-wise spending
- Set daily, weekly, and monthly budgets
- Receive budget alerts and spending insights
- Use AI-assisted expense categorization
- Generate expense reports
- Track report download history
- Manage premium membership
- Make and track payments
- Use a clearly labelled simulated wallet-transfer feature for product demonstration

## ✨ Key Features

### 🔐 Authentication & Account Management
- User registration and login
- Password hashing with bcrypt
- JWT-based authentication
- Forgot-password flow
- Password reset
- Change-password flow with OTP verification
- Protected routes and premium-only access
- Authentication rate limiting

### 💰 Expense Management
- Add and delete expenses
- Expense categories
- Expense history
- Monthly and daily spending statistics
- Highest-spending category tracking
- Pagination for expense data

### 🎯 Budget Management
- Overall daily, weekly, and monthly spending limits
- Category-specific budget limits
- Budget usage tracking
- Budget status monitoring
- Budget alerts when limits are approached or exceeded
- Budget audit logging
- Protected budget changes requiring re-authentication

### 🤖 AI-Powered Insights
- AI-assisted expense categorization using Google Gemini
- Local rule-based categorization fallback
- Daily spending insights
- Week-over-week savings trends
- Category spending trends
- Budget-status insights

### 📊 Reports & Analytics
- Daily reports
- Weekly reports
- Monthly reports
- Yearly reports
- Custom date-range reports
- PDF/CSV report support in the frontend
- Report download history
- Download-again workflow

### 💳 Premium & Payments
- Premium membership
- Cashfree payment integration
- Payment order creation and status handling
- Cashfree webhook processing
- Webhook signature verification
- Payment idempotency handling
- Payment history
- Transaction records

### 💸 Demo Wallet / SmartPay
The application includes a **clearly labelled simulated payment mode** for demonstrating internal transfers without representing real bank or wallet funds.

Features include:
- Demo wallet balance
- System-generated SmartPay payment ID
- Send money between registered users
- Receive money
- Transfer history
- Idempotency protection
- Balance tracking
- Money sent/received notifications

### 🔔 Notifications
- Budget alerts
- Budget exceeded notifications
- Money sent notifications
- Money received notifications
- Read/unread notification state

### ☁️ External Services
- MongoDB database
- Google Gemini integration for AI categorization
- Cashfree for payment processing
- Brevo for email-related functionality

## 🛠️ Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

### Frontend
- HTML5
- CSS3
- JavaScript
- Axios

### Authentication & Security
- JWT
- bcrypt
- Helmet
- CORS
- Express Rate Limit
- Protected middleware
- Environment-based secrets

### Integrations
- Google Gemini
- Cashfree Payments
- 
- Brevo Email API

### Testing
- Node.js built-in test runner

## 🏗️ Application Architecture

The application follows a layered backend structure:

```text
                    ┌──────────────────────┐
                    │      Frontend        │
                    │ HTML / CSS / JS      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Express.js API    │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
       Middleware          Controllers        Routes
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                         Service Layer
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼
          MongoDB          External APIs
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 Gemini   Cashfree    Brevo
```

The project separates routing, authentication middleware, controllers, services, models, and utility logic to keep responsibilities organized and easier to maintain.

## 📁 Project Structure

```text
smart pay-expense-tracker-full/
│
├── controller/          # Request handlers
├── middleware/          # Authentication, authorization, rate limiting, errors
├── model/               # Mongoose schemas and database models
├── routes/              # API route definitions
├── services/            # Business logic and external integrations
│   └── payments/        # Payment provider and transaction services
├── utils/               # Shared utilities and validation helpers
├── public/               # Frontend HTML, CSS and JavaScript
├── test/                 # Automated tests
├── app.js                # Express application entry point
├── db.js                 # MongoDB connection
├── package.json
├── package-lock.json
└── README.md
```

## 🗄️ Database

MongoDB is used as the primary database with Mongoose.

Main data models include:

- `User`
- `Expense`
- `BudgetRule`
- `BudgetUsage`
- `BudgetAuditLog`
- `Order`
- `Transaction`
- `WebhookEvent`
- `DemoTransfer`
- `Notification`
- `ReportDownload`
- `ForgotPasswordRequest`
- `ChangePasswordOTP`

Indexes and unique constraints are used for frequently queried data and important integrity requirements such as idempotency and duplicate prevention.

## 🔌 API Overview

The backend exposes REST-style endpoints for the main product areas.

### Authentication & Users

```text
POST   /users
POST   /users/login
GET    /users/stats
GET    /users/membership
```

### Expenses

```text
POST   /expense/addexpense
GET    /expense/getexpenses
DELETE /expense/deleteexpense/:id
```

### Budgets

```text
GET    /budget/rules
PUT    /budget/rules
POST   /budget/rules/category
DELETE /budget/rules/category/:category
GET    /budget/status
GET    /budget/insights
```

### Reports

```text
GET  /expense/report
POST /expense/report-history
GET  /expense/report-history
```

### Payments

```text
POST /payments/create
GET  /payments/history
GET  /payments/history/:id
```

### Demo Wallet

```text
GET  /payments/demo/status
GET  /payments/demo/wallet
GET  /payments/demo/history
POST /payments/demo/transfer
```

### Notifications

```text
GET   /notifications
PATCH /notifications/read-all
PATCH /notifications/:id/read
```

### Password Management

```text
POST /password/forgotpassword
GET  /password/resetpassword/:id
POST /password/updatepassword/:id
POST /password/changepassword/request
POST /password/changepassword/verify
```

## ⚙️ Environment Variables

Create a `.env` file in the project root.

Example configuration:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Kolkata

GEMINI_API_KEY=your_gemini_api_key

CASHFREE_ENVIRONMENT=sandbox
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_DEFAULT_CUSTOMER_PHONE=your_test_phone

BREVO_API_KEY=your_brevo_api_key

DEMO_PAYMENTS_ENABLED=true

# Optional DNS workaround when required by the deployment environment
MONGODB_DNS_OVERRIDE=false
```

**Never commit the real `.env` file or API keys to GitHub.**

## 🏃 Running the Project Locally

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

### 2. Open the project directory

```bash
cd smart-expense-tracker-full
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file and provide the required values described above.

A MongoDB database is required for the application to start successfully.

### 5. Start the application

```bash
npm start
```

The application will be available at:

```text
http://localhost:3000
```

### Development mode

```bash
npm run dev
```

## 🧪 Testing

The project includes automated tests using the Node.js built-in test runner.

Run:

```bash
npm test
```

The test suite includes coverage for important application behavior such as:

- AI expense categorization
- Category fallback behavior
- Budget/payment smoke flows
- Regression protection for previously identified bugs

## 🔐 Security & Reliability Considerations

The application includes several backend-focused security and reliability measures:

- Password hashing using bcrypt
- JWT authentication
- Protected routes
- Premium authorization middleware
- Authentication rate limiting
- Helmet security headers
- CORS configuration
- Environment-based secret management
- Input validation at the model/service level
- Payment webhook signature verification
- Payment idempotency protection
- Unique database constraints
- Centralized error handling
- Database indexes for common access patterns
- Integer minor-unit/paise handling for budget and payment amounts where applicable
- Clearly separated demo-payment functionality to avoid representing simulated funds as real money

## 📈 System Design Considerations

The project was designed with scalability and maintainability in mind.

### Separation of responsibilities

Routes handle endpoint definitions, controllers handle HTTP-level operations, services contain business logic, and models manage database persistence.

### Idempotency

Payment and demo-transfer workflows use idempotency-related identifiers and database constraints to help prevent duplicate processing.

### Database consistency

Important entities use unique indexes and validation rules to reduce duplicate or invalid records.

### External dependency failures

AI categorization includes a local rule-based fallback so expense categorization can still function when the external AI service is unavailable.

### Pagination

Paginated access is used for data sets that can grow over time, such as expenses, transactions, and report history.

## ⚠️ Limitations

- AI categorization depends on the availability and limits of the configured Gemini API.
- Cashfree payment functionality depends on the payment provider and configured sandbox/production credentials.
- The SmartPay wallet is a simulated demonstration feature and does not represent real bank or payment-provider funds.
- External services such as Gemini, Cashfree, and Brevo require valid credentials and may be subject to provider availability, quotas, or sandbox restrictions.
- The current application is designed as a capstone/portfolio product rather than a production banking or financial institution system.
- Large-scale deployments would require additional infrastructure such as caching, background processing, monitoring, and horizontal scaling.

## 🔮 Future Improvements

Potential future enhancements include:

- Advanced spending forecasting
- Recurring expense management
- More detailed financial goals
- Additional analytics and visualizations
- Mobile application
- Redis-based caching
- Background job processing
- Expanded monitoring and observability
- More advanced recommendation and anomaly-detection features

## 🎯 Capstone Objective

This project was developed as a Node.js backend capstone with a product-oriented approach.

The goal was not only to build CRUD functionality, but to demonstrate practical backend concepts including:

- REST API development
- Authentication and authorization
- MongoDB data modelling
- Middleware design
- Business-logic separation
- Third-party API integration
- Payment processing concepts
- Webhook handling
- Idempotency
- Rate limiting
- Error handling
- Testing
- System design and scalability considerations

## 👩‍💻 Author

**Mehnaz Ara Islam**

B.Tech in Computer Engineering

GitHub: **[Add your GitHub profile link]**

LinkedIn: **[Add your LinkedIn profile link]**

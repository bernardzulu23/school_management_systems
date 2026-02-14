# 🇿🇲 Zambian School Management System - Next.js PWA

A comprehensive, offline-first school management system designed specifically for the Zambian educational context, supporting rural schools with limited connectivity.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Support for multiple schools with isolated data.
- **Offline-First PWA**: Fully functional without internet using Workbox and local storage.
- **Mobile Money Integration**: Integrated support for Airtel Money, MTN MoMo, and Zamtel Kwacha.
- **Creative Teaching Tools**: Multimedia lesson creator, student work showcase, and collaborative project manager.
- **Zambian Curriculum Support**: Pre-configured subjects, grading systems, and reporting for Grades 1-12.
- **SDG Framework**: Integrated monitoring for SDG 1 (No Poverty), SDG 2 (Zero Hunger), and SDG 4 (Quality Education).

## 🛠️ Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma with SQLite (Local) / PostgreSQL (Production)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: Workbox & next-pwa
- **Testing**: Jest & React Testing Library
- **Linting**: ESLint & Prettier

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/zambian-school-management.git
   cd zambian-school-management
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXT_PUBLIC_API_URL="http://localhost:3000"
   JWT_SECRET="your-secret-key"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🧹 Code Quality

The project uses ESLint and Prettier for code quality. A husky pre-commit hook is set up to run `lint-staged` before every commit.

```bash
# Run linter
npm run lint

# Format code
npm run format
```

## 📄 Documentation

- [API Documentation](API_DOCS.md)
- [Security Audit](SECURITY_AUDIT.md)
- [Performance Optimization](PERFORMANCE.md)
- [UX Improvements](UX_IMPROVEMENTS.md)
- [Change Log](CHANGELOG.md)

## 🤝 Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

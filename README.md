# Event Ticket Scanner

Modern event ticket management and scanning application with Supabase backend.

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 ou supérieure)
- Supabase account

### Setup

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Click the "Connect to Supabase" button in the top right
   - The database schema will be automatically applied from the migration files

3. **Start the application**
   ```bash
   npm run dev
   ```
   This starts the Vite development server on http://localhost:5173

### Available Scripts

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: Zustand
- **PDF Generation**: jsPDF
- **QR Codes**: qrcode library

## 📱 Features

- ✅ User management and authentication
- ✅ Event creation and management
- ✅ Ticket generation with QR codes
- ✅ Ticket scanning
- ✅ Admin dashboard
- ✅ PDF ticket export
- ✅ Responsive interface
- ✅ Custom tickets with variable pricing

## 🔧 Configuration

The application uses Supabase for backend services. Environment variables are automatically configured when you connect to Supabase.

## 📊 Database

The database schema is automatically applied from the migration files in `supabase/migrations/`.

### Main Tables:
- `users` - Application users
- `events` - Organized events
- `tickets` - Generated tickets for events
- `scans` - Ticket scan history

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Ticket className="h-8 w-8" />
            <span className="text-xl font-bold">QRticketPro</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-white hover:text-indigo-200 transition">
              Accueil
            </Link>
            <Link to="/events" className="text-white hover:text-indigo-200 transition">
              Événements
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className="text-white hover:text-indigo-200 transition">
                Tableau de bord
              </Link>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center bg-indigo-700 px-4 py-2 rounded-lg">
                  <User className="h-5 w-5 mr-2" />
                  <span className="font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <User className="h-5 w-5 mr-2" />
                <span>Connexion</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-indigo-700 transition"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-indigo-900 bg-opacity-95">
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <Link
              to="/"
              className="text-white text-xl hover:text-indigo-200 transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Accueil
            </Link>
            <Link
              to="/events"
              className="text-white text-xl hover:text-indigo-200 transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Événements
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-white text-xl hover:text-indigo-200 transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Tableau de bord
                </Link>
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center bg-indigo-700 px-6 py-3 rounded-lg">
                    <User className="h-5 w-5 mr-2" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="h-5 w-5 mr-2" />
                <span>Connexion</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
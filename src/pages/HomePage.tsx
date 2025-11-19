import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, QrCode, Smartphone, Check, Star, Crown } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Créez et Gérez vos Événements</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Plateforme complète pour la création de tickets d'événements avec codes QR et validation mobile
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/events" 
              className="bg-white text-indigo-600 hover:bg-indigo-100 px-8 py-3 rounded-lg font-semibold text-lg transition shadow-lg"
            >
              Découvrir les événements
            </Link>
            <Link 
              to="/login" 
              className="bg-indigo-800 hover:bg-indigo-900 px-8 py-3 rounded-lg font-semibold text-lg transition shadow-lg"
            >
              Connexion
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Fonctionnalités Principales</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl shadow-md text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Création de Tickets</h3>
              <p className="text-gray-600">
                Créez facilement des tickets personnalisés pour vos événements avec des codes QR uniques.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-xl shadow-md text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Codes QR Sécurisés</h3>
              <p className="text-gray-600">
                Chaque ticket est doté d'un code QR unique et sécurisé pour éviter la fraude.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-xl shadow-md text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Application Mobile</h3>
              <p className="text-gray-600">
                Scannez et validez les tickets avec notre application mobile dédiée.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Plans d'abonnement</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choisissez le plan qui correspond le mieux à vos besoins d'organisation d'événements
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plan Basic */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300">
              <div className="text-center mb-6">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Basic</h3>
                <div className="text-4xl font-bold text-indigo-600 mb-2">300 MAD</div>
                <p className="text-gray-500">par mois</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">1000 tickets max par événement</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Codes QR sécurisés</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Application mobile incluse</span>
                </div>
               
              </div>
              
              <button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors">
                Choisir Basic
              </button>
            </div>

            {/* Plan Pro */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-indigo-500 hover:border-indigo-600 transition-all duration-300 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Populaire
                </span>
              </div>
              
              <div className="text-center mb-6">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Pro</h3>
                <div className="text-4xl font-bold text-indigo-600 mb-2">1000 MAD</div>
                <p className="text-gray-500">par mois</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">5000 tickets max par événement</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Codes QR sécurisés</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Application mobile incluse</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Support prioritaire</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Statistiques avancées</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Personnalisation des tickets</span>
                </div>
              </div>
              
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors">
                Choisir Pro
              </button>
            </div>

            {/* Plan Premium */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-yellow-400 hover:border-yellow-500 transition-all duration-300">
              <div className="text-center mb-6">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Premium</h3>
                <div className="text-4xl font-bold text-yellow-600 mb-2">2500 MAD</div>
                <p className="text-gray-500">par mois</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-semibold">Tickets illimités par événement</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Codes QR sécurisés</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Application mobile incluse</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Support 24/7 dédié</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Statistiques avancées</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Personnalisation complète</span>
                </div>
                
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Formation personnalisée</span>
                </div>
              </div>
              
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors">
                Choisir Premium
              </button>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Tous les plans incluent un événement de test gratuit
            </p>
            <p className="text-sm text-gray-500">
              Prix hors taxes • Facturation mensuelle • Résiliation possible à tout moment
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Comment Ça Marche</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">1</div>
              <h3 className="text-xl font-semibold mb-2">Créez un Événement</h3>
              <p className="text-gray-600">
                Définissez les détails de votre événement, date, lieu et types de billets.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">2</div>
              <h3 className="text-xl font-semibold mb-2">Vendez des Tickets</h3>
              <p className="text-gray-600">
                Partagez votre événement et vendez des billets avec codes QR intégrés.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">3</div>
              <h3 className="text-xl font-semibold mb-2">Téléchargez l'App</h3>
              <p className="text-gray-600">
                Utilisez notre application mobile pour scanner les codes QR à l'entrée.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">4</div>
              <h3 className="text-xl font-semibold mb-2">Gérez l'Événement</h3>
              <p className="text-gray-600">
                Suivez les entrées en temps réel et gérez votre événement efficacement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Prêt à Gérer Vos Événements ?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers d'organisateurs qui utilisent notre plateforme pour gérer leurs événements.
          </p>
          <Link 
            to="/login" 
            className="bg-white text-indigo-600 hover:bg-indigo-100 px-8 py-3 rounded-lg font-semibold text-lg transition shadow-lg inline-block"
          >
            Se Connecter
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Ticket, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../stores/eventStore';
import { useReservationStore } from '../stores/reservationStore';
import { validateWhatsAppNumber, formatWhatsAppNumber } from '../utils/whatsapp';
import WhatsAppButton from '../components/WhatsAppButton';
import toast from 'react-hot-toast';

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const event = useEventStore(state => state.getEvent(id || ''));
  const createReservation = useReservationStore(state => state.createReservation);
  const [selectedTicketType, setSelectedTicketType] = useState(0);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Événement non trouvé</h2>
          <p className="mt-2 text-gray-600">L'événement que vous recherchez n'existe pas.</p>
          <button
            onClick={() => navigate('/events')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retour aux événements
          </button>
        </div>
      </div>
    );
  }

  const handleWhatsAppContact = () => {
    if (!validateWhatsAppNumber(whatsappNumber)) {
      setWhatsappError('Veuillez entrer un numéro WhatsApp valide');
      return;
    }

    setWhatsappError('');
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const selectedType = event.ticketTypes[selectedTicketType];
      
      if (!selectedType) {
        throw new Error('Type de billet non valide');
      }

      const reservation = createReservation({
        eventId: event.id,
        userId: user?.id || 'guest',
        ticketType: selectedType.name,
        price: selectedType.price,
        userEmail: whatsappNumber
      });

      // Format WhatsApp message
      const message = encodeURIComponent(
        `Bonjour, je souhaite réserver pour l'événement "${event.title}"\n\n` +
        `Numéro de réservation: ${reservation.reservationNumber}\n` +
        `Type de billet: ${selectedType.name}\n` +
        `Prix: ${selectedType.price} MAD\n\n` +
        `Merci de me confirmer la disponibilité.`
      );

      // Open WhatsApp with pre-filled message
      window.open(
        `https://wa.me/${event.whatsappNumber.replace(/[\s+]/g, '')}?text=${message}`,
        '_blank'
      );
      
      setShowReservationModal(false);
      toast.success('Redirection vers WhatsApp...');
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      toast.error('Une erreur est survenue lors de la réservation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsAppNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsAppNumber(e.target.value);
    setWhatsappNumber(formatted);
    if (whatsappError && validateWhatsAppNumber(formatted)) {
      setWhatsappError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Event Header */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="relative h-96">
            <img
              src={event.image || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <span className="inline-block px-3 py-1 bg-indigo-600 rounded-full text-sm font-semibold mb-4">
                {event.category}
              </span>
              <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>{format(new Date(event.date), 'dd MMMM yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  <span>{event.ticketsSold} / {event.capacity} places réservées</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  <WhatsAppButton
                    phoneNumber={event.whatsappNumber}
                    variant="secondary"
                    className="!bg-transparent !text-white hover:!text-green-200 !border-0 !p-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">À propos de l'événement</h2>
              <p className="text-gray-600 whitespace-pre-line">{event.description}</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold mb-4">Informations pratiques</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Date et horaires</h3>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-2" />
                    <div>
                      <p>{format(new Date(event.date), 'dd MMMM yyyy', { locale: fr })}</p>
                      <p>De {event.startTime} à {event.endTime}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Lieu</h3>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2" />
                    <div>
                      <p>{event.location}</p>
                      <p>{event.address}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Capacité</h3>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-5 w-5 mr-2" />
                    <div>
                      <p>{event.capacity} places au total</p>
                      <p>{event.capacity - event.ticketsSold} places encore disponibles</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-5 w-5 mr-2" />
                    <div>
                      <WhatsAppButton
                        phoneNumber={event.whatsappNumber}
                        variant="secondary"
                        className="!p-0 !border-0"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Cliquez pour contacter l'organisateur sur WhatsApp
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-8 sticky top-8">
              <h2 className="text-2xl font-bold mb-6">Réserver mes places</h2>

              <div className="space-y-4 mb-6">
                {event.ticketTypes.map((type, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      selectedTicketType === index
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-600'
                    }`}
                    onClick={() => setSelectedTicketType(index)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{type.name}</h3>
                      <span className="font-bold">{type.price} MAD</span>
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      {type.quantity - (event.ticketsSold || 0)} places disponibles
                    </div>
                  </div>
                ))}
              </div>

              <WhatsAppButton
                phoneNumber={event.whatsappNumber}
                className="w-full"
                message={`Bonjour, je suis intéressé par l'événement "${event.title}". Pouvez-vous me donner plus d'informations ?`}
              />

              <div className="mt-4 text-center text-sm text-gray-500">
                <div className="flex items-center justify-center mb-2">
                  <Ticket className="h-4 w-4 mr-1" />
                  <span>Paiement en espèces au guichet</span>
                </div>
                <p>Réservation valable 24h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de réservation */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Phone className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-xl font-bold">Confirmer la réservation</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Pour finaliser votre réservation, veuillez entrer votre numéro WhatsApp.
                Vous serez redirigé vers WhatsApp pour contacter l'organisateur.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={handleWhatsAppNumberChange}
                    className={`w-full pl-10 pr-3 py-2 border ${
                      whatsappError ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="+212 612 345 678"
                  />
                </div>
                {whatsappError && (
                  <p className="mt-2 text-sm text-red-600">{whatsappError}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">Format: +212 6XX XXX XXX (pour le Maroc)</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Récapitulatif :</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>Événement :</span>
                    <span className="font-medium">{event.title}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Type de billet :</span>
                    <span className="font-medium">{event.ticketTypes[selectedTicketType]?.name}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Prix :</span>
                    <span className="font-medium">{event.ticketTypes[selectedTicketType]?.price} MAD</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowReservationModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleWhatsAppContact}
                disabled={isProcessing || !whatsappNumber}
                className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center ${
                  (isProcessing || !whatsappNumber) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Phone className="h-5 w-5 mr-2" />
                {isProcessing ? 'Traitement...' : 'Contacter sur WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailsPage;
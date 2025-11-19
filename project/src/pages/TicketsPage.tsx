import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, QrCode, Download, CheckCircle, XCircle, Ticket, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import QRCode from 'qrcode';
import { useAuth } from '../contexts/AuthContext';
import { generateTicketPDF } from '../utils/ticketPDF';
import toast from 'react-hot-toast';
import { useEventStore } from '../stores/eventStore';

const TicketsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const events = useEventStore(state => state.events);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const tickets = events.map(event => ({
    id: event.id,
    eventId: event.id,
    eventName: event.title,
    eventDate: new Date(event.date),
    location: event.location,
    ticketType: event.ticketTypes[0]?.name || 'Standard',
    price: event.ticketTypes[0]?.price || 0,
    purchaseDate: new Date(),
    qrCode: `TICKET-${event.id}`,
    used: false,
    image: event.image || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
    logo: event.logo,
    paymentMethod: 'cash'
  }));

  const filteredTickets = selectedEvent === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.eventId === selectedEvent);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (selectedTicket) {
      const ticket = tickets.find(t => t.id === selectedTicket);
      if (ticket) {
        QRCode.toCanvas(
          document.getElementById(`qr-${ticket.id}`),
          JSON.stringify({
            id: ticket.id,
            eventId: ticket.eventId,
            eventName: ticket.eventName,
            ticketType: ticket.ticketType,
            price: ticket.price,
            purchaseDate: ticket.purchaseDate
          }),
          {
            width: 180,
            margin: 1,
            errorCorrectionLevel: 'H'
          }
        );
      }
    }
  }, [isAuthenticated, navigate, selectedTicket, tickets]);

  const handleGenerateTicket = async (event: typeof events[0]) => {
    setIsGenerating(true);
    try {
      const ticketData = {
        id: `${event.id}-${Date.now()}`,
        userId: user?.id || 'guest',
        eventId: event.id,
        eventName: event.title,
        eventDate: new Date(event.date),
        location: event.location,
        ticketType: event.ticketTypes[0]?.name || 'Standard',
        price: event.ticketTypes[0]?.price || 0,
        qrCode: `TICKET-${event.id}-${Date.now()}`,
        image: event.image,
        logo: event.logo
      };

      const doc = await generateTicketPDF(ticketData);
      doc.save(`ticket-${event.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);

      toast.success('Ticket généré avec succès !');
      setSelectedTicket(ticketData.id);
    } catch (error) {
      console.error('Erreur lors de la génération du ticket:', error);
      toast.error('Une erreur est survenue lors de la génération du ticket');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTicketDetails = (ticketId: string) => {
    setSelectedTicket(selectedTicket === ticketId ? null : ticketId);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mes Tickets</h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
              >
                <option value="all">Tous les événements</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {filteredTickets.length > 0 ? (
            <div className="space-y-6">
              {filteredTickets.map(ticket => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div 
                    className="flex flex-col md:flex-row cursor-pointer"
                    onClick={() => toggleTicketDetails(ticket.id)}
                  >
                    <div className="md:w-1/3 h-48 md:h-auto">
                      <img 
                        src={ticket.image} 
                        alt={ticket.eventName} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="p-6 md:w-2/3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-xl font-bold">{ticket.eventName}</h2>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            ticket.used 
                              ? 'bg-gray-200 text-gray-700' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {ticket.used ? 'Utilisé' : 'Valide'}
                          </span>
                        </div>
                        
                        <p className="text-indigo-600 font-semibold mb-4">{ticket.ticketType}</p>
                        
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{format(ticket.eventDate, 'dd MMMM yyyy', { locale: fr })}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{ticket.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 text-sm">
                            Prix: {ticket.price} MAD
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const event = events.find(ev => ev.id === ticket.eventId);
                            if (event) handleGenerateTicket(event);
                          }}
                          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <span>Génération...</span>
                          ) : (
                            <>
                              <QrCode className="h-5 w-5 mr-2" />
                              <span>Générer le ticket</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {selectedTicket === ticket.id && (
                    <div className="border-t border-gray-200 p-6">
                      <div className="flex flex-col md:flex-row items-center">
                        <div className="md:w-1/3 flex justify-center mb-6 md:mb-0">
                          <div className="bg-white p-4 rounded-lg shadow-md">
                            <canvas id={`qr-${ticket.id}`} />
                          </div>
                        </div>
                        
                        <div className="md:w-2/3 md:pl-8">
                          <h3 className="text-lg font-semibold mb-4">Informations du ticket</h3>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">ID du ticket:</span>
                              <span className="font-medium">{ticket.id}</span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{ticket.ticketType}</span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Prix:</span>
                              <span className="font-medium">{ticket.price} MAD</span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Méthode de paiement:</span>
                              <span className="font-medium">Espèces</span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Statut:</span>
                              <span className="flex items-center">
                                {ticket.used ? (
                                  <>
                                    <XCircle className="h-4 w-4 text-gray-500 mr-1" />
                                    <span className="text-gray-500">Utilisé</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                    <span className="text-green-600">Valide</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-6 flex justify-end">
                            <button 
                              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                              onClick={() => handleGenerateTicket(events.find(e => e.id === ticket.eventId)!)}
                            >
                              <Download className="h-5 w-5 mr-2" />
                              Télécharger le ticket
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="flex justify-center mb-4">
                <Ticket className="h-16 w-16 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Aucun ticket trouvé</h2>
              <p className="text-gray-600 mb-6">Vous n'avez pas encore acheté de tickets pour des événements.</p>
              <button 
                onClick={() => navigate('/events')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Découvrir les événements
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
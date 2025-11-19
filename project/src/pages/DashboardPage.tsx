import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { 
  Ticket,
  Calendar,
  User,
  Settings,
  ChevronRight,
  Download,
  QrCode,
  LogOut,
  Filter,
  Lock,
  Save,
  AlertCircle,
  Smartphone,
  DollarSign,
  Clock
} from 'lucide-react';
import { useTicketStore } from '../stores/ticketStore';
import { useEventStore } from '../stores/eventStore';
import { useUserStore } from '../stores/userStore';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateCustomTicketPDF } from '../utils/customTicketPDF';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type Tab = 'overview' | 'tickets' | 'events' | 'profile' | 'settings';

interface MonthlyEventStats {
  month: string;
  eventStats: {
    eventName: string;
    count: number;
  }[];
}

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCustomTicketModal, setShowCustomTicketModal] = useState(false);
  const [customTicketData, setCustomTicketData] = useState({
    eventId: '',
    customPrice: '',
    ticketType: ''
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { tickets, addCustomTicket, loadTickets } = useTicketStore();
  const { events, loadEvents } = useEventStore();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true
  });

  // Load user data on component mount
  useEffect(() => {
    if (user?.id) {
      // Load events and tickets from database
      loadEvents(user.id).catch(error => {
        console.error('Erreur lors du chargement des événements:', error);
        toast.error('Impossible de charger les événements depuis la base de données');
      });
      
      loadTickets(user.id).catch(error => {
        console.error('Erreur lors du chargement des tickets:', error);
        toast.error('Impossible de charger les tickets depuis la base de données');
      });
    }
  }, [user?.id, loadEvents, loadTickets]);

  const userTickets = tickets.filter(ticket => ticket.userId === user?.id);
  const userEvents = events.filter(event => event.organizerId === user?.id);

  const filteredTickets = selectedEvent === 'all' 
    ? userTickets 
    : userTickets.filter(ticket => ticket.eventId === selectedEvent);

  // Calculer les statistiques en temps réel
  const customTicketsCount = userTickets.filter(ticket => ticket.isCustom).length;
  const totalSpent = userTickets.reduce((total, ticket) => {
    const effectivePrice = ticket.customPrice || ticket.price;
    return total + Number(effectivePrice);
  }, 0);

  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const calculatedMonthlyStats: MonthlyEventStats[] = last6Months.map(month => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    
    const ticketsInMonth = userTickets.filter(ticket => {
      const ticketDate = new Date(ticket.purchaseDate);
      return ticketDate >= start && ticketDate <= end;
    });

    const eventStats = events.map(event => ({
      eventName: event.title,
      count: ticketsInMonth.filter(ticket => ticket.eventId === event.id).length
    })).filter(stat => stat.count > 0);

    return {
      month: format(month, 'MMM', { locale: fr }),
      eventStats
    };
  });

  const chartData = {
    labels: calculatedMonthlyStats.map(stat => stat.month),
    datasets: events.map((event, index) => ({
      label: event.title,
      data: calculatedMonthlyStats.map(stat => 
        stat.eventStats.find(es => es.eventName === event.title)?.count || 0
      ),
      backgroundColor: `hsla(${index * 60}, 70%, 60%, 0.5)`,
      borderColor: `hsla(${index * 60}, 70%, 60%, 1)`,
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }))
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Tickets générés par événement'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw} tickets`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        },
        title: {
          display: true,
          text: 'Nombre de tickets'
        }
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleGenerateCustomTicket = async (event: typeof events[0]) => {
    const currentUser = useUserStore.getState().getUserById(user?.id || '');
    if (!currentUser) {
      toast.error('Utilisateur non trouvé');
      return;
    }

    // Vérifier la limite mensuelle avant de générer le ticket
    if (currentUser.monthlyTicketLimit !== -1) {
      try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const monthlyCount = await useUserStore.getState().getUserMonthlyTicketCount(currentUser.id, currentYear, currentMonth);
        
        if (monthlyCount >= currentUser.monthlyTicketLimit) {
          toast.error(`❌ Limite mensuelle atteinte (${monthlyCount}/${currentUser.monthlyTicketLimit} tickets ce mois-ci)`);
          return;
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la limite:', error);
        toast.error('Erreur lors de la vérification de la limite mensuelle');
        return;
      }
    }

    if (currentUser.monthlyTicketLimit !== -1) {
      const currentTicketCount = useTicketStore.getState().getTicketCountByUserAndEvent(currentUser.id, event.id);
      if (currentTicketCount >= currentUser.monthlyTicketLimit) {
        toast.error(`Limite de tickets atteinte (${currentUser.monthlyTicketLimit} tickets maximum)`);
        return;
      }
    }

    setIsGeneratingCustom(true);
    try {
      const ticketData = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventId: event.id,
        userId: currentUser.id,
        eventName: event.title,
        eventDate: new Date(event.date),
        location: event.location,
        ticketType: event.ticketTypes[0]?.name || 'Standard',
        price: event.ticketTypes[0]?.price || 0,
        startTime: event.startTime,
        endTime: event.endTime,
        logo: event.logo,
        generatedAt: new Date()
      };

      // Generate custom format PDF
      const doc = await generateCustomTicketPDF(ticketData);
      doc.save(`ticket-personnalise-${event.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);

      // Ajouter le ticket à la base de données
      await addCustomTicket({
        eventId: event.id,
        userId: currentUser.id,
        eventName: event.title,
        eventDate: new Date(event.date),
        location: event.location,
        ticketType: event.ticketTypes[0]?.name || 'Standard',
        price: event.ticketTypes[0]?.price || 0,
        startTime: event.startTime,
        endTime: event.endTime,
        image: event.image,
        customPrice: event.ticketTypes[0]?.price || 0
      });

      // Recharger les tickets pour mettre à jour les statistiques
      await loadTickets(user?.id);

      console.log('✅ Ticket personnalisé généré et stocké dans la base de données');
      toast.success('Ticket personnalisé généré et sauvegardé avec succès !');
    } catch (error) {
      console.error('❌ Erreur génération ticket personnalisé:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération du ticket personnalisé';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handleCreateCustomTicket = () => {
    setCustomTicketData({
      eventId: '',
      customPrice: '',
      ticketType: ''
    });
    setShowCustomTicketModal(true);
  };

  const handleSubmitCustomTicket = async () => {
    if (!customTicketData.eventId || !customTicketData.customPrice) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    const event = events.find(e => e.id === customTicketData.eventId);
    if (!event) {
      toast.error('Événement non trouvé');
      return;
    }

    const currentUser = useUserStore.getState().getUserById(user?.id || '');
    if (!currentUser) {
      toast.error('Utilisateur non trouvé');
      return;
    }

    const customPrice = parseFloat(customTicketData.customPrice);
    if (isNaN(customPrice) || customPrice < 0) {
      toast.error('Prix personnalisé invalide');
      return;
    }

    try {
      const ticketData = {
        eventId: event.id,
        userId: currentUser.id,
        eventName: event.title,
        eventDate: new Date(event.date),
        location: event.location,
        ticketType: customTicketData.ticketType || event.ticketTypes[0]?.name || 'Personnalisé',
        price: event.ticketTypes[0]?.price || 0,
        startTime: event.startTime,
        endTime: event.endTime,
        image: event.image,
        customPrice: customPrice
      };

      const ticket = await addCustomTicket(ticketData);
      if (ticket) {
        // Generate custom PDF avec prix personnalisé et heure
        const doc = await generateCustomTicketPDF({
          id: ticket.id,
          userId: currentUser.id,
          eventId: event.id,
          eventName: ticketData.eventName,
          eventDate: ticketData.eventDate,
          location: ticketData.location,
          ticketType: ticketData.ticketType,
          price: ticketData.price,
          logo: event.logo,
          generatedAt: new Date(),
          customPrice: customPrice,
          startTime: ticketData.startTime,
          endTime: ticketData.endTime
        });
        doc.save(`ticket-personnalise-${event.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);

        // Recharger les tickets pour mettre à jour les statistiques
        await loadTickets(user?.id);

        console.log('✅ Ticket personnalisé manuel créé et stocké dans la base de données');
        toast.success('Ticket personnalisé créé et sauvegardé dans la base de données !');
        setShowCustomTicketModal(false);
      }
    } catch (error) {
      console.error('❌ Erreur création ticket personnalisé manuel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du ticket personnalisé';
      
      if (errorMessage.includes('ID vide')) {
        toast.error(
          <div>
            <p>Erreur critique détectée !</p>
            <p className="mt-2 text-sm">
              <a href="https://qrticketpro.com/server/clean_empty_tickets.php" target="_blank" className="underline">
                Cliquez ici pour nettoyer la base de données
              </a>
            </p>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profil mis à jour avec succès');
    setIsEditingProfile(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (!user?.id) {
      toast.error('Utilisateur non trouvé');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setIsProcessing(true);
    
    useUserStore.getState().changePassword(
      user.id,
      passwordForm.currentPassword,
      passwordForm.newPassword
    ).then(() => {
      toast.success('Mot de passe modifié avec succès dans la base de données !');
      setIsChangingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }).catch((error) => {
      console.error('Erreur changement mot de passe:', error);
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    }).finally(() => {
      setIsProcessing(false);
    });
  };

  const handleDownloadAPK = () => {
    // The APK file is stored in the public directory
    const apkPath = '/event-ticket-scanner.apk';
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = apkPath;
    link.download = 'event-ticket-scanner.apk';
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Téléchargement de l\'application démarré');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'overview'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="h-5 w-5 mr-3" />
                Vue d'ensemble
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'events'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-5 w-5 mr-3" />
                Mes événements
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'tickets'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Ticket className="h-5 w-5 mr-3" />
                Mes tickets
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'profile'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="h-5 w-5 mr-3" />
                Profil
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'settings'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-5 w-5 mr-3" />
                Paramètres
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Déconnexion
              </button>
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Ticket className="h-6 w-6 text-indigo-600" />
                        <h3 className="ml-3 text-lg font-medium text-gray-900">Tickets générés</h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{userTickets.length}</p>
                    <p className="mt-1 text-sm text-gray-500">Total des tickets générés</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <QrCode className="h-6 w-6 text-purple-600" />
                        <h3 className="ml-3 text-lg font-medium text-gray-900">Tickets personnalisés</h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {customTicketsCount}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Tickets avec prix personnalisé</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                        <h3 className="ml-3 text-lg font-medium text-gray-900">Total dépensé</h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {totalSpent.toFixed(2)} MAD
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Montant total des tickets</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques par événement</h3>
                  <Line data={chartData} options={chartOptions} />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Détails par mois</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mois</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Événement</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets générés</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {calculatedMonthlyStats.map((stat, monthIndex) => (
                          stat.eventStats.map((eventStat, eventIndex) => (
                            <tr key={`${monthIndex}-${eventIndex}`}>
                              {eventIndex === 0 && (
                                <td rowSpan={stat.eventStats.length} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {stat.month}
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eventStat.eventName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eventStat.count}</td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Mes événements</h3>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCreateCustomTicket}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <QrCode className="h-5 w-5 mr-2" />
                        Ticket personnalisé
                      </button>
                      <Link
                        to="/create-event"
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Calendar className="h-5 w-5 mr-2" />
                        Créer un événement
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userEvents.map(event => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <img src={event.image} alt={event.title} className="w-full h-48 object-cover rounded-lg mb-4" />
                        <h4 className="text-lg font-medium mb-2">{event.title}</h4>
                        <p className="text-sm text-gray-500 mb-2">{event.location}</p>
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleGenerateCustomTicket(event)}
                              disabled={isGeneratingCustom}
                              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full justify-center"
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              {isGeneratingCustom ? 'Génération...' : 'Ticket personnalisé'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Mes tickets</h3>
                    <div className="flex items-center space-x-4">
                      <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="all">Tous les événements</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{event.title}</option>
                        ))}
                      </select>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const event = events.find(e => e.id === selectedEvent);
                            if (event) handleGenerateCustomTicket(event);
                          }}
                          disabled={isGeneratingCustom || selectedEvent === 'all'}
                          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Personnalisé
                        </button>
                      </div>
                      <button className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtrer
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Événement</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Généré le</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTickets.map(ticket => (
                          <tr key={ticket.id} className={ticket.isCustom ? 'bg-purple-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center">
                                {ticket.isCustom && <QrCode className="h-4 w-4 text-purple-600 mr-2" />}
                                {ticket.eventName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(ticket.purchaseDate), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ticket.ticketType}
                              {ticket.isCustom && <span className="ml-2 text-purple-600 font-medium">(Personnalisé)</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ticket.customPrice ? (
                                <div>
                                  <span className="text-purple-600 font-medium">{ticket.customPrice} MAD</span>
                                  <span className="text-gray-400 line-through ml-2">{ticket.price} MAD</span>
                                </div>
                              ) : (
                                `${ticket.price} MAD`
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ticket.generatedAt ? format(new Date(ticket.generatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => {
                                    const event = events.find(e => e.id === ticket.eventId);
                                    if (event) handleGenerateCustomTicket(event);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Personnalisé
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Mon profil</h3>
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      {isEditingProfile ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Sauvegarder
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Modifier
                        </>
                      )}
                    </button>
                  </div>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom</label>
                      <input
                        type="text"
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        disabled={!isEditingProfile}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        id="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        disabled={!isEditingProfile}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Sécurité</h3>
                    <button
                      onClick={() => setIsChangingPassword(!isChangingPassword)}
                      className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Changer le mot de passe
                    </button>
                  </div>
                  {isChangingPassword && (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Mot de passe actuel</label>
                        <input
                          type="password"
                          id="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Entrez votre mot de passe actuel"
                        />
                      </div>
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                        <input
                          type="password"
                          id="newPassword"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                          minLength={6}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Au moins 6 caractères"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                        <input
                          type="password"
                          id="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Confirmez le nouveau mot de passe"
                        />
                      </div>
                      
                      {passwordForm.newPassword && passwordForm.confirmPassword && 
                       passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <div className="text-red-600 text-sm">
                          Les mots de passe ne correspondent pas
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isProcessing || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isProcessing ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Application mobile section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Smartphone className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-medium text-gray-900">Application Scanner</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Téléchargez notre application Android pour scanner les tickets d'événements.
                        Cette application vous permet de valider rapidement les tickets via leurs codes QR.
                      </p>
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={handleDownloadAPK}
                          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Télécharger l'application Android (APK)
                        </button>
                        <p className="text-xs text-gray-500">
                          Version 1.0.0 • Taille: 15MB • Android 6.0 et supérieur requis
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Paramètres de notification</h3>
                
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Notifications par email</h4>
                        <p className="text-sm text-gray-500">Recevoir des notifications par email</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          emailNotifications: !notificationSettings.emailNotifications
                        })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          notificationSettings.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                            notificationSettings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Notifications SMS</h4>
                        <p className="text-sm text-gray-500">Recevoir des notifications par SMS</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          smsNotifications: !notificationSettings.smsNotifications
                        })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          notificationSettings.smsNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                            notificationSettings.smsNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Emails marketing</h4>
                        <p className="text-sm text-gray-500">Recevoir des offres et promotions</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          marketingEmails: !notificationSettings.marketingEmails
                        })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          notificationSettings.marketingEmails ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                            notificationSettings.marketingEmails ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Supprimer le compte</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Une fois que vous supprimez votre compte, toutes vos données seront définitivement effacées.
                        Cette action ne peut pas être annulée.
                      </p>
                      <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        Supprimer mon compte
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour ticket personnalisé */}
      {showCustomTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-6">Créer un ticket personnalisé</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Événement *
                </label>
                <select
                  value={customTicketData.eventId}
                  onChange={(e) => setCustomTicketData({ ...customTicketData, eventId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">Sélectionnez un événement</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix personnalisé (MAD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customTicketData.customPrice}
                    onChange={(e) => setCustomTicketData({ ...customTicketData, customPrice: e.target.value })}
                    className="w-full pl-10 border border-gray-300 rounded-lg p-2"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de billet (optionnel)
                </label>
                <input
                  type="text"
                  value={customTicketData.ticketType}
                  onChange={(e) => setCustomTicketData({ ...customTicketData, ticketType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Ex: VIP Personnalisé"
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    Le ticket sera généré avec l'heure actuelle : {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCustomTicketModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitCustomTicket}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Créer le ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
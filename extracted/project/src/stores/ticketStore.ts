import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useUserStore } from './userStore';
import { useEventStore } from './eventStore';
import toast from 'react-hot-toast';

// Get API base URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const currentUrl = window.location.href;
    if (currentUrl.includes('localhost:5173')) {
      return 'http://localhost:8080';
    } else if (currentUrl.includes('qrticketpro.com')) {
      return 'https://qrticketpro.com/server';
    }
  }
  return '/server';
};

// Real API request to MySQL database
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/${endpoint}`;
  
  try {
    console.log('🔗 API Request to MySQL:', {
      url,
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body as string) : null
    });
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('📡 MySQL API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ MySQL API Error Response:', errorText);
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ MySQL API Success Response:', data);
    return data;
  } catch (error) {
    console.error('🚨 MySQL API Request Failed:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('❌ Serveur PHP non accessible. Assurez-vous que le serveur PHP est démarré sur le port 8080');
    }
    throw error;
  }
};

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  eventName: string;
  eventDate: Date;
  location: string;
  ticketType: string;
  price: number;
  purchaseDate: Date;
  qrCode: string;
  used: boolean;
  image?: string;
  isCustom?: boolean;
  customPrice?: number;
  generatedAt?: Date;
  startTime?: string;
  endTime?: string;
}

interface TicketStore {
  tickets: Ticket[];
  isLoading: boolean;
  addTicket: (ticket: Omit<Ticket, 'id' | 'qrCode' | 'purchaseDate' | 'used'>) => Promise<Ticket | null>;
  addCustomTicket: (ticket: Omit<Ticket, 'id' | 'qrCode' | 'purchaseDate' | 'used' | 'isCustom'> & { customPrice?: number }) => Promise<Ticket | null>;
  getTicketsByUser: (userId: string) => Ticket[];
  getTicketsByEvent: (eventId: string) => Ticket[];
  getTicketCountByUserAndEvent: (userId: string, eventId: string) => number;
  markTicketAsUsed: (ticketId: string) => void;
  generateFreeTicket: (eventId: string, userId: string) => Promise<Ticket | null>;
  getTotalSpentByUser: (userId: string) => number;
  getCustomTicketsByUser: (userId: string) => Ticket[];
  loadTickets: (userId?: string) => Promise<void>;
}

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      tickets: [],
      isLoading: false,
      
      addTicket: async (ticketData) => {
        const user = useUserStore.getState().getUserById(ticketData.userId);
        if (!user) {
          throw new Error('Utilisateur non trouvé');
        }

        // Vérifier la limite mensuelle de tickets
        if (user.monthlyTicketLimit !== -1) {
          try {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            const monthlyCount = await useUserStore.getState().getUserMonthlyTicketCount(ticketData.userId, currentYear, currentMonth);
            
            console.log(`🎫 Vérification limite mensuelle pour ${user.name}:`, {
              limite: user.monthlyTicketLimit,
              ticketsGeneresThisMois: monthlyCount,
              mois: currentMonth,
              annee: currentYear
            });
            
            if (monthlyCount >= user.monthlyTicketLimit) {
              console.error('❌ Limite mensuelle de tickets atteinte:', monthlyCount, 'sur', user.monthlyTicketLimit);
              throw new Error(`Limite mensuelle de tickets atteinte (${monthlyCount}/${user.monthlyTicketLimit} tickets ce mois-ci)`);
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('Limite mensuelle')) {
              throw error; // Re-throw limit errors
            }
            console.warn('Erreur lors de la vérification de la limite mensuelle:', error);
            // Continue without blocking if we can't check the limit
          }
        }

        const price = Number(ticketData.price);
        if (isNaN(price)) {
          console.error('Prix invalide:', ticketData.price);
          throw new Error('Prix invalide');
        }

        try {
          set({ isLoading: true });

          // Generate a robust ticket ID on the frontend
          const timestamp = Date.now();
          const microseconds = Math.floor(performance.now() * 1000).toString();
          const random = Math.random().toString(36).substr(2, 12); // 12 characters
          const userHash = ticketData.userId.length > 6 ? ticketData.userId.substr(-6) : ticketData.userId;
          const eventHash = ticketData.eventId.length > 4 ? ticketData.eventId.substr(-4) : ticketData.eventId;
          const ticketId = `std_${timestamp}_${microseconds}_${userHash}_${eventHash}_${random}`;
          const qrCode = `TICKET-${ticketId}`;
          
          // CRITICAL: Validate that ticketId is not empty and has minimum length
          if (!ticketId || ticketId.trim() === '' || ticketId.length < 30) {
            throw new Error('Impossible de générer un ID de ticket valide');
          }
          
          console.log('🎫 Création du ticket avec ID généré:', {
            id: ticketId,
            idLength: ticketId.length,
            eventId: ticketData.eventId,
            userId: ticketData.userId,
            eventName: ticketData.eventName
          });

          // Verify event exists
          const events = useEventStore.getState().events;
          const event = events.find(e => e.id === ticketData.eventId);
          if (!event) {
            throw new Error('Événement non trouvé');
          }

          const data = await apiRequest('create_ticket.php', {
            method: 'POST',
            body: JSON.stringify({
              id: ticketId,
              eventId: ticketData.eventId,
              userId: ticketData.userId,
              eventName: ticketData.eventName,
              eventDate: ticketData.eventDate.toISOString().split('T')[0],
              location: ticketData.location,
              ticketType: ticketData.ticketType,
              price: price,
              qrCode: qrCode,
              image: ticketData.image,
              startTime: ticketData.startTime,
              endTime: ticketData.endTime,
              isCustom: false,
              validateId: true // Request backend validation
            })
          });

          console.log('Réponse de l\'API create_ticket:', data);

          if (data.success && data.ticket) {
            const ticket: Ticket = {
              id: data.ticket.id,
              eventId: data.ticket.eventId,
              userId: data.ticket.userId,
              eventName: data.ticket.eventName,
              eventDate: new Date(data.ticket.eventDate),
              location: data.ticket.location,
              ticketType: data.ticket.ticketType,
              price: data.ticket.price,
              purchaseDate: new Date(),
              qrCode: data.ticket.qrCode,
              used: false,
              image: data.ticket.image,
              generatedAt: new Date(),
              startTime: data.ticket.startTime,
              endTime: data.ticket.endTime
            };

            set((state) => ({ 
              tickets: [...state.tickets, ticket],
              isLoading: false
            }));
            
            console.log('✅ Ticket créé et stocké avec succès:', ticket.id);
            toast.success('Ticket créé avec succès !');
            return ticket;
          } else {
            console.error('Réponse invalide du serveur:', data);
            const errorMessage = (data as any).error || 'Réponse invalide du serveur';
            console.error('Détails de l\'erreur:', data);
            throw new Error(errorMessage);
          }
        } catch (error) {
          set({ isLoading: false });
          
          if (error instanceof Error) {
            if (error.message.includes('ID vide') || error.message.includes('ERREUR CRITIQUE')) {
              const isProduction = window.location.hostname.includes('qrticketpro.com');
              const cleanupUrl = isProduction 
                ? 'https://qrticketpro.com/server/clean_empty_tickets.php'
                : 'http://localhost:8080/clean_empty_tickets.php';
              throw new Error(`Erreur critique: ID de ticket vide généré. Veuillez nettoyer la base de données en visitant ${cleanupUrl}`);
            } else if (error.message.includes('Conflit d\'ID de ticket') || error.message.includes('already exists')) {
              // Retry once with a completely new ID
              console.log('🔄 Collision d\'ID détectée, nouvelle tentative...');
              return get().addTicket(ticketData); // Retry will generate new ID
            } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
              throw new Error('Impossible de se connecter au serveur. Assurez-vous que le serveur PHP est démarré.');
            } else if (error.message.includes('HTTP 500')) {
              throw new Error('Erreur du serveur. Vérifiez que la base de données est accessible.');
            }
          }
          
          throw error;
        }
      },

      addCustomTicket: async (ticketData) => {
        const user = useUserStore.getState().getUserById(ticketData.userId);
        if (!user) {
          throw new Error('Utilisateur non trouvé');
        }

        // Vérifier la limite mensuelle de tickets pour les tickets personnalisés
        if (user.monthlyTicketLimit !== -1) {
          try {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            const monthlyCount = await useUserStore.getState().getUserMonthlyTicketCount(ticketData.userId, currentYear, currentMonth);
            
            console.log(`🎫 Vérification limite mensuelle (ticket personnalisé) pour ${user.name}:`, {
              limite: user.monthlyTicketLimit,
              ticketsGeneresThisMois: monthlyCount,
              mois: currentMonth,
              annee: currentYear
            });
            
            if (monthlyCount >= user.monthlyTicketLimit) {
              console.error('❌ Limite mensuelle de tickets atteinte (personnalisé):', monthlyCount, 'sur', user.monthlyTicketLimit);
              throw new Error(`Limite mensuelle de tickets atteinte (${monthlyCount}/${user.monthlyTicketLimit} tickets ce mois-ci)`);
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('Limite mensuelle')) {
              throw error; // Re-throw limit errors
            }
            console.warn('Erreur lors de la vérification de la limite mensuelle (personnalisé):', error);
            // Continue without blocking if we can't check the limit
          }
        }

        const price = Number(ticketData.price);
        const customPrice = ticketData.customPrice ? Number(ticketData.customPrice) : undefined;
        
        if (isNaN(price)) {
          throw new Error('Prix invalide');
        }

        if (customPrice && isNaN(customPrice)) {
          throw new Error('Prix personnalisé invalide');
        }

        // Validation supplémentaire pour le prix personnalisé
        if (customPrice !== undefined && customPrice < 0) {
          throw new Error('Le prix personnalisé ne peut pas être négatif');
        }

        try {
          set({ isLoading: true });

          // Verify event exists
          const events = useEventStore.getState().events;
          const event = events.find(e => e.id === ticketData.eventId);
          if (!event) {
            throw new Error('Événement non trouvé');
          }

          // Generate a robust custom ticket ID
          const timestamp = Date.now();
          const microseconds = Math.floor(performance.now() * 1000).toString();
          const random = Math.random().toString(36).substr(2, 12);
          const userHash = ticketData.userId.length > 6 ? ticketData.userId.substr(-6) : ticketData.userId;
          const eventHash = ticketData.eventId.length > 4 ? ticketData.eventId.substr(-4) : ticketData.eventId;
          const ticketId = `custom_${timestamp}_${microseconds}_${userHash}_${eventHash}_${random}`;
          const qrCode = `CUSTOM-TICKET-${ticketId}`;
          
          // CRITICAL: Validate that ticketId is not empty and has minimum length
          if (!ticketId || ticketId.trim() === '' || ticketId.length < 35) {
            throw new Error('Impossible de générer un ID de ticket valide');
          }
          
          console.log('🎫 Création du ticket personnalisé avec ID:', {
            id: ticketId,
            idLength: ticketId.length,
            customPrice: customPrice
          });
          
          const data = await apiRequest('create_ticket.php', {
            method: 'POST',
            body: JSON.stringify({
              id: ticketId,
              eventId: ticketData.eventId,
              userId: ticketData.userId,
              eventName: ticketData.eventName,
              eventDate: ticketData.eventDate.toISOString().split('T')[0],
              location: ticketData.location,
              ticketType: ticketData.ticketType,
              price: price,
              customPrice: customPrice,
              qrCode: qrCode,
              image: ticketData.image,
              startTime: ticketData.startTime,
              endTime: ticketData.endTime,
              isCustom: true,
              validateId: true
            })
          });

          if (data.success && data.ticket) {
            const ticket: Ticket = {
              id: data.ticket.id,
              eventId: data.ticket.eventId,
              userId: data.ticket.userId,
              eventName: data.ticket.eventName,
              eventDate: new Date(data.ticket.eventDate),
              location: data.ticket.location,
              ticketType: data.ticket.ticketType,
              price: data.ticket.price,
              purchaseDate: new Date(data.ticket.generatedAt || Date.now()),
              qrCode: data.ticket.qrCode,
              used: false,
              image: ticketData.image,
              isCustom: true,
              customPrice: data.ticket.customPrice,
              generatedAt: new Date(data.ticket.generatedAt || Date.now()),
              startTime: data.ticket.startTime,
              endTime: data.ticket.endTime
            };

            set((state) => ({ 
              tickets: [...state.tickets, ticket],
              isLoading: false
            }));
            
            console.log('✅ Ticket personnalisé créé et stocké avec succès:', ticket.id);
            toast.success('Ticket créé avec succès dans la base de données !');
            return ticket;
          } else {
            throw new Error((data as any).error || 'Réponse invalide du serveur');
          }
        } catch (error) {
          set({ isLoading: false });
          
          if (error instanceof Error) {
            if (error.message.includes('ID vide') || error.message.includes('ERREUR CRITIQUE')) {
              const isProduction = window.location.hostname.includes('qrticketpro.com');
              const cleanupUrl = isProduction 
                ? 'https://qrticketpro.com/server/clean_empty_tickets.php'
                : 'http://localhost:8080/clean_empty_tickets.php';
              throw new Error(`Erreur critique: ID de ticket vide généré. Veuillez nettoyer la base de données en visitant ${cleanupUrl}`);
            } else if (error.message.includes('Conflit d\'ID de ticket') || error.message.includes('already exists')) {
              // Retry once with a completely new ID
              console.log('🔄 Collision d\'ID détectée, nouvelle tentative...');
              return get().addCustomTicket(ticketData); // Retry will generate new ID
            } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
              throw new Error('Impossible de se connecter au serveur. Assurez-vous que le serveur PHP est démarré.');
            } else if (error.message.includes('HTTP 500')) {
              throw new Error('Erreur du serveur. Vérifiez que la base de données est accessible.');
            }
          }
          
          throw error;
        }
      },

      getTicketsByUser: (userId) => {
        return get().tickets.filter(ticket => ticket.userId === userId);
      },
      
      getTicketsByEvent: (eventId) => {
        return get().tickets.filter(ticket => ticket.eventId === eventId);
      },
      
      getTicketCountByUserAndEvent: (userId, eventId) => {
        return get().tickets.filter(
          ticket => ticket.userId === userId && ticket.eventId === eventId
        ).length;
      },
      
      markTicketAsUsed: (ticketId) => {
        set((state) => ({
          tickets: state.tickets.map(ticket =>
            ticket.id === ticketId ? { ...ticket, used: true } : ticket
          )
        }));
      },
      
      generateFreeTicket: async (eventId: string, userId: string) => {
        const user = useUserStore.getState().getUserById(userId);
        if (!user) {
          toast.error('Utilisateur non trouvé');
          return null;
        }

        // Vérifier la limite mensuelle
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const monthlyCount = await useUserStore.getState().getUserMonthlyTicketCount(userId, currentYear, currentMonth);
        
        if (user.monthlyTicketLimit !== -1 && monthlyCount >= user.monthlyTicketLimit) {
          toast.error(`Limite mensuelle de tickets atteinte (${user.monthlyTicketLimit} tickets maximum par mois)`);
          return null;
        }

        const ticket: Ticket = {
          id: uuidv4(),
          eventId,
          userId,
          eventName: "Test Event",
          eventDate: new Date(),
          location: "Test Location",
          ticketType: "Free",
          price: 0,
          purchaseDate: new Date(),
          qrCode: `FREE-${uuidv4()}`,
          used: false,
          generatedAt: new Date()
        };

        set((state) => ({ tickets: [...state.tickets, ticket] }));
        return ticket;
      },
      
      getTotalSpentByUser: (userId: string) => {
        const userTickets = get().tickets.filter(ticket => ticket.userId === userId);
        return userTickets.reduce((total, ticket) => {
          const effectivePrice = ticket.customPrice || ticket.price;
          return total + Number(effectivePrice);
        }, 0);
      },
      
      getCustomTicketsByUser: (userId: string) => {
        return get().tickets.filter(ticket => ticket.userId === userId && ticket.isCustom);
      },

      loadTickets: async (userId) => {
        try {
          set({ isLoading: true });
          
          try {
            const url = userId 
              ? `get_tickets.php?userId=${encodeURIComponent(userId)}`
              : 'get_tickets.php';
              
            const data = await apiRequest(url);

            if (data.success && Array.isArray(data.tickets)) {
              const tickets = data.tickets.map((ticket: any) => ({
                id: ticket.id,
                eventId: ticket.eventId,
                userId: ticket.userId,
                eventName: ticket.eventName,
                eventDate: new Date(ticket.eventDate),
                location: ticket.location,
                ticketType: ticket.ticketType,
                price: parseFloat(ticket.price) || 0,
                customPrice: ticket.customPrice ? parseFloat(ticket.customPrice) : undefined,
                purchaseDate: ticket.purchaseDate ? new Date(ticket.purchaseDate) : new Date(),
                qrCode: ticket.qrCode,
                used: Boolean(ticket.used),
                isCustom: Boolean(ticket.isCustom),
                image: ticket.image,
                startTime: ticket.startTime,
                endTime: ticket.endTime,
                generatedAt: ticket.generatedAt ? new Date(ticket.generatedAt) : new Date()
              }));

              console.log(`✅ Chargé ${tickets.length} tickets depuis la base de données`);
              set({ tickets, isLoading: false });
            } else {
              console.log('ℹ️ Aucun ticket trouvé dans la base de données');
              set({ tickets: [], isLoading: false });
            }
          } catch (error) {
            console.warn('Backend not available, using local storage:', error);
            set({ tickets: [], isLoading: false });
          }
        } catch (error) {
          console.warn('Error loading tickets:', error);
          set({ tickets: [], isLoading: false });
        }
      }
    }),
    {
      name: 'ticket-storage',
      version: 2,
      migrate: (persistedState: any) => {
        return {
          tickets: Array.isArray(persistedState?.tickets) ? persistedState.tickets : [],
          isLoading: false
        };
      }
    }
  )
);
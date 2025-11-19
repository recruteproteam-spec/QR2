import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  category: string;
  capacity: number;
  image: string;
  logo?: string;
  whatsappNumber: string;
  ticketsSold: number;
  revenue: number;
  organizerId: string;
  ticketTypes: {
    name: string;
    price: number;
    quantity: number;
    description: string;
  }[];
}

interface EventStore {
  events: Event[];
  isLoading: boolean;
  addEvent: (event: Event) => Promise<Event>;
  getEvent: (id: string) => Event | undefined;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  getEventsByOrganizer: (organizerId: string) => Event[];
  loadEvents: (organizerId?: string) => Promise<void>;
  loadAllEvents: () => Promise<void>;
}

// Get API base URL from environment variables with fallback handling
export const getApiBaseUrl = () => {
  // Use the server endpoint for production
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

// Enhanced fetch wrapper with better error handling
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  
  const url = `${baseUrl}/${endpoint}`;
  
  try {
    console.log('🔗 API Request:', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body ? JSON.parse(options.body as string) : null
    });
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('📡 API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('📋 Parsed Error Data:', errorData);
        errorMessage = errorData.error || errorMessage;
        
        // Si on a des détails de débogage, les afficher
        if (errorData.debug_info) {
          console.error('🐛 Debug Info:', errorData.debug_info);
        }
        if (errorData.details) {
          console.error('📝 Error Details:', errorData.details);
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ API Success Response:', data);
    return data;
  } catch (error) {
    console.error('🚨 API Request Failed:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const currentUrl = window.location.href;
      const isHttps = currentUrl.startsWith('https://');
      const apiIsHttp = url.startsWith('http://');
      
      if (isHttps && apiIsHttp) {
        throw new Error('Erreur de sécurité: Impossible d\'accéder à l\'API HTTP depuis une page HTTPS. Veuillez accéder à l\'application via http://localhost:5173');
      } else {
        throw new Error('❌ Serveur PHP non accessible. Solutions:\n1. Ouvrez un nouveau terminal\n2. Exécutez: npm run server\n3. Initialisez la DB: http://localhost:8080/init_database.php\n4. Redémarrez l\'application');
      }
    }
    throw error;
  }
};

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      events: [],
      isLoading: false,
      
      addEvent: async (event) => {
        try {
          set({ isLoading: true });
          
          const data = await apiRequest('create_event.php', {
            method: 'POST',
            body: JSON.stringify({
              id: event.id,
              title: event.title,
              description: event.description,
              date: event.date.toISOString().split('T')[0], // Format YYYY-MM-DD
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              address: event.address,
              category: event.category,
              capacity: event.capacity,
              image: event.image,
              logo: event.logo,
              whatsappNumber: event.whatsappNumber,
              organizerId: event.organizerId,
              ticketTypes: event.ticketTypes
            })
          });

          if (data.success && data.event) {
            const newEvent: Event = {
              ...event,
              date: new Date(data.event.date),
              ticketsSold: 0,
              revenue: 0
            };

            // Add to local state
            set((state) => ({ 
              events: [...state.events, newEvent],
              isLoading: false
            }));

            return newEvent;
          } else {
            throw new Error('Réponse invalide du serveur');
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('Erreur lors de la création de l\'événement:', error);
          throw error;
        }
      },

      getEvent: (id) => get().events.find(event => event.id === id),
      
      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map(event =>
          event.id === id ? { ...event, ...updates } : event
        )
      })),
      
      getEventsByOrganizer: (organizerId) => get().events.filter(event => event.organizerId === organizerId),

      loadEvents: async (organizerId) => {
        try {
          set({ isLoading: true });
          
          try {
            const url = organizerId 
              ? `get_events.php?organizerId=${encodeURIComponent(organizerId)}`
              : 'get_events.php';
              
            const data = await apiRequest(url);

            if (data.success && Array.isArray(data.events)) {
              const events = data.events.map((event: any) => ({
                id: event.id,
                title: event.title,
                description: event.description,
                date: new Date(event.date),
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                address: event.address,
                category: event.category,
                capacity: parseInt(event.capacity) || 0,
                image: event.image || '',
                logo: event.logo,
                whatsappNumber: event.whatsappNumber,
                ticketsSold: parseInt(event.ticketsSold) || 0,
                revenue: parseFloat(event.revenue) || 0,
                organizerId: event.organizerId,
                ticketTypes: Array.isArray(event.ticketTypes) ? event.ticketTypes : []
              }));

              set({ events, isLoading: false });
            } else {
              console.error('Erreur lors du chargement des événements:', data);
              set({ isLoading: false });
            }
          } catch (error) {
            console.warn('Backend not available, using local storage:', error);
            // Use local storage when backend is not available
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('Error loading events:', error);
          set({ isLoading: false });
        }
      },

      loadAllEvents: async () => {
        await get().loadEvents();
      }
    }),
    {
      name: 'event-storage',
      version: 2,
      migrate: (persistedState: any) => {
        // Migration logic if needed
        return {
          events: Array.isArray(persistedState?.events) ? persistedState.events : [],
          isLoading: false
        };
      }
    }
  )
);
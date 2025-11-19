import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from './eventStore';

export interface UserStatistics {
  totalTickets: number;
  customTickets: number;
  totalSpent: number;
  eventsAttended: number;
  favoriteCategory: string | null;
  lastTicketDate: string | null;
}

export interface MonthlyStatistics {
  year: number;
  month: number;
  ticketsGenerated: number;
  amountSpent: number;
  eventsAttended: number;
}

interface StatisticsStore {
  userStats: UserStatistics | null;
  monthlyStats: MonthlyStatistics[];
  isLoading: boolean;
  loadUserStatistics: (userId: string) => Promise<void>;
  updateUserStatistics: (userId: string) => Promise<void>;
  createStatisticsTables: () => Promise<void>;
}

export const useStatisticsStore = create<StatisticsStore>()(
  persist(
    (set, get) => ({
      userStats: null,
      monthlyStats: [],
      isLoading: false,

      createStatisticsTables: async () => {
        try {
          set({ isLoading: true });
          
          const data = await apiRequest('create_user_stats.php', {
            method: 'POST'
          });

          if (data.success) {
            console.log('✅ Tables de statistiques créées:', data.tables_created);
          }
        } catch (error) {
          console.error('Erreur lors de la création des tables de statistiques:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loadUserStatistics: async (userId: string) => {
        try {
          set({ isLoading: true });
          
          const data = await apiRequest(`get_user_stats.php?userId=${encodeURIComponent(userId)}`);

          if (data.success) {
            const userStats: UserStatistics = {
              totalTickets: data.statistics.total_tickets || 0,
              customTickets: data.statistics.custom_tickets || 0,
              totalSpent: data.statistics.total_spent || 0,
              eventsAttended: data.statistics.events_attended || 0,
              favoriteCategory: data.statistics.favorite_category,
              lastTicketDate: data.statistics.last_ticket_date
            };

            const monthlyStats: MonthlyStatistics[] = (data.monthly_statistics || []).map((stat: any) => ({
              year: stat.year,
              month: stat.month,
              ticketsGenerated: stat.tickets_generated,
              amountSpent: stat.amount_spent,
              eventsAttended: stat.events_attended
            }));

            set({ 
              userStats, 
              monthlyStats,
              isLoading: false 
            });
          } else {
            console.error('Erreur lors du chargement des statistiques:', data);
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des statistiques:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateUserStatistics: async (userId: string) => {
        try {
          const data = await apiRequest('update_user_stats.php', {
            method: 'POST',
            body: JSON.stringify({ userId })
          });

          if (data.success) {
            console.log('✅ Statistiques mises à jour:', data.statistics);
            
            // Reload statistics after update
            await get().loadUserStatistics(userId);
          } else {
            throw new Error('Erreur lors de la mise à jour des statistiques');
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour des statistiques:', error);
          throw error;
        }
      }
    }),
    {
      name: 'statistics-storage',
      version: 1
    }
  )
);
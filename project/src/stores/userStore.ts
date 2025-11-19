import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  passwordHash: string;
  monthlyTicketLimit: number;
  customTicketTemplates?: {
    id: string;
    name: string;
    config: {
      backgroundColor: string;
      textColor: string;
      font: string;
      logo?: string;
    };
  }[];
}

interface UserStore {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }) => User;
  createUser: (name: string, email: string) => Promise<{ user: User; password: string }>;
  updateUser: (id: string, updates: Partial<Omit<User, 'id' | 'passwordHash'>>) => void;
  updateMonthlyTicketLimit: (userId: string, limit: number) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  getUserById: (id: string) => User | undefined;
  getUserByEmail: (email: string) => User | undefined;
  changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  initializeAdmin: () => Promise<void>;
  loadUsers: () => Promise<void>;
  getUserMonthlyTicketCount: (userId: string, year?: number, month?: number) => Promise<number>;
  addCustomTicketTemplate: (userId: string, template: { name: string; config: any }) => void;
  getCustomTicketTemplates: (userId: string) => User['customTicketTemplates'];
  removeCustomTicketTemplate: (userId: string, templateId: string) => void;
}

// Get API base URL with automatic HTTPS/HTTP detection
const getApiBaseUrl = () => {
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

// Real API request to MySQL database
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  
  const url = `${baseUrl}/${endpoint}`;
  
  try {
    console.log('🔗 MySQL User API Request:', {
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
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ MySQL User API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ MySQL User API Success:', data);
    return data;
  } catch (error) {
    console.error('🚨 MySQL User API Failed:', error);
    
    // Fallback to local admin for critical operations
    if (endpoint === 'login_user.php' && options.body) {
      const body = JSON.parse(options.body as string);
      const { email, password } = body;
      
      if (email === 'admin@eventticket.com' && password === 'admin123!') {
        console.log('🔄 Fallback to local admin login');
        return {
          success: true,
          user: {
            id: 'admin_default',
            email: 'admin@eventticket.com',
            name: 'Administrateur',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            ticket_limit: -1
          }
        };
      }
    }
    
    throw error;
  }
};

// Créer l'utilisateur admin par défaut
const createAdminUser = (): User => ({
  id: uuidv4(),
  email: 'admin@eventticket.com',
  name: 'Administrateur',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  passwordHash: bcrypt.hashSync('admin123!', bcrypt.genSaltSync(10)),
  monthlyTicketLimit: -1,
  customTicketTemplates: []
});

// État initial avec un tableau users vide et l'utilisateur admin
const defaultState = {
  users: [createAdminUser()],
  currentUser: null,
  isLoading: false
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      loadUsers: async () => {
        try {
          set({ isLoading: true });
          
          try {
            const data = await apiRequest('get_users.php');
            
            if (data.success && Array.isArray(data.users)) {
              const users = data.users.map((user: any) => ({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role as 'admin' | 'user',
                isActive: Boolean(user.is_active),
                createdAt: new Date(user.created_at),
                lastLogin: user.last_login ? new Date(user.last_login) : undefined,
                passwordHash: '', // Ne pas exposer le hash
                monthlyTicketLimit: parseInt(user.monthly_ticket_limit) || 50,
                customTicketTemplates: []
              }));
              
              // Fusionner avec les utilisateurs locaux existants
              const currentUsers = Array.isArray(get().users) ? get().users : [];
              const mergedUsers = [...users];
              
              // Ajouter les utilisateurs locaux qui ne sont pas dans la DB
              currentUsers.forEach(localUser => {
                if (!mergedUsers.find(u => u.email === localUser.email)) {
                  mergedUsers.push(localUser);
                }
              });
              
              const hasAdmin = users.some((u: User) => u.role === 'admin');
              if (!hasAdmin) {
                mergedUsers.push(createAdminUser());
              }
              
              set({ users: mergedUsers, isLoading: false });
            } else {
              throw new Error('Invalid response format');
            }
          } catch (error) {
            console.warn('Backend not available, using local admin only:', error);
            // Préserver les utilisateurs existants quand le backend n'est pas disponible
            const currentUsers = Array.isArray(get().users) ? get().users : [];
            
            if (currentUsers.length === 0) {
              // Seulement si aucun utilisateur n'existe, créer l'admin par défaut
              set({ users: [createAdminUser()], isLoading: false });
            } else {
              // Garder les utilisateurs existants
              const hasAdmin = currentUsers.some((u: User) => u.role === 'admin');
              if (!hasAdmin) {
                currentUsers.push(createAdminUser());
              }
              set({ isLoading: false });
            }
          }
          
        } catch (error) {
          console.warn('Error loading users, using local storage:', error);
          set({ isLoading: false });
        }
      },

      addUser: (userData) => {
        if (!userData.email || !userData.name || !userData.password) {
          throw new Error('Tous les champs sont requis');
        }

        const currentUsers = Array.isArray(get().users) ? get().users : [];

        if (currentUsers.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
          throw new Error('Un utilisateur avec cet email existe déjà');
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(userData.password, salt);

        const user: User = {
          id: uuidv4(),
          email: userData.email.toLowerCase(),
          name: userData.name,
          role: userData.role,
          isActive: true,
          createdAt: new Date(),
          passwordHash,
          monthlyTicketLimit: userData.monthlyTicketLimit || 50,
          customTicketTemplates: []
        };

        set({ users: [...currentUsers, user] });
        return user;
      },

      createUser: async (name: string, email: string) => {
        if (!name || !email) {
          throw new Error('Le nom et l\'email sont requis');
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedName = name.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          throw new Error('Format d\'email invalide');
        }

        try {
          const data = await apiRequest('create_user.php', {
            method: 'POST',
            body: JSON.stringify({
              name: normalizedName,
              email: normalizedEmail,
              password: '', // Le serveur générera un mot de passe
              role: 'user',
              monthlyTicketLimit: 50
            })
          });

          if (data.success && data.user && data.password) {
            // Recharger la liste des utilisateurs
            await get().loadUsers();
            
            return {
              user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role as 'admin' | 'user',
                isActive: data.user.isActive,
                createdAt: new Date(data.user.createdAt),
                passwordHash: '',
                monthlyTicketLimit: data.user.monthlyTicketLimit,
                customTicketTemplates: []
              },
              password: data.password
            };
          } else {
            throw new Error('Réponse invalide du serveur');
          }
        } catch (error) {
          console.error('Erreur lors de la création de l\'utilisateur:', error);
          throw error;
        }
      },

      updateUser: (id, updates) => {
        const currentUsers = Array.isArray(get().users) ? get().users : [];
        set({
          users: currentUsers.map(user => 
            user.id === id ? { ...user, ...updates } : user
          )
        });
      },

      updateMonthlyTicketLimit: async (userId: string, limit: number) => {
        try {
          const data = await apiRequest('update_user.php', {
            method: 'POST',
            body: JSON.stringify({
              userId: userId,
              monthlyTicketLimit: limit
            })
          });

          if (data.success) {
            // Mettre à jour localement
            const currentUsers = Array.isArray(get().users) ? get().users : [];
            set({
              users: currentUsers.map(user =>
                user.id === userId ? { ...user, monthlyTicketLimit: limit } : user
              )
            });
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour de la limite mensuelle de tickets:', error);
          throw error;
        }
      },

      toggleUserStatus: async (id: string) => {
        try {
          const currentUsers = Array.isArray(get().users) ? get().users : [];
          const user = currentUsers.find(u => u.id === id);
          if (!user) {
            throw new Error('Utilisateur non trouvé');
          }

          const data = await apiRequest('update_user.php', {
            method: 'POST',
            body: JSON.stringify({
              userId: id,
              isActive: !user.isActive
            })
          });

          if (data.success) {
            // Mettre à jour localement
            set({
              users: currentUsers.map(u =>
                u.id === id ? { ...u, isActive: !u.isActive } : u
              )
            });
          }
        } catch (error) {
          console.error('Erreur lors du changement de statut:', error);
          throw error;
        }
      },

      login: async (email, password) => {
        try {
          // Check local users first
          const currentUsers = Array.isArray(get().users) ? get().users : [];
          const localUser = currentUsers.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
          
          if (localUser && bcrypt.compareSync(password, localUser.passwordHash)) {
            const user: User = {
              ...localUser,
              lastLogin: new Date()
            };
            
            set({ currentUser: user });
            toast.success('Connexion réussie !');
            return user;
          }
          
          // Try backend authentication if local auth fails
          try {
            // First, try to ensure admin user exists in database
            if (email.toLowerCase() === 'admin@eventticket.com') {
              try {
                await apiRequest('create_admin.php', {
                  method: 'POST'
                });
              } catch (adminError) {
                console.warn('Could not ensure admin user exists:', adminError);
              }
            }

            const data = await apiRequest('login_user.php', {
              method: 'POST',
              body: JSON.stringify({
                email: email.toLowerCase(),
                password: password
              })
            });

            if (data.success && data.user) {
              const user: User = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role as 'admin' | 'user',
                isActive: Boolean(data.user.is_active),
                createdAt: new Date(data.user.created_at),
                lastLogin: data.user.last_login ? new Date(data.user.last_login) : new Date(),
                passwordHash: '',
                monthlyTicketLimit: parseInt(data.user.monthly_ticket_limit) || 50,
                customTicketTemplates: []
              };

              set({ currentUser: user });
              toast.success('Connexion réussie !');
              return user;
            } else {
              throw new Error('Réponse de connexion invalide');
            }
          } catch (backendError) {
            console.warn('Backend authentication failed, trying local fallback:', backendError);
            
            // Fallback to admin credentials check
            if (email.toLowerCase() === 'admin@eventticket.com' && password === 'admin123!') {
              const adminUser = createAdminUser();
              set({ currentUser: adminUser });
              toast.success('Connexion réussie (mode hors ligne) !');
              return adminUser;
            }
            
            throw new Error('Email ou mot de passe incorrect');
          }
        } catch (error) {
          console.error('Erreur lors de la connexion:', error);
          
          // Final fallback for admin
          if (email.toLowerCase() === 'admin@eventticket.com' && password === 'admin123!') {
            try {
              const adminUser = createAdminUser();
              set({ currentUser: adminUser });
              toast.success('Connexion réussie (mode local) !');
              return adminUser;
            } catch (fallbackError) {
              console.error('Even fallback failed:', fallbackError);
            }
          }
          
          throw error;
        }
      },

      logout: () => {
        set({ currentUser: null });
      },

      getUserById: (id) => {
        const currentUsers = Array.isArray(get().users) ? get().users : [];
        return currentUsers.find(u => u.id === id);
      },

      getUserByEmail: (email) => {
        const currentUsers = Array.isArray(get().users) ? get().users : [];
        return currentUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      },

      changePassword: async (userId, currentPassword, newPassword) => {
        try {
          // Call backend API to change password
          const data = await apiRequest('change_password.php', {
            method: 'POST',
            body: JSON.stringify({
              userId: userId,
              currentPassword: currentPassword,
              newPassword: newPassword
            })
          });

          if (data.success) {
            // Update local user data if needed
            const currentUsers = Array.isArray(get().users) ? get().users : [];
            set({
              users: currentUsers.map(u =>
                u.id === userId ? { ...u, passwordHash: '' } : u // Clear local hash for security
              )
            });
            
            console.log('✅ Password changed successfully in database');
          } else {
            throw new Error(data.error || 'Erreur lors du changement de mot de passe');
          }
        } catch (error) {
          console.error('Erreur lors du changement de mot de passe:', error);
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        try {
          const data = await apiRequest('reset_password.php', {
            method: 'POST',
            body: JSON.stringify({ email: email.toLowerCase() })
          });

          if (data.success && data.newPassword) {
            return data.newPassword;
          } else {
            throw new Error('Réponse invalide du serveur');
          }
        } catch (error) {
          console.error('Erreur lors de la réinitialisation du mot de passe:', error);
          throw error;
        }
      },

      initializeAdmin: async () => {
        const currentUsers = Array.isArray(get().users) ? get().users : [];
        const existingAdmin = currentUsers.find(u => u.role === 'admin');
        
        if (!existingAdmin) {
          set({ users: [...currentUsers, createAdminUser()] });
        }

        // Try to ensure admin exists in database (optional)
        try {
          await apiRequest('init_database.php', {
            method: 'GET'
          });
        } catch (error) {
          console.warn('Could not initialize admin in database (working offline):', error);
        }

        // Try to load users from database (optional)
        try {
          await get().loadUsers();
        } catch (error) {
          console.warn('Could not load users from database (working offline):', error);
        }
      },

      addCustomTicketTemplate: (userId, template) => {
        const currentUsers = Array.isArray(get().users) ? get().users : [];
        set({
          users: currentUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                customTicketTemplates: [
                  ...(user.customTicketTemplates || []),
                  {
                    id: uuidv4(),
                    ...template
                  }
                ]
              };
            }
            return user;
          })
        });
      },

      getCustomTicketTemplates: (userId) => {
        const user = get().getUserById(userId);
        return user?.customTicketTemplates || [];
      },

      removeCustomTicketTemplate: (userId, templateId) => {
        const currentUsers = Array.isArray(get().users) ? get().users : [];
        set({
          users: currentUsers.map(user => {
            if (user.id === userId) {
              return {
                ...user,
                customTicketTemplates: (user.customTicketTemplates || []).filter(
                  template => template.id !== templateId
                )
              };
            }
            return user;
          })
        });
      },

      getUserMonthlyTicketCount: async (userId: string, year?: number, month?: number) => {
        try {
          const currentYear = year || new Date().getFullYear();
          const currentMonth = month || (new Date().getMonth() + 1);
          
          console.log(`📊 Récupération du nombre de tickets mensuels:`, {
            userId,
            year: currentYear,
            month: currentMonth
          });
          
          const data = await apiRequest(`get_monthly_ticket_count.php?userId=${encodeURIComponent(userId)}&year=${currentYear}&month=${currentMonth}`);
          
          if (data.success) {
            console.log(`✅ Nombre de tickets ce mois-ci:`, data.count);
            return data.count || 0;
          } else {
            console.warn('⚠️ Réponse API invalide pour le comptage mensuel:', data);
            return 0;
          }
        } catch (error) {
          console.error('Erreur lors du comptage mensuel des tickets:', error);
          return 0;
        }
      }
    }),
    {
      name: 'user-storage',
      version: 3,
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const data = JSON.parse(str);
            if (data.state?.users) {
              data.state.users = data.state.users.map((user: any) => ({
                monthlyTicketLimit: user.monthlyTicketLimit || 50,
                createdAt: new Date(user.createdAt),
                lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
              }));
            }
            return data;
          } catch (error) {
            console.error('Erreur lors de la lecture du storage:', error);
            return defaultState;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Erreur lors de l\'écriture dans le storage:', error);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('Erreur lors de la suppression du storage:', error);
          }
        }
      },
      migrate: (persistedState: any) => {
        if (!persistedState) {
          return defaultState;
        }

        try {
          // Préserver les utilisateurs existants du stockage local
          const existingUsers = Array.isArray(persistedState.users) ? persistedState.users : [];
          const currentUser = persistedState.currentUser || null;
          
          const migratedUsers = existingUsers.map((user: any) => ({
            id: user.id || uuidv4(),
            email: user.email || '',
            name: user.name || '',
            role: user.role || 'user',
            isActive: typeof user.isActive === 'boolean' ? user.isActive : true,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
            passwordHash: user.passwordHash || '',
            ticketLimit: user.ticketLimit || 10,
            customTicketTemplates: user.customTicketTemplates || []
          }));

          const hasAdmin = migratedUsers.some((user: User) => user.role === 'admin');
          if (!hasAdmin) {
            migratedUsers.push(createAdminUser());
          }

          return {
            users: migratedUsers.length > 0 ? migratedUsers : [createAdminUser()],
            currentUser: currentUser,
            isLoading: false
          };
        } catch (error) {
          console.error('Erreur lors de la migration:', error);
          // En cas d'erreur, essayer de préserver au moins les données existantes
          return {
            users: Array.isArray(persistedState.users) ? persistedState.users : [createAdminUser()],
            currentUser: persistedState.currentUser || null,
            isLoading: false
          };
        }
      }
    }
  )
);
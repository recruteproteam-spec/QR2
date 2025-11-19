import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Users, UserPlus, Lock, Mail, User, CheckCircle, XCircle, Key, LogOut, Ticket, RefreshCw } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface NewUserFormData {
  name: string;
  email: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    users = [], 
    currentUser, 
    createUser, 
    toggleUserStatus,
    resetPassword,
    loadUsers,
    updateMonthlyTicketLimit,
    isLoading
  } = useUserStore();
  const { logout } = useAuth();
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [monthlyTicketLimits, setMonthlyTicketLimits] = useState<{ [key: string]: number }>({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewUserFormData>();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
      return;
    }

    // Charger les utilisateurs depuis la base de données
    loadUsers();
  }, [currentUser, navigate, loadUsers]);

  useEffect(() => {
    // Initialize ticket limits from users
    const initialLimits: { [key: string]: number } = {};
    users.forEach(user => {
      initialLimits[user.id] = user.monthlyTicketLimit;
    });
    setMonthlyTicketLimits(initialLimits);
  }, [users]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRefreshUsers = async () => {
    setIsProcessing(true);
    try {
      await loadUsers();
      toast.success('Liste des utilisateurs mise à jour');
    } catch (error) {
      toast.error('Erreur lors du rafraîchissement');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateUser = async (data: NewUserFormData) => {
    if (!data.name || !data.email) {
      toast.error('Tous les champs sont requis');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await createUser(
        data.name.trim(),
        data.email.trim()
      );

      if (result && result.user && result.password) {
        toast.success(
          <div>
            <p>✅ Utilisateur créé avec succès dans la base de données !</p>
            <p className="mt-2 font-mono text-sm">
              Mot de passe temporaire : <strong>{result.password}</strong>
            </p>
          </div>,
          { duration: 10000 }
        );

        setShowNewUserForm(false);
        reset();
        
        // Recharger la liste des utilisateurs
        await loadUsers();
      } else {
        throw new Error('Erreur lors de la création de l\'utilisateur');
      }
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setIsProcessing(true);
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const newPassword = await resetPassword(user.email);
      
      toast.success(
        <div>
          <p>✅ Mot de passe réinitialisé avec succès dans la base de données !</p>
          <p className="mt-2 font-mono text-sm">
            Nouveau mot de passe : <strong>{newPassword}</strong>
          </p>
        </div>,
        { duration: 10000 }
      );
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMonthlyTicketLimitChange = async (userId: string, value: string) => {
    const limit = parseInt(value, 10);
    if (!isNaN(limit) && limit >= -1) { // -1 signifie illimité
      try {
        setIsProcessing(true);
        setMonthlyTicketLimits(prev => ({ ...prev, [userId]: limit }));
        await updateMonthlyTicketLimit(userId, limit);
        
        const limitText = limit === -1 ? 'illimitée' : `${limit} tickets/mois`;
        toast.success(`✅ Limite mensuelle mise à jour: ${limitText}`);
      } catch (error) {
        console.error('Erreur mise à jour limite:', error);
        toast.error('❌ Erreur lors de la mise à jour de la limite');
        // Revert the change
        setMonthlyTicketLimits(prev => ({ 
          ...prev, 
          [userId]: users.find(u => u.id === userId)?.monthlyTicketLimit || 50 
        }));
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('❌ Valeur invalide. Utilisez -1 pour illimité ou un nombre positif');
      // Reset to previous value
      setMonthlyTicketLimits(prev => ({ 
        ...prev, 
        [userId]: users.find(u => u.id === userId)?.monthlyTicketLimit || 50 
      }));
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      setIsProcessing(true);
      await toggleUserStatus(userId);
      toast.success('✅ Statut utilisateur mis à jour dans la base de données');
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user => user.role !== 'admin') : [];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
            <p className="text-gray-600 mt-2">Gérez les utilisateurs et leurs accès</p>
            <p className="text-sm text-green-600 mt-1">
              🔗 Connecté à la base de données MySQL
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleRefreshUsers}
              disabled={isLoading || isProcessing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold">
                Utilisateurs ({filteredUsers.length})
                {isLoading && <span className="text-sm text-gray-500 ml-2">(Chargement...)</span>}
              </h2>
            </div>
            <button
              onClick={() => setShowNewUserForm(true)}
              disabled={isProcessing}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Nouvel utilisateur
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limite de tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 ${
                      selectedUser === user.id ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-4 w-4 mr-1" />
                          Bloqué
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Ticket className="h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          min="-1"
                          value={monthlyTicketLimits[user.id] ?? user.monthlyTicketLimit}
                          onChange={(e) => handleMonthlyTicketLimitChange(user.id, e.target.value)}
                          className="w-24 px-2 py-1 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Limite"
                        />
                        <span className="text-xs text-gray-500">
                          {monthlyTicketLimits[user.id] === -1 ? '(illimité)' : '/mois'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {monthlyTicketLimits[user.id] === -1 
                          ? 'Tickets illimités' 
                          : `Max ${monthlyTicketLimits[user.id] || user.monthlyTicketLimit} tickets/mois`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Jamais connecté'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUserStatus(user.id);
                        }}
                        disabled={isProcessing}
                        className={`inline-flex items-center px-3 py-1 rounded-md mr-2 disabled:opacity-50 ${
                          user.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        {user.isActive ? 'Bloquer' : 'Activer'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetPassword(user.id);
                        }}
                        disabled={isProcessing}
                        className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 disabled:opacity-50"
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Réinitialiser MDP
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        Chargement des utilisateurs...
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de création d'utilisateur */}
      {showNewUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nouvel utilisateur</h3>
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Limites mensuelles :</strong> -1 = illimité, 0+ = nombre max de tickets par mois
                </p>
              </div>
              <button
                onClick={() => setShowNewUserForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className={`pl-10 w-full border rounded-lg p-2 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Jean Dupont"
                    {...register('name', { required: 'Le nom est requis' })}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    className={`pl-10 w-full border rounded-lg p-2 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="jean.dupont@example.com"
                    {...register('email', {
                      required: 'L\'email est requis',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email invalide'
                      }
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  📝 Un mot de passe temporaire sera généré automatiquement et affiché après la création.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  🎫 Limite par défaut : 50 tickets/mois (modifiable après création)
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, MapPin, Image, Ticket, Info, Plus, Trash2, Phone, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEventStore, Event } from '../stores/eventStore';
import { v4 as uuidv4 } from 'uuid';
import { compressImage, validateImageFile } from '../utils/imageUtils';
import toast from 'react-hot-toast';

interface TicketType {
  name: string;
  price: number;
  quantity: number;
  description: string;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  category: string;
  capacity: number;
  image: string;
  logo: string;
  whatsappNumber: string;
  ticketTypes: TicketType[];
}

const CreateEventPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const addEvent = useEventStore(state => state.addEvent);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<EventFormData>({
    defaultValues: {
      ticketTypes: [{ name: '', price: 0, quantity: 0, description: '' }],
      logo: '',
    }
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const ticketTypes = watch('ticketTypes');

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      validateImageFile(file);
      const base64Logo = await compressImage(file);
      setValue('logo', base64Logo);
      setLogoPreview(base64Logo);
      toast.success('Logo importé avec succès');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'importation du logo');
    } finally {
      setIsUploading(false);
    }
  };

  const addTicketType = () => {
    setValue('ticketTypes', [
      ...ticketTypes,
      { name: '', price: 0, quantity: 0, description: '' }
    ]);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length > 1) {
      setValue('ticketTypes', ticketTypes.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: EventFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const event: Event = {
        id: uuidv4(),
        ...data,
        date: new Date(data.date),
        ticketsSold: 0,
        revenue: 0,
        organizerId: user?.id || 'unknown'
      };
      
      await addEvent(event);
      toast.success('Événement créé avec succès !');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de l\'événement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Créer un Nouvel Événement</h1>
        
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Basic Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Info className="h-5 w-5 mr-2 text-indigo-600" />
                Informations de base
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre de l'événement*
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Ex: Festival de Musique Électronique"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <textarea
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Décrivez votre événement en détail..."
                    {...register('description', { required: 'La description est requise' })}
                  ></textarea>
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie*
                  </label>
                  <select
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('category', { required: 'La catégorie est requise' })}
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    <option value="Musique">Musique</option>
                    <option value="Technologie">Technologie</option>
                    <option value="Culture">Culture</option>
                    <option value="Sport">Sport</option>
                    <option value="Art">Art</option>
                    <option value="Gastronomie">Gastronomie</option>
                    <option value="Autre">Autre</option>
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro WhatsApp*
                  </label>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="tel"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.whatsappNumber ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="+212 612 345 678"
                      {...register('whatsappNumber', {
                        required: 'Le numéro WhatsApp est requis',
                        pattern: {
                          value: /^\+(?:212|33|1|44|49|39|34|351|31|32|41|43|46|47|48|380|420|421|7|86|81|82|91|971|974|973|966|965|968|962|961|963|964|972|90|20|27|234|225|221|216|213|212)[0-9\s]{8,}$/,
                          message: 'Format invalide. Exemple: +212 612 345 678'
                        }
                      })}
                    />
                  </div>
                  {errors.whatsappNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.whatsappNumber.message}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Format: +212 6XX XXX XXX (pour le Maroc) ou autre indicatif international
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de l'image de couverture
                  </label>
                  <div className="flex items-center">
                    <Image className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="https://example.com/image.jpg"
                      {...register('image')}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Entrez l'URL d'une image de couverture pour votre événement</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo de l'événement
                  </label>
                  <div className="mt-1 flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-24 w-24 object-contain rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <label
                        htmlFor="logo-upload"
                        className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none ${
                          isUploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload className="h-5 w-5 mr-2 text-gray-400" />
                        {isUploading ? 'Importation...' : 'Importer un logo'}
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                      />
                      <input
                        type="hidden"
                        {...register('logo')}
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        PNG ou JPG jusqu'à 5MB. Fond transparent recommandé.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Date and Time */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                Date et Heure
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date*
                  </label>
                  <input
                    type="date"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('date', { required: 'La date est requise' })}
                  />
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heure de début*
                    </label>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <input
                        type="time"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.startTime ? 'border-red-500' : 'border-gray-300'}`}
                        {...register('startTime', { required: 'L\'heure de début est requise' })}
                      />
                    </div>
                    {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heure de fin*
                    </label>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <input
                        type="time"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.endTime ? 'border-red-500' : 'border-gray-300'}`}
                        {...register('endTime', { required: 'L\'heure de fin est requise' })}
                      />
                    </div>
                    {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Location */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
                Lieu
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du lieu*
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Ex: Parc des Expositions"
                    {...register('location', { required: 'Le lieu est requis' })}
                  />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse complète*
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Ex: 1 Place de la Porte de Versailles, 75015 Paris"
                    {...register('address', { required: 'L\'adresse est requise' })}
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacité maximale*
                  </label>
                  <input
                    type="number"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${errors.capacity ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Ex: 500"
                    {...register('capacity', { 
                      required: 'La capacité est requise',
                      min: { value: 1, message: 'La capacité doit être supérieure à 0' }
                    })}
                  />
                  {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>}
                </div>
              </div>
            </div>
            
            {/* Tickets */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Ticket className="h-5 w-5 mr-2 text-indigo-600" />
                Billets
              </h2>
              
              <div className="space-y-6">
                {ticketTypes.map((_, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Type de billet #{index + 1}</h3>
                      {ticketTypes.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeTicketType(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom du billet*
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ex: Pass Standard"
                          {...register(`ticketTypes.${index}.name` as const, { required: true })}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prix (MAD)*
                        </label>
                        <input
                          type="number"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ex: 500"
                          {...register(`ticketTypes.${index}.price` as const, { 
                            required: true,
                            min: 0
                          })}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantité disponible*
                        </label>
                        <input
                          type="number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ex: 100"
                          {...register(`ticketTypes.${index}.quantity` as const, { 
                            required: true,
                            min: 1
                          })}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ex: Accès à toutes les zones"
                          {...register(`ticketTypes.${index}.description` as const)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addTicketType}
                  className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="h-5 w-5 mr-1" />
                  Ajouter un type de billet
                </button>
              </div>
            </div>
            
            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={() => navigate('/events')}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Création en cours...' : 'Créer l\'événement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
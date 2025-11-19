import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Reservation {
  id: string;
  reservationNumber: string;
  eventId: string;
  userId: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: Date;
  ticketType: string;
  price: number;
  userEmail: string;
}

interface ReservationStore {
  reservations: Reservation[];
  createReservation: (data: Omit<Reservation, 'id' | 'reservationNumber' | 'createdAt' | 'status'>) => Reservation;
  confirmPayment: (reservationNumber: string) => void;
  cancelReservation: (reservationNumber: string) => void;
  getReservationByNumber: (reservationNumber: string) => Reservation | undefined;
  getUserReservations: (userId: string) => Reservation[];
}

export const useReservationStore = create<ReservationStore>()(
  persist(
    (set, get) => ({
      reservations: [],
      createReservation: (data) => {
        const reservation: Reservation = {
          id: uuidv4(),
          reservationNumber: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
          status: 'pending',
          createdAt: new Date(),
          ...data,
        };
        
        set((state) => ({
          reservations: [...state.reservations, reservation]
        }));
        
        return reservation;
      },
      confirmPayment: (reservationNumber) => {
        set((state) => ({
          reservations: state.reservations.map(reservation =>
            reservation.reservationNumber === reservationNumber
              ? { ...reservation, status: 'paid' }
              : reservation
          )
        }));
      },
      cancelReservation: (reservationNumber) => {
        set((state) => ({
          reservations: state.reservations.map(reservation =>
            reservation.reservationNumber === reservationNumber
              ? { ...reservation, status: 'cancelled' }
              : reservation
          )
        }));
      },
      getReservationByNumber: (reservationNumber) => {
        return get().reservations.find(r => r.reservationNumber === reservationNumber);
      },
      getUserReservations: (userId) => {
        return get().reservations.filter(r => r.userId === userId);
      },
    }),
    {
      name: 'reservation-storage'
    }
  )
);
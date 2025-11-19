// Email service disabled - Resend package not available
// This is a placeholder for future email functionality

interface EmailData {
  to: string;
  reservationNumber: string;
  eventName: string;
  eventDate: Date;
  location: string;
  ticketType: string;
  price: number;
}

export const sendReservationEmail = async (data: EmailData) => {
  try {
    // For development, we'll just log the email data and return success
    console.log('Email would have been sent with data:', data);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiRequest } from '../stores/eventStore';

interface TicketData {
  id: string;
  eventName: string;
  eventDate: Date;
  location: string;
  ticketType: string;
  price: number;
  userId: string;
  eventId: string;
  logo?: string;
}

export const generateTicketPDF = async (ticket: TicketData): Promise<jsPDF> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Add logo and header
    if (ticket.logo) {
      try {
        const logoWidth = 40;
        const logoHeight = 20;
        doc.addImage(ticket.logo, 'PNG', margin, yPosition, logoWidth, logoHeight, undefined, 'FAST');
        doc.setFontSize(24);
        doc.setTextColor(79, 70, 229);
        doc.text('QRticketPro', margin + logoWidth + 5, yPosition + (logoHeight / 2));
        yPosition += logoHeight + 10;
      } catch (error) {
        console.warn('Impossible de charger le logo:', error);
        doc.setFontSize(24);
        doc.setTextColor(79, 70, 229);
        doc.text('QRticketPro', margin, yPosition + 10);
        yPosition += 20;
      }
    } else {
      doc.setFontSize(24);
      doc.setTextColor(79, 70, 229);
      doc.text('QRticketPro', margin, yPosition + 10);
      yPosition += 20;
    }

    // Event name
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    const eventNameLines = doc.splitTextToSize(ticket.eventName, contentWidth);
    doc.text(eventNameLines, margin, yPosition + 10);
    yPosition += 10 * eventNameLines.length + 10;

    // Event details
    doc.setFontSize(12);
    const details = [
      `Date : ${format(ticket.eventDate, 'dd MMMM yyyy', { locale: fr })}`,
      `Lieu : ${ticket.location}`,
      `Type de billet : ${ticket.ticketType}`,
      `Prix : ${ticket.price} MAD`
    ];

    details.forEach(detail => {
      doc.text(detail, margin, yPosition);
      yPosition += 8;
    });

    // QR Code with user_id and event_id
    const validationUrl = `https://www.qrticketpro.com/validate.php?user_id=${ticket.userId}&event_id=${ticket.eventId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });

    const qrCodeSize = 50;
    const qrCodeX = (pageWidth - qrCodeSize) / 2;
    yPosition += 10;
    doc.addImage(qrCodeDataUrl, 'PNG', qrCodeX, yPosition, qrCodeSize, qrCodeSize);
    yPosition += qrCodeSize + 10;

    // Ticket ID
    doc.setFontSize(10);
    doc.text(`Ticket ID: ${ticket.id}`, margin, yPosition);
    yPosition += 10;

    // Legal notes
    doc.setFontSize(8);
    const legalNotes = [
      'Ce billet est personnel et non cessible. Une pièce d\'identité pourra être demandée.',
      'Le code QR doit être présenté à l\'entrée de l\'événement pour validation.'
    ];

    legalNotes.forEach(note => {
      const noteLines = doc.splitTextToSize(note, contentWidth);
      doc.text(noteLines, margin, yPosition);
      yPosition += 5 * noteLines.length;
    });

    // ✅ Envoi du ticket vers la base de données - Using centralized API request
    try {
      await apiRequest('insert_ticket.php', {
        method: 'POST',
        body: JSON.stringify({ ticketId: ticket.id })
      });
      console.log('✅ Ticket standard envoyé vers la base de données:', ticket.id);
    } catch (err) {
      console.error("❌ Erreur lors de l'enregistrement du ticket standard dans la base de données :", err);
    }

    return doc;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Erreur lors de la génération du PDF. Veuillez réessayer.');
  }
};
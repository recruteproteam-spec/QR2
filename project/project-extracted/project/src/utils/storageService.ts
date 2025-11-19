import { supabase } from './supabaseClient';
import QRCode from 'qrcode';

const BUCKETS = {
  TICKET_QRCODES: 'ticket-qrcodes',
  TICKET_IMAGES: 'ticket-images',
  EVENT_IMAGES: 'event-images'
};

export const uploadQRCode = async (ticketId: string, qrCodeData: string): Promise<string> => {
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, qrCodeData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });

    const fileName = `${ticketId}.png`;
    const filePath = `qrcodes/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKETS.TICKET_QRCODES)
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKETS.TICKET_QRCODES)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading QR code:', error);
    throw new Error('Failed to upload QR code to storage');
  }
};

export const uploadTicketImage = async (ticketId: string, imageFile: File): Promise<string> => {
  try {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${ticketId}.${fileExt}`;
    const filePath = `tickets/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKETS.TICKET_IMAGES)
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKETS.TICKET_IMAGES)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading ticket image:', error);
    throw new Error('Failed to upload ticket image to storage');
  }
};

export const uploadEventImage = async (eventId: string, imageFile: File): Promise<string> => {
  try {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${eventId}.${fileExt}`;
    const filePath = `events/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKETS.EVENT_IMAGES)
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKETS.EVENT_IMAGES)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading event image:', error);
    throw new Error('Failed to upload event image to storage');
  }
};

export const deleteQRCode = async (ticketId: string): Promise<void> => {
  try {
    const filePath = `qrcodes/${ticketId}.png`;
    const { error } = await supabase.storage
      .from(BUCKETS.TICKET_QRCODES)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting QR code:', error);
  }
};

export const deleteTicketImage = async (ticketId: string, fileExtension: string = 'jpg'): Promise<void> => {
  try {
    const filePath = `tickets/${ticketId}.${fileExtension}`;
    const { error } = await supabase.storage
      .from(BUCKETS.TICKET_IMAGES)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting ticket image:', error);
  }
};

export const deleteEventImage = async (eventId: string, fileExtension: string = 'jpg'): Promise<void> => {
  try {
    const filePath = `events/${eventId}.${fileExtension}`;
    const { error } = await supabase.storage
      .from(BUCKETS.EVENT_IMAGES)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting event image:', error);
  }
};

export const ensureStorageBucketsExist = async (): Promise<void> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }

    const existingBucketNames = buckets.map(b => b.name);

    for (const bucketName of Object.values(BUCKETS)) {
      if (!existingBucketNames.includes(bucketName)) {
        const isPublic = bucketName === BUCKETS.EVENT_IMAGES;

        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: 5242880
        });

        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
        } else {
          console.log(`✅ Created storage bucket: ${bucketName}`);
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring buckets exist:', error);
  }
};

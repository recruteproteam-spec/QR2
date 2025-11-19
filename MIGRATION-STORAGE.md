# Migration: Suppression du stockage des QR codes et images dans la base de données

## Problème identifié

Votre base de données MySQL stockait les QR codes et images directement dans les colonnes `qr_code` et `image`, ce qui causait:
- **Surcharge de la base de données**: Les données binaires en base64 occupent beaucoup d'espace
- **Performance dégradée**: Les requêtes deviennent lentes avec de grosses données
- **Coûts de stockage élevés**: Le stockage en base de données est plus coûteux
- **Risque de corruption**: Les grandes valeurs TEXT peuvent causer des erreurs

## Solution mise en place

### 1. Migration de la base de données Supabase

Une migration a été appliquée qui:
- Remplace la colonne `qr_code` par `qr_code_url` dans la table `tickets`
- Remplace la colonne `image` par `image_url` dans la table `tickets`
- Les colonnes stockent maintenant des URLs au lieu de données binaires
- Les données sont stockées dans Supabase Storage

### 2. Supabase Storage Buckets

Trois buckets de stockage ont été créés:
- **ticket-qrcodes** (privé): Stocke les QR codes des tickets
- **ticket-images** (privé): Stocke les images personnalisées des tickets
- **event-images** (public): Stocke les images des événements

### 3. Nouveaux services

Deux nouveaux fichiers ont été créés:

#### `src/utils/supabaseClient.ts`
Client Supabase configuré pour l'application

#### `src/utils/storageService.ts`
Service de gestion du stockage avec les fonctions:
- `uploadQRCode()`: Upload un QR code et retourne l'URL
- `uploadTicketImage()`: Upload une image de ticket et retourne l'URL
- `uploadEventImage()`: Upload une image d'événement et retourne l'URL
- `deleteQRCode()`: Supprime un QR code
- `deleteTicketImage()`: Supprime une image de ticket
- `deleteEventImage()`: Supprime une image d'événement
- `ensureStorageBucketsExist()`: Crée les buckets s'ils n'existent pas

### 4. Edge Function déployée

Une fonction `setup-storage` a été déployée pour:
- Créer automatiquement les buckets de stockage
- Configurer les permissions appropriées
- Initialiser l'environnement de stockage

## Prochaines étapes pour compléter la migration

### 1. Initialiser les buckets de stockage

Appelez la fonction Edge Function pour créer les buckets:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-storage`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  }
);

const result = await response.json();
console.log('Storage buckets initialized:', result);
```

### 2. Mettre à jour le code de création de tickets

Modifier `src/stores/ticketStore.ts` pour utiliser le nouveau service:

```typescript
import { uploadQRCode, uploadTicketImage } from '../utils/storageService';

// Dans la fonction addTicket, remplacer:
// qrCode: qrCode (données base64)

// Par:
const qrCodeUrl = await uploadQRCode(ticketId, qrCode);

// Et si une image est fournie:
const imageUrl = ticketData.imageFile
  ? await uploadTicketImage(ticketId, ticketData.imageFile)
  : undefined;

// Ensuite envoyer à l'API:
body: JSON.stringify({
  // ... autres champs
  qrCodeUrl: qrCodeUrl,  // URL au lieu de données
  imageUrl: imageUrl,    // URL au lieu de données
})
```

### 3. Mettre à jour le code de création d'événements

Modifier `src/stores/eventStore.ts` pour utiliser le nouveau service:

```typescript
import { uploadEventImage } from '../utils/storageService';

// Lors de la création d'un événement avec image:
const imageUrl = eventData.imageFile
  ? await uploadEventImage(eventId, eventData.imageFile)
  : undefined;
```

### 4. Initialiser les buckets au démarrage de l'application

Dans `src/App.tsx` ou `src/main.tsx`, ajouter:

```typescript
import { ensureStorageBucketsExist } from './utils/storageService';

// Au chargement de l'application:
useEffect(() => {
  ensureStorageBucketsExist();
}, []);
```

### 5. Configurer les politiques de stockage (RLS)

Les buckets privés (`ticket-qrcodes` et `ticket-images`) nécessitent des politiques RLS. Créer ces politiques dans le dashboard Supabase:

#### Politique pour ticket-qrcodes (SELECT):
```sql
CREATE POLICY "Users can view own ticket QR codes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-qrcodes' AND
  auth.uid() IN (
    SELECT u.auth_id FROM tickets t
    JOIN users u ON t.user_id = u.id
    WHERE storage.foldername(name)[1] = 'qrcodes'
    AND storage.filename(name) = t.id || '.png'
  )
);
```

#### Politique pour ticket-qrcodes (INSERT):
```sql
CREATE POLICY "Authenticated users can upload ticket QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-qrcodes' AND
  auth.uid() IS NOT NULL
);
```

#### Politiques similaires pour ticket-images

### 6. Migrer les données existantes (optionnel)

Si vous avez déjà des tickets avec des QR codes/images en base64 dans votre ancienne base MySQL:

1. Créer un script de migration qui:
   - Lit tous les tickets existants
   - Pour chaque ticket avec un QR code en base64:
     - Convertit le base64 en fichier
     - Upload vers Supabase Storage
     - Met à jour la base de données avec l'URL
   - Pour chaque image en base64, même processus

2. Exemple de script:
```typescript
// migration-script.ts
import { supabase } from './src/utils/supabaseClient';
import { uploadQRCode } from './src/utils/storageService';

async function migrateTickets() {
  // Récupérer les tickets de l'ancienne base MySQL
  const response = await fetch('http://localhost:8080/get_tickets.php');
  const { tickets } = await response.json();

  for (const ticket of tickets) {
    if (ticket.qrCode && ticket.qrCode.startsWith('TICKET-')) {
      // Upload le QR code vers Storage
      const qrCodeUrl = await uploadQRCode(ticket.id, ticket.qrCode);

      // Mettre à jour Supabase avec l'URL
      await supabase
        .from('tickets')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', ticket.id);

      console.log(`Migré ticket ${ticket.id}`);
    }
  }

  console.log('Migration terminée!');
}

migrateTickets();
```

## Avantages de cette approche

1. **Performance**: Les requêtes SQL sont beaucoup plus rapides
2. **Scalabilité**: Le stockage de fichiers est optimisé pour les binaires
3. **Coûts**: Le stockage de fichiers est moins coûteux que la base de données
4. **CDN**: Supabase Storage utilise un CDN pour la distribution rapide
5. **Sécurité**: Les politiques RLS protègent l'accès aux fichiers
6. **Maintenance**: Plus facile de gérer et sauvegarder les fichiers séparément

## Vérifications

Après la migration, vérifier:

- [ ] Les buckets sont créés dans Supabase Storage
- [ ] Les politiques RLS sont configurées
- [ ] Les nouveaux tickets génèrent des URLs au lieu de base64
- [ ] Les QR codes sont accessibles et scannables
- [ ] Les images s'affichent correctement
- [ ] Les anciens tickets (si migrés) fonctionnent toujours

## Support

En cas de problème:
1. Vérifier les logs du navigateur (Console)
2. Vérifier les logs Supabase (Dashboard → Logs)
3. Vérifier que les variables d'environnement sont correctement configurées
4. Tester avec un nouveau ticket pour isoler le problème

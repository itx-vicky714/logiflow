import { redirect } from 'next/navigation';

// Shipment details are handled via the modal on /shipments
// This redirect handles any direct deep-link attempts
export default function ShipmentDetailPage() {
  redirect('/shipments');
}

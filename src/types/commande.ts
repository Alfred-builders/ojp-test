export interface CommandeLigneFlat {
  id: string;
  lot_id: string;
  lot_numero: string;
  client_name: string;
  client_id: string;
  dossier_id: string;
  or_investissement_id: string;
  designation: string;
  metal: string | null;
  poids: number | null;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  fulfillment: string;
  fonderie_id: string | null;
  stock_disponible: number;
}

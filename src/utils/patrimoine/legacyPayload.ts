// Corps de POST /api/portfolio/positions envoyé par le formulaire d'ajout
// actuel (écran de repli, tant que le lot portefeuille n'est pas en
// production). Sans React : testable avec Node.
//
// Livret : le premier champ est le montant versé, le second le taux annuel
// en %. Même forme que la page web : une part au prix du montant, le taux dans
// `rate`. (Avant, le montant partait en quantité et le taux en prix : la
// valeur affichée valait montant × taux.)

const decimal = (text: string): number => parseFloat(text.replace(/\s/g, '').replace(',', '.'));

export type LegacyForm = { type: string; ticker: string; name: string; first: string; second: string; currency: 'EUR' | 'USD' };

export function positionPayload(form: LegacyForm): Record<string, unknown> {
  const first = decimal(form.first);
  const second = decimal(form.second);
  const base = { ticker: form.ticker.trim().toUpperCase(), name: form.name.trim(), type: form.type };
  if (form.type === 'livret') {
    return {
      ...base,
      quantity: 1,
      buy_price: first,
      buy_currency: 'EUR',
      is_livret: true,
      ...(Number.isFinite(second) && second > 0 ? { rate: second } : {}),
    };
  }
  return { ...base, quantity: first, buy_price: second, buy_currency: form.currency };
}

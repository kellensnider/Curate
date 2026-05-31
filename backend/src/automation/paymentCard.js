/**
 * Adapts the user's stored `paymentCard` (see models/User.js) into the shapes
 * the automation paths consume:
 *   - toPaymentMethod(): the field-by-field object the scripted browser flows
 *     (mcp/browser-tools.js) fill into Netflix/Disney/Hulu/Max payment forms.
 *   - describeCardForAgent(): a natural-language block the Gemini computer-use
 *     agent reads so it can fill a payment form *if one is prompted*.
 *
 * HACKATHON NOTE: the card is stored/passed in plaintext (no PCI vault). This is
 * deliberately simple for the demo. The agent is instructed to fill the form but
 * NOT submit a real charge; computer-use.js additionally halts the run on any
 * payment/charge safety decision as a human-in-the-loop backstop.
 */

function toPaymentMethod(card) {
  if (!card || !card.number) return null;
  const [mm = '', yy = ''] = String(card.expiry || '').split('/');
  return {
    card_number: String(card.number),
    expiry_month: mm.trim(),
    expiry_year: yy.trim(), // 2-digit; browser-tools does .slice(-2)
    cvv: String(card.cvc || ''),
    name: card.cardholderName || '',
    zip: card.zip || '',
  };
}

function describeCardForAgent(card) {
  if (!card || !card.number) return '';
  const name = card.cardholderName || 'the cardholder';
  return [
    'A saved payment card is on file for this user.',
    'If — and ONLY if — a payment or credit-card form must be completed to continue,',
    `fill it with this card: number ${card.number}, expiry ${card.expiry}, CVC ${card.cvc}, name on card "${name}".`,
    'After the payment form is filled, STOP. Do NOT click the final "Subscribe" / "Start Membership" / pay / confirm-charge button — never submit a real charge. Reaching a filled payment form is success; report it.',
  ].join(' ');
}

module.exports = { toPaymentMethod, describeCardForAgent };

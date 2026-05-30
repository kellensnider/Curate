export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatSavings(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

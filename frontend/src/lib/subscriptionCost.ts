import type { BackendSubscription } from './api';

export interface BaselineSubscription {
  service: string;
  displayName: string;
  monthlyCost: number;
  effectiveMonthlyCost: number;
  infiniteMembership: boolean;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function getEffectiveMonthlyCost(
  subscription: Pick<BackendSubscription, 'monthlyCost' | 'effectiveMonthlyCost' | 'infiniteMembership'>,
) {
  return subscription.infiniteMembership
    ? 0
    : subscription.effectiveMonthlyCost ?? subscription.monthlyCost ?? 0;
}

export function snapshotBaselineSubscriptions(
  subscriptions: BackendSubscription[],
): BaselineSubscription[] {
  return subscriptions
    .filter((subscription) => subscription.status === 'active')
    .map((subscription) => ({
      service: subscription.service,
      displayName: subscription.displayName,
      monthlyCost: subscription.monthlyCost,
      effectiveMonthlyCost: getEffectiveMonthlyCost(subscription),
      infiniteMembership: Boolean(subscription.infiniteMembership),
    }));
}

export function calculateSubscriptionCost(
  subscriptions: Array<
    Pick<BackendSubscription, 'status' | 'monthlyCost' | 'effectiveMonthlyCost' | 'infiniteMembership'>
  >,
  options: { activeOnly?: boolean } = {},
) {
  const { activeOnly = true } = options;
  const total = subscriptions.reduce((sum, subscription) => {
    if (activeOnly && subscription.status !== 'active') return sum;
    return sum + getEffectiveMonthlyCost(subscription);
  }, 0);

  return roundMoney(total);
}

export function calculateBaselineCost(subscriptions: BaselineSubscription[]) {
  return roundMoney(
    subscriptions.reduce((sum, subscription) => sum + subscription.effectiveMonthlyCost, 0),
  );
}

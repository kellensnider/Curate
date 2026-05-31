function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function getEffectiveMonthlyCost(subscription) {
  if (subscription.infiniteMembership) return 0;
  if (typeof subscription.effectiveMonthlyCost === 'number') {
    return subscription.effectiveMonthlyCost;
  }
  return subscription.monthlyCost || 0;
}

function calculateSubscriptionCost(subscriptions, options = {}) {
  const { activeOnly = true } = options;
  const total = subscriptions.reduce((sum, subscription) => {
    const status = subscription.infiniteMembership ? 'active' : subscription.status;
    if (activeOnly && status !== 'active') return sum;
    return sum + getEffectiveMonthlyCost(subscription);
  }, 0);

  return roundMoney(total);
}

function snapshotBaselineSubscriptions(subscriptions) {
  return subscriptions
    .filter((subscription) => (subscription.infiniteMembership ? 'active' : subscription.status) === 'active')
    .map((subscription) => ({
      service: subscription.service,
      displayName: subscription.displayName,
      monthlyCost: subscription.monthlyCost,
      effectiveMonthlyCost: getEffectiveMonthlyCost(subscription),
      infiniteMembership: Boolean(subscription.infiniteMembership),
    }));
}

module.exports = {
  calculateSubscriptionCost,
  getEffectiveMonthlyCost,
  snapshotBaselineSubscriptions,
  roundMoney,
};

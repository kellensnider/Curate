const { SERVICE_PRICES } = require('../models');
const { calculateSubscriptionCost, snapshotBaselineSubscriptions, roundMoney } = require('../utils/subscriptionCost');

function subscription(service, status = 'active', infiniteMembership = false) {
  const price = SERVICE_PRICES[service];
  return {
    service,
    displayName: price.name,
    status,
    monthlyCost: price.monthly,
    effectiveMonthlyCost: infiniteMembership ? 0 : price.monthly,
    infiniteMembership,
  };
}

const startingSubscriptions = [
  subscription('netflix'),
  subscription('max'),
  subscription('disney'),
  subscription('hulu', 'cancelled'),
];

const baselineSubscriptions = snapshotBaselineSubscriptions(startingSubscriptions);
const baselineMonthlyCost = calculateSubscriptionCost(startingSubscriptions);
const recommendedMonthlyCost = roundMoney(SERVICE_PRICES.netflix.monthly + SERVICE_PRICES.hulu.monthly);
const estimatedSavings = roundMoney(baselineMonthlyCost - recommendedMonthlyCost);

const afterApplySubscriptions = [
  subscription('netflix'),
  subscription('hulu'),
  subscription('max', 'cancelled'),
  subscription('disney', 'cancelled'),
];
const liveMonthlyCostAfterApply = calculateSubscriptionCost(afterApplySubscriptions);

const infiniteBaseline = calculateSubscriptionCost([
  subscription('netflix'),
  subscription('max', 'active', true),
  subscription('disney'),
]);

console.log('Savings baseline verification');
console.log(`Baseline services: ${baselineSubscriptions.map((sub) => sub.displayName).join(', ')}`);
console.log(`Baseline monthly cost: $${baselineMonthlyCost.toFixed(2)}`);
console.log(`Recommended services: Netflix, Hulu`);
console.log(`Recommended monthly cost: $${recommendedMonthlyCost.toFixed(2)}`);
console.log(`Estimated savings: $${estimatedSavings.toFixed(2)}`);
console.log(`Live monthly cost after applying: $${liveMonthlyCostAfterApply.toFixed(2)}`);
console.log(`Stored savings after applying should remain: $${estimatedSavings.toFixed(2)}`);
console.log(`Infinite membership baseline example: Netflix + free Max + Disney+ = $${infiniteBaseline.toFixed(2)}`);

if (baselineMonthlyCost !== 45.47 || recommendedMonthlyCost !== 33.48 || estimatedSavings !== 11.99) {
  console.error('Savings baseline verification failed.');
  process.exit(1);
}

console.log('Savings baseline verification passed.');

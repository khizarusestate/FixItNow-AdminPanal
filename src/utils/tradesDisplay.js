/**
 * Utility for displaying worker trades/services with View More dropdown (Admin)
 */

/**
 * Get trades to display (first trade + rest for dropdown)
 */
export function getTradesDisplay(trades = []) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      primary: null,
      additional: [],
      hasMore: false,
    };
  }

  const primary = trades[0];
  const additional = trades.slice(1);

  return {
    primary,
    additional,
    hasMore: additional.length > 0,
  };
}

/**
 * Extract trade name from trade object or string
 */
export function getTradeName(trade) {
  if (typeof trade === 'string') return trade;
  if (trade && typeof trade === 'object') {
    return trade.name || trade.category || trade.service || 'Unknown';
  }
  return 'Unknown';
}

/**
 * Format trades for display in readable format
 */
export function formatTrades(trades = []) {
  if (!Array.isArray(trades) || trades.length === 0) return 'No trades';

  const tradeNames = trades.map(getTradeName);

  if (tradeNames.length === 1) return tradeNames[0];

  const all = tradeNames.join(', ');
  if (all.length <= 50) return all;

  return `${tradeNames[0]} +${tradeNames.length - 1} more`;
}

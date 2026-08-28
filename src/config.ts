export default Object.freeze({
  TRANSACTION: {
    DEFAULT_AMOUNT: 0,
    DEFAULT_GAS_LIMIT: 250000, // unit of gas
    DEFAULT_GAS_PRICE: 0.00005000, // unit of metrix/gas
    // Slider bounds. Gas limit is just a spending cap (unused gas is refunded), so a
    // generous ceiling is low-risk. Gas price directly multiplies into real cost, so its
    // floor is pinned to the library's recommended default rather than a live network
    // minimum (no such feed exists) to avoid ever suggesting a value that risks rejection.
    GAS_LIMIT_MIN: 100000, // unit of gas
    GAS_LIMIT_MAX: 2500000, // unit of gas (10x default)
    GAS_PRICE_MIN: 5000, // satoshi/gas (matches the recommended default)
    GAS_PRICE_MAX: 50000, // satoshi/gas (10x default)
  },
});

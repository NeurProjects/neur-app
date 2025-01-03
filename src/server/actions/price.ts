import { HermesClient } from '@pythnetwork/hermes-client';
import { z } from 'zod';

/**
 * Fetches the last 10 prices for a given feed ID starting from a given start time.
 * It fetches prices at 15-minute intervals.
 *
 * @param connection - The HermesClient instance to connect to the Pyth network.
 * @param feedId - The feed ID of the price feed to fetch prices for.
 * @param startTime - The timestamp to start fetching prices from (UNIX timestamp).
 * @returns An array of price objects with time and value.
 */
async function fetchLast10Prices(
  connection: HermesClient,
  feedId: string,
  startTime: number,
): Promise<{ time: string; value: number }[]> {
  const prices: { time: string; value: number }[] = [];
  const interval = 15 * 60; // 15 minutes in seconds

  for (let i = 0; i < 10; i++) {
    const time = startTime - i * interval; // Decrease the time by 15 minutes for each iteration
    try {
      const priceUpdates = await connection.getPriceUpdatesAtTimestamp(time, [
        feedId,
      ]);
      if (priceUpdates.parsed) {
        const update = priceUpdates.parsed;
        const price = priceUpdates.parsed[0].price.price;
        const expo = priceUpdates.parsed[0].price.expo;
        const actualPrice = Number(price) * Math.pow(10, expo);
        prices.push({
          time: new Date(time * 1000).toISOString(), // Convert UNIX timestamp to ISO string
          value: actualPrice,
        });
      }
    } catch (error) {
      console.error(`Error fetching price at timestamp ${time}:`, error);
    }
  }

  return prices;
}

/**
 * Fetches the price history for a given token ID.
 *
 * @param tokenId - The ID of the token to fetch price history for.
 * @param days - The number of days to fetch price history for (default: 7).
 * @returns An array of objects containing time and value pairs.
 * @throws If the API key is missing or the request fails.
 */
export const fetchPriceHistory = async (
  tokenName: string,
): Promise<{ time: string; value: number }[]> => {
  const connection = new HermesClient('https://hermes.pyth.network', {});
  const priceFeeds = await connection.getPriceFeeds({
    query: tokenName,
    filter: 'crypto',
  });
  const feed = priceFeeds.filter(
    (feed) =>
      feed.attributes['base'].toLocaleLowerCase() ===
      tokenName.toLocaleLowerCase(),
  )[0];
  const currentTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds (UNIX format)

  const last10Prices = await fetchLast10Prices(
    connection,
    feed.id,
    currentTime,
  );

  return last10Prices;
};

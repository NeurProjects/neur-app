import { LAMPORTS_PER_SOL } from '@solana/web3.js';



import { chunkArray } from '@/lib/utils';
import rawKnownAddresses from '@/lib/utils/known-addresses.json';
import { BundleTransaction } from '@/types/bundle';
import { FungibleToken } from '@/types/helius/fungibleToken';
import { NonFungibleToken } from '@/types/helius/nonFungibleToken';



import { RPC_URL } from '../constants';


export interface Holder {
  owner: string;
  balance: number;
  classification?: string; // optional, assigned later
}

interface MintInfo {
  mint: string;
  decimals: number;
  supply: bigint;
  isInitialized: boolean;
  freezeAuthority: string;
  mintAuthority: string;
}

type HeliusMethod =
  | 'searchAssets'
  | 'getBalance'
  | 'getTokenAccounts'
  | 'getAccountInfo'
  | 'getMultipleAccounts'
  | 'getSignaturesForAddress'
  | 'getTransaction';

const KNOWN_ADDRESSES: Record<string, string> = rawKnownAddresses as Record<
  string,
  string
>;

const fetchHelius = async (method: HeliusMethod, params: any) => {
  try {
    const response = await fetch(RPC_URL, {
      next: { revalidate: 5 },
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'request-id',
        method: method,
        params: params, // some methods require objects, some require arrays
      }),
    });

    // Check for rate limiting response
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (!response.ok) {
      throw new Error(
        `Helius API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(
        `Helius API error: ${data.error.message || JSON.stringify(data.error)}`,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      return {
        status: 429,
        error: 'Helius API request failed: Too many requests',
      };
    }
    if (error instanceof Error) {
      throw new Error(`Helius API request failed: ${error.message}`);
    }
    throw new Error('Helius API request failed with unknown error');
  }
};

export const getBalance: (walletAddress: string) => Promise<number> = async (
  walletAddress: string,
) => {
  const data = await fetchHelius('getBalance', [walletAddress]);
  return Number(data.result.balance) / LAMPORTS_PER_SOL;
};

export const searchWalletAssets: (walletAddress: string) => Promise<{
  fungibleTokens: FungibleToken[];
  nonFungibleTokens: NonFungibleToken[];
}> = async (ownerAddress: string) => {
  try {
    const data = await fetchHelius('searchAssets', {
      ownerAddress: ownerAddress,
      tokenType: 'all',
      displayOptions: {
        showNativeBalance: true,
        showInscription: false,
        showCollectionMetadata: false,
      },
    });

    if (!data.result?.items) {
      throw new Error('Invalid response format from Helius API');
    }

    const items: (FungibleToken | NonFungibleToken)[] = data.result.items;

    // Split the items into fungible and non-fungible tokens
    let fungibleTokens: FungibleToken[] = items.filter(
      (item): item is FungibleToken =>
        item.interface === 'FungibleToken' ||
        item.interface === 'FungibleAsset',
    );

    // Hardcoding the image for USDC
    fungibleTokens = fungibleTokens.map((item) => {
      if (item.id === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
        return {
          ...item,
          content: {
            ...item.content,
            files: [
              {
                uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
                cdn_uri: '',
                mime: 'image/png',
              },
            ],
            links: {
              image:
                'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
            },
          },
        };
      } else if (item.id === 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1') {
        return {
          ...item,
          content: {
            ...item.content,
            files: [
              {
                uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png',
                cdn_uri: '',
                mime: 'image/png',
              },
            ],
            links: {
              image:
                'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png',
            },
          },
        };
      }
      return item;
    });
    const nonFungibleTokens: NonFungibleToken[] = items.filter(
      (item): item is NonFungibleToken =>
        !['FungibleToken', 'FungibleAsset'].includes(item.interface),
    );

    // Calculate SOL balance from lamports
    const solBalance = data.result.nativeBalance.lamports;
    //console.log(data.result);

    // Create SOL token object
    const solToken = {
      interface: 'FungibleAsset',
      id: 'So11111111111111111111111111111111111111112', // Mint address as ID
      content: {
        $schema: 'https://schema.metaplex.com/nft1.0.json',
        json_uri: '',
        files: [
          {
            uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
            cdn_uri: '',
            mime: 'image/png',
          },
        ],
        metadata: {
          description: 'Solana Token',
          name: 'Wrapped SOL',
          symbol: 'SOL',
          token_standard: 'Native Token',
        },
        links: {
          image:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        },
      },
      authorities: [],
      compression: {
        eligible: false,
        compressed: false,
        data_hash: '',
        creator_hash: '',
        asset_hash: '',
        tree: '',
        seq: 0,
        leaf_id: 0,
      },
      grouping: [],
      royalty: {
        royalty_model: '',
        target: null,
        percent: 0,
        basis_points: 0,
        primary_sale_happened: false,
        locked: false,
      },
      creators: [],
      ownership: {
        frozen: false,
        delegated: false,
        delegate: null,
        ownership_model: 'token',
        owner: nonFungibleTokens[0]?.ownership.owner,
      },
      supply: null,
      mutable: true,
      burnt: false,

      token_info: {
        symbol: 'SOL',
        balance: solBalance,
        supply: 0,
        decimals: 9,
        token_program: '',
        associated_token_address: '',
        price_info: {
          price_per_token: data.result.nativeBalance.price_per_sol,
          total_price: data.result.nativeBalance.total_price,
          currency: '',
        },
      },
    };

    // Add SOL token to the tokens array
    fungibleTokens.push(solToken);

    return { fungibleTokens, nonFungibleTokens };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search wallet assets: ${error.message}`);
    }
    throw new Error('Failed to search wallet assets with unknown error');
  }
};

export async function getMintAccountInfo(mint: string): Promise<MintInfo> {
  const data = await fetchHelius('getAccountInfo', [
    mint,
    { encoding: 'jsonParsed' },
  ]);

  if (!data.result || !data.result.value) {
    throw new Error(`No account info found for mint: ${mint}`);
  }

  const value = data.result.value;
  if (!value.data || !value.data.parsed || value.data.parsed.type !== 'mint') {
    throw new Error(`Account is not a valid SPL mint: ${mint}`);
  }

  const info = value.data.parsed.info;
  return {
    mint,
    decimals: info.decimals,
    supply: BigInt(info.supply),
    isInitialized: info.isInitialized,
    freezeAuthority: info.freezeAuthority,
    mintAuthority: info.mintAuthority,
  };
}

/**
 * Fetches all holders for a given mint (via "getTokenAccounts"),
 * returning a Map of `address -> Holder`.
 */
export async function getTokenHolders(
  mintInfo: MintInfo,
): Promise<Map<string, Holder>> {
  let page = 1;
  const holderMap = new Map<string, Holder>();

  while (true) {
    const data = await fetchHelius('getTokenAccounts', {
      page,
      limit: 1000,
      displayOptions: {},
      mint: mintInfo.mint,
    });

    if (!data.result || data.result.token_accounts.length === 0) {
      break; // no more results
    }

    data.result.token_accounts.forEach((account: any) => {
      const owner = account.owner;
      const balanceRaw = BigInt(account.amount || '0');
      const balance = Number(balanceRaw) / 10 ** mintInfo.decimals;

      if (holderMap.has(owner)) {
        const h = holderMap.get(owner)!;
        h.balance += balance;
      } else {
        holderMap.set(owner, {
          owner,
          balance: balance,
        });
      }
    });

    page++;
  }

  return holderMap;
}

/**
 * Use "getMultipleAccounts" in a single RPC call for a list of addresses
 */
async function getMultipleAccountsInfoHelius(addresses: string[]) {
  return await fetchHelius('getMultipleAccounts', [
    addresses,
    { encoding: 'jsonParsed' },
  ]);
}

/**
 * Classify a list of addresses (subset of holders).
 * - If address is in ACCOUNT_LABELS, use that.
 * - Else look at the account's `owner` program → PROGRAM_LABELS or fallback.
 * - Mutates the `Holder.classification` in `holderMap`.
 */
async function classifyAddresses(
  holderMap: Map<string, Holder>,
  addresses: string[],
  chunkSize = 20,
) {
  const addressChunks = chunkArray(addresses, chunkSize);

  for (const chunk of addressChunks) {
    const response = await getMultipleAccountsInfoHelius(chunk);
    const accountInfos = response?.result?.value;

    if (!accountInfos || !Array.isArray(accountInfos)) {
      continue;
    }

    for (let i = 0; i < chunk.length; i++) {
      const addr = chunk[i];
      const accInfo = accountInfos[i];
      const holder = holderMap.get(addr);
      if (!holder) continue;

      // (1) If address is in ACCOUNT_LABELS
      if (addr in KNOWN_ADDRESSES) {
        holder.classification = KNOWN_ADDRESSES[addr];
        continue;
      }

      // (2) Otherwise check `accInfo.owner`
      if (accInfo && accInfo.owner) {
        const programId = accInfo.owner;
        holder.classification =
          KNOWN_ADDRESSES[programId] ?? `Unrecognized Program`;
      } else {
        holder.classification = "Unknown or Doesn't Exist";
      }
    }
  }
}

/**
 * 1) Fetch mint info
 * 2) Fetch all holders (Map)
 * 3) Sort them by descending balance
 * 4) Classify only the top limit holders (minimize RPC calls)
 * 5) Return a sorted array (with classification for top 20)
 */
export async function getHoldersClassification(
  mint: string,
  limit: number = 10,
) {
  // 1) Mint info
  const mintAccountInfo = await getMintAccountInfo(mint);
  const totalSupply =
    Number(mintAccountInfo.supply) / 10 ** mintAccountInfo.decimals;

  // 2) Holder map
  const holderMap = await getTokenHolders(mintAccountInfo);

  // 3) Sort once by balance desc (turn the map into an array)
  const sortedHolders = Array.from(holderMap.values()).sort((a, b) => {
    return b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0;
  });

  const topHolders = sortedHolders.slice(0, limit);
  await classifyAddresses(
    holderMap,
    topHolders.map((h) => h.owner),
    limit,
  );

  return {
    topHolders,
    totalHolders: holderMap.size,
    totalSupply,
  };
}

/**
 * Get transaction history for a given mint address
 * 1) Get signatures for the mint address
 * 2) Get full transaction data for each signature
 * 3) Return an array of transaction history
 *
 * @param mintAddress - The mint address to get transaction history for
 * @param limit - The maximum number of transactions to return
 * @returns An array of transaction history
 */
export async function getTransactionHistory(
  mintAddress: string,
  limit: number = 1000,
) {
  const transactions: BundleTransaction[] = [];

  try {
    // Getting all Signatures
    let signaturesData: any[] = [];
    let before: string | null = null;
    let hasMoreSignatures = true;

    while (hasMoreSignatures) {
      const signatures = await fetchHelius('getSignaturesForAddress', [
        mintAddress,
        { limit, before },
      ]);

      if (signatures.result?.length === 0) {
        hasMoreSignatures = false;
        break;
      }

      signaturesData.push(...signatures.result);
      before = signatures.result[signatures.result.length - 1].signature;
    }

    if (signaturesData.length === 0) {
      return transactions;
    }

    // Wait for 1 second before fetching transactions to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Getting all Transactions
    const signatures = signaturesData;
    const batchSize = 100;

    for (let i = 0; i < signatures.length; ) {
      try {
        const batch = signatures.slice(i, i + batchSize).map((sig) => ({
          jsonrpc: '2.0',
          id: 'request-id',
          method: 'getTransaction',
          params: [sig.signature, { maxSupportedTransactionVersion: 0 }],
        }));

        // Fetch batch of transactions
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });

        if (response.status === 429) {
          console.log('[getTransactionHistory] tx.status', response.status);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (!response.ok) {
          console.error('Failed to fetch transaction data', response);
          continue;
        }

        const txData = await response.json();

        if (!txData || !Array.isArray(txData)) {
          console.error('Failed to fetch transaction data');
          continue;
        }

        if (txData[0]?.result?.status === 429) {
          console.log('[getTransactionHistory] tx.status', txData[0].status);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        for (const txResult of txData) {
          const tx = txResult.result;

          if (!tx) continue;

          const preBalance = tx.meta?.preBalances?.[0];
          const postBalance = tx.meta?.postBalances?.[0];
          const price =
            preBalance !== postBalance
              ? (postBalance - preBalance) / Math.pow(10, 9) // Adjust for token decimals
              : 0;

          // Calculate quantity from postTokenBalances
          const quantity =
            preBalance !== postBalance ? postBalance - preBalance : 0;

          transactions.push({
            signature: tx.transaction.signatures[0],
            slot: tx.slot,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            quantity,
            price,
            buyer: tx.meta?.postTokenBalances?.[0]?.owner,
          });
        }

        i += batchSize;
      } catch (error) {
        console.error('Error processing batch:', error);
      }
    }

    return transactions;
  } catch (error) {
    console.warn(
      'Error in getTransactionHistory, returning partial results:',
      error,
    );
    return transactions;
  }
}
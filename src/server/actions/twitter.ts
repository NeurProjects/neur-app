const TWITTER_ENDPOINT_URL = process.env.TWITTER_ENDPOINT_URL;

export interface Tweet {
  type: string;
  id: string;
  url: string;
  twitterUrl: string;
  text: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  inReplyToId: string | null;
  conversationId: string;
  inReplyToUserId: string | null;
  inReplyToUsername: string | null;
  isPinned: boolean;
  author: Author;
  isConversationControlled: boolean;
}

interface Author {
  type: string;
  userName: string;
  url: string;
  twitterUrl: string;
  id: string;
  name: string;
  isVerified: boolean;
  isBlueVerified: boolean;
  profilePicture: string;
  coverPicture: string;
  description: string;
  location: string;
  followers: number;
  following: number;
  status: string;
  canDm: boolean;
  canMediaTag: boolean;
  createdAt: string;
  fastFollowersCount: number;
  favouritesCount: number;
  hasCustomTimelines: boolean;
  isTranslator: boolean;
  mediaCount: number;
  statusesCount: number;
  withheldInCountries: string[];
  affiliatesHighlightedLabel: Record<string, any>;
  possiblySensitive: boolean;
  pinnedTweetIds: string[];
  isAutomated: boolean;
  automatedBy: string | null;
}
export const getTweetsByTag = async (tag: string) => {
  const maxItems = 10;
  const since24h = `${new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')}_UTC`;
  const requestBody = {
    maxItems,
    min_faves: 1,
    queryType: 'Top',
    since: since24h,
    twitterContent: tag,
  };
  try {
    const response = await fetch(
      `${TWITTER_ENDPOINT_URL}&maxItems=${maxItems}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tweets');
    }

    const data = await response.json();
    return {
      success: true,
      result: data.sort((a: Tweet, b: Tweet) => b.viewCount - a.viewCount),
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch tweets',
    };
  }
};

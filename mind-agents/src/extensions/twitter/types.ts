/**
 * Twitter Extension Types
 * 
 * Type definitions for the Twitter extension with improved type safety using enums.
 */

/**
 * Twitter action types enum
 */
export enum TwitterActionType {
  // Tweet actions
  TWEET = 'tweet',
  REPLY = 'reply',
  RETWEET = 'retweet',
  QUOTE = 'quote',
  DELETE_TWEET = 'delete_tweet',
  CREATE_THREAD = 'create_thread',
  SCHEDULE_TWEET = 'schedule_tweet',
  
  // Engagement actions
  LIKE = 'like',
  UNLIKE = 'unlike',
  BOOKMARK = 'bookmark',
  REMOVE_BOOKMARK = 'remove_bookmark',
  
  // User management actions
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  BLOCK = 'block',
  UNBLOCK = 'unblock',
  MUTE = 'mute',
  UNMUTE = 'unmute',
  
  // Search actions
  SEARCH_TWEETS = 'search_tweets',
  SEARCH_USERS = 'search_users',
  SEARCH_TRENDING = 'search_trending',
  
  // Media actions
  UPLOAD_MEDIA = 'upload_media',
  DELETE_MEDIA = 'delete_media',
  
  // Direct message actions
  SEND_DM = 'send_dm',
  GET_DMS = 'get_dms'
}

/**
 * Twitter error types enum
 */
export enum TwitterErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  INVALID_REQUEST = 'invalid_request',
  DUPLICATE_ACTION = 'duplicate_action',
  ACCOUNT_SUSPENDED = 'account_suspended',
  INTERNAL_ERROR = 'internal_error',
  BROWSER_ERROR = 'browser_error',
  API_ERROR = 'api_error'
}

/**
 * Twitter user visibility enum
 */
export enum TwitterUserVisibility {
  PUBLIC = 'public',
  PROTECTED = 'protected',
  PRIVATE = 'private'
}

/**
 * Twitter reply settings enum
 */
export enum TwitterReplySettings {
  EVERYONE = 'everyone',
  MENTIONED_USERS = 'mentionedUsers',
  FOLLOWING = 'following',
  NONE = 'none'
}

/**
 * Twitter media type enum
 */
export enum TwitterMediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
  GIF = 'gif',
  POLL = 'poll'
}

/**
 * Twitter configuration interface
 */
export interface TwitterConfig {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  twoFactorSecret?: string;
  headless?: boolean;
  userDataDir?: string;
  proxy?: TwitterProxyConfig;
  rateLimits?: Record<TwitterActionType, TwitterRateLimit>;
  rateLimitBuffer?: number; // milliseconds to wait between actions
  antiDetection?: TwitterAntiDetectionConfig;
  sessionPersistence?: TwitterSessionConfig;
  autoLogin?: boolean;
}

export interface TwitterProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface TwitterRateLimit {
  requests: number;
  window: number; // in milliseconds
}

export interface TwitterAntiDetectionConfig {
  randomDelay?: boolean;
  humanTyping?: boolean;
  randomUserAgent?: boolean;
  viewport?: { width: number; height: number };
}

export interface TwitterSessionConfig {
  enabled: boolean;
  cookiesPath?: string;
}

/**
 * Twitter user interface
 */
export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  profileImageUrl?: string;
  verified?: boolean;
  followersCount?: number;
  followingCount?: number;
  tweetCount?: number;
  createdAt?: string;
  location?: string;
  url?: string;
  visibility: TwitterUserVisibility;
}

/**
 * Twitter tweet interface
 */
export interface TwitterTweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  conversationId?: string;
  inReplyToUserId?: string;
  referencedTweets?: TwitterReferencedTweet[];
  attachments?: TwitterTweetAttachments;
  contextAnnotations?: TwitterContextAnnotation[];
  entities?: TwitterTweetEntities;
  geo?: TwitterTweetGeo;
  lang?: string;
  possiblySensitive?: boolean;
  replySettings?: TwitterReplySettings;
  source?: string;
  metrics?: TwitterTweetMetrics;
}

export interface TwitterReferencedTweet {
  type: 'retweeted' | 'quoted' | 'replied_to';
  id: string;
}

export interface TwitterTweetAttachments {
  mediaKeys?: string[];
  pollIds?: string[];
}

export interface TwitterContextAnnotation {
  domain: {
    id: string;
    name: string;
    description?: string;
  };
  entity: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface TwitterTweetEntities {
  annotations?: TwitterEntityAnnotation[];
  cashtags?: TwitterEntityTag[];
  hashtags?: TwitterEntityTag[];
  mentions?: TwitterEntityMention[];
  urls?: TwitterEntityUrl[];
}

export interface TwitterEntityAnnotation {
  start: number;
  end: number;
  probability: number;
  type: string;
  normalizedText: string;
}

export interface TwitterEntityTag {
  start: number;
  end: number;
  tag: string;
}

export interface TwitterEntityMention {
  start: number;
  end: number;
  username: string;
  id?: string;
}

export interface TwitterEntityUrl {
  start: number;
  end: number;
  url: string;
  expandedUrl: string;
  displayUrl: string;
  status?: number;
  title?: string;
  description?: string;
  unwoundUrl?: string;
}

export interface TwitterTweetGeo {
  coordinates?: {
    type: string;
    coordinates: [number, number];
  };
  placeId?: string;
}

export interface TwitterTweetMetrics {
  impressionCount?: number;
  likeCount: number;
  replyCount: number;
  retweetCount: number;
  quoteCount: number;
}

/**
 * Twitter direct message interface
 */
export interface TwitterDirectMessage {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  attachments?: TwitterDirectMessageAttachments;
}

export interface TwitterDirectMessageAttachments {
  mediaKeys?: string[];
}

/**
 * Twitter media interface
 */
export interface TwitterMedia {
  mediaKey: string;
  type: TwitterMediaType;
  url?: string;
  previewUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  duration?: number; // For videos, in milliseconds
}

/**
 * Twitter search results interface
 */
export interface TwitterSearchResults {
  tweets?: TwitterTweet[];
  users?: TwitterUser[];
  nextToken?: string;
}

/**
 * Twitter action result interface
 */
export interface TwitterActionResult {
  success: boolean;
  data?: any;
  error?: {
    type: TwitterErrorType;
    message: string;
    code?: number;
  };
  metadata?: Record<string, any>;
}
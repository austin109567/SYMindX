/**
 * Tweeting Skill for Twitter Extension
 * 
 * Provides actions related to creating and posting tweets.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { BaseTwitterSkill } from './base-skill.js';
import { TwitterActionType, TwitterErrorType } from '../types.js';

export class TweetingSkill extends BaseTwitterSkill {
  /**
   * Get all tweeting-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TwitterActionType.TWEET]: {
        name: TwitterActionType.TWEET,
        description: 'Post a tweet',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          text: 'string', 
          media_ids: 'array', 
          reply_to_tweet_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.postTweet(params.text, params.media_ids, params.reply_to_tweet_id);
        }
      },
      
      [TwitterActionType.REPLY]: {
        name: TwitterActionType.REPLY,
        description: 'Reply to a tweet',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          tweet_id: 'string', 
          text: 'string', 
          media_ids: 'array' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.replyToTweet(params.tweet_id, params.text, params.media_ids);
        }
      },
      
      [TwitterActionType.CREATE_THREAD]: {
        name: TwitterActionType.CREATE_THREAD,
        description: 'Create a Twitter thread',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          tweets: 'array', 
          media_ids: 'array[]' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createThread(params.tweets, params.media_ids);
        }
      },
      
      [TwitterActionType.SCHEDULE_TWEET]: {
        name: TwitterActionType.SCHEDULE_TWEET,
        description: 'Schedule a tweet for later',
        category: ActionCategory.SYSTEM,
        parameters: { 
          text: 'string', 
          scheduled_time: 'string', 
          media_ids: 'array' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.scheduleTweet(params.text, params.scheduled_time, params.media_ids);
        }
      },
      
      [TwitterActionType.DELETE_TWEET]: {
        name: TwitterActionType.DELETE_TWEET,
        description: 'Delete a tweet',
        category: ActionCategory.SYSTEM,
        parameters: { 
          tweet_id: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.deleteTweet(params.tweet_id);
        }
      }
    };
  }

  /**
   * Post a tweet
   */
  async postTweet(text: string, mediaIds?: string[], replyToTweetId?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.postTweet(text, mediaIds, replyToTweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Reply to a tweet
   */
  async replyToTweet(tweetId: string, text: string, mediaIds?: string[]): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.replyToTweet(tweetId, text, mediaIds);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Create a thread of tweets
   */
  async createThread(tweets: string[], mediaIds?: string[][]): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.createThread(tweets, mediaIds);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Schedule a tweet for later
   */
  async scheduleTweet(text: string, scheduledTime: string, mediaIds?: string[]): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.scheduleTweet(text, scheduledTime, mediaIds);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.deleteTweet(tweetId);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.RESOURCE_NOT_FOUND);
    }
  }
}
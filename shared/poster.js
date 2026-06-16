/**
 * Social Poster integration — wraps the existing CLI social-poster
 * to be callable from the API and bot
 */
import { PostService } from '../src/post-service.js';
import { loadConfig } from '../src/config-manager.js';
import logger from './logger.js';

let postServiceInstance = null;

export const getPostService = () => {
  if (!postServiceInstance) {
    const config = loadConfig();
    postServiceInstance = new PostService({
      platformOptions: {
        x: { headless: true, timeout: 60000 },
        linkedin: { headless: true, timeout: 60000 },
        reddit: { headless: true, timeout: 60000 },
        facebook: { headless: true, timeout: 60000 },
        'hacker-news': { headless: true, timeout: 60000 },
        'stacker-news': { headless: true, timeout: 60000 },
        primal: { headless: true, timeout: 60000 },
      },
    });
  }
  return postServiceInstance;
};

export const publishPost = async (post) => {
  logger.info(`Publishing post ${post.id} to platforms: ${post.platforms?.join(', ')}`);
  const service = getPostService();
  const content = {
    text: post.content,
    link: post.link || undefined,
    mediaUrl: post.media_url || undefined,
    mediaType: post.media_type || undefined,
  };
  const results = await service.post(content, post.platforms || []);
  logger.info(`Post ${post.id} published:`, results);
  return results;
};

export const getAvailablePlatforms = () => {
  return ['x', 'linkedin', 'reddit', 'facebook', 'hacker-news', 'stacker-news', 'primal'];
};

export const getPlatformStatus = async () => {
  try {
    const service = getPostService();
    return service.getPlatformStatus();
  } catch {
    return {};
  }
};

// src/app/utils/githubClient.ts
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';

const MyOctokit = Octokit.plugin(throttling);

export class GitHubClient {
  private octokit: Octokit;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.octokit = new MyOctokit({
      auth: process.env.GITHUB_TOKEN,
      throttle: {
        enabled: true,
        onRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
          if (options.request.retryCount <= 3) {
            console.log(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
          return false;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Secondary rate limit hit for request ${options.method} ${options.url}`);
          return true;
        }
      }
    });
  }

  async getRepositoryContent(owner: string, repo: string, path: string = '') {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error: any) {
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later or use a GitHub token for higher limits.');
      }
      console.error('Error fetching repository content:', error);
      throw error;
    }
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      
      if ('content' in response.data) {
        return Buffer.from(response.data.content, 'base64').toString();
      }
      throw new Error('Not a file');
    } catch (error: any) {
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later or use a GitHub token for higher limits.');
      }
      console.error('Error fetching file content:', error);
      throw error;
    }
  }
}
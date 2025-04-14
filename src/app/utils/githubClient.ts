// src/app/utils/githubClient.ts
import { Octokit } from '@octokit/rest';

export class GitHubClient {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
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
    } catch (error) {
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
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }
}
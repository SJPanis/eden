import { Octokit } from "@octokit/rest";

export class GitHubService {
  private octokit: Octokit;
  private owner = "SJPanis";
  private repo = "eden";

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  async getMainSHA(): Promise<string> {
    const { data } = await this.octokit.repos.getBranch({
      owner: this.owner,
      repo: this.repo,
      branch: "main",
    });
    return data.commit.sha;
  }

  async createBranch(branchName: string): Promise<void> {
    const sha = await this.getMainSHA();
    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
  }

  async commitFile(
    branchName: string,
    filePath: string,
    content: string,
    message: string,
  ): Promise<void> {
    const encoded = Buffer.from(content).toString("base64");
    let sha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: branchName,
      });
      if (!Array.isArray(data) && "sha" in data) sha = data.sha;
    } catch {
      /* new file */
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message,
      content: encoded,
      branch: branchName,
      ...(sha ? { sha } : {}),
    });
  }

  async openPR(
    branchName: string,
    title: string,
    body: string,
  ): Promise<string> {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      head: branchName,
      base: "main",
    });
    return data.html_url;
  }
}

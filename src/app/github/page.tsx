import { getGitHubAccountAction } from "@/app/api/github/account-actions";
import { selectRepositoriesByUserIdAction } from "@/app/api/github/actions";
import { GitHubClientPage } from "./client-page";

export default async function GitHubPage() {
  const [repositories, account] = await Promise.all([
    selectRepositoriesByUserIdAction(),
    getGitHubAccountAction(),
  ]);

  return (
    <GitHubClientPage
      initialRepositories={repositories}
      initialAccount={account}
    />
  );
}

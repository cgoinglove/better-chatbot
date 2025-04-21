"use client";

import {
  GitHubAccountInfo,
  getGitHubAccountAction,
} from "@/app/api/github/account-actions";
import { appStore } from "@/app/store";
import { GitHubAccountCard } from "@/components/github-account-card";
import { GitHubAutoSync } from "@/components/github-auto-sync";
import { GitHubConnectCard } from "@/components/github-connect-card";
import { GitHubLocalRepos } from "@/components/github-local-repos";
import { GitHubRemoteRepositories } from "@/components/github-remote-repositories";
import { GitHubRepositoryForm } from "@/components/github-repository-form";
import { GitHubRepositoryList } from "@/components/github-repository-list";
import { GitHubRepository } from "app-types/github";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Dialog, DialogContent, DialogTrigger } from "ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { useShallow } from "zustand/shallow";

interface GitHubClientPageProps {
  initialRepositories: GitHubRepository[];
  initialAccount: GitHubAccountInfo | null;
}

export function GitHubClientPage({
  initialRepositories,
  initialAccount,
}: GitHubClientPageProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("local");
  const [githubAccount, setGithubAccount] = useState<GitHubAccountInfo | null>(
    initialAccount,
  );

  const [appStoreMutate, repositoryList] = appStore(
    useShallow((state) => [state.mutate, state.githubRepositoryList]),
  );

  // Initialize the store with the initial repositories
  useEffect(() => {
    if (!repositoryList) {
      appStoreMutate({ githubRepositoryList: initialRepositories });
    }
  }, [initialRepositories, appStoreMutate, repositoryList]);

  const repositories = repositoryList || initialRepositories;

  // Refresh GitHub account when tab changes
  useEffect(() => {
    if (activeTab === "account") {
      const refreshAccount = async () => {
        const account = await getGitHubAccountAction();
        setGithubAccount(account);
      };

      refreshAccount();
    }
  }, [activeTab]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            GitHub Integration
          </h1>
          <p className="text-muted-foreground">
            Connect your GitHub account and work with repositories.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="local">Local Repositories</TabsTrigger>
          <TabsTrigger value="remote">Remote Repositories</TabsTrigger>
          <TabsTrigger value="account">GitHub Account</TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Managed Repositories</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Repository
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <GitHubRepositoryForm
                  onCancel={() => setOpen(false)}
                  onSuccess={() => setOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <GitHubRepositoryList repositories={repositories} />

          <GitHubLocalRepos />

          <div className="rounded-lg border p-4 bg-muted/50">
            <h3 className="font-medium mb-2">How to use local repositories</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Add a local GitHub repository using the "Add Repository" button
                or select from discovered repositories
              </li>
              <li>Index the repository to make its contents searchable</li>
              <li>
                In chat, you can now reference files from your repositories
              </li>
              <li>
                Ask questions about code, request explanations, or suggest
                improvements
              </li>
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="remote" className="mt-6 space-y-6">
          {githubAccount ? (
            <>
              <GitHubAutoSync />
              <GitHubRemoteRepositories />
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Connect your GitHub account to access your remote repositories.
              </p>
              <Button onClick={() => setActiveTab("account")}>
                Go to Account Settings
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="max-w-md mx-auto">
            {githubAccount ? (
              <GitHubAccountCard
                account={githubAccount}
                onUnlink={() => setGithubAccount(null)}
              />
            ) : (
              <GitHubConnectCard />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

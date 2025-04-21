"use client";

import { checkoutBranchAction, getLocalBranchesAction } from "@/app/api/github/clone-actions";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Loader2, GitBranch, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";

interface GitHubBranchSelectorProps {
  repositoryPath: string;
  repositoryName: string;
  onBranchChange?: (branch: string) => void;
}

export function GitHubBranchSelector({
  repositoryPath,
  repositoryName,
  onBranchChange,
}: GitHubBranchSelectorProps) {
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  
  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const branchList = await getLocalBranchesAction(repositoryPath);
      
      // Find current branch (the one with * prefix)
      const current = branchList.find(branch => branch.startsWith('* '));
      if (current) {
        setCurrentBranch(current.substring(2)); // Remove the '* ' prefix
      } else if (branchList.length > 0) {
        setCurrentBranch(branchList[0]);
      }
      
      // Clean branch names (remove * prefix)
      const cleanBranches = branchList.map(branch => 
        branch.startsWith('* ') ? branch.substring(2) : branch
      );
      
      setBranches(cleanBranches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error("Failed to fetch branches");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBranches();
  }, [repositoryPath]);
  
  const handleBranchChange = async (branch: string) => {
    if (branch === currentBranch) return;
    
    setIsSwitching(true);
    
    try {
      const result = await checkoutBranchAction(repositoryPath, branch);
      
      if (result.success) {
        setCurrentBranch(branch);
        toast.success(result.message);
        onBranchChange?.(branch);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error switching branch:", error);
      toast.error("An error occurred while switching branch");
    } finally {
      setIsSwitching(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <GitBranch className="mr-2 h-5 w-5" />
          Branch Selection
        </CardTitle>
        <CardDescription>
          Switch between branches in {repositoryName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Select
              value={currentBranch}
              onValueChange={handleBranchChange}
              disabled={isLoading || isSwitching}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    <div className="flex items-center">
                      {branch === currentBranch && (
                        <Check className="mr-2 h-4 w-4 text-primary" />
                      )}
                      {branch}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchBranches}
            disabled={isLoading || isSwitching}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {isSwitching && (
          <div className="mt-4 flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Switching to {currentBranch}...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

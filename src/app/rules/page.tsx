"use client";

import { Rule } from "app-types/rules";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import { Plus } from "lucide-react";
import { RuleItem } from "@/components/rule-item";
import { RuleForm } from "@/components/rule-form";
import { selectRulesByUserIdAction } from "../api/rules/actions";
import { toast } from "sonner";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";

export default function RulesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [appStoreMutate, ruleList] = appStore(
    useShallow((state) => [state.mutate, state.ruleList])
  );
  
  useEffect(() => {
    const fetchRules = async () => {
      try {
        setIsLoading(true);
        const rules = await selectRulesByUserIdAction();
        appStoreMutate({ ruleList: rules });
      } catch (error) {
        toast.error("Failed to load rules");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRules();
  }, [appStoreMutate]);
  
  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setIsCreating(false);
  };
  
  const handleCreateRule = () => {
    setEditingRule(null);
    setIsCreating(true);
  };
  
  const handleCancel = () => {
    setEditingRule(null);
    setIsCreating(false);
  };
  
  const handleSuccess = () => {
    setEditingRule(null);
    setIsCreating(false);
  };
  
  // Sort rules by priority (higher priority first)
  const sortedRules = [...ruleList].sort((a, b) => b.priority - a.priority);
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rule Engine</h1>
        {!isCreating && !editingRule && (
          <Button onClick={handleCreateRule}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        )}
      </div>
      
      {isCreating && (
        <div className="mb-6">
          <RuleForm
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      )}
      
      {editingRule && (
        <div className="mb-6">
          <RuleForm
            rule={editingRule}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">Loading rules...</div>
      ) : sortedRules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No rules found</p>
          {!isCreating && (
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first rule
            </Button>
          )}
        </div>
      ) : (
        <div>
          {sortedRules.map((rule) => (
            <RuleItem
              key={rule.id}
              rule={rule}
              onEdit={handleEditRule}
            />
          ))}
        </div>
      )}
    </div>
  );
}

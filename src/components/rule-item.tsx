"use client";

import { Rule } from "app-types/rules";
import { useState } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Switch } from "ui/switch";
import { Pencil, Trash2 } from "lucide-react";
import { deleteRuleAction, toggleRuleStatusAction } from "@/app/api/rules/actions";
import { toast } from "sonner";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";

interface RuleItemProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
}

export function RuleItem({ rule, onEdit }: RuleItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  const [appStoreMutate, ruleList] = appStore(
    useShallow((state) => [state.mutate, state.ruleList])
  );
  
  const handleToggle = async () => {
    try {
      setIsToggling(true);
      const updatedRule = await toggleRuleStatusAction(rule.id, !rule.isEnabled);
      
      if (updatedRule) {
        // Update the rule in the store
        const updatedRuleList = ruleList.map((r) => 
          r.id === rule.id ? updatedRule : r
        );
        
        appStoreMutate({ ruleList: updatedRuleList });
        toast.success(`Rule ${updatedRule.isEnabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error("Failed to update rule status");
      }
    } catch (error) {
      toast.error("An error occurred while updating rule status");
      console.error(error);
    } finally {
      setIsToggling(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const success = await deleteRuleAction(rule.id);
      
      if (success) {
        // Remove the rule from the store
        const updatedRuleList = ruleList.filter((r) => r.id !== rule.id);
        appStoreMutate({ ruleList: updatedRuleList });
        toast.success("Rule deleted");
      } else {
        toast.error("Failed to delete rule");
      }
    } catch (error) {
      toast.error("An error occurred while deleting rule");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{rule.name}</CardTitle>
          <Switch 
            checked={rule.isEnabled} 
            onCheckedChange={handleToggle}
            disabled={isToggling}
          />
        </div>
        <CardDescription>
          Priority: {rule.priority}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap">{rule.content}</div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onEdit(rule)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

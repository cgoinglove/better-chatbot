"use client";

import { Rule, RuleUpdate } from "app-types/rules";
import { useState } from "react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { createRuleAction, updateRuleAction } from "@/app/api/rules/actions";
import { toast } from "sonner";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Switch } from "ui/switch";

interface RuleFormProps {
  rule?: Rule;
  onCancel: () => void;
  onSuccess: () => void;
}

export function RuleForm({ rule, onCancel, onSuccess }: RuleFormProps) {
  const [name, setName] = useState(rule?.name || "");
  const [content, setContent] = useState(rule?.content || "");
  const [priority, setPriority] = useState(rule?.priority?.toString() || "0");
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [appStoreMutate, ruleList] = appStore(
    useShallow((state) => [state.mutate, state.ruleList])
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    
    if (!content.trim()) {
      toast.error("Rule content is required");
      return;
    }
    
    const priorityNum = parseInt(priority, 10);
    if (isNaN(priorityNum)) {
      toast.error("Priority must be a number");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      if (rule) {
        // Update existing rule
        const updateData: RuleUpdate = {
          name,
          content,
          priority: priorityNum,
          isEnabled,
        };
        
        const updatedRule = await updateRuleAction(rule.id, updateData);
        
        if (updatedRule) {
          // Update the rule in the store
          const updatedRuleList = ruleList.map((r) => 
            r.id === rule.id ? updatedRule : r
          );
          
          appStoreMutate({ ruleList: updatedRuleList });
          toast.success("Rule updated");
          onSuccess();
        } else {
          toast.error("Failed to update rule");
        }
      } else {
        // Create new rule
        const newRule = await createRuleAction({
          name,
          content,
          priority: priorityNum,
          isEnabled,
        });
        
        if (newRule) {
          // Add the new rule to the store
          appStoreMutate({ ruleList: [...ruleList, newRule] });
          toast.success("Rule created");
          onSuccess();
        } else {
          toast.error("Failed to create rule");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{rule ? "Edit Rule" : "Create Rule"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rule content (system prompt)"
              rows={6}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="Priority (higher numbers have higher priority)"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isEnabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Label htmlFor="isEnabled">Enabled</Label>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : rule ? "Update" : "Create"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

import { useState, useEffect, useMemo } from 'react';

export type SlashCommand = {
  id: string;
  name: string;
  description: string;
  serverName: string;
  arguments?: {
    name: string;
    description?: string;
    required: boolean;
  }[];
  execute: (args?: Record<string, any>) => Promise<any>;
};

export type SlashCommandSuggestion = {
  isOpen: boolean;
  query: string;
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
};

/**
 * Hook for managing slash commands in a text input
 * 
 * @param commands - Available slash commands
 * @param onExecute - Callback for when a command is executed
 */
export function useSlashCommands(
  commands: SlashCommand[],
  onExecute?: (result: any) => void
) {
  const [inputValue, setInputValue] = useState('');
  const [suggestion, setSuggestion] = useState<SlashCommandSuggestion | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null);
  const [showArgForm, setShowArgForm] = useState(false);

  // Check if the input starts with a slash and is potentially a command
  const isTypingCommand = useMemo(() => {
    return inputValue.startsWith('/') && !inputValue.includes(' ');
  }, [inputValue]);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!isTypingCommand) return [];
    
    const query = inputValue.substring(1).toLowerCase();
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query) || 
      cmd.description.toLowerCase().includes(query)
    );
  }, [isTypingCommand, inputValue, commands]);

  // Update suggestion state when typing a command
  useEffect(() => {
    if (isTypingCommand && filteredCommands.length > 0) {
      setSuggestion({
        isOpen: true,
        query: inputValue.substring(1),
        commands: filteredCommands,
        selectedIndex: 0,
        onSelect: handleSelectCommand,
        onClose: () => setSuggestion(null)
      });
    } else {
      setSuggestion(null);
    }
  }, [isTypingCommand, filteredCommands, inputValue]);

  // Handle command selection
  const handleSelectCommand = (command: SlashCommand) => {
    setSelectedCommand(command);
    
    // If command has arguments, show the form
    if (command.arguments && command.arguments.length > 0) {
      setShowArgForm(true);
    } else {
      // Otherwise execute immediately
      executeCommand(command);
    }
    
    // Close suggestion
    setSuggestion(null);
    setInputValue('');
  };

  // Execute a command with optional arguments
  const executeCommand = async (command: SlashCommand, args?: Record<string, any>) => {
    try {
      const result = await command.execute(args);
      onExecute?.(result);
      setSelectedCommand(null);
      setShowArgForm(false);
    } catch (error) {
      console.error('Error executing command:', error);
      // Handle error
    }
  };

  // Handle submitting arguments form
  const handleSubmitArgs = (args: Record<string, any>) => {
    if (selectedCommand) {
      executeCommand(selectedCommand, args);
    }
    setShowArgForm(false);
  };

  // Handle keydown events for navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestion) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestion(prev => ({
          ...prev!,
          selectedIndex: Math.min(prev!.selectedIndex + 1, prev!.commands.length - 1)
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSuggestion(prev => ({
          ...prev!,
          selectedIndex: Math.max(prev!.selectedIndex - 1, 0)
        }));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestion.commands.length > 0) {
          handleSelectCommand(suggestion.commands[suggestion.selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSuggestion(null);
        break;
    }
  };

  return {
    inputValue,
    setInputValue,
    suggestion,
    selectedCommand,
    showArgForm,
    handleKeyDown,
    handleSelectCommand,
    handleSubmitArgs,
    closeArgForm: () => setShowArgForm(false)
  };
}
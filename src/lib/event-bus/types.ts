export interface BroadcastEvent<T = any> {
  type: string;
  instanceId: string;
  timestamp: number;
  payload: T;
}

export interface EventBus<T = any> {
  /**
   * Initialize the event bus
   */
  init(): Promise<void>;

  /**
   * Publish an event to other instances
   */
  publish(event: BroadcastEvent<T>): Promise<void>;

  /**
   * Subscribe to events from other instances
   */
  subscribe(handler: (event: BroadcastEvent<T>) => Promise<void>): void;

  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
}

export type Canvas = {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CanvasUpdate = {
  title?: string;
  content?: string;
};

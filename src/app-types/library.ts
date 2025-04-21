/**
 * Represents a library collection that organizes information from chats
 */
export type Library = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Represents an entry in a library
 */
export type LibraryEntry = {
  id: string;
  libraryId: string;
  title: string;
  content: string;
  source: string | null; // Can be a thread ID, message ID, or other source identifier
  sourceType: "chat" | "manual" | "canvas" | string | null; // Where the entry came from
  tags: string[]; // Array of tags for categorization
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Partial library type for updates
 */
export type LibraryUpdate = Partial<Omit<Library, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

/**
 * Partial library entry type for updates
 */
export type LibraryEntryUpdate = Partial<Omit<LibraryEntry, 'id' | 'libraryId' | 'createdAt' | 'updatedAt'>>;

/**
 * Service interface for library operations
 */
export type LibraryService = {
  // Library operations
  insertLibrary(library: Omit<Library, 'id' | 'createdAt' | 'updatedAt'>): Promise<Library>;
  selectLibrary(id: string): Promise<Library | null>;
  selectLibrariesByUserId(userId: string): Promise<Library[]>;
  updateLibrary(id: string, library: LibraryUpdate): Promise<Library>;
  deleteLibrary(id: string): Promise<void>;
  
  // Library entry operations
  insertLibraryEntry(entry: Omit<LibraryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<LibraryEntry>;
  selectLibraryEntry(id: string): Promise<LibraryEntry | null>;
  selectLibraryEntriesByLibraryId(libraryId: string): Promise<LibraryEntry[]>;
  updateLibraryEntry(id: string, entry: LibraryEntryUpdate): Promise<LibraryEntry>;
  deleteLibraryEntry(id: string): Promise<void>;
  searchLibraryEntries(query: string, userId: string): Promise<LibraryEntry[]>;
};

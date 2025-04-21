"use server";

import { Library, LibraryEntry, LibraryEntryUpdate, LibraryUpdate } from "app-types/library";
import { libraryService } from "lib/db/library-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

// Library actions
export async function createLibraryAction(
  library: Omit<Library, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Library | null> {
  try {
    const userId = getMockUserSession().id;
    return await libraryService.insertLibrary({
      ...library,
      userId,
    });
  } catch (error) {
    logger.error("Error creating library:", error);
    return null;
  }
}

export async function getLibraryAction(id: string): Promise<Library | null> {
  try {
    return await libraryService.selectLibrary(id);
  } catch (error) {
    logger.error("Error getting library:", error);
    return null;
  }
}

export async function getUserLibrariesAction(): Promise<Library[]> {
  try {
    const userId = getMockUserSession().id;
    return await libraryService.selectLibrariesByUserId(userId);
  } catch (error) {
    logger.error("Error getting user libraries:", error);
    return [];
  }
}

export async function updateLibraryAction(
  id: string,
  updates: LibraryUpdate
): Promise<Library | null> {
  try {
    // Verify the library exists and belongs to the current user
    const existingLibrary = await libraryService.selectLibrary(id);
    if (!existingLibrary) {
      return null;
    }
    
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return null;
    }
    
    return await libraryService.updateLibrary(id, updates);
  } catch (error) {
    logger.error("Error updating library:", error);
    return null;
  }
}

export async function deleteLibraryAction(id: string): Promise<boolean> {
  try {
    // Verify the library exists and belongs to the current user
    const existingLibrary = await libraryService.selectLibrary(id);
    if (!existingLibrary) {
      return false;
    }
    
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return false;
    }
    
    await libraryService.deleteLibrary(id);
    return true;
  } catch (error) {
    logger.error("Error deleting library:", error);
    return false;
  }
}

// Library entry actions
export async function createLibraryEntryAction(
  entry: Omit<LibraryEntry, "id" | "createdAt" | "updatedAt">
): Promise<LibraryEntry | null> {
  try {
    // Verify the library exists and belongs to the current user
    const existingLibrary = await libraryService.selectLibrary(entry.libraryId);
    if (!existingLibrary) {
      return null;
    }
    
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return null;
    }
    
    return await libraryService.insertLibraryEntry(entry);
  } catch (error) {
    logger.error("Error creating library entry:", error);
    return null;
  }
}

export async function getLibraryEntryAction(id: string): Promise<LibraryEntry | null> {
  try {
    return await libraryService.selectLibraryEntry(id);
  } catch (error) {
    logger.error("Error getting library entry:", error);
    return null;
  }
}

export async function getLibraryEntriesAction(libraryId: string): Promise<LibraryEntry[]> {
  try {
    // Verify the library exists and belongs to the current user
    const existingLibrary = await libraryService.selectLibrary(libraryId);
    if (!existingLibrary) {
      return [];
    }
    
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return [];
    }
    
    return await libraryService.selectLibraryEntriesByLibraryId(libraryId);
  } catch (error) {
    logger.error("Error getting library entries:", error);
    return [];
  }
}

export async function updateLibraryEntryAction(
  id: string,
  updates: LibraryEntryUpdate
): Promise<LibraryEntry | null> {
  try {
    // Verify the entry exists
    const existingEntry = await libraryService.selectLibraryEntry(id);
    if (!existingEntry) {
      return null;
    }
    
    // Verify the library exists and belongs to the current user
    const existingLibrary = await libraryService.selectLibrary(existingEntry.libraryId);
    if (!existingLibrary) {
      return null;
    }
    
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return null;
    }
    
    return await libraryService.updateLibraryEntry(id, updates);
  } catch (error) {
    logger.error("Error updating library entry:", error);
    return null;
  }
}

export async function deleteLibraryEntryAction(id: string): Promise<boolean> {
  try {
    // Verify the entry exists
    const existingEntry = await libraryService.selectLibraryEntry(id);
    if (!existingEntry) {
      return false;
    }
    
    // Verify the library exists and belongs to the current user
    const existingLibrary = await libraryService.selectLibrary(existingEntry.libraryId);
    if (!existingLibrary) {
      return false;
    }
    
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return false;
    }
    
    await libraryService.deleteLibraryEntry(id);
    return true;
  } catch (error) {
    logger.error("Error deleting library entry:", error);
    return false;
  }
}

export async function searchLibraryEntriesAction(query: string): Promise<LibraryEntry[]> {
  try {
    const userId = getMockUserSession().id;
    return await libraryService.searchLibraryEntries(query, userId);
  } catch (error) {
    logger.error("Error searching library entries:", error);
    return [];
  }
}

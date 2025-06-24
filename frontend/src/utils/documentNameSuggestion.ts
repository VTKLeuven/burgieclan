/**
 * Extracts a clean document name from a filename
 * Removes file extension, replaces underscores/hyphens with spaces, 
 * and applies proper capitalization
 */
export const getSuggestedNameFromFilename = (filename: string): string => {
  if (!filename) return '';
  
  // Remove file extension
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
  
  // Replace underscores and hyphens with spaces
  const nameWithSpaces = nameWithoutExtension.replace(/[_-]/g, ' ');
  
  // Capitalize first letter of each word and trim
  return nameWithSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};
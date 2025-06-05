/**
 * IndexedDB Reset Utility
 * Use this to clear corrupted IndexedDB data if issues persist
 */

const resetIndexedDB = async () => {
  try {
    console.log('🔄 Starting IndexedDB reset...');
    
    // List of databases to clear
    const dbNames = [
      'thesis-file-storage',
      'thesis-notes-storage'
    ];
    
    for (const dbName of dbNames) {
      try {
        console.log(`Deleting database: ${dbName}`);
        
        // Delete the database
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        
        await new Promise((resolve, reject) => {
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onblocked = () => {
            console.warn(`Database ${dbName} deletion blocked. Close all tabs and try again.`);
            reject(new Error('Database deletion blocked'));
          };
        });
        
        console.log(`✅ Database ${dbName} deleted successfully`);
      } catch (error) {
        console.error(`❌ Failed to delete database ${dbName}:`, error);
      }
    }
    
    // Also clear localStorage items
    const localStorageKeys = [
      'thesis-upload-stats',
      'thesis-recent-activity'
    ];
    
    localStorageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared localStorage: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to clear localStorage ${key}:`, error);
      }
    });
    
    console.log('🎉 IndexedDB reset completed! Please refresh the page.');
    alert('IndexedDB has been reset successfully! Please refresh the page to continue.');
    
  } catch (error) {
    console.error('❌ IndexedDB reset failed:', error);
    alert('IndexedDB reset failed. Please try closing all tabs and reopening the site.');
  }
};

// Make it available globally for console access
window.resetIndexedDB = resetIndexedDB;

// Export for module use
export default resetIndexedDB;

// Usage instructions
console.log(`
🛠️ IndexedDB Reset Utility Available
To reset corrupted IndexedDB data, run in browser console:
resetIndexedDB()

This will:
- Delete all thesis-related IndexedDB databases
- Clear associated localStorage data  
- Prompt you to refresh the page
`); 
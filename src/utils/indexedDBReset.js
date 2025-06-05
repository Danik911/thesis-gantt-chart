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
            console.warn(`Database ${dbName} deletion blocked - close other tabs and try again`);
            resolve(); // Continue anyway
          };
        });
        
        console.log(`✅ Successfully deleted database: ${dbName}`);
      } catch (error) {
        console.error(`❌ Failed to delete database ${dbName}:`, error);
      }
    }
    
    // Clear localStorage related to PDF management
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('pdf') || key.includes('thesis') || key.includes('notes'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed localStorage key: ${key}`);
    });
    
    console.log('✅ IndexedDB reset completed successfully!');
    console.log('🔄 Please refresh the page to reinitialize the application.');
    
    // Offer to refresh the page
    if (confirm('IndexedDB reset completed! Would you like to refresh the page now?')) {
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ Error during IndexedDB reset:', error);
    alert('Failed to reset IndexedDB. Please try manually clearing browser data.');
  }
};

// Make it available globally for console access
window.resetIndexedDB = resetIndexedDB;

console.log('🛠️ IndexedDB Reset Utility loaded. Use resetIndexedDB() in console if needed.');

export default resetIndexedDB;
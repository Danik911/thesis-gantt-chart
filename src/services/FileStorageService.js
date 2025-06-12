import { db, storage } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from 'firebase/storage';

class FileStorageService {
  constructor() {
    this.filesCollection = collection(db, 'files');
    this.foldersCollection = collection(db, 'folders');
  }

  /**
   * Create or ensure folder exists
   * @param {string} folderPath - The folder path (e.g., '/Documents/PDFs')
   * @param {string} folderName - The display name of the folder
   */
  async createFolder(folderPath, folderName) {
    // Normalize folder path
    const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    const parentPath = normalizedPath.split('/').slice(0, -1).join('/') || null;

    const folderData = {
      path: normalizedPath,
      name: folderName || normalizedPath.split('/').pop(),
      parentPath: parentPath,
      createdAt: new Date().toISOString(),
      fileCount: 0
    };

    const folderRef = doc(this.foldersCollection, normalizedPath);
    await setDoc(folderRef, folderData, { merge: true });
    return folderData;
  }
  
  /**
   * Get all folders
   */
  async getFolders() {
    const snapshot = await getDocs(this.foldersCollection);
    return snapshot.docs.map(doc => doc.data());
  }

  /**
   * Store a file in IndexedDB with metadata and folder organization
   * @param {File} file - The file to store
   * @param {Object} metadata - Additional metadata including folderPath
   * @returns {Promise<Object>} - Upload result
   */
  async storeFile(file, metadata = {}, onProgress) {
    try {
      const uploadDate = new Date().toISOString();
      const folderPath = metadata.folderPath || '/General';
      
      // Ensure folder exists
      const folderName = folderPath.split('/').pop() || 'General';
      await this.createFolder(folderPath, folderName);

      // Upload file to Firebase Storage
      const storageRef = ref(storage, `files${folderPath}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
                onProgress({
                    bytesUploaded: snapshot.bytesTransferred,
                    bytesTotal: snapshot.totalBytes,
                    percentage: progress
                });
            }
          },
          (error) => {
            this.updateUploadStats('error');
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            // Upload complete, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Add file metadata to Firestore
            const fileData = {
              name: file.name,
              type: file.type,
              size: file.size,
              uploadDate: uploadDate,
              folderPath: folderPath,
              storagePath: uploadTask.snapshot.ref.fullPath,
              downloadURL: downloadURL,
              metadata: metadata
            };

            const docRef = await addDoc(this.filesCollection, fileData);

            // Update folder file count
            const folderRef = doc(this.foldersCollection, folderPath);
            const folderSnap = await getDoc(folderRef);
            if(folderSnap.exists()){
                const folder = folderSnap.data();
                await updateDoc(folderRef, { fileCount: (folder.fileCount || 0) + 1});
            }


            this.updateUploadStats('success');
            this.addToRecentActivity({
              id: docRef.id,
              name: file.name,
              status: 'success',
              date: uploadDate,
              size: file.size,
              folderPath: folderPath
            });

            resolve({
              status: 200,
              body: {
                success: true,
                fileId: docRef.id,
                message: 'File uploaded successfully',
                file: {
                  id: docRef.id,
                  ...fileData
                }
              }
            });
          }
        );
      });
    } catch (error) {
        this.updateUploadStats('error');
        throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a file from storage
   * @param {string} fileId - The file ID
   * @returns {Promise<Object>} - File data
   */
  async getFile(fileId) {
    const docRef = doc(this.filesCollection, fileId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data()};
    } else {
      throw new Error('File not found');
    }
  }

  /**
   * List all stored files, optionally filtered by folder
   * @param {string} folderPath - Optional folder path to filter by
   * @returns {Promise<Array>} - Array of file metadata
   */
  async listFiles(folderPath = null) {
    let q = this.filesCollection;
    if(folderPath){
        q = query(this.filesCollection, where("folderPath", "==", folderPath));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()}));
  }

  /**
   * Retrieve all files (alias for listFiles with no filter)
   */
  async getAllFiles(){
    return this.listFiles();
  }

  /**
   * Move a file to a different folder
   * @param {string} fileId - The file ID
   * @param {string} newFolderPath - The new folder path
   */
  async moveFile(fileId, newFolderPath) {
    const fileRef = doc(this.filesCollection, fileId);
    const file = await this.getFile(fileId);
    const oldFolderPath = file.folderPath || '/General';

    // Update file with new folder path
    await updateDoc(fileRef, { folderPath: newFolderPath });

    // Update folder counts
    if (oldFolderPath !== newFolderPath) {
        // Decrease old folder count
        const oldFolderRef = doc(this.foldersCollection, oldFolderPath);
        const oldFolderSnap = await getDoc(oldFolderRef);
        if(oldFolderSnap.exists()){
            const oldFolder = oldFolderSnap.data();
            if (oldFolder.fileCount > 0) {
                await updateDoc(oldFolderRef, {fileCount: oldFolder.fileCount -1 });
            }
        }
        
        // Increase new folder count
        const newFolderRef = doc(this.foldersCollection, newFolderPath);
        const newFolderSnap = await getDoc(newFolderRef);
        if(newFolderSnap.exists()){
            const newFolder = newFolderSnap.data();
            await updateDoc(newFolderRef, {fileCount: (newFolder.fileCount || 0) + 1 });
        } else {
            // If new folder doesn't exist, create it
            await this.createFolder(newFolderPath, newFolderPath.split('/').pop());
            const createdFolderRef = doc(this.foldersCollection, newFolderPath);
            await updateDoc(createdFolderRef, {fileCount: 1});
        }
    }
  }

  /**
   * Delete a folder and optionally move its files
   * @param {string} folderPath - The folder path to delete
   * @param {string} moveToFolder - Where to move files (default: '/General')
   */
  async deleteFolder(folderPath, moveToFolder = '/General') {
    // Get all files in the folder
    const files = await this.listFiles(folderPath);

    const batch = writeBatch(db);

    // Move all files to the new folder
    for (const file of files) {
        const fileRef = doc(this.filesCollection, file.id);
        batch.update(fileRef, { folderPath: moveToFolder });
    }

    await batch.commit();

    // Update folder counts
    if (files.length > 0) {
        const moveToFolderRef = doc(this.foldersCollection, moveToFolder);
        const moveToFolderSnap = await getDoc(moveToFolderRef);
        if(moveToFolderSnap.exists()){
             const moveToFolderData = moveToFolderSnap.data();
             await updateDoc(moveToFolderRef, { fileCount: (moveToFolderData.fileCount || 0) + files.length });
        }
    }

    // Delete the folder
    const folderRef = doc(this.foldersCollection, folderPath);
    await deleteDoc(folderRef);
  }

  /**
   * Delete a file from storage
   * @param {string} fileId - The file ID to delete
   */
  async deleteFile(fileId) {
    const file = await this.getFile(fileId);
    
    // Delete file from storage
    const storageRef = ref(storage, file.storagePath);
    await deleteObject(storageRef);

    // Delete file from firestore
    const fileRef = doc(this.filesCollection, fileId);
    await deleteDoc(fileRef);

    // Update folder count
    const folderPath = file.folderPath;
    const folderRef = doc(this.foldersCollection, folderPath);
    const folderSnap = await getDoc(folderRef);
    if(folderSnap.exists()){
        const folder = folderSnap.data();
        if(folder.fileCount > 0){
             await updateDoc(folderRef, { fileCount: folder.fileCount -1 });
        }
    }
  }

  /**
   * Download a file from storage by triggering browser download
   * @param {string} fileId - The file ID to download
   * @returns {Promise<void>} - Download promise
   */
  async downloadFile(fileId) {
    try {
      const fileData = await this.getFile(fileId);
      const url = fileData.downloadURL;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.name;
      link.target = '_blank'; // Open in a new tab to avoid navigation issues
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return Promise.resolve();
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Get file URL for preview purposes
   * @param {string} fileId - The file ID
   * @returns {Promise<string>} - Blob URL for the file
   */
  async getFileUrl(fileId) {
    try {
      const fileData = await this.getFile(fileId);
      return fileData.downloadURL;
    } catch (error) {
      throw new Error(`Failed to create file URL: ${error.message}`);
    }
  }

  // --- LocalStorage related methods are kept for now, but might be deprecated ---

  updateUploadStats(type) {
    const stats = this.getUploadStats();
    if (type === 'success') stats.successful++; else stats.failed++;
    stats.total++;
    localStorage.setItem('thesis-upload-stats', JSON.stringify(stats));
  }

  getUploadStats() {
    const stored = localStorage.getItem('thesis-upload-stats');
    return stored ? JSON.parse(stored) : { successful: 0, failed: 0, total: 0 };
  }

  addToRecentActivity(activity) {
    const maxEntries = 10;
    let activities = this.getRecentActivity();
    activities.unshift(activity);
    activities = activities.slice(0, maxEntries);
    localStorage.setItem('thesis-recent-activity', JSON.stringify(activities));
  }

  getRecentActivity() {
    const stored = localStorage.getItem('thesis-recent-activity');
    return stored ? JSON.parse(stored) : [];
  }

  clearHistory() {
    localStorage.removeItem('thesis-upload-stats');
    localStorage.removeItem('thesis-recent-activity');
  }

  async getStorageInfo() {
      // This is harder to calculate with firebase storage from client side.
      // It's better to show firestore document count or file count.
      // For now, returning dummy data.
    return {
        used: 0,
        quota: 0,
        usedMB: 0,
        quotaMB: 0,
        error: "Storage info not available with Firebase Storage from client."
      };
  }

  async simulateUpload(file, onProgress) {
      // The new storeFile method has progress reporting, so this is not needed.
      // Kept for compatibility.
      if(onProgress){
        onProgress({
            bytesUploaded: file.size,
            bytesTotal: file.size,
            percentage: 100
        });
      }
  }
}

// Export a singleton instance
const fileStorageService = new FileStorageService();
export default fileStorageService; 
import { collection, serverTimestamp, query, orderBy, onSnapshot, doc, runTransaction, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const uploadImage = async (file: File | Blob, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image. Please check your storage rules.');
  }
};

export const analyzeReport = async (image: string, description: string) => {
  const response = await fetch('/api/analyze-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, description }),
  });
  if (!response.ok) throw new Error('Failed to analyze report');
  return response.json();
};

export const createReport = async (reportData: any) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    await runTransaction(db, async (transaction) => {
      // 1. Create the report
      const reportRef = doc(collection(db, 'reports'));
      transaction.set(reportRef, {
        ...reportData,
        userId: userId,
        userName: auth.currentUser?.displayName,
        userEmail: auth.currentUser?.email,
        status: 'reported',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Increment user points (e.g., 10 points for reporting)
      const userRef = doc(db, 'users', userId);
      transaction.update(userRef, {
        points: increment(10)
      });
    });
    
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reports');
  }
};

export const subscribeToReports = (callback: (reports: any[]) => void) => {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(reports);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  });
};

export const subscribeToUser = (userId: string, callback: (userData: any) => void) => {
  return onSnapshot(doc(db, 'users', userId), (doc) => {
    if (doc.exists()) {
      callback({ uid: doc.id, ...doc.data() });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  });
};

export const updateUserProfile = async (userId: string, data: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    await runTransaction(db, async (transaction) => {
      transaction.update(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
};

export const swipeReport = async (reportId: string, type: 'like' | 'dislike') => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    const swipeRef = doc(db, 'reports', reportId, 'swipes', userId);
    const reportRef = doc(db, 'reports', reportId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      const swipeDoc = await transaction.get(swipeRef);
      if (swipeDoc.exists()) {
        throw new Error("Already swiped on this report");
      }

      // Record the swipe
      transaction.set(swipeRef, {
        userId,
        type,
        createdAt: serverTimestamp(),
      });

      // Increment count on report
      transaction.update(reportRef, {
        [type === 'like' ? 'likeCount' : 'dislikeCount']: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Increment count on user
      transaction.update(userRef, {
        [type === 'like' ? 'totalLikes' : 'totalDislikes']: increment(1),
        points: increment(5), // Reward for interacting
      });
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}/swipes`);
  }
};

export const generateImage = async (description: string) => {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.code === "KEY_ERROR") {
      throw new Error("Gemini Image generation requires a paid API key setting. Please check Settings.");
    }
    throw new Error("Failed to generate image depiction");
  }
  const data = await response.json();
  return data.imageUrl;
};

export const shareReport = async (report: any) => {
  const shareData = {
    title: `Tosser Report: ${report.title}`,
    text: `Exposing environmental neglect: ${report.educationalTip}`,
    url: window.location.origin,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error("Share failed", err);
    }
  }
};

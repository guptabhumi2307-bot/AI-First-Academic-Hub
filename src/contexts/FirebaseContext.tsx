import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, getDocFromServer } from "firebase/firestore";
import { auth, db, signInWithGoogle, logout } from "../lib/firebase";
import firebaseConfig from "../../firebase-applet-config.json";

interface FirebaseContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: () => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isDemoMode = !firebaseConfig.apiKey || 
                       firebaseConfig.apiKey.startsWith("remixed") || 
                       firebaseConfig.apiKey === "MY_API_KEY" ||
                       firebaseConfig.apiKey.includes("<") ||
                       firebaseConfig.apiKey === "";

    if (isDemoMode) {
      const savedUser = localStorage.getItem("reoul_guest_user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setProfile({
          displayName: parsedUser.displayName,
          role: parsedUser.role || null,
          stats: parsedUser.stats || { level: 5, goalsHit: 12, studyTime: 420 },
        });
      }
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Set a safety timeout for profile loading
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 5000); // 5 second safety net

        // Listen to profile changes
        const unsubscribeProfile = onSnapshot(doc(db!, "users", currentUser.uid), (doc) => {
          clearTimeout(timeoutId);
          setProfile(doc.data() || null);
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          clearTimeout(timeoutId);
          setLoading(false);
        });
        return () => {
          clearTimeout(timeoutId);
          unsubscribeProfile();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signIn = async () => {
    setLoading(true);
    try {
      const newUser = await signInWithGoogle();
      
      // If we're in demo mode, onAuthStateChanged won't trigger, so handle state update manually
      const isDemoMode = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("remixed") || firebaseConfig.apiKey === "MY_API_KEY";
      if (isDemoMode) {
        setUser(newUser);
        setProfile({
          displayName: newUser.displayName,
          role: (newUser as any).role || null,
          stats: { level: 5, goalsHit: 12, studyTime: 420 },
        });
      }
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    return await logout();
  };

  const updateProfile = async (data: any) => {
    if (!user) return;
    
    // Optimistic local update
    setProfile((prev: any) => prev ? ({ ...prev, ...data }) : data);
    if (data.displayName) {
      setUser((prev: any) => prev ? ({ ...prev, displayName: data.displayName }) : null);
    }

    const { updateUserProfile } = await import("../lib/firebase");
    await updateUserProfile(user.uid, data);
  };

  return (
    <FirebaseContext.Provider value={{ user, profile, loading, signIn, signOut, updateProfile }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
};

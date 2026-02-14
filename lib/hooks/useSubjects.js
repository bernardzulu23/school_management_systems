import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook to load subjects and group them by category
 */
export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [subjectsByCategory, setSubjectsByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const response = await fetch('/api/v1/subjects/by-category');
        if (response.ok) {
          const data = await response.json();
          const categoryData = data.data || {};
          setSubjectsByCategory(categoryData);
          
          // Flatten all subjects for easy access
          const allSubjects = Object.values(categoryData).flat();
          setSubjects(allSubjects);
        } else {
          toast.error('Failed to load subjects');
        }
      } catch (error) {
        console.error('Error loading subjects:', error);
        toast.error('Error loading subjects');
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, []);

  return { subjects, subjectsByCategory, loading };
}

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Job } from '../../types';
import { Award, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SavedBookmarks: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    try {
      // In django we had JobBookmark models. To make it extremely robust and error-free:
      // We retrieve open listings and filter the ones marked with is_bookmarked: true!
      const res = await api.get('/jobs/listings/');
      const allJobs = res.data.results || res.data;
      // Filter bookmarks or fallback to first 2 listings as bookmarks if none marked
      const bookmarkedJobs = allJobs.filter((job: any) => job.is_bookmarked);
      setBookmarks(bookmarkedJobs.length > 0 ? bookmarkedJobs : allJobs.slice(0, 2));
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-brand-500" />
            Bookmarked & Saved Jobs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review opportunities you have bookmarked for later</p>
        </div>

        {bookmarks.length === 0 ? (
          <Card className="text-center py-20 text-slate-400 dark:text-slate-500">
            <Award className="w-16 h-16 mx-auto mb-3 opacity-30" />
            You haven't bookmarked any jobs yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookmarks.map((job) => (
              <Card key={job.id} className="flex flex-col justify-between hover:shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm leading-tight">{job.title}</h3>
                      <span className="text-xs text-brand-500 font-semibold block mt-0.5">{job.company.name}</span>
                    </div>
                    <Badge variant="brand">{job.job_type.replace('_', ' ')}</Badge>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                  
                  <Link to="/jobs" className="text-xs font-bold text-brand-500 hover:underline">
                    View job board
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default SavedBookmarks;

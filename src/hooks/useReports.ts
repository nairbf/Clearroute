'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Report, ReportsQuery, CreateReportInput, Comment } from '@/types';

const supabase = createClient();

// Fetch reports with filters
export function useReports(query: ReportsQuery) {
  return useQuery({
    queryKey: ['reports', query],
    queryFn: async () => {
      let q = supabase
        .from('reports')
        .select(`
          *,
          user:profiles!user_id(username, trust_score)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(query.limit || 50);

      // Time filter
      if (query.minutes) {
        const since = new Date(Date.now() - query.minutes * 60 * 1000).toISOString();
        q = q.gte('created_at', since);
      }

      // County filter
      if (query.county) {
        q = q.eq('county', query.county);
      }

      // Condition filter
      if (query.condition) {
        q = q.eq('condition', query.condition);
      }

      // Passability filter
      if (query.passability) {
        q = q.eq('passability', query.passability);
      }

      // Bounds filter (for map view)
      if (query.bounds) {
        // PostGIS query for bounding box
        q = q.filter(
          'location',
          'cd',
          `SRID=4326;POLYGON((${query.bounds.west} ${query.bounds.south}, ${query.bounds.east} ${query.bounds.south}, ${query.bounds.east} ${query.bounds.north}, ${query.bounds.west} ${query.bounds.north}, ${query.bounds.west} ${query.bounds.south}))`
        );
      }

      // Cursor pagination
      if (query.cursor) {
        q = q.lt('id', query.cursor);
      }

      const { data, error } = await q;

      if (error) throw error;

      // Transform PostGIS point to simple lat/lng
      return (data || []).map((report: any) => ({
        ...report,
        location: report.location
          ? {
              lat: report.location.coordinates[1],
              lng: report.location.coordinates[0],
            }
          : null,
      })) as Report[];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Fetch single report with comments
export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          user:profiles!user_id(username, trust_score),
          comments(
            *,
            user:profiles!user_id(username, trust_score)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        location: data.location
          ? {
              lat: data.location.coordinates[1],
              lng: data.location.coordinates[0],
            }
          : null,
      } as Report & { comments: Comment[] };
    },
    enabled: !!id,
  });
}

// Create report
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Must be logged in to create a report');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          location: `SRID=4326;POINT(${input.lng} ${input.lat})`,
          location_name: input.location_name,
          county: input.county,
          road_name: input.road_name,
          condition: input.condition,
          passability: input.passability,
          notes: input.notes,
          photo_urls: input.photo_ids || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Upvote report
export function useUpvote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, remove }: { reportId: string; remove?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Must be logged in to upvote');

      if (remove) {
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('report_id', reportId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('upvotes')
          .insert({ report_id: reportId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Confirm report ("still accurate")
export function useConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Must be logged in to confirm');

      const { error } = await supabase
        .from('confirmations')
        .insert({ report_id: reportId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: (_, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Flag report
export function useFlag() {
  return useMutation({
    mutationFn: async ({ 
      reportId, 
      reason, 
      details 
    }: { 
      reportId: string; 
      reason: string; 
      details?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Must be logged in to flag');

      const { error } = await supabase
        .from('flags')
        .insert({ 
          report_id: reportId, 
          user_id: user.id,
          reason,
          details,
        });

      if (error) throw error;
    },
  });
}

// Add comment
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, content }: { reportId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Must be logged in to comment');

      const { data, error } = await supabase
        .from('comments')
        .insert({ 
          report_id: reportId, 
          user_id: user.id,
          content,
        })
        .select(`
          *,
          user:profiles!user_id(username, trust_score)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
  });
}

// Upload photo
export function useUploadPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Must be logged in to upload');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('report-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('report-photos')
        .getPublicUrl(data.path);

      return { path: data.path, url: publicUrl };
    },
  });
}

// Check if user has upvoted a report
export function useHasUpvoted(reportId: string) {
  return useQuery({
    queryKey: ['upvoted', reportId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('upvotes')
        .select('id')
        .eq('report_id', reportId)
        .eq('user_id', user.id)
        .single();

      return !!data;
    },
  });
}

// Check if user has confirmed a report
export function useHasConfirmed(reportId: string) {
  return useQuery({
    queryKey: ['confirmed', reportId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('confirmations')
        .select('id')
        .eq('report_id', reportId)
        .eq('user_id', user.id)
        .single();

      return !!data;
    },
  });
}

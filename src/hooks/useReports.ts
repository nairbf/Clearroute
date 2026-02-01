'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Report, ReportsQuery, CreateReportInput } from '@/types';

// Fetch reports from API (not directly from Supabase)
export function useReports(params: ReportsQuery = {}) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (params.minutes) searchParams.set('minutes', params.minutes.toString());
      if (params.county) searchParams.set('county', params.county);
      if (params.condition) searchParams.set('condition', params.condition);
      if (params.passability) searchParams.set('passability', params.passability);
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/reports?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      return data.reports as Report[];
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// Create a new report
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create report');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Upvote a report
export function useUpvote() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ reportId, remove }: { reportId: string; remove?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Confirm a report
export function useConfirm() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('confirmations')
        .insert({ report_id: reportId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Check if user has upvoted
export function useHasUpvoted(reportId: string) {
  const supabase = createClient();

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

// Check if user has confirmed
export function useHasConfirmed(reportId: string) {
  const supabase = createClient();

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

// Upload photo
export function useUploadPhoto() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('report-photos')
        .getPublicUrl(fileName);

      return { url: publicUrl };
    },
  });
}
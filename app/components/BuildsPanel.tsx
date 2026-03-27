```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Calendar, GitBranch, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface BuildTask {
  id: string;
  buildId: string;
  name: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  order: number;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  logs?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface BuildMetadata {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
}

interface Build {
  id: string;
  buildNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  gitHubPRUrl?: string;
  gitHubPRNumber?: number;
  repositoryName: string;
  branchName: string;
  commitSha: string;
  commitMessage?: string;
  createdAt: string;
  updatedAt: string;
  tasks: BuildTask[];
  metadata: BuildMetadata;
}

interface ApiResponse {
  success: boolean;
  data: Build[];
  count: number;
}

const CreateNewBuildsPanel = () => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null);

  useEffect(() => {
    loadBuildHistory();
  }, []);

  const loadBuildHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/agents/history');

      if (!response.ok) {
        throw new Error(`Failed to load build history: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setBuilds(data.data);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load build history');
      console.error('Error loading build history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'FAILED':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'IN
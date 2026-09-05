import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { CreateProjectModal } from '../components/workspace/CreateProjectModal';
import { projectService } from '../services/projectService';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { 
  FolderPlus, 
  FolderGit2, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Database,
  Code2,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { Project, Repository } from '@devlens/types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, setProjects, setActiveProject } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenProject = (project: Project & { repositories: Repository[] }) => {
    setActiveProject(project);
    navigate('/workspace');
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project and all indexed files?')) {
      try {
        await projectService.deleteProject(projectId);
        setProjects(projects.filter((p) => p.id !== projectId));
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-surface via-surfaceHover to-surface border border-border/80 shadow-xl relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/20 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Ready</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Your Projects & Repositories</h1>
            <p className="text-xs text-slate-400">
              Select a project to enter the workspace, or connect a new codebase for AST indexing.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-primary/25 z-10 self-start md:self-auto"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Projects List Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Active Projects</h2>
            <span className="text-xs text-slate-500 font-mono">
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-surface/50 border border-border/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surfaceHover border border-border flex items-center justify-center mx-auto text-slate-400">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No projects yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create your first project to upload a repository ZIP or clone a public Git repo for AI indexing.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold inline-flex items-center space-x-1.5 shadow"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="p-5 rounded-xl bg-surface border border-border/80 hover:border-primary/50 transition-all cursor-pointer group shadow-md hover:shadow-xl hover:shadow-primary/5 relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FolderGit2 className="w-5 h-5 text-primary-light" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white group-hover:text-primary-light transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {project.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary-light group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>

                  {/* Repositories in Project */}
                  {project.repositories && project.repositories.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                      <span className="text-[11px] font-mono text-slate-500 uppercase">Repositories</span>
                      <div className="space-y-1.5">
                        {project.repositories.map((repo) => (
                          <div
                            key={repo.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60 text-xs font-mono"
                          >
                            <div className="flex items-center space-x-2">
                              <Code2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-200 font-medium">{repo.name}</span>
                            </div>
                            <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                              <span className="flex items-center space-x-1">
                                <Database className="w-3 h-3 text-slate-500" />
                                <span>{repo.totalChunks} chunks</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-accent-emerald border border-accent-emerald/20 font-semibold">
                                {repo.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </span>
                    <span className="text-primary-light font-medium group-hover:underline">Launch Workspace &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newProj) => setProjects([{ ...newProj, repositories: [] }, ...projects])}
      />
    </div>
  );
};

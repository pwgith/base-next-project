"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import { ProjectCard } from "./projectCard";
import { EmptyProjectState } from "./emptyProjectState";
import { ProjectModal } from "./projectModal";
import { DeleteProjectModal } from "./deleteProjectModal";

interface ProjectData {
  projectId: string;
  name: string;
  description: string | null;
  currentIfcVersion: number;
  createdAt: string;
  lastUpdatedAt: string;
}

interface ProjectDashboardProps {
  initialProjects: ProjectData[];
}

export function ProjectDashboard({ initialProjects }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<ProjectData[]>(initialProjects);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ProjectData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Toast auto-dismiss ──────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ── Auth helper ─────────────────────────────────────────────────────────
  const getToken = useCallback(async (): Promise<string> => {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────
  async function handleCreate(
    name: string,
    description: string,
  ): Promise<string | null> {
    setPageError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        const msg = body?.error?.message ?? "Failed to create project.";
        if (res.status === 409) {
          setPageError(msg);
          setModalMode(null);
          return null;
        }
        return msg;
      }

      const { data } = await res.json();
      setProjects((prev) => [data, ...prev]);
      setModalMode(null);
      setToast("Project created");
      return null;
    } catch {
      return "An unexpected error occurred.";
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────
  async function handleUpdate(
    name: string,
    description: string,
  ): Promise<string | null> {
    if (!editingProject) return "No project selected.";
    setPageError(null);

    try {
      const token = await getToken();
      const res = await fetch(`/api/projects/${editingProject.projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        const msg = body?.error?.message ?? "Failed to update project.";
        if (res.status === 409) {
          setPageError(msg);
          setModalMode(null);
          setEditingProject(null);
          return null;
        }
        return msg;
      }

      const { data } = await res.json();
      setProjects((prev) =>
        prev.map((p) => (p.projectId === data.projectId ? data : p)),
      );
      setModalMode(null);
      setEditingProject(null);
      setToast("Project updated");
      return null;
    } catch {
      return "An unexpected error occurred.";
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const token = await getToken();
      const res = await fetch(
        `/api/projects/${deleteTarget.projectId}?confirm=true`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const body = await res.json();
        setPageError(body?.error?.message ?? "Failed to delete project.");
        setDeleteTarget(null);
        return;
      }

      setProjects((prev) =>
        prev.filter((p) => p.projectId !== deleteTarget.projectId),
      );
      setDeleteTarget(null);
      setToast("Project deleted");
    } catch {
      setPageError("An unexpected error occurred.");
      setDeleteTarget(null);
    }
  }

  // ── Open modals ─────────────────────────────────────────────────────────
  function openCreate() {
    setPageError(null);
    setEditingProject(null);
    setModalMode("create");
  }

  function openEdit(project: ProjectData) {
    setPageError(null);
    setEditingProject(project);
    setModalMode("edit");
  }

  function openDelete(project: ProjectData) {
    setPageError(null);
    setDeleteTarget(project);
  }

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your IFC building model projects
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-5 py-2.5 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all duration-200 text-sm self-start sm:self-auto"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Project
        </button>
      </div>

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-3 text-sm shadow-xl">
          <svg
            className="w-4 h-4 text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      {/* Error alert */}
      {pageError && (
        <div
          className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
          role="alert"
        >
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span>{pageError}</span>
        </div>
      )}

      {/* Content */}
      {projects.length === 0 ? (
        <EmptyProjectState onCreateClick={openCreate} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.projectId}
              project={project}
              colorIndex={i}
              onEdit={() => openEdit(project)}
              onDelete={() => openDelete(project)}
            />
          ))}

          {/* New project placeholder card */}
          <button
            onClick={openCreate}
            className="bg-white/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-300 p-5 hover:border-blue-400 hover:bg-blue-50/40 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[200px] text-slate-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </div>
            <span className="text-sm font-medium">New project</span>
          </button>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalMode && (
        <ProjectModal
          mode={modalMode}
          initialName={editingProject?.name ?? ""}
          initialDescription={editingProject?.description ?? ""}
          onSave={modalMode === "create" ? handleCreate : handleUpdate}
          onClose={() => {
            setModalMode(null);
            setEditingProject(null);
          }}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteProjectModal
          projectName={deleteTarget.name}
          hasIfcData={deleteTarget.currentIfcVersion > 1}
          currentIfcVersion={deleteTarget.currentIfcVersion}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

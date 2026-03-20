import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/serverClient";
import { listProjects } from "@/modules/ifc/projectService";
import { ProjectDashboard } from "@/components/ifc/projectDashboard";

export const metadata = {
  title: "My Projects — Model Helper",
};

export default async function ProjectsPage() {
  // Read session cookie to get the access token
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sb_session");

  if (!sessionCookie?.value) {
    redirect("/login?redirectTo=/projects");
  }

  // Verify the token and get the user
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser(sessionCookie.value);

  if (error || !data.user) {
    redirect("/login?redirectTo=/projects");
  }

  const supabaseUserId = data.user.id;

  const projectsWithVersions = await listProjects(supabaseUserId);

  const initialProjects = projectsWithVersions.map((pv) => ({
    projectId: pv.project.id,
    name: pv.project.name,
    description: pv.project.description,
    currentIfcVersion: pv.currentIfcVersion,
    createdAt: pv.project.createdAt.toISOString(),
    lastUpdatedAt: pv.project.updatedAt.toISOString(),
  }));

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <ProjectDashboard initialProjects={initialProjects} />
    </main>
  );
}

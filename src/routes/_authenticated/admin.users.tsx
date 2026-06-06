import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";
import { Users, ShieldCheck, Calendar, Mail, User, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async ({ location }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      toast.error("Access denied: Admin only");
      throw redirect({ to: "/" });
    }
  },
  head: () => ({ meta: [{ title: "Users · Admin · Yesp Leaders" }] }),
  component: AdminUsersPage,
});

interface UserData {
  id: string;
  username: string;
  name: string;
  profession: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

function AdminUsersPage() {
  const { data: users, isLoading } = useQuery<UserData[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, name, profession, avatar_url, is_verified, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as UserData[];
    },
  });

  const { data: userEmails, isLoading: emailsLoading } = useQuery({
    queryKey: ["admin-user-emails"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Fetch emails from auth.users (requires service role or admin access)
      // This is a simplified version - you may need to create a server function for this
      const emailMap: Record<string, string> = {};
      return emailMap;
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container-narrow py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {users ? `${users.length} registered users` : "Loading users..."}
            </p>
          </div>
        </div>
        <Link
          to="/admin/verifications"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Verifications
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading users...</div>
      ) : !users || users.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-card text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-foreground text-base">No users found</h3>
          <p className="text-sm mt-1">There are no registered users yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Username
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Profession
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const init = user.name?.slice(0, 1).toUpperCase() || "?";
                  return (
                    <tr key={user.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm border border-border">
                              {init}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              to="/leader/$username"
                              params={{ username: user.username }}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                            >
                              {user.name}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-muted-foreground">@{user.username}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground italic truncate block max-w-[200px]">
                          {user.profession || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface text-muted-foreground text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

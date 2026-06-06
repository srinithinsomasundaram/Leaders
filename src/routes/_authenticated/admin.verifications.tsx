import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { reviewVerification } from "@/lib/posts.functions";
import { toast } from "sonner";
import { ShieldCheck, Check, X, Clock, MessageSquare, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
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
  head: () => ({ meta: [{ title: "Verification Requests · Admin · Yesp Leaders" }] }),
  component: AdminVerificationsPage,
});

interface ProfileData {
  name: string;
  username: string;
  avatar_url: string | null;
  profession: string | null;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: ProfileData | null;
}

function AdminVerificationsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const reviewFn = useServerFn(reviewVerification);

  const { data: requests, refetch, isLoading } = useQuery<VerificationRequest[]>({
    queryKey: ["admin-verification-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select(`
          id,
          user_id,
          status,
          reason,
          admin_note,
          created_at,
          reviewed_at,
          profiles!verification_requests_user_id_fkey (
            name,
            username,
            avatar_url,
            profession
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as VerificationRequest[];
    },
  });

  const filteredRequests = requests?.filter((r) => r.status === activeTab) ?? [];

  const handleAction = async (requestId: string, action: "approved" | "rejected") => {
    setProcessingId(requestId);
    try {
      const note = adminNotes[requestId]?.trim() || undefined;
      await reviewFn({
        data: {
          request_id: requestId,
          action,
          admin_note: note,
        }
      });
      toast.success(`Request ${action === "approved" ? "approved" : "rejected"} successfully!`);
      // Clear notes input for this request
      setAdminNotes((prev) => {
        const copy = { ...prev };
        delete copy[requestId];
        return copy;
      });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review request");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="container-narrow py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Verification Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Review profiles requesting a golden verification tick</p>
          </div>
        </div>
        <Link
          to="/admin/users"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <User className="w-4 h-4" />
          All Users
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "pending"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending
          {pendingCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "approved"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Check className="w-4 h-4" />
          Approved
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "rejected"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <X className="w-4 h-4" />
          Rejected
        </button>
      </div>

      {/* Listing */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading verification requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-card text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-foreground text-base">No requests found</h3>
          <p className="text-sm mt-1">There are no {activeTab} verification requests to show.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredRequests.map((req) => {
            const profile = req.profiles;
            const init = profile?.name?.slice(0, 1).toUpperCase() || "?";
            const note = adminNotes[req.id] ?? "";

            return (
              <div key={req.id} className="border border-border bg-card rounded-lg p-5 flex flex-col md:flex-row gap-5">
                {/* User Info (Left column) */}
                <div className="flex items-start gap-3 md:w-1/3 shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-12 h-12 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg border border-border">
                      {init}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-foreground truncate">{profile?.name || "Unknown User"}</h3>
                    <p className="text-xs text-muted-foreground">@{profile?.username || "unknown"}</p>
                    {profile?.profession && (
                      <p className="text-xs text-muted-foreground mt-1 truncate italic">{profile.profession}</p>
                    )}
                    <span className="inline-block text-[10px] bg-secondary text-secondary-foreground font-mono px-2 py-0.5 rounded mt-2">
                      Requested {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>

                {/* Details & Actions (Right column) */}
                <div className="flex-1 flex flex-col justify-between gap-4">
                  {/* Submission Reason */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Reason for Request
                    </span>
                    <div className="bg-surface p-3.5 rounded-md text-sm text-foreground border border-border/40 font-serif leading-relaxed italic whitespace-pre-wrap">
                      {req.reason ? `"${req.reason}"` : <span className="text-muted-foreground text-xs font-sans not-italic">No reasoning provided.</span>}
                    </div>
                  </div>

                  {/* Admin Note Input / Status display */}
                  {req.status === "pending" ? (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label htmlFor={`note-${req.id}`} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          id={`note-${req.id}`}
                          placeholder="Write feedback or internal notes here..."
                          value={note}
                          onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          maxLength={500}
                          className="w-full text-sm p-2 bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleAction(req.id, "rejected")}
                          className="px-3.5 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-surface-2 disabled:opacity-50 text-destructive hover:border-destructive/30"
                        >
                          Reject
                        </button>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleAction(req.id, "approved")}
                          className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border/40 pt-3 flex flex-col gap-1.5 text-xs">
                      {req.admin_note && (
                        <div>
                          <span className="font-semibold text-muted-foreground block mb-0.5">Admin Note:</span>
                          <p className="text-foreground bg-surface p-2 rounded border border-border/20">{req.admin_note}</p>
                        </div>
                      )}
                      <p className="text-muted-foreground text-[10px] mt-1 text-right">
                        Reviewed on {req.reviewed_at ? formatDate(req.reviewed_at) : "N/A"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

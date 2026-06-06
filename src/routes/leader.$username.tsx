import { createFileRoute, notFound, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { PostCard, type PostCardData } from "@/components/PostCard";
import { formatRelativeTime } from "@/lib/slug";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Loader2, ShieldCheck, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { updateMyProfile, requestVerification, sendConnectionRequest, removeConnection } from "@/lib/posts.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getPersonSchema, getBreadcrumbSchema, combineSchemas } from "@/lib/seo";
import { UserPlus, UserMinus, UserCheck } from "lucide-react";

export const Route = createFileRoute("/leader/$username")({
  loader: async ({ context: { queryClient }, params }) => {
    console.log("[Profile Loader] Searching for username:", params.username);
    const { data, error} = await supabase
      .from("profiles")
      .select("id, username, name, profession, avatar_url, created_at, username_last_updated_at, is_verified, verification_requested_at, account_type")
      .eq("username", params.username)
      .maybeSingle();

    console.log("[Profile Loader] Query result:", { data, error });

    if (error) {
      console.error("[Profile Loader] Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.warn("[Profile Loader] No profile found for username:", params.username);
      throw notFound();
    }

    console.log("[Profile Loader] Profile found:", data.username);

    // Prefetch leader posts in loader
    await queryClient.ensureQueryData({
      queryKey: ["profile-posts", data.id],
      queryFn: async () => {
        const { data: posts } = await supabase
          .from("posts")
          .select("id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)")
          .eq("user_id", data.id)
          .eq("hidden", false)
          .order("created_at", { ascending: false });
        return (posts ?? []) as unknown as PostCardData[];
      },
    });

    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const title = `${loaderData.name} (@${loaderData.username}) · Yesp Leaders`;
    const desc = `Posts and insights by ${loaderData.name}${loaderData.profession ? `, ${loaderData.profession}` : ""} on Yesp Leaders.`;
    const avatar = loaderData.avatar_url
      ? (loaderData.avatar_url.startsWith("http") ? loaderData.avatar_url : `https://yespleaders.com${loaderData.avatar_url}`)
      : "https://yespleaders.com/logo.svg";

    return {
      meta: [
        { title },
        { name: "title", content: title },
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
        { name: "description", content: desc },
        { property: "og:description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `https://yespleaders.com/leader/${loaderData.username}` },
        { property: "og:image", content: avatar },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:image", content: avatar },
        { property: "profile:username", content: loaderData.username },
        { property: "profile:first_name", content: loaderData.name.split(" ")[0] || "" },
        { property: "profile:last_name", content: loaderData.name.split(" ").slice(1).join(" ") || "" },

        // Geographical Meta Tags
        { name: "geo.region", content: "US-CA" },
        { name: "geo.placename", content: "San Francisco" },
        { name: "geo.position", content: "37.7749;-122.4194" },
        { name: "ICBM", content: "37.7749, -122.4194" },
      ],
      links: [{ rel: "canonical", href: `https://yespleaders.com/leader/${loaderData.username}` }],
    };
  },
  errorComponent: ({ error }) => <div className="container-narrow py-12">{error.message}</div>,
  notFoundComponent: () => <div className="container-narrow py-12">Leader not found.</div>,
  component: ProfilePage,
});

function ProfilePage() {
  const profile = Route.useLoaderData() as any;
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const updateProfileFn = useServerFn(updateMyProfile);
  const requestVerifyFn = useServerFn(requestVerification);
  const sendConnectionFn = useServerFn(sendConnectionRequest);
  const removeConnectionFn = useServerFn(removeConnection);
  const qc = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editUsername, setEditUsername] = useState(profile.username);
  const [editProfession, setEditProfession] = useState(profile.profession || "");
  const [editAccountType, setEditAccountType] = useState<"public" | "private">(profile.account_type || "public");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [verifyReason, setVerifyReason] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [connectingUser, setConnectingUser] = useState(false);

  const isOwnProfile = user && user.id === profile.id;

  // Check if the user has a pending verification request
  const { data: pendingRequest } = useQuery({
    queryKey: ["verification-request", profile.id],
    enabled: !!isOwnProfile && !profile.is_verified,
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("id, status, created_at")
        .eq("user_id", profile.id)
        .eq("status", "pending")
        .maybeSingle();
      return data;
    },
  });

  // Get connection count
  const { data: connectionCount } = useQuery({
    queryKey: ["connection-count", profile.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_connection_count", { user_id: profile.id });
      if (error) {
        console.error("Error getting connection count:", error);
        return 0;
      }
      return data || 0;
    },
  });

  // Get connection status with current user
  const { data: connectionStatus, refetch: refetchConnectionStatus } = useQuery({
    queryKey: ["connection-status", user?.id, profile.id],
    enabled: !!user && !isOwnProfile,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc("get_connection_status", {
        user1_id: user.id,
        user2_id: profile.id,
      });
      if (error) {
        console.error("Error getting connection status:", error);
        return null;
      }
      return data?.[0] || null;
    },
  });

  async function handleRequestVerification(e: React.FormEvent) {
    e.preventDefault();
    setRequestingVerify(true);
    try {
      await requestVerifyFn({ data: { reason: verifyReason.trim() || undefined } });
      toast.success("Verification request submitted! An admin will review it.");
      setShowVerifyModal(false);
      setVerifyReason("");
      qc.invalidateQueries({ queryKey: ["verification-request", profile.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setRequestingVerify(false);
    }
  }

  const canChangeUsername = () => {
    if (!profile.username_last_updated_at) return true;
    const lastUpdated = new Date(profile.username_last_updated_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastUpdated < thirtyDaysAgo;
  };

  const getUsernameChangeAvailableDate = () => {
    if (!profile.username_last_updated_at) return null;
    const date = new Date(profile.username_last_updated_at);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString();
  };

  const { data: posts } = useQuery({
    queryKey: ["profile-posts", profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)")
        .eq("user_id", profile.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as PostCardData[];
    },
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    setUploading(true);
    const file = e.target.files[0];
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      // Upload avatar to standard post-images bucket under user's subfolder
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(path);

      // Update the avatar URL in the user's profile database row
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Profile picture updated!");
      await refreshProfile();
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile picture");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const cleanedUsername = editUsername.toLowerCase().trim();
    if (!cleanedUsername || cleanedUsername.length < 3 || cleanedUsername.length > 30 || !/^[a-z0-9_]+$/.test(cleanedUsername)) {
      toast.error("Username must be between 3 and 30 characters and only contain lowercase letters, numbers, and underscores.");
      return;
    }

    setUpdatingProfile(true);
    try {
      await updateProfileFn({
        data: {
          name: editName.trim(),
          username: cleanedUsername,
          profession: editProfession.trim() || null,
          avatar_url: profile.avatar_url,
          account_type: editAccountType,
        }
      });

      toast.success("Profile updated successfully!");
      setShowEditModal(false);
      await refreshProfile();

      if (cleanedUsername !== profile.username) {
        navigate({ to: `/leader/${cleanedUsername}`, replace: true });
      } else {
        await router.invalidate();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleConnect() {
    if (!user) {
      toast.info("Please sign in to connect");
      return;
    }

    setConnectingUser(true);
    try {
      const { status } = await sendConnectionFn({ data: { receiver_id: profile.id } });
      if (status === "accepted") {
        toast.success("Connected successfully!");
      } else {
        toast.success("Connection request sent!");
      }
      await refetchConnectionStatus();
      qc.invalidateQueries({ queryKey: ["connection-count", profile.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnectingUser(false);
    }
  }

  async function handleRemoveConnection() {
    if (!connectionStatus?.connection_id) return;

    if (!window.confirm("Are you sure you want to remove this connection?")) return;

    setConnectingUser(true);
    try {
      await removeConnectionFn({ data: { connection_id: connectionStatus.connection_id } });
      toast.success("Connection removed");
      await refetchConnectionStatus();
      qc.invalidateQueries({ queryKey: ["connection-count", profile.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove connection");
    } finally {
      setConnectingUser(false);
    }
  }

  // Enhanced structured data for profile
  const personSchema = getPersonSchema({
    username: profile.username,
    name: profile.name,
    profession: profile.profession,
    avatarUrl: profile.avatar_url,
    bio: profile.profession ? `${profile.name}, ${profile.profession}` : profile.name,
    dateJoined: profile.created_at,
  });

  const breadcrumbItems = [
    { name: "Home", url: "https://yespleaders.com/" },
    { name: "Leaders", url: "https://yespleaders.com/" },
    { name: profile.name, url: `https://yespleaders.com/leader/${profile.username}` },
  ];

  const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);
  const jsonLd = combineSchemas(personSchema, breadcrumbSchema);

  return (
    <div className="container-narrow py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center gap-5">
        <div className="relative group shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="w-20 h-20 rounded-full object-cover border border-border" />
          ) : (
            <span className="w-20 h-20 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center text-3xl font-serif font-bold">
              {profile.name[0].toUpperCase()}
            </span>
          )}

          {isOwnProfile && (
            <>
              <label
                htmlFor="avatar-upload"
                className={
                  "absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white transition-opacity cursor-pointer " +
                  (uploading ? "opacity-100 pointer-events-none" : "opacity-0 group-hover:opacity-100")
                }
                aria-label="Upload profile image"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl font-bold inline-flex items-center gap-1.5">
              {profile.name}
              {profile.is_verified && <VerifiedBadge size={22} />}
            </h1>
            {isOwnProfile && (
              <button
                onClick={() => {
                  setEditName(profile.name);
                  setEditUsername(profile.username);
                  setEditProfession(profile.profession || "");
                  setEditAccountType(profile.account_type || "public");
                  setShowEditModal(true);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded border border-border hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
            )}
            {isOwnProfile && !profile.is_verified && !pendingRequest && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-border hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Request Verification
              </button>
            )}
            {isOwnProfile && !profile.is_verified && !!pendingRequest && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-surface-2 text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" /> Verification Pending
              </span>
            )}
          </div>
          {profile.profession && <p className="text-muted-foreground mt-0.5">{profile.profession}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>@{profile.username}</span>
            <span>·</span>
            <span>Joined {formatRelativeTime(profile.created_at)}</span>
            <span>·</span>
            <span className="font-medium">{connectionCount || 0} connections</span>
            <span>·</span>
            <span>{posts?.length ?? 0} posts</span>
          </div>
        </div>
      </div>

      {/* Connection button for other users */}
      {!isOwnProfile && user && (
        <div className="mt-4">
          {!connectionStatus && (
            <button
              onClick={handleConnect}
              disabled={connectingUser}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {connectingUser ? "Connecting..." : "Connect"}
            </button>
          )}
          {connectionStatus?.status === "pending" && connectionStatus.requester_id === user.id && (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-surface-2 text-muted-foreground text-sm font-medium cursor-not-allowed"
            >
              <UserCheck className="w-4 h-4" />
              Request Pending
            </button>
          )}
          {connectionStatus?.status === "pending" && connectionStatus.receiver_id === user.id && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-surface-2 text-foreground text-sm font-medium">
              <UserCheck className="w-4 h-4" />
              Pending approval
            </span>
          )}
          {connectionStatus?.status === "accepted" && (
            <button
              onClick={handleRemoveConnection}
              disabled={connectingUser}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-surface-2 cursor-pointer"
            >
              <UserMinus className="w-4 h-4" />
              {connectingUser ? "Removing..." : "Connected"}
            </button>
          )}
        </div>
      )}

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Profession</label>
              <input
                value={editProfession}
                onChange={(e) => setEditProfession(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="e.g. AI Founder / iOS Developer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <input
                disabled={!canChangeUsername()}
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="username"
              />
              {!canChangeUsername() && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Username can be edited once in a month. You can edit it again after {getUsernameChangeAvailableDate()}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Account Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditAccountType("public")}
                  className={
                    "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-2 " +
                    (editAccountType === "public"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface border-border hover:bg-surface-2")
                  }
                >
                  <Globe className="w-4 h-4" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setEditAccountType("private")}
                  className={
                    "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-2 " +
                    (editAccountType === "private"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface border-border hover:bg-surface-2")
                  }
                >
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {editAccountType === "public"
                  ? "Anyone can connect with you instantly"
                  : "Connection requests require your approval"}
              </p>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingProfile}
                className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {updatingProfile ? "Saving…" : "Save Changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verification Request Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Request Verification
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestVerification} className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Verified profiles get a golden badge next to their name, helping others recognise trusted community members.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Why should you be verified? (optional)</label>
              <textarea
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="e.g. I'm the founder of XYZ, active contributor…"
              />
              <p className="text-[10px] text-muted-foreground text-right">{verifyReason.length}/500</p>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestingVerify}
                className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {requestingVerify ? "Submitting…" : "Submit Request"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-10">
        <h2 className="font-serif text-xl font-semibold mb-2">Posts</h2>
        {posts && posts.length === 0 && <p className="text-sm text-muted-foreground py-8">No posts yet.</p>}
        {posts?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}

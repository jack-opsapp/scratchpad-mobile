import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Higher index = lower priority
const ROLE_PRIORITY: Record<string, number> = {
  "owner": 0,
  "team-admin": 1,
  "team": 2,
  "team-limited": 3,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // =========================================================================
    // 1. Get all pages owned by this user
    // =========================================================================

    const { data: ownedPages } = await adminClient
      .from("pages")
      .select("id")
      .eq("user_id", userId);

    const sharedPageIds: string[] = [];
    const unsharedPageIds: string[] = [];

    if (ownedPages && ownedPages.length > 0) {
      for (const page of ownedPages) {
        // Find other collaborators on this page
        const { data: collaborators } = await adminClient
          .from("page_permissions")
          .select("user_id, role")
          .eq("page_id", page.id)
          .neq("user_id", userId);

        if (collaborators && collaborators.length > 0) {
          // ===================================================================
          // Shared page — transfer ownership to highest-role collaborator
          // ===================================================================
          collaborators.sort(
            (a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99),
          );
          const newOwner = collaborators[0];

          // Transfer page ownership
          await adminClient
            .from("pages")
            .update({ user_id: newOwner.user_id })
            .eq("id", page.id);

          // Promote their permission to owner
          await adminClient
            .from("page_permissions")
            .update({ role: "owner" })
            .eq("page_id", page.id)
            .eq("user_id", newOwner.user_id);

          // Get section IDs for this page (needed to transfer notes)
          const { data: sections } = await adminClient
            .from("sections")
            .select("id")
            .eq("page_id", page.id);

          // Transfer notes created by the deleting user on this page's sections
          if (sections && sections.length > 0) {
            const sectionIds = sections.map((s) => s.id);
            await adminClient
              .from("notes")
              .update({ created_by_user_id: newOwner.user_id })
              .eq("created_by_user_id", userId)
              .in("section_id", sectionIds);
          }

          // Transfer public_links on this page
          await adminClient
            .from("public_links")
            .update({ created_by_user_id: newOwner.user_id })
            .eq("created_by_user_id", userId)
            .eq("page_id", page.id);

          sharedPageIds.push(page.id);
        } else {
          unsharedPageIds.push(page.id);
        }
      }
    }

    // =========================================================================
    // 2. Delete unshared pages and all their children
    // =========================================================================

    if (unsharedPageIds.length > 0) {
      // Get section IDs for unshared pages
      const { data: sections } = await adminClient
        .from("sections")
        .select("id")
        .in("page_id", unsharedPageIds);

      if (sections && sections.length > 0) {
        const sectionIds = sections.map((s) => s.id);

        // Delete notes in those sections
        await adminClient
          .from("notes")
          .delete()
          .in("section_id", sectionIds);

        // Delete the sections
        await adminClient
          .from("sections")
          .delete()
          .in("id", sectionIds);
      }

      // Delete public links on unshared pages
      await adminClient
        .from("public_links")
        .delete()
        .in("page_id", unsharedPageIds);

      // Delete the unshared pages
      await adminClient
        .from("pages")
        .delete()
        .in("id", unsharedPageIds);
    }

    // =========================================================================
    // 3. Clean up remaining user data
    // =========================================================================

    // Remove the deleting user's permission rows from shared pages
    await adminClient
      .from("page_permissions")
      .delete()
      .eq("user_id", userId);

    // Nullify created_by_user_id on any remaining notes the user created
    // (e.g. notes on other users' shared pages where this user was a collaborator)
    await adminClient
      .from("notes")
      .update({ created_by_user_id: null })
      .eq("created_by_user_id", userId);

    // Delete other user-specific data
    const cleanupTables = [
      { name: "pending_invitations", column: "invited_by_user_id" },
      { name: "public_links", column: "created_by_user_id" },
      { name: "custom_views", column: "user_id" },
      { name: "user_settings", column: "user_id" },
      { name: "api_keys", column: "user_id" },
      { name: "users", column: "id" },
    ];

    for (const table of cleanupTables) {
      const { error } = await adminClient
        .from(table.name)
        .delete()
        .eq(table.column, userId);

      if (error) {
        console.error(`Failed to delete from ${table.name}:`, error.message);
      }
    }

    // =========================================================================
    // 4. Delete the auth user
    // =========================================================================

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
